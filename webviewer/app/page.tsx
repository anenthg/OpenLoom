"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HeroCTA from "./ChromeExtensionButton";
import Footer from "./Footer";

/* ------------------------------------------------------------------ */
/* Terminal autocomplete dropdown for backend providers                 */
/* ------------------------------------------------------------------ */

const INFRA_PROVIDERS = [
  { name: "Supabase", color: "var(--emerald)", status: "ready" },
  { name: "Convex", color: "var(--crimson)", status: "soon" },
  { name: "Firebase", color: "var(--mustard)", status: "soon" },
] as const;

function BackendInfraDropdown() {
  return (
    <span className="relative inline-block cursor-default group">
      <span className="border-b border-dotted border-[var(--mustard)]/50 transition-colors group-hover:border-[var(--cotton)]/50">
        backend infra
      </span>

      {/* Dropdown */}
      <span
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 translate-y-1"
      >
        <span className="block rounded-lg border border-[var(--cotton)]/10 bg-[var(--deep-black)] px-1 py-1 shadow-xl shadow-black/40 backdrop-blur-sm">
          {/* Terminal prompt hint */}
          {INFRA_PROVIDERS.map((p) => (
            <span
              key={p.name}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors hover:bg-[var(--cotton)]/[0.06]"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-mono text-xs text-[var(--cotton)]/80">
                {p.name}
              </span>
              <span
                className="ml-auto pl-4 font-mono text-[10px]"
                style={{
                  color:
                    p.status === "ready"
                      ? "var(--emerald)"
                      : "var(--cotton)",
                  opacity: p.status === "ready" ? 0.7 : 0.25,
                }}
              >
                {p.status}
              </span>
            </span>
          ))}
        </span>

        {/* Arrow pointing up */}
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-[var(--cotton)]/10 bg-[var(--deep-black)]" />
      </span>
    </span>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = el.dataset.delay ?? "0";
            setTimeout(() => {
              el.setAttribute("data-visible", "");
            }, Number(delay));
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.15 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    setPlaying(true);
  };

  return (
    <div className="relative cursor-pointer" onClick={!playing ? handlePlay : undefined}>
      <video
        ref={videoRef}
        className="w-full"
        controls={playing}
        preload="metadata"
        playsInline
        poster="/demo-poster.png"
        onEnded={() => setPlaying(false)}
      >
        <source src="/demo.mp4" type="video/mp4" />
      </video>
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--crimson)] shadow-lg shadow-[var(--crimson)]/30 transition-transform hover:scale-110">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  useScrollReveal();

  return (
    <main className="overflow-x-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* HERO — Jamakkalam stripes + glassmorphic terminal                */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6">
        {/* Jamakkalam striped background */}
        <div className="jamakkalam-stripes jamakkalam-stripes-animated pointer-events-none absolute inset-0" />
        {/* Subtle vignette overlay so stripes don't overwhelm */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(26,26,46,0.7) 100%)",
          }}
        />

        {/* Glassmorphic terminal window */}
        <div className="glass-terminal relative z-10 w-full max-w-2xl rounded-2xl p-8 md:p-12">
          {/* Terminal chrome */}
          <div className="mb-6 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[var(--crimson)]" />
            <span className="h-3 w-3 rounded-full bg-[var(--mustard)]" />
            <span className="h-3 w-3 rounded-full bg-[var(--emerald)]" />
            <span className="ml-3 font-mono text-xs text-[var(--cotton)]/40">
              ~/openloom
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-sans text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-[var(--cotton)]">
            Replace meetings
            <br />
            <span className="text-[var(--cotton)]/50">
              with videos you actually own.
            </span>
          </h1>

          <div className="mt-6 mb-6 font-mono text-sm leading-relaxed">
            <div className="text-[var(--mustard)]">
              <span className="text-[var(--emerald)]">$</span> Open-source alternative to Loom. Your screen recordings live on your
              own hosted <BackendInfraDropdown /> — no third-party servers, no vendor
              lock-in.
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <HeroCTA />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 z-10 flex flex-col items-center gap-2 text-[var(--cotton)]/30">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <svg
            width="16"
            height="24"
            fill="none"
            className="animate-bounce"
          >
            <path
              d="M8 4v12m0 0-4-4m4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </section>

      {/* DEMO VIDEO */}
      <section className="relative bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl" data-reveal>
          <div className="overflow-hidden rounded-2xl border border-[var(--cotton)]/8 bg-[var(--warp-indigo)] shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 border-b border-[var(--cotton)]/5 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[var(--crimson)]" />
              <span className="h-3 w-3 rounded-full bg-[var(--mustard)]" />
              <span className="h-3 w-3 rounded-full bg-[var(--emerald)]" />
              <span className="ml-3 font-mono text-xs text-[var(--cotton)]/30">
                OpenLoom Demo
              </span>
            </div>
            <DemoVideo />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* GET STARTED — interactive tutorial tabs                          */}
      {/* ---------------------------------------------------------------- */}
      <GetStartedSection />

      {/* ---------------------------------------------------------------- */}
      {/* FEATURES                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-16 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
          >
            Everything you need.{" "}
            <span className="text-[var(--cotton)]/40">Nothing you don&apos;t.</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "selfhost",
                title: "Self-hosted",
                desc: "Recordings live on your own backend \u2014 Supabase, and soon (Convex & Firebase). No third-party servers, no vendor lock-in.",
              },
              {
                icon: "screen",
                title: "Screen + Camera",
                desc: "Capture your entire screen, a window, or a tab. Drag your camera overlay anywhere.",
              },
              {
                icon: "link",
                title: "Instant Sharing",
                desc: "Get a shareable link the moment you stop recording. Optionally protect it with a password.",
              },
              {
                icon: "emoji",
                title: "Emoji Reactions",
                desc: "Viewers leave timestamped emoji reactions that appear directly on the video timeline.",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                data-reveal
                data-delay={i * 120}
                className="stripe-hover-border group rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] p-8 transition-all duration-300 hover:border-[var(--cotton)]/15 hover:bg-[var(--cotton)]/[0.06]"
              >
                <FeatureIcon type={f.icon} />
                <h3 className="mt-4 text-lg font-semibold text-[var(--cotton)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--cotton)]/50">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* HOW IT WORKS — animated data flow diagram                        */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2
            className="mb-16 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
          >
            How it works
          </h2>

          <div data-reveal>
            <DataFlowDiagram />
          </div>

          {/* Step descriptions below diagram */}
          <div className="mt-14 grid gap-8 md:grid-cols-3" data-reveal data-delay="200">
            <div className="text-center">
              <span className="font-mono text-sm font-bold text-[var(--crimson)]">01 — Record</span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cotton)]/50">
                Open the Chrome extension, choose your capture mode, and hit record. Your video uploads to your own backend.
              </p>
            </div>
            <div className="text-center">
              <span className="font-mono text-sm font-bold text-[var(--mustard)]">02 — Store</span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cotton)]/50">
                Your backend stores the video, metadata, and reactions. Everything lives on your own project.
              </p>
            </div>
            <div className="text-center">
              <span className="font-mono text-sm font-bold text-[var(--emerald)]">03 — Watch</span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cotton)]/50">
                Share a link. The web player fetches directly from your backend, via a public API. Hosted on GitHub Pages - no middleman.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4" data-reveal data-delay="400">
            <a
              href="https://openloom.live/v/cy1nZmVuZmljcml5amZjdWhkc2pidw/0tZYznu3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--emerald)]/20 px-5 py-2.5 text-sm font-medium text-[var(--emerald)] transition-all hover:border-[var(--emerald)]/40 hover:bg-[var(--emerald)]/10"
            >
              See it in action
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <Link
              href="/technology"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--cotton)]/10 px-5 py-2.5 text-sm font-medium text-[var(--cotton)]/60 transition-all hover:border-[var(--cotton)]/20 hover:text-[var(--cotton)]"
            >
              Deep dive into the architecture
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--mustard)]/20 px-5 py-2.5 text-sm font-medium text-[var(--mustard)]/70 transition-all hover:border-[var(--mustard)]/40 hover:bg-[var(--mustard)]/10 hover:text-[var(--mustard)]"
            >
              Cost estimates
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FINAL CTA                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-[var(--warp-indigo)] px-6 py-32">
        <div
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
          data-reveal
        >
          <h2 className="text-4xl font-bold tracking-tight text-[var(--cotton)] md:text-5xl">
            Built in the open
          </h2>
          <p className="mt-4 text-lg text-[var(--cotton)]/50">
            OpenLoom is fully open sourced. Found a bug? Want a feature? Open an
            issue. Want to contribute? PRs are always welcome.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/anenthg/OpenLoom"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[var(--crimson)] px-10 py-4 text-lg font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_40px_rgba(217,43,43,0.3)] active:scale-[0.97]"
            >
              Star on GitHub
            </a>
            <a
              href="https://github.com/anenthg/OpenLoom/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[var(--cotton)]/15 px-8 py-4 text-lg font-medium text-[var(--cotton)]/70 transition-all hover:border-[var(--cotton)]/30 hover:text-[var(--cotton)]"
            >
              Request a Feature
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Data flow diagram — animated SVG                                    */
/* ------------------------------------------------------------------ */

function DataFlowDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <svg
        viewBox="0 0 720 175"
        fill="none"
        className="w-full"
        aria-label="Data flow: Chrome Extension uploads to your backend, OpenLoom Player reads from it"
      >
        {/* ---- Node: Chrome Extension (center 75) ---- */}
        <rect x="0" y="5" width="150" height="100" rx="16" fill="#1A1A2E" stroke="#D92B2B" strokeWidth="2" />
        {/* Puzzle piece icon */}
        <path d="M63 30h6v-2a3 3 0 116 0v2h6a2 2 0 012 2v5h-2a3 3 0 100 6h2v5a2 2 0 01-2 2h-5v-2a3 3 0 10-6 0v2h-5a2 2 0 01-2-2V32a2 2 0 012-2z" stroke="#D92B2B" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        <circle cx="75" cy="39" r="2" fill="#D92B2B" className="animate-pulse" />
        <text x="75" y="89" textAnchor="middle" fill="#F5F5E8" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">
          Chrome Ext.
        </text>

        {/* ---- Node: Firebase (center 360) ---- */}
        <rect x="285" y="5" width="150" height="103" rx="16" fill="#1A1A2E" stroke="#F5C518" strokeWidth="2" />
        <ellipse cx="360" cy="31" rx="20" ry="8" stroke="#F5C518" strokeWidth="1.5" fill="none" />
        <path d="M340 31v20c0 4.4 8.95 8 20 8s20-3.6 20-8V31" stroke="#F5C518" strokeWidth="1.5" fill="none" />
        <path d="M340 41c0 4.4 8.95 8 20 8s20-3.6 20-8" stroke="#F5C518" strokeWidth="1.5" fill="none" />
        <text x="360" y="89" textAnchor="middle" fill="#F5F5E8" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">
          Your Backend
        </text>
        <text x="360" y="103" textAnchor="middle" fill="#0E9A57" fontSize="9" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.5">
          Supabase
        </text>

        {/* ---- Node: OpenLoom Player (center 645) ---- */}
        <rect x="570" y="5" width="150" height="103" rx="16" fill="#1A1A2E" stroke="#0E9A57" strokeWidth="2" />
        <rect x="615" y="23" width="60" height="38" rx="4" stroke="#0E9A57" strokeWidth="1.5" fill="none" />
        <line x1="615" y1="31" x2="675" y2="31" stroke="#0E9A57" strokeWidth="1" />
        <path d="M638 36 L652 44 L638 52Z" fill="#0E9A57" />
        <text x="645" y="89" textAnchor="middle" fill="#F5F5E8" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">
          OpenLoom Player
        </text>
        <text x="645" y="103" textAnchor="middle" fill="#0E9A57" fontSize="9" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.5">
          Free forever
        </text>

        {/* ---- Arrow: Desktop → Firebase (150 → 285) ---- */}
        <line x1="154" y1="55" x2="281" y2="55" stroke="#D92B2B" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
        <circle r="5" fill="#D92B2B" opacity="0.9">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M154,55 L281,55" />
        </circle>
        <circle r="5" fill="#D92B2B" opacity="0.5">
          <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.8s" path="M154,55 L281,55" />
        </circle>
        <circle r="5" fill="#D92B2B" opacity="0.3">
          <animateMotion dur="2.5s" repeatCount="indefinite" begin="1.6s" path="M154,55 L281,55" />
        </circle>
        <path d="M277 50 L285 55 L277 60" stroke="#D92B2B" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="218" y="45" textAnchor="middle" fill="#D92B2B" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.7">
          upload chunks
        </text>

        {/* ---- Arrow: Firebase → OpenLoom (435 → 570) ---- */}
        <line x1="439" y1="55" x2="566" y2="55" stroke="#0E9A57" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
        <circle r="5" fill="#0E9A57" opacity="0.9">
          <animateMotion dur="2s" repeatCount="indefinite" path="M439,55 L566,55" />
        </circle>
        <circle r="5" fill="#0E9A57" opacity="0.5">
          <animateMotion dur="2s" repeatCount="indefinite" begin="0.7s" path="M439,55 L566,55" />
        </circle>
        <circle r="5" fill="#0E9A57" opacity="0.3">
          <animateMotion dur="2s" repeatCount="indefinite" begin="1.3s" path="M439,55 L566,55" />
        </circle>
        <path d="M562 50 L570 55 L562 60" stroke="#0E9A57" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="503" y="45" textAnchor="middle" fill="#0E9A57" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.7">
          stream video
        </text>

        {/* ---- Dashed feedback line: OpenLoom → Firebase (reactions) ---- */}
        <line x1="566" y1="75" x2="439" y2="75" stroke="#F5C518" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <circle r="3" fill="#F5C518" opacity="0.7">
          <animateMotion dur="3s" repeatCount="indefinite" path="M566,75 L439,75" />
        </circle>
        <path d="M443 72 L435 75 L443 78" stroke="#F5C518" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        <text x="503" y="91" textAnchor="middle" fill="#F5C518" fontSize="9" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.5">
          reactions
        </text>

        {/* ---- Bottom label: "Your infrastructure" bracket ---- */}
        <line x1="0" y1="130" x2="435" y2="130" stroke="#F5F5E8" strokeWidth="1" opacity="0.15" />
        <line x1="0" y1="125" x2="0" y2="130" stroke="#F5F5E8" strokeWidth="1" opacity="0.15" />
        <line x1="435" y1="125" x2="435" y2="130" stroke="#F5F5E8" strokeWidth="1" opacity="0.15" />
        <text x="218" y="145" textAnchor="middle" fill="#F5F5E8" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.3">
          your infrastructure
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feature icons using brand colors                                    */
/* ------------------------------------------------------------------ */

function FeatureIcon({ type }: { type: string }) {
  const cls = "h-8 w-8";
  if (type === "screen") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="var(--crimson)" strokeWidth="1.5" />
        <path d="M8 21h8M12 17v4" stroke="var(--crimson)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "link") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="var(--mustard)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="var(--mustard)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "selfhost") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="8" rx="2" stroke="var(--cotton)" strokeWidth="1.5" strokeOpacity="0.7" />
        <rect x="2" y="14" width="20" height="8" rx="2" stroke="var(--cotton)" strokeWidth="1.5" strokeOpacity="0.7" />
        <circle cx="6" cy="6" r="1.5" fill="var(--emerald)" />
        <circle cx="6" cy="18" r="1.5" fill="var(--emerald)" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--emerald)" strokeWidth="1.5" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="var(--emerald)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="10" r="1" fill="var(--emerald)" />
      <circle cx="15" cy="10" r="1" fill="var(--emerald)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Get Started — interactive tabbed tutorial                           */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    id: "install",
    label: "Install Extension",
    color: "var(--crimson)",
    title: "Install & Configure",
    description:
      "Download the OpenLoom Chrome extension, load it into Chrome, and connect your Supabase backend. Paste your project URL and access token \u2014 you\u2019re ready to record.",
  },
  {
    id: "setup",
    label: "Setup",
    color: "var(--mustard)",
    title: "Configure Your Backend",
    description:
      "Create a Supabase project, generate an access token, and paste your project URL. The extension provisions everything automatically.",
  },
  {
    id: "share",
    label: "Share Recording",
    color: "var(--emerald)",
    title: "Record & Share",
    description:
      "Hit record, choose your capture mode (screen, window, or tab), stop when you\u2019re done. A shareable link is auto-copied to your clipboard \u2014 paste it anywhere.",
  },
];

function StepIcon({ id, active }: { id: string; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  if (id === "install") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4h2v2a2 2 0 104 0V4h2a2 2 0 012 2v3h-2a2 2 0 100 4h2v3a2 2 0 01-2 2h-3v-2a2 2 0 10-4 0v2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    );
  }
  if (id === "setup") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function ExtensionInstallVisual() {
  return (
    <svg viewBox="0 0 480 300" fill="none" className="w-full" aria-label="Chrome extension install steps">
      {/* Window chrome */}
      <rect x="0" y="0" width="480" height="300" rx="12" fill="#0A0A12" stroke="rgba(245,245,232,0.08)" strokeWidth="1" />
      <rect x="0" y="0" width="480" height="36" rx="12" fill="#141422" />
      <rect x="0" y="24" width="480" height="12" fill="#141422" />
      <circle cx="20" cy="18" r="5" fill="var(--crimson)" />
      <circle cx="36" cy="18" r="5" fill="var(--mustard)" />
      <circle cx="52" cy="18" r="5" fill="var(--emerald)" />
      <text x="240" y="22" textAnchor="middle" fill="rgba(245,245,232,0.4)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">chrome://extensions</text>

      {/* Step indicators */}
      <text x="100" y="68" textAnchor="middle" fill="var(--crimson)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" fontWeight="600">1. Download</text>
      <text x="240" y="68" textAnchor="middle" fill="var(--mustard)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" fontWeight="600">2. Load unpacked</text>
      <text x="380" y="68" textAnchor="middle" fill="var(--emerald)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" fontWeight="600">3. Connect</text>
      <line x1="140" y1="64" x2="200" y2="64" stroke="rgba(245,245,232,0.1)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="280" y1="64" x2="340" y2="64" stroke="rgba(245,245,232,0.1)" strokeWidth="1" strokeDasharray="4 3" />

      {/* Extension card */}
      <rect x="60" y="90" width="360" height="80" rx="10" fill="rgba(245,245,232,0.03)" stroke="rgba(245,245,232,0.1)" strokeWidth="1" />
      {/* Extension icon placeholder */}
      <rect x="76" y="106" width="48" height="48" rx="10" fill="rgba(217,43,43,0.15)" stroke="var(--crimson)" strokeWidth="1" />
      <path d="M92 118h4v2a3 3 0 106 0v-2h4a1 1 0 011 1v4h-2a3 3 0 100 6h2v4a1 1 0 01-1 1h-4v-2a3 3 0 10-6 0v2h-4a1 1 0 01-1-1v-14a1 1 0 011-1z" stroke="var(--crimson)" strokeWidth="1" fill="none" />
      <text x="140" y="126" fill="rgba(245,245,232,0.7)" fontSize="14" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">OpenLoom</text>
      <text x="140" y="143" fill="rgba(245,245,232,0.35)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">v0.1.0 · Screen recorder</text>
      {/* Toggle */}
      <rect x="362" y="118" width="40" height="22" rx="11" fill="var(--emerald)" />
      <circle cx="391" cy="129" r="8" fill="white" />

      {/* Supabase connection */}
      <text x="60" y="200" fill="rgba(245,245,232,0.5)" fontSize="11" fontFamily="var(--font-space-grotesk), sans-serif">Supabase Project URL</text>
      <rect x="60" y="208" width="360" height="32" rx="8" fill="rgba(245,245,232,0.04)" stroke="rgba(245,245,232,0.1)" strokeWidth="1" />
      <text x="76" y="229" fill="rgba(245,245,232,0.25)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">https://your-project.supabase.co</text>

      {/* Connect button */}
      <rect x="160" y="254" width="160" height="36" rx="10" fill="var(--crimson)" />
      <text x="240" y="277" textAnchor="middle" fill="white" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">Connect</text>
    </svg>
  );
}

const SUPABASE_CHECKLIST = [
  { label: "Create a Supabase project", done: true },
  { label: "Generate an Access Token", done: true },
  { label: "Paste Project URL + Access Token", done: true },
];

function SetupVisual() {
  const items = SUPABASE_CHECKLIST;
  const accentColor = "var(--emerald)";

  return (
    <div>
      <svg viewBox="0 0 480 250" fill="none" className="w-full" aria-label="Supabase setup checklist">
        {/* Window chrome */}
        <rect x="0" y="0" width="480" height="250" rx="12" fill="#0A0A12" stroke="rgba(245,245,232,0.08)" strokeWidth="1" />
        <rect x="0" y="0" width="480" height="36" rx="12" fill="#141422" />
        <rect x="0" y="24" width="480" height="12" fill="#141422" />
        <circle cx="20" cy="18" r="5" fill="var(--crimson)" />
        <circle cx="36" cy="18" r="5" fill="var(--mustard)" />
        <circle cx="52" cy="18" r="5" fill="var(--emerald)" />
        <text x="240" y="22" textAnchor="middle" fill="rgba(245,245,232,0.4)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">
          Supabase Dashboard
        </text>

        {/* Checklist items */}
        {items.map((item, i) => {
          const y = 56 + i * 44;
          return (
            <g key={item.label}>
              <rect x="40" y={y} width="400" height="36" rx="8" fill="rgba(245,245,232,0.03)" stroke="rgba(245,245,232,0.06)" strokeWidth="1" />
              <circle cx="64" cy={y + 18} r="10" fill={accentColor} opacity="0.15" />
              <path d={`M58 ${y + 18} l4 4 8-8`} stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <text x="88" y={y + 22} fill="rgba(245,245,232,0.7)" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif">{item.label}</text>
              <text x="400" y={y + 22} textAnchor="end" fill={accentColor} fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.6">done</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ShareRecordingVisual() {
  return (
    <svg viewBox="0 0 480 300" fill="none" className="w-full" aria-label="Share recording email mockup">
      {/* Window chrome */}
      <rect x="0" y="0" width="480" height="300" rx="12" fill="#0A0A12" stroke="rgba(245,245,232,0.08)" strokeWidth="1" />
      <rect x="0" y="0" width="480" height="36" rx="12" fill="#141422" />
      <rect x="0" y="24" width="480" height="12" fill="#141422" />
      <circle cx="20" cy="18" r="5" fill="var(--crimson)" />
      <circle cx="36" cy="18" r="5" fill="var(--mustard)" />
      <circle cx="52" cy="18" r="5" fill="var(--emerald)" />
      <text x="240" y="22" textAnchor="middle" fill="rgba(245,245,232,0.4)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">New Message</text>

      {/* Email fields */}
      <text x="40" y="62" fill="rgba(245,245,232,0.35)" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif">To:</text>
      <text x="72" y="62" fill="rgba(245,245,232,0.6)" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif">team@company.com</text>
      <line x1="40" y1="72" x2="440" y2="72" stroke="rgba(245,245,232,0.06)" strokeWidth="1" />

      <text x="40" y="92" fill="rgba(245,245,232,0.35)" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif">Subject:</text>
      <text x="96" y="92" fill="rgba(245,245,232,0.6)" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif">Quick walkthrough of the OpenLoom website</text>
      <line x1="40" y1="102" x2="440" y2="102" stroke="rgba(245,245,232,0.06)" strokeWidth="1" />

      {/* Body text */}
      <text x="40" y="128" fill="rgba(245,245,232,0.45)" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif">Hey team, here&apos;s a quick recording:</text>

      {/* Link preview card */}
      <rect x="40" y="142" width="400" height="100" rx="10" fill="rgba(245,245,232,0.03)" stroke="rgba(245,245,232,0.08)" strokeWidth="1" />
      {/* Thumbnail area */}
      <rect x="52" y="154" width="120" height="76" rx="6" fill="rgba(0,0,0,0.3)" />
      <path d="M100 182 L118 192 L100 202Z" fill="var(--emerald)" opacity="0.6" />
      {/* Link details */}
      <a href="https://openloom.live/v/cy1zb21teXFqa3F1ZWVwd3p4ZGJqcw/QAGRwxX8" target="_blank" rel="noopener noreferrer" style={{ cursor: 'pointer' }}>
        <text x="188" y="175" fill="var(--emerald)" fontSize="12" fontFamily="var(--font-jetbrains-mono), monospace" textDecoration="underline">openloom.live/v/jfjf...</text>
        <text x="188" y="195" fill="rgba(245,245,232,0.35)" fontSize="11" fontFamily="var(--font-space-grotesk), sans-serif">Website walkthrough — 2:34</text>
        <text x="188" y="215" fill="rgba(245,245,232,0.25)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace">Recorded just now</text>
      </a>
      {/* Send button */}
      <rect x="360" y="256" width="80" height="34" rx="8" fill="var(--emerald)" />
      <text x="400" y="278" textAnchor="middle" fill="white" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">Send</text>
    </svg>
  );
}

const TAB_VISUALS = [ExtensionInstallVisual, SetupVisual, ShareRecordingVisual];

function GetStartedSection() {
  const [activeTab, setActiveTab] = useState(0);
  const step = STEPS[activeTab];
  const Visual = TAB_VISUALS[activeTab];

  return (
    <section id="get-started" className="bg-[var(--warp-indigo)] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2
          className="mb-16 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
          data-reveal
        >
          Get started{" "}
          <span className="text-[var(--cotton)]/40">in three steps.</span>
        </h2>

        <div className="flex flex-col gap-8 md:flex-row" data-reveal data-delay="150">
          {/* Sidebar */}
          <div className="flex flex-row gap-2 md:w-64 md:flex-col md:gap-0">
            {STEPS.map((s, i) => {
              const isActive = i === activeTab;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(i)}
                  className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition-all md:flex-none md:rounded-none md:border-b md:border-[var(--cotton)]/5 ${
                    isActive
                      ? "bg-[var(--cotton)]/[0.06] md:bg-transparent"
                      : "opacity-50 hover:opacity-75"
                  }`}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
                    style={{
                      backgroundColor: isActive ? s.color : "rgba(245,245,232,0.06)",
                      color: isActive ? "#fff" : "rgba(245,245,232,0.4)",
                    }}
                  >
                    <StepIcon id={s.id} active={isActive} />
                  </span>
                  <span
                    className={`hidden text-sm md:inline ${
                      isActive
                        ? "font-semibold text-[var(--cotton)]"
                        : "text-[var(--cotton)]/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content panel */}
          <div className="min-h-[420px] flex-1">
            <div
              key={activeTab}
              className="animate-[fade-in-up_0.4s_ease-out]"
            >
              <h3
                className="text-2xl font-bold text-[var(--cotton)]"
                style={{ color: step.color }}
              >
                {step.title}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--cotton)]/50">
                {step.description}
              </p>

              {/* Visual mockup */}
              <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--cotton)]/8 shadow-2xl shadow-black/30">
                <Visual />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

