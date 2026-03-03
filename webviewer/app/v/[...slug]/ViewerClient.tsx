"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { REACTION_EMOJIS, type Reaction } from "@/lib/reactions";
import {
  fetchVideoMeta,
  incrementView,
  fetchReactions as fetchReactionsEdge,
  addReaction as addReactionEdge,
  type VideoMeta,
} from "@/lib/api";
import { USE_MOCK, mock } from "@/lib/mock";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAPTURE_LABELS: Record<string, string> = {
  screen: "Entire Screen",
  window: "Application Window",
  tab: "Browser Tab",
};

const CAPTURE_ICONS: Record<string, string> = {
  screen: "M3 4h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1zM8 20h8M12 16v4",
  window: "M3 3h18a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zM2 8h20",
  tab: "M12 2a10 10 0 110 20 10 10 0 010-20zM2 12h20",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(isoString);
}

function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return atob(base64 + "=".repeat(pad));
}

function parseSlug(): { projectId: string; code: string; provider: string } | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 3 && parts[0] === "v") {
    try {
      const decoded = decodeBase64Url(parts[1]);
      const dashIdx = decoded.indexOf("-");
      if (dashIdx < 1) return null;
      const provider = decoded.slice(0, dashIdx);
      const projectId = decoded.slice(dashIdx + 1);
      if (!provider || !projectId) return null;
      return { projectId, code: parts[2], provider };
    } catch {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BrandLoader({ label = "Loading video..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="brand-loader-icon">
        <div className="jamakkalam-stripes brand-loader-stripes absolute inset-0" />
        <div className="brand-loader-window">
          <div className="brand-loader-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="brand-loader-play">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
            </svg>
          </div>
        </div>
      </div>
      <span className="brand-loader-label text-gray-400">{label}</span>
    </div>
  );
}

interface FloatingEmojiItem {
  id: number;
  emoji: string;
  x: number;
}

function FloatingEmojis({ items }: { items: FloatingEmojiItem[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          className="animate-float-up absolute bottom-12 text-3xl"
          style={{ left: `${item.x}%` }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}

function EmojiBar({
  reactions,
  onReact,
}: {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
}) {
  const counts: Record<string, number> = {};
  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {REACTION_EMOJIS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          aria-label={label}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm active:scale-95"
        >
          <span className="text-base">{emoji}</span>
          {(counts[emoji] ?? 0) > 0 && (
            <span className="min-w-[1ch] text-xs font-medium text-gray-600">
              {counts[emoji]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ReactionTimeline({
  reactions,
  playerContainerRef,
  plyrRef,
}: {
  reactions: Reaction[];
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  plyrRef: React.RefObject<unknown>;
}) {
  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container || reactions.length === 0) return;

    const player = plyrRef.current as { duration: number } | null;
    if (!player || !player.duration || !Number.isFinite(player.duration))
      return;

    const duration = player.duration;
    const progressBar = container.querySelector(".plyr__progress");
    if (!progressBar) return;

    progressBar
      .querySelectorAll(".reaction-marker")
      .forEach((el) => el.remove());

    const segmentCount = 100;
    const buckets = new Array<number>(segmentCount).fill(0);
    const bucketEmojis: Map<number, Map<string, number>> = new Map();
    for (const r of reactions) {
      const idx = Math.min(
        Math.floor((r.timestamp / duration) * segmentCount),
        segmentCount - 1,
      );
      buckets[idx]++;
      if (!bucketEmojis.has(idx)) bucketEmojis.set(idx, new Map());
      const emojiMap = bucketEmojis.get(idx)!;
      emojiMap.set(r.emoji, (emojiMap.get(r.emoji) || 0) + 1);
    }

    const maxCount = Math.max(...buckets);

    for (let i = 0; i < segmentCount; i++) {
      if (buckets[i] === 0) continue;
      const dot = document.createElement("div");
      dot.className = "reaction-marker";
      const left = ((i + 0.5) / segmentCount) * 100;
      const opacity = 0.3 + 0.7 * (buckets[i] / maxCount);
      dot.style.cssText = `position:absolute;left:${left}%;top:50%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:var(--mustard);opacity:${opacity};z-index:3;cursor:pointer;`;

      const emojiMap = bucketEmojis.get(i)!;
      const sorted = [...emojiMap.entries()].sort((a, b) => b[1] - a[1]);
      const tooltipParts: string[] = [];
      for (const [emoji, count] of sorted) {
        tooltipParts.push(count > 1 ? `${emoji} ${count}` : emoji);
      }

      const tooltip = document.createElement("div");
      tooltip.className = "reaction-tooltip";
      tooltip.textContent = tooltipParts.join("  ");
      dot.appendChild(tooltip);

      progressBar.appendChild(dot);
    }

    return () => {
      progressBar
        .querySelectorAll(".reaction-marker")
        .forEach((el) => el.remove());
    };
  }, [reactions, playerContainerRef, plyrRef]);

  return null;
}


// ---------------------------------------------------------------------------
// Main viewer page
// ---------------------------------------------------------------------------

type Phase = "loading" | "not_found" | "error" | "player";

export default function VideoViewerPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmojiItem[]>(
    [],
  );
  const [playerReady, setPlayerReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const lastReactionTimeRef = useRef(0);
  const floatingIdRef = useRef(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<unknown>(null);
  const slugRef = useRef<{ projectId: string; code: string; provider: string } | null>(null);

  // -------------------------------------------------------------------------
  // 1. Parse URL and fetch video metadata
  // -------------------------------------------------------------------------
  useEffect(() => {
    const slug = parseSlug();
    if (!slug) {
      setPhase("not_found");
      return;
    }
    slugRef.current = slug;

    (USE_MOCK
      ? mock.fetchVideoMeta(slug.projectId, slug.code)
      : fetchVideoMeta(slug.projectId, slug.code)
    )
      .then((meta) => {
        setVideoMeta(meta);
        setPhase("player");
      })
      .catch((err: Error) => {
        if (err.message === "not_found") {
          setPhase("not_found");
        } else {
          setErrorMsg(
            "Unable to load video. The creator\u2019s server may be offline.",
          );
          setPhase("error");
        }
      });
  }, []);

  // -------------------------------------------------------------------------
  // 2. When entering player phase, load video blob and reactions
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== "player" || !slugRef.current) return;
    const { projectId, code } = slugRef.current;

    if (USE_MOCK) {
      mock.incrementView();
    } else {
      incrementView(projectId, code);
    }

    if (USE_MOCK) {
      mock.assembleVideoBlob().then((url) => setVideoSrc(url));
    } else if (videoMeta?.storage_url) {
      setVideoSrc(videoMeta.storage_url);
    } else {
      setErrorMsg("Failed to load video data.");
      setPhase("error");
    }

    (USE_MOCK ? mock.fetchReactions() : fetchReactionsEdge(projectId, code))
      .then((data) => setReactions(data))
      .catch(() => {});
  }, [phase, videoMeta]);

  // -------------------------------------------------------------------------
  // 3. Initialize Plyr when video src is ready
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!videoSrc || !videoRef.current) return;

    let destroyed = false;
    const videoEl = videoRef.current;

    // Fix WebM duration (browsers report Infinity/NaN) BEFORE initializing
    // Plyr so the player never displays a garbage time value.
    const fixDurationThenInitPlyr = () => {
      if (destroyed) return;

      const initPlyr = () => {
        if (destroyed || !videoRef.current) return;
        import("plyr").then((mod) => {
          if (destroyed || !videoRef.current) return;
          const PlyrConstructor = mod.default ?? mod;
          const player = new PlyrConstructor(videoRef.current, {
            controls: [
              "play-large",
              "play",
              "progress",
              "current-time",
              "duration",
              "mute",
              "volume",
              "settings",
              "pip",
              "fullscreen",
            ],
            settings: ["speed"],
            speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          });
          plyrRef.current = player;
          setPlayerReady(true);
        });
      };

      if (!Number.isFinite(videoEl.duration) || videoEl.duration === 0) {
        videoEl.currentTime = 1e101;
        videoEl.addEventListener("timeupdate", function onSeek() {
          videoEl.removeEventListener("timeupdate", onSeek);
          videoEl.currentTime = 0;
          initPlyr();
        });
      } else {
        initPlyr();
      }
    };

    if (videoEl.readyState >= 1) {
      fixDurationThenInitPlyr();
    } else {
      videoEl.addEventListener("loadedmetadata", fixDurationThenInitPlyr, {
        once: true,
      });
    }

    return () => {
      destroyed = true;
      if (plyrRef.current) {
        (plyrRef.current as { destroy: () => void }).destroy();
        plyrRef.current = null;
      }
      setPlayerReady(false);
    };
  }, [videoSrc]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleReaction = useCallback((emoji: string) => {
    const now = Date.now();
    if (now - lastReactionTimeRef.current < 500) return;
    lastReactionTimeRef.current = now;

    const player = plyrRef.current as { currentTime: number } | null;
    const timestamp = player?.currentTime ?? 0;

    const optimistic: Reaction = {
      id: `temp-${Date.now()}`,
      emoji,
      timestamp,
      created_at: new Date().toISOString(),
    };
    setReactions((prev) => [...prev, optimistic]);

    const id = floatingIdRef.current++;
    const x = 20 + Math.random() * 60;
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((f) => f.id !== id));
    }, 1600);

    if (slugRef.current) {
      const { projectId, code } = slugRef.current;
      if (USE_MOCK) {
        mock.addReaction();
      } else {
        addReactionEdge(projectId, code, emoji, timestamp);
      }
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const stripe = <div className="stripe-divider h-[5px]" />;

  if (phase === "loading") {
    return (
      <>
        {stripe}
        <main className="flex flex-1 items-center justify-center bg-white py-20">
          <BrandLoader />
        </main>
      </>
    );
  }

  if (phase === "not_found") {
    return (
      <>
        {stripe}
        <main className="flex flex-1 items-center justify-center bg-white py-20">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Recording not found
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              This recording may have been removed or the link is invalid.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (phase === "error") {
    return (
      <>
        {stripe}
        <main className="flex flex-1 items-center justify-center bg-white py-20">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <svg className="h-8 w-8 text-[var(--crimson)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-500">{errorMsg}</p>
          </div>
        </main>
      </>
    );
  }

  // Password gate — reserved for future use when is_protected is supported

  if (!videoMeta) return null;

  const captureLabel =
    CAPTURE_LABELS[videoMeta.capture_mode] ?? videoMeta.capture_mode;
  const captureIconPath =
    CAPTURE_ICONS[videoMeta.capture_mode] ?? CAPTURE_ICONS.screen;
  const duration = formatDuration(videoMeta.duration_ms);
  const reactionCount = reactions.length;

  return (
    <>
    {stripe}
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-screen-lg px-6 py-8">
        {/* Video player */}
        <div
          ref={playerContainerRef}
          className="relative overflow-hidden rounded-xl shadow-xl"
        >
          {videoSrc && (
            <video
              ref={videoRef}
              className={`block aspect-video w-full ${playerReady ? "" : "absolute inset-0 invisible"}`}
              src={videoSrc}
              playsInline
              preload="auto"
            />
          )}
          {!playerReady && (
            <div className="loom-loader flex aspect-video items-center justify-center">
              <BrandLoader />
            </div>
          )}
          <FloatingEmojis items={floatingEmojis} />
        </div>

        {/* Reaction timeline markers */}
        {playerReady && (
          <ReactionTimeline
            reactions={reactions}
            playerContainerRef={playerContainerRef}
            plyrRef={plyrRef}
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Title + Actions row (YouTube-style)                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-5">
          <h1 className="text-xl font-semibold leading-tight text-gray-900 md:text-2xl">
            {videoMeta.title}
          </h1>

          {/* Stats row + actions */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            {/* Left: stats */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {videoMeta.view_count.toLocaleString()} views
              </span>
              <span className="text-gray-300">&#183;</span>
              <span>{formatRelativeTime(videoMeta.created_at)}</span>
              {duration && (
                <>
                  <span className="text-gray-300">&#183;</span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {duration}
                  </span>
                </>
              )}
              {reactionCount > 0 && (
                <>
                  <span className="text-gray-300">&#183;</span>
                  <span>{reactionCount} reactions</span>
                </>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg bg-[var(--warp-indigo)] px-5 py-2.5 text-sm font-semibold text-[var(--cotton)] transition-all hover:shadow-[0_0_20px_rgba(217,43,43,0.2)] active:scale-[0.97]"
              >
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-[repeating-linear-gradient(90deg,var(--crimson)_0px,var(--crimson)_8px,var(--mustard)_8px,var(--mustard)_16px,var(--emerald)_16px,var(--emerald)_24px)] opacity-60 transition-opacity group-hover:opacity-100" />
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-4.632a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                {copied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Emoji reactions bar                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-700">Reactions</p>
          <EmojiBar reactions={reactions} onReact={handleReaction} />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Description card (Loom / YouTube style expandable)               */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-700">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={captureIconPath} />
              </svg>
              {captureLabel}
            </span>
            <span className="text-gray-300">&#183;</span>
            <span>{formatDate(videoMeta.created_at)}</span>
          </div>

          {videoMeta.description && (
            <div className="mt-3">
              <p
                className={`text-sm leading-relaxed text-gray-600 ${
                  !descExpanded ? "line-clamp-2" : ""
                }`}
              >
                {videoMeta.description}
              </p>
              {videoMeta.description.length > 120 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-1 text-sm font-medium text-gray-900 hover:underline"
                >
                  {descExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
    <footer className="border-t border-[var(--cotton)]/5 bg-[var(--warp-indigo)] px-6 py-8">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between text-sm text-[var(--cotton)]/40">
        <span className="font-mono text-xs text-[var(--cotton)]/25">
          OpenLoom — inspired by the thari (தறி), Tamil for loom. Design from{" "}
          <a
            href="https://en.wikipedia.org/wiki/Bhavani_Jamakkalam"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[var(--cotton)]/40"
          >
            Bhavani Jamakkalam
          </a>
        </span>
        <span className="font-mono text-xs text-[var(--cotton)]/25">git init ~{" "}
          <a
            href="https://x.com/anenth"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[var(--cotton)]/40"
          >
            @anenth
          </a>
        </span>
      </div>
    </footer>
    </>
  );
}
