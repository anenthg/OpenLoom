"use client";

import { useEffect, useState } from "react";
import HeroCTA from "../ChromeExtensionButton";

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

export default function TechnologyPage() {
  useScrollReveal();

  return (
    <main className="overflow-x-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* HERO                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative flex min-h-[55dvh] flex-col items-center justify-center px-6">
        <div className="jamakkalam-stripes jamakkalam-stripes-animated pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(26,26,46,0.7) 100%)",
          }}
        />

        <div className="glass-terminal relative z-10 w-full max-w-3xl rounded-2xl p-8 md:p-12">
          <div className="mb-6 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[var(--crimson)]" />
            <span className="h-3 w-3 rounded-full bg-[var(--mustard)]" />
            <span className="h-3 w-3 rounded-full bg-[var(--emerald)]" />
            <span className="ml-3 font-mono text-xs text-[var(--cotton)]/40">
              ~/openloom/technology
            </span>
          </div>

          <h1 className="font-sans text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-[var(--cotton)]">
            How OpenLoom Works
            <br />
            <span className="text-[var(--cotton)]/50">Under the Hood</span>
          </h1>

          <div className="mt-6 font-mono text-sm leading-relaxed">
            <div className="text-[var(--mustard)]">
              <span className="text-[var(--emerald)]">$</span> A complete
              technical breakdown of the end-to-end workflow. From recording on
              your desktop to playback in any browser — with your choice of
              Supabase, Convex, or Firebase as your backend.
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* ARCHITECTURE DIAGRAM                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-4 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
          >
            The Architecture
          </h2>
          <p
            className="mx-auto mb-16 max-w-2xl text-center text-lg text-[var(--cotton)]/50"
            data-reveal
            data-delay="100"
          >
            Three independent layers. You own the first two. The third is
            replaceable.
          </p>

          <div className="overflow-x-auto" data-reveal data-delay="200">
            <div className="min-w-[700px]">
              <ArchitectureDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* YOUR MACHINE, YOUR RULES                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-3" data-reveal>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crimson)]/10 text-[var(--crimson)]">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-mono text-sm font-bold text-[var(--crimson)]">
              01 — YOUR MACHINE
            </span>
          </div>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
            data-delay="100"
          >
            Your Machine, Your Rules
          </h2>

          <div
            className="space-y-6 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="200"
          >
            <p>
              When you download OpenLoom Desktop, you get a native macOS
              application that runs entirely on your hardware. During setup,
              you choose one of three backend providers —{" "}
              <strong className="text-[var(--emerald)]">Supabase</strong>,{" "}
              <strong className="text-[var(--crimson)]">Convex</strong>, or{" "}
              <strong className="text-[var(--mustard)]">Firebase</strong> — and
              connect it to your own project. The app stores your{" "}
              <strong className="text-[var(--cotton)]">
                backend credentials
              </strong>{" "}
              in your application&apos;s sandboxed container. These credentials
              never leave your computer.
            </p>

            <p>
              Nothing is uploaded until you explicitly choose to share a
              recording. When you do, the desktop app encodes the video,
              and uploads it directly to your backend&apos;s file storage —
              authenticated by the credentials that only your machine has.
            </p>
          </div>

          {/* What lives on your machine */}
          <div
            className="mt-10 overflow-hidden rounded-xl border border-[var(--crimson)]/15 bg-black/20"
            data-reveal
            data-delay="300"
          >
            <div className="flex items-center gap-2 border-b border-[var(--cotton)]/5 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--crimson)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--mustard)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--emerald)]" />
              <span className="ml-3 font-mono text-xs text-[var(--cotton)]/30">
                ~/Library/Application Support/OpenLoom/
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-[var(--cotton)]/60">
              <code>{`├── config.json                  # Provider type, project ID & settings
├── credentials/
│   ├── service-account.json     # Firebase SA key (if Firebase)
│   ├── convex-deploy-key        # Convex deploy key (if Convex)
│   └── supabase-tokens          # Supabase access token (if Supabase)
│                                # ⚠ NEVER uploaded. NEVER shared.
├── preferences.json             # Recording defaults (resolution, fps, etc.)
└── temp/                        # Raw recordings before encoding
    └── recording-2024-01-15/    # Cleaned up after upload
        ├── raw-capture.mov
        └── encoded.webm`}</code>
            </pre>
          </div>

          <div
            className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--crimson)]/10 bg-[var(--crimson)]/[0.04] p-4"
            data-reveal
            data-delay="400"
          >
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--crimson)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
              />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm text-[var(--cotton)]/60">
              <strong className="text-[var(--cotton)]">
                Your backend credentials are the crown jewel.
              </strong>{" "}
              They grant write access to your backend project. Because they
              live only on your machine, no one else — not even OpenLoom&apos;s
              infrastructure — can modify your recordings, delete your data, or
              access your storage directly.
            </p>
          </div>
        </div>
      </section>

      <div className="stripe-divider mx-auto max-w-xs opacity-20" />

      {/* ---------------------------------------------------------------- */}
      {/* INSIDE YOUR BACKEND                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-3" data-reveal>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mustard)]/10 text-[var(--mustard)]">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              </svg>
            </span>
            <span className="font-mono text-sm font-bold text-[var(--mustard)]">
              02 — YOUR BACKEND
            </span>
          </div>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
            data-delay="100"
          >
            Inside Your Backend Project
          </h2>

          <p
            className="mb-12 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="200"
          >
            OpenLoom supports three backend providers. Each stores the same
            data — video files, metadata, and reactions — but uses the
            provider&apos;s native services. Here&apos;s how each one works.
          </p>

          <BackendTabs />
        </div>
      </section>

      <div className="stripe-divider mx-auto max-w-xs opacity-20" />

      {/* ---------------------------------------------------------------- */}
      {/* PUBLIC API SURFACE                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-3" data-reveal>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--emerald)]/10 text-[var(--emerald)]">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <span className="font-mono text-sm font-bold text-[var(--emerald)]">
              03 — PUBLIC API
            </span>
          </div>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
            data-delay="100"
          >
            The Public API Surface
          </h2>

          <p
            className="mb-6 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="200"
          >
            Each backend exposes a public API through its serverless function
            layer. These are the only way anyone — including the official
            viewer — can interact with your recordings. No backdoors, no admin
            panels, no hidden routes.
          </p>

          {/* Base URL patterns for each provider */}
          <div
            className="mb-8 overflow-hidden rounded-xl border border-[var(--emerald)]/15 bg-black/20"
            data-reveal
            data-delay="300"
          >
            <div className="border-b border-[var(--cotton)]/5 px-5 py-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--emerald)]/60">
                Base URL Patterns
              </span>
            </div>
            <div className="space-y-3 px-5 py-4 font-mono text-sm">
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 rounded bg-[var(--emerald)]/10 px-2 py-0.5 text-center text-[10px] font-bold text-[var(--emerald)]">
                  Supabase
                </span>
                <div>
                  <span className="text-[var(--cotton)]/40">https://</span>
                  <span className="text-[var(--emerald)]">
                    {"{project-ref}"}
                  </span>
                  <span className="text-[var(--cotton)]/60">
                    .supabase.co/functions/v1/
                  </span>
                  <span className="text-[var(--emerald)]">openloom</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 rounded bg-[var(--crimson)]/10 px-2 py-0.5 text-center text-[10px] font-bold text-[var(--crimson)]">
                  Convex
                </span>
                <div>
                  <span className="text-[var(--cotton)]/40">https://</span>
                  <span className="text-[var(--crimson)]">
                    {"{deployment}"}
                  </span>
                  <span className="text-[var(--cotton)]/60">
                    .convex.site
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 rounded bg-[var(--mustard)]/10 px-2 py-0.5 text-center text-[10px] font-bold text-[var(--mustard)]">
                  Firebase
                </span>
                <div>
                  <span className="text-[var(--cotton)]/40">https://</span>
                  <span className="text-[var(--cotton)]/60">us-central1-</span>
                  <span className="text-[var(--mustard)]">
                    {"{project-id}"}
                  </span>
                  <span className="text-[var(--cotton)]/60">
                    .cloudfunctions.net/
                  </span>
                  <span className="text-[var(--mustard)]">openloom</span>
                </div>
              </div>
            </div>
          </div>

          {/* Endpoints table */}
          <div
            className="overflow-hidden rounded-xl border border-[var(--cotton)]/8"
            data-reveal
            data-delay="400"
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03]">
                  <th className="px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--cotton)]/40">
                    Method
                  </th>
                  <th className="px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--cotton)]/40">
                    Endpoint
                  </th>
                  <th className="px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--cotton)]/40">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    method: "GET",
                    endpoint: "/v?code={code}",
                    alt: "/v/{code}",
                    purpose:
                      "Fetch video metadata — title, duration, view count, capture mode",
                    color: "var(--emerald)",
                  },
                  {
                    method: "POST",
                    endpoint: "/view",
                    alt: "/v/{code}/view",
                    purpose:
                      "Increment the view counter. Fire-and-forget, no response body",
                    color: "var(--mustard)",
                  },
                  {
                    method: "GET",
                    endpoint: "/reactions?code={code}",
                    alt: "/v/{code}/reactions",
                    purpose:
                      "Fetch all timestamped emoji reactions for the video",
                    color: "var(--emerald)",
                  },
                  {
                    method: "POST",
                    endpoint: "/reactions/add",
                    alt: "/v/{code}/reactions",
                    purpose:
                      "Add a new emoji reaction at a specific timestamp",
                    color: "var(--mustard)",
                  },
                ].map((ep, i) => (
                  <tr
                    key={ep.endpoint + ep.method}
                    className={
                      i < 3 ? "border-b border-[var(--cotton)]/5" : ""
                    }
                  >
                    <td className="px-5 py-3">
                      <span
                        className="rounded-md px-2 py-0.5 font-mono text-xs font-bold"
                        style={{
                          color: ep.color,
                          backgroundColor: `color-mix(in srgb, ${ep.color} 12%, transparent)`,
                        }}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--cotton)]/70">
                      <span>{ep.endpoint}</span>
                      <span className="ml-2 text-[var(--cotton)]/30">
                        (Firebase: {ep.alt})
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--cotton)]/50">
                      {ep.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--emerald)]/10 bg-[var(--emerald)]/[0.04] p-4"
            data-reveal
            data-delay="500"
          >
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--emerald)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-[var(--cotton)]/60">
              Supabase and Convex use query-parameter style URLs{" "}
              (<code className="font-mono text-[var(--emerald)]">/v?code=xxx</code>).
              Firebase uses path-based URLs{" "}
              (<code className="font-mono text-[var(--mustard)]">/v/{"{code}"}</code>).
              The web viewer automatically selects the correct pattern based on
              the provider prefix in the share link.
            </p>
          </div>
        </div>
      </section>

      <div className="stripe-divider mx-auto max-w-xs opacity-20" />

      {/* ---------------------------------------------------------------- */}
      {/* THE VIEWER — A DUMB CLIENT                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-3" data-reveal>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--emerald)]/10 text-[var(--emerald)]">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="2" y1="9" x2="22" y2="9" />
                <path d="M9 13l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-mono text-sm font-bold text-[var(--emerald)]">
              04 — THE VIEWER
            </span>
          </div>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
            data-delay="100"
          >
            The Viewer is a Dumb Client
          </h2>

          <p
            className="mb-8 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="200"
          >
            The OpenLoom web player at{" "}
            <code className="font-mono text-[var(--emerald)]">openloom.live</code>{" "}
            is a completely stateless single-page application. It carries{" "}
            <strong className="text-[var(--cotton)]">zero secrets</strong> and
            has <strong className="text-[var(--cotton)]">zero special
            access</strong>. It&apos;s a static Next.js app exported and deployed
            on GitHub Pages — nothing more.
          </p>

          {/* What the viewer doesn't have */}
          <div
            className="mb-10 grid gap-4 sm:grid-cols-2"
            data-reveal
            data-delay="300"
          >
            {[
              {
                label: "Zero backend credentials",
                desc: "Can't read databases or storage directly",
              },
              {
                label: "Zero server-side logic",
                desc: "Static HTML/JS/CSS on GitHub Pages",
              },
              {
                label: "Zero persistent state",
                desc: "No cookies, sessions, or user accounts",
              },
              {
                label: "Zero write access",
                desc: "Only calls serverless functions over HTTPS",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-[var(--cotton)]/5 bg-[var(--cotton)]/[0.02] p-4"
              >
                <svg
                  className="mt-1 h-4 w-4 shrink-0 text-[var(--crimson)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M18 6 6 18M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[var(--cotton)]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--cotton)]/40">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* The playback flow */}
          <h3
            className="mb-6 text-xl font-semibold text-[var(--cotton)]"
            data-reveal
            data-delay="400"
          >
            What happens when someone opens a link
          </h3>

          <div
            className="overflow-hidden rounded-xl border border-[var(--cotton)]/8 bg-black/20"
            data-reveal
            data-delay="500"
          >
            <div className="flex items-center gap-2 border-b border-[var(--cotton)]/5 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--crimson)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--mustard)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--emerald)]" />
              <span className="ml-3 font-mono text-xs text-[var(--cotton)]/30">
                playback sequence
              </span>
            </div>
            <div className="space-y-0 p-5 font-mono text-sm leading-relaxed">
              <PlaybackStep
                n={1}
                color="var(--cotton)"
                title="Parse the URL"
                code="https://openloom.live/v/{encoded-id}/{video-code}"
                desc="Decode the base64url ID to extract the provider prefix (s-, c-, or f-) and project identifier."
              />
              <PlaybackStep
                n={2}
                color="var(--mustard)"
                title="Construct the API base"
                code="s → supabase.co/functions | c → convex.site | f → cloudfunctions.net"
                desc="The provider prefix determines which URL pattern to use."
              />
              <PlaybackStep
                n={3}
                color="var(--emerald)"
                title="Fetch metadata"
                code="GET /v?code={code} → { title, duration_ms, view_count, storage_url, ... }"
                desc="Retrieve the video's metadata from the serverless function."
              />
              <PlaybackStep
                n={4}
                color="var(--crimson)"
                title="Load the video"
                code="fetch(storage_url) → <video src={url} />"
                desc="The storage URL points directly to the video file. Supabase and Firebase use permanent public URLs. Convex uses a redirect proxy."
              />
              <PlaybackStep
                n={5}
                color="var(--emerald)"
                title="Play"
                code="<video /> → Plyr initializes → reactions load in parallel"
                desc="Video plays. Reactions load in parallel. View count increments."
                last
              />
            </div>
          </div>

          <p
            className="mt-6 text-sm leading-relaxed text-[var(--cotton)]/50"
            data-reveal
            data-delay="600"
          >
            The viewer does not know your admin credentials, your database
            schema, or your storage bucket name. It only knows the public
            serverless function URL — the same URL available to anyone with
            the link.
          </p>
        </div>
      </section>

      <div className="stripe-divider mx-auto max-w-xs opacity-20" />

      {/* ---------------------------------------------------------------- */}
      {/* GITHUB PAGES DEPLOYMENT                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-3" data-reveal>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cotton)]/5 text-[var(--cotton)]/70">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-mono text-sm font-bold text-[var(--cotton)]/60">
              05 — GITHUB PAGES
            </span>
          </div>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
            data-delay="100"
          >
            Deployed on GitHub Pages
          </h2>

          <p
            className="mb-6 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="200"
          >
            The official web player at{" "}
            <code className="font-mono text-[var(--emerald)]">openloom.live</code>{" "}
            is deployed as a{" "}
            <strong className="text-[var(--cotton)]">
              static Next.js export on GitHub Pages
            </strong>
            . No server, no runtime, no build service — just static
            HTML/CSS/JS served from GitHub&apos;s CDN. This gives the viewer
            maximum transparency and zero operational complexity.
          </p>

          {/* How GitHub Pages deployment works */}
          <div
            className="mb-8 overflow-hidden rounded-xl border border-[var(--cotton)]/8 bg-black/20"
            data-reveal
            data-delay="300"
          >
            <div className="flex items-center gap-2 border-b border-[var(--cotton)]/5 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--crimson)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--mustard)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--emerald)]" />
              <span className="ml-3 font-mono text-xs text-[var(--cotton)]/30">
                GitHub Pages deployment pipeline
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
              <code>
                <span className="text-[var(--cotton)]/40"># The webviewer is a Next.js app with static export</span>
                {"\n"}
                <span className="text-[var(--cotton)]/40"># next.config.ts → output: &quot;export&quot;</span>
                {"\n\n"}
                <span className="text-[var(--cotton)]/40"># GitHub Actions workflow triggers on push to main:</span>
                {"\n\n"}
                <span className="text-[var(--emerald)]">1.</span>
                <span className="text-[var(--cotton)]/70">
                  {" "}
                  Checkout repo → Install dependencies
                </span>
                {"\n"}
                <span className="text-[var(--emerald)]">2.</span>
                <span className="text-[var(--cotton)]/70">
                  {" "}
                  next build → generates static /out directory
                </span>
                {"\n"}
                <span className="text-[var(--emerald)]">3.</span>
                <span className="text-[var(--cotton)]/70">
                  {" "}
                  Upload /out as GitHub Pages artifact
                </span>
                {"\n"}
                <span className="text-[var(--emerald)]">4.</span>
                <span className="text-[var(--cotton)]/70">
                  {" "}
                  Deploy to GitHub Pages environment
                </span>
                {"\n\n"}
                <span className="text-[var(--cotton)]/40"># Result: static files served at openloom.live</span>
                {"\n"}
                <span className="text-[var(--cotton)]/40"># Custom domain configured via CNAME record</span>
                {"\n"}
                <span className="text-[var(--cotton)]/40"># HTTPS provided automatically by GitHub</span>
              </code>
            </pre>
          </div>

          {/* Why GitHub Pages */}
          <div
            className="mb-8 grid gap-4 sm:grid-cols-2"
            data-reveal
            data-delay="400"
          >
            {[
              {
                title: "Fully auditable",
                desc: "Every deployment is a git commit. The source code, build output, and deployed version are all public and verifiable.",
              },
              {
                title: "Zero cost",
                desc: "GitHub Pages is free for public repositories. No hosting bills, no usage-based pricing, no surprise charges.",
              },
              {
                title: "No build server",
                desc: "GitHub Actions runs the build. No Netlify, Vercel, or Cloudflare account needed. One less vendor dependency.",
              },
              {
                title: "Global CDN",
                desc: "GitHub Pages uses Fastly's CDN. Static files are served from edge locations worldwide with automatic HTTPS.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-[var(--cotton)]/5 bg-[var(--cotton)]/[0.02] p-4"
              >
                <svg
                  className="mt-1 h-4 w-4 shrink-0 text-[var(--emerald)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[var(--cotton)]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--cotton)]/40">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <h3
            className="mb-6 text-xl font-semibold text-[var(--cotton)]"
            data-reveal
            data-delay="450"
          >
            Deploy Your Own Viewer
          </h3>

          <p
            className="mb-6 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="460"
          >
            Because the viewer is just a static web app with{" "}
            <strong className="text-[var(--cotton)]">
              no built-in secrets
            </strong>
            , you can fork and deploy your own instance. This gives you full
            control and eliminates any dependency on{" "}
            <code className="font-mono text-[var(--emerald)]">openloom.live</code>.
          </p>

          <div
            className="mb-8 overflow-hidden rounded-xl border border-[var(--cotton)]/8 bg-black/20"
            data-reveal
            data-delay="500"
          >
            <div className="flex items-center gap-2 border-b border-[var(--cotton)]/5 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--crimson)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--mustard)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--emerald)]" />
              <span className="ml-3 font-mono text-xs text-[var(--cotton)]/30">
                deploy your own viewer on GitHub Pages
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
              <code>
                <span className="text-[var(--cotton)]/40"># 1. Fork the repository on GitHub</span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70">
                  {" "}
                  git clone https://github.com/your-fork/OpenLoom.git
                </span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70"> cd OpenLoom/webviewer</span>
                {"\n\n"}
                <span className="text-[var(--cotton)]/40"># 2. Enable GitHub Pages in repo Settings → Pages</span>
                {"\n"}
                <span className="text-[var(--cotton)]/40">#    Source: &quot;GitHub Actions&quot;</span>
                {"\n\n"}
                <span className="text-[var(--cotton)]/40"># 3. Push to main — GitHub Actions builds &amp; deploys automatically</span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70"> git push origin main</span>
                {"\n\n"}
                <span className="text-[var(--cotton)]/40"># 4. (Optional) Add a custom domain in Settings → Pages</span>
                {"\n"}
                <span className="text-[var(--cotton)]/40">#    watch.yourcompany.com → CNAME to your-fork.github.io</span>
              </code>
            </pre>
          </div>

          {/* Benefits grid */}
          <div
            className="grid gap-4 sm:grid-cols-2"
            data-reveal
            data-delay="550"
          >
            {[
              {
                title: "Your own domain",
                desc: "watch.yourcompany.com instead of openloom.live",
              },
              {
                title: "Custom branding",
                desc: "Modify the CSS, swap colors, add your logo",
              },
              {
                title: "Full UI control",
                desc: "Change the player, add features, remove what you don't need",
              },
              {
                title: "Zero downtime risk",
                desc: "Even if openloom.live goes offline, your recordings are accessible",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-[var(--cotton)]/5 bg-[var(--cotton)]/[0.02] p-4"
              >
                <svg
                  className="mt-1 h-4 w-4 shrink-0 text-[var(--emerald)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[var(--cotton)]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--cotton)]/40">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-8 flex items-start gap-3 rounded-xl border border-[var(--mustard)]/10 bg-[var(--mustard)]/[0.04] p-4"
            data-reveal
            data-delay="600"
          >
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mustard)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-[var(--cotton)]/60">
              <strong className="text-[var(--cotton)]">
                This is the key insight:
              </strong>{" "}
              your data lives on your backend. Your viewer can live anywhere.
              The two are connected only by public HTTPS endpoints. Swap the
              viewer, swap the backend — nothing about the other layer changes.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FINAL CTA                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-[var(--warp-indigo)] px-6 py-16">
        <div
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
          data-reveal
        >
          <h2 className="text-4xl font-bold tracking-tight text-[var(--cotton)] md:text-5xl">
            Own your recordings
          </h2>
          <p className="mt-4 text-lg text-[var(--cotton)]/50">
            No middleman. No vendor lock-in. Your backend, your machine, your
            rules.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <HeroCTA />
            <a
              href="https://github.com/anenthg/OpenLoom"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[var(--cotton)]/15 px-8 py-4 text-lg font-medium text-[var(--cotton)]/70 transition-all hover:border-[var(--cotton)]/30 hover:text-[var(--cotton)]"
            >
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FOOTER                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[var(--cotton)]/5 bg-[var(--warp-indigo)] px-6 py-8">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between text-sm text-[var(--cotton)]/40">
          <span className="font-mono text-xs text-[var(--cotton)]/25">
            OpenLoom — inspired by the thari (&#2980;&#2993;&#3007;), Tamil for loom. Design from{" "}
            <a
              href="https://en.wikipedia.org/wiki/Bhavani_Jamakkalam"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--cotton)]/40"
            >
              Bhavani Jamakkalam
            </a>
          </span>
          <span className="font-mono text-xs text-[var(--cotton)]/25">
            git init ~{" "}
            <a
              href="https://x.com/anenth"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--cotton)]/40"
            >
              @anenth
            </a>
            {" · "}
            <a
              href="/privacy"
              className="transition-colors hover:text-[var(--cotton)]/40"
            >
              Privacy
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Backend tabs component                                               */
/* ------------------------------------------------------------------ */

const BACKEND_TABS = [
  {
    id: "supabase" as const,
    label: "Supabase",
    color: "var(--emerald)",
  },
  {
    id: "convex" as const,
    label: "Convex",
    color: "var(--crimson)",
  },
  {
    id: "firebase" as const,
    label: "Firebase",
    color: "var(--mustard)",
  },
];

function BackendTabs() {
  const [active, setActive] = useState<"supabase" | "convex" | "firebase">("supabase");

  return (
    <div>
      {/* Tab buttons */}
      <div className="mb-6 flex gap-2" data-reveal data-delay="250">
        {BACKEND_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className="rounded-lg px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: active === tab.id ? tab.color : "rgba(245,245,232,0.3)",
              backgroundColor:
                active === tab.id
                  ? `color-mix(in srgb, ${tab.color} 10%, transparent)`
                  : "transparent",
              borderWidth: 1,
              borderColor:
                active === tab.id
                  ? `color-mix(in srgb, ${tab.color} 20%, transparent)`
                  : "rgba(245,245,232,0.05)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "supabase" && <SupabaseBackend />}
      {active === "convex" && <ConvexBackend />}
      {active === "firebase" && <FirebaseBackend />}
    </div>
  );
}

function SupabaseBackend() {
  const c = "var(--emerald)";
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Supabase Storage */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--emerald)]/10 bg-[var(--emerald)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--emerald)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16v16H4z" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 9h16M9 4v16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Supabase Storage
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Holds the actual video files in a public{" "}
          <code className="font-mono text-[var(--emerald)]">videos</code>{" "}
          bucket. Videos are stored as single WebM or MP4 files with permanent
          public URLs — no signed tokens needed for playback.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--emerald)]/70">
          <code>{`storage/videos/
  {short-code}.webm     (12.4 MB)
  {short-code}.mp4      (14.1 MB)

Public URL:
  {project-url}/storage/v1/
    object/public/videos/{code}.webm`}</code>
        </pre>
      </div>

      {/* Supabase Postgres */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--emerald)]/10 bg-[var(--emerald)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--emerald)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            PostgreSQL Database
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Two tables store video metadata and reactions. Accessed via
          PostgREST (from desktop) and Edge Functions (from the viewer).
          Row Level Security policies protect all data.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--emerald)]/70">
          <code>{`videos (table)
  ├── short_code: "a1b2c3d4"
  ├── title: "Q3 Product Demo"
  ├── storage_url: "https://..."
  ├── view_count: 142
  ├── duration_ms: 45200
  └── capture_mode: "window"

reactions (table)
  ├── video_short_code: "a1b2c3d4"
  ├── emoji: "🔥"
  └── timestamp: 12.5`}</code>
        </pre>
      </div>

      {/* Supabase Edge Functions */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--emerald)]/15 bg-[var(--emerald)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--emerald)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m18 16 4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m6 8-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m14.5 4-5 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Edge Functions
          </h3>
          <span className="rounded-full bg-[var(--emerald)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--emerald)]">
            Public Gateway
          </span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          A single Deno-based Edge Function{" "}
          <code className="font-mono text-[var(--emerald)]">openloom</code>{" "}
          serves as the public API. It uses built-in{" "}
          <code className="font-mono text-[var(--cotton)]/60">SUPABASE_URL</code>{" "}
          and{" "}
          <code className="font-mono text-[var(--cotton)]/60">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          environment variables — no manual secrets configuration needed.
        </p>
        <p className="text-sm leading-relaxed text-[var(--cotton)]/50">
          Deployed automatically by OpenLoom Desktop via{" "}
          <code className="font-mono text-[var(--cotton)]/60">npx supabase functions deploy</code>.
        </p>
      </div>

      {/* Supabase RLS */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.02] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--cotton)]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Row Level Security
          </h3>
          <span className="rounded-full bg-[var(--cotton)]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--cotton)]/40">
            Firewall
          </span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Both tables have RLS enabled. Only the service role (used by
          Edge Functions and the desktop app) can read and write data.
          Direct public access is denied.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--cotton)]/40">
          <code>{`ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Only service role has access
CREATE POLICY "service_role_access" ON videos
  FOR ALL USING (true) WITH CHECK (true);`}</code>
        </pre>
      </div>
    </div>
  );
}

function ConvexBackend() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Convex File Storage */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--crimson)]/10 bg-[var(--crimson)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--crimson)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16v16H4z" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 9h16M9 4v16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            File Storage
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Holds video files in Convex&apos;s built-in file storage. Files are
          referenced by storage IDs. Public access requires generating
          temporary signed URLs — the HTTP action serves as a redirect proxy.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--crimson)]/70">
          <code>{`_storage/
  storageId: "kg2abc..."  → video.webm
  storageId: "kg2def..."  → video.mp4

Access URL (redirect):
  {deployment}.convex.site/
    file/{short-code}.webm`}</code>
        </pre>
      </div>

      {/* Convex Database */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--crimson)]/10 bg-[var(--crimson)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--crimson)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Convex Database
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Two tables store video metadata and reactions. Convex uses a
          document database with automatic indexing and real-time
          subscriptions.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--crimson)]/70">
          <code>{`videos (table)
  ├── short_code: "a1b2c3d4"
  ├── title: "Q3 Product Demo"
  ├── storage_url: "https://..."
  ├── view_count: 142
  ├── duration_ms: 45200
  └── capture_mode: "window"

reactions (table)
  ├── video_short_code: "a1b2c3d4"
  ├── emoji: "🔥"
  └── timestamp: 12.5`}</code>
        </pre>
      </div>

      {/* Convex HTTP Actions */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--crimson)]/15 bg-[var(--crimson)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--crimson)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m18 16 4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m6 8-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m14.5 4-5 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            HTTP Actions
          </h3>
          <span className="rounded-full bg-[var(--crimson)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--crimson)]">
            Public Gateway
          </span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          TypeScript HTTP actions deployed to Convex serve as the public API.
          They also handle file URL proxying — generating temporary signed URLs
          for video files and returning 302 redirects.
        </p>
        <p className="text-sm leading-relaxed text-[var(--cotton)]/50">
          Deployed automatically by OpenLoom Desktop via{" "}
          <code className="font-mono text-[var(--cotton)]/60">npx convex deploy</code>.
        </p>
      </div>

      {/* Convex Auth */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.02] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--cotton)]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Deploy Key Auth
          </h3>
          <span className="rounded-full bg-[var(--cotton)]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--cotton)]/40">
            Firewall
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--cotton)]/50">
          The desktop app uses a deploy key for admin-level access.
          HTTP actions are the only public surface — they validate
          requests and control what data is exposed. Direct database
          queries from the outside are not possible.
        </p>
      </div>
    </div>
  );
}

function FirebaseBackend() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Cloud Storage */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--mustard)]/10 bg-[var(--mustard)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--mustard)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16v16H4z" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 9h16M9 4v16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Cloud Storage
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Holds the actual video binary data. Recordings are split into
          ~5 MB WebM chunks for parallel downloads and resumable uploads.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--mustard)]/70">
          <code>{`gs://your-project.appspot.com/
  videos/
    {video-code}/
      chunk-000.webm   (5.2 MB)
      chunk-001.webm   (4.8 MB)
      chunk-002.webm   (5.1 MB)
      ...`}</code>
        </pre>
      </div>

      {/* Cloud Firestore */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--mustard)]/10 bg-[var(--mustard)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--mustard)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Cloud Firestore
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Stores video metadata and timestamped reactions. Structured as a
          collection of video documents, each with a reactions
          subcollection.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--mustard)]/70">
          <code>{`videos (collection)
  └─ {video-code} (document)
      ├── title: "Q3 Product Demo"
      ├── description: "..."
      ├── view_count: 142
      ├── duration_ms: 45200
      ├── capture_mode: "window"
      │
      └─ reactions (subcollection)
          └─ {id}
              ├── emoji: "🔥"
              ├── timestamp: 12.5
              └── created_at: "..."`}</code>
        </pre>
      </div>

      {/* Cloud Functions */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--emerald)]/15 bg-[var(--emerald)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--emerald)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m18 16 4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m6 8-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m14.5 4-5 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Cloud Functions
          </h3>
          <span className="rounded-full bg-[var(--emerald)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--emerald)]">
            Public Gateway
          </span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          The <strong className="text-[var(--cotton)]">only</strong> part
          of your Firebase that is publicly accessible. Acts as a
          controlled gateway — validates requests, rate-limits reactions,
          and serves chunk URLs with temporary signed access.
        </p>
        <p className="text-sm leading-relaxed text-[var(--cotton)]/50">
          Cloud Functions read from Firestore and generate signed Storage
          URLs. They never expose raw credentials or direct database
          paths.
        </p>
      </div>

      {/* Security Rules */}
      <div className="stripe-hover-border rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.02] p-6">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--cotton)]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          <h3 className="text-lg font-semibold text-[var(--cotton)]">
            Security Rules
          </h3>
          <span className="rounded-full bg-[var(--cotton)]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--cotton)]/40">
            Firewall
          </span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/50">
          Firestore and Cloud Storage are locked down with security rules
          that <strong className="text-[var(--cotton)]">deny all
          direct public access</strong>. Every read and write from the
          outside world goes through Cloud Functions.
        </p>
        <pre className="rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--cotton)]/40">
          <code>{`rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{document=**} {
      allow read, write: if false;
      // All access via Cloud Functions
    }
  }
}`}</code>
        </pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Playback step component                                             */
/* ------------------------------------------------------------------ */

function PlaybackStep({
  n,
  color,
  title,
  code,
  desc,
  last,
}: {
  n: number;
  color: string;
  title: string;
  code: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-5"}>
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            color,
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          }}
        >
          {n}
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="ml-7 mt-1">
        <code className="text-xs text-[var(--cotton)]/40">{code}</code>
        <p className="mt-0.5 font-sans text-xs text-[var(--cotton)]/30">
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Architecture diagram — animated SVG                                  */
/* ------------------------------------------------------------------ */

function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 940 560"
      fill="none"
      className="w-full"
      aria-label="Architecture diagram showing data flow between Desktop App, Your Backend, and Web Viewer"
    >
      <defs>
        <filter id="glow-green">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ============================================================ */}
      {/* YOUR MACHINE                                                  */}
      {/* ============================================================ */}
      <rect
        x="2"
        y="2"
        width="210"
        height="536"
        rx="16"
        fill="rgba(26,26,46,0.6)"
        stroke="#D92B2B"
        strokeWidth="1.5"
        strokeDasharray="8 4"
      />
      <text
        x="107"
        y="28"
        textAnchor="middle"
        fill="#D92B2B"
        fontSize="11"
        fontFamily="var(--font-jetbrains-mono), monospace"
        fontWeight="700"
        letterSpacing="0.1em"
      >
        YOUR MACHINE
      </text>

      {/* Desktop App box */}
      <rect
        x="16"
        y="48"
        width="182"
        height="220"
        rx="12"
        fill="rgba(217,43,43,0.06)"
        stroke="#D92B2B"
        strokeWidth="1"
        opacity="0.7"
      />
      {/* Monitor icon */}
      <rect
        x="82"
        y="62"
        width="50"
        height="34"
        rx="4"
        stroke="#D92B2B"
        strokeWidth="1.5"
        fill="none"
      />
      <line
        x1="107"
        y1="96"
        x2="107"
        y2="104"
        stroke="#D92B2B"
        strokeWidth="1.5"
      />
      <line
        x1="95"
        y1="104"
        x2="119"
        y2="104"
        stroke="#D92B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="107" cy="79" r="4" fill="#D92B2B" className="animate-pulse" />
      <text
        x="107"
        y="128"
        textAnchor="middle"
        fill="#F5F5E8"
        fontSize="13"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="600"
      >
        OpenLoom Desktop
      </text>

      {/* Lock icon + Credentials */}
      <rect
        x="44"
        y="148"
        width="10"
        height="8"
        rx="2"
        stroke="#D92B2B"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M46 148v-3a3 3 0 0 1 6 0v3"
        stroke="#D92B2B"
        strokeWidth="1"
        fill="none"
      />
      <text
        x="60"
        y="155"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        Backend Credentials
      </text>

      {/* Items list */}
      <text
        x="44"
        y="176"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        Screen Recorder
      </text>
      <text
        x="44"
        y="192"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        Video Encoder
      </text>
      <text
        x="44"
        y="208"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        File Uploader
      </text>
      <text
        x="44"
        y="224"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        Provider SDK / REST
      </text>
      <text
        x="44"
        y="252"
        fill="#D92B2B"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        credentials.json
      </text>

      {/* "Private" label at bottom */}
      <rect
        x="30"
        y="500"
        width="154"
        height="24"
        rx="6"
        fill="rgba(217,43,43,0.08)"
      />
      <text
        x="107"
        y="516"
        textAnchor="middle"
        fill="#D92B2B"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        PRIVATE — never leaves
      </text>

      {/* ============================================================ */}
      {/* ANIMATED FLOW: Machine → Backend                              */}
      {/* ============================================================ */}
      <line
        x1="216"
        y1="160"
        x2="266"
        y2="160"
        stroke="#D92B2B"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.3"
      />
      <circle r="4" fill="#D92B2B" opacity="0.9">
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path="M216,160 L266,160"
        />
      </circle>
      <circle r="4" fill="#D92B2B" opacity="0.4">
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          begin="0.7s"
          path="M216,160 L266,160"
        />
      </circle>
      <path
        d="M262 155 L270 160 L262 165"
        stroke="#D92B2B"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="241"
        y="148"
        textAnchor="middle"
        fill="#D92B2B"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        auth write
      </text>

      {/* ============================================================ */}
      {/* YOUR BACKEND                                                  */}
      {/* ============================================================ */}
      <rect
        x="270"
        y="2"
        width="400"
        height="536"
        rx="16"
        fill="rgba(26,26,46,0.6)"
        stroke="#F5C518"
        strokeWidth="1.5"
        strokeDasharray="8 4"
      />
      <text
        x="470"
        y="28"
        textAnchor="middle"
        fill="#F5C518"
        fontSize="11"
        fontFamily="var(--font-jetbrains-mono), monospace"
        fontWeight="700"
        letterSpacing="0.1em"
      >
        YOUR BACKEND
      </text>

      {/* PRIVATE zone label */}
      <rect
        x="284"
        y="38"
        width="60"
        height="16"
        rx="4"
        fill="rgba(245,197,24,0.1)"
      />
      <text
        x="314"
        y="50"
        textAnchor="middle"
        fill="#F5C518"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        fontWeight="700"
        opacity="0.5"
      >
        PRIVATE
      </text>

      {/* File Storage */}
      <rect
        x="284"
        y="62"
        width="178"
        height="120"
        rx="10"
        fill="rgba(245,197,24,0.04)"
        stroke="#F5C518"
        strokeWidth="1"
        opacity="0.5"
      />
      <text
        x="373"
        y="82"
        textAnchor="middle"
        fill="#F5C518"
        fontSize="11"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="600"
      >
        File Storage
      </text>
      <text
        x="298"
        y="100"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        videos/{"{code}"}/
      </text>
      <text
        x="310"
        y="114"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        video.webm
      </text>
      <text
        x="310"
        y="126"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        video.mp4
      </text>
      <text
        x="298"
        y="148"
        fill="#F5F5E8"
        fontSize="7"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        Supabase Storage / Convex Files / GCS
      </text>

      {/* Database */}
      <rect
        x="478"
        y="62"
        width="178"
        height="200"
        rx="10"
        fill="rgba(245,197,24,0.04)"
        stroke="#F5C518"
        strokeWidth="1"
        opacity="0.5"
      />
      <text
        x="567"
        y="82"
        textAnchor="middle"
        fill="#F5C518"
        fontSize="11"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="600"
      >
        Database
      </text>
      <text
        x="492"
        y="100"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        videos/{"{code}"}
      </text>
      <text
        x="502"
        y="114"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        title
      </text>
      <text
        x="502"
        y="126"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        description
      </text>
      <text
        x="502"
        y="138"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        storage_url
      </text>
      <text
        x="502"
        y="150"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        view_count
      </text>
      <text
        x="502"
        y="162"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        duration_ms
      </text>
      <text
        x="502"
        y="174"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        capture_mode
      </text>
      <text
        x="492"
        y="196"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        reactions/{"{id}"}
      </text>
      <text
        x="502"
        y="210"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        emoji
      </text>
      <text
        x="502"
        y="222"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        timestamp
      </text>
      <text
        x="502"
        y="234"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        created_at
      </text>
      <text
        x="492"
        y="254"
        fill="#F5F5E8"
        fontSize="7"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        Postgres / Convex DB / Firestore
      </text>

      {/* Access Control */}
      <rect
        x="284"
        y="196"
        width="178"
        height="56"
        rx="10"
        fill="rgba(245,245,232,0.02)"
        stroke="#F5F5E8"
        strokeWidth="1"
        opacity="0.2"
      />
      {/* Shield icon */}
      <path
        d="M373 208c-2.5 0-6 3-6 3v8s3.5 5 6 5 6-5 6-5v-8s-3.5-3-6-3Z"
        stroke="#F5F5E8"
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />
      <text
        x="373"
        y="238"
        textAnchor="middle"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        Access Control
      </text>

      {/* ---- SECURITY BOUNDARY ---- */}
      <line
        x1="280"
        y1="280"
        x2="660"
        y2="280"
        stroke="#F5C518"
        strokeWidth="1.5"
        strokeDasharray="10 5"
        opacity="0.4"
      />
      {/* Boundary label with background */}
      <rect
        x="405"
        y="270"
        width="130"
        height="20"
        rx="4"
        fill="rgba(26,26,46,0.9)"
      />
      <text
        x="470"
        y="284"
        textAnchor="middle"
        fill="#F5C518"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        fontWeight="700"
        opacity="0.7"
      >
        SECURITY BOUNDARY
      </text>

      {/* PUBLIC zone label */}
      <rect
        x="284"
        y="296"
        width="54"
        height="16"
        rx="4"
        fill="rgba(14,154,87,0.12)"
      />
      <text
        x="311"
        y="308"
        textAnchor="middle"
        fill="#0E9A57"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        fontWeight="700"
        opacity="0.6"
      >
        PUBLIC
      </text>

      {/* Serverless Functions — THE GATEWAY */}
      <rect
        x="284"
        y="320"
        width="372"
        height="200"
        rx="12"
        fill="rgba(14,154,87,0.05)"
        stroke="#0E9A57"
        strokeWidth="1.5"
        filter="url(#glow-green)"
      />
      <text
        x="470"
        y="342"
        textAnchor="middle"
        fill="#0E9A57"
        fontSize="12"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="700"
      >
        Serverless Functions
      </text>
      <text
        x="470"
        y="358"
        textAnchor="middle"
        fill="#0E9A57"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        THE PUBLIC GATEWAY
      </text>

      {/* Endpoint list */}
      <text
        x="310"
        y="386"
        fill="#0E9A57"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        GET
      </text>
      <text
        x="346"
        y="386"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /v?code={"{code}"}
      </text>
      <text
        x="490"
        y="386"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        metadata
      </text>

      <text
        x="304"
        y="410"
        fill="#F5C518"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        POST
      </text>
      <text
        x="346"
        y="410"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /view
      </text>
      <text
        x="490"
        y="410"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        increment views
      </text>

      <text
        x="310"
        y="434"
        fill="#0E9A57"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        GET
      </text>
      <text
        x="346"
        y="434"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /reactions?code={"{code}"}
      </text>
      <text
        x="530"
        y="434"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        fetch reactions
      </text>

      <text
        x="304"
        y="458"
        fill="#F5C518"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        POST
      </text>
      <text
        x="346"
        y="458"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /reactions/add
      </text>
      <text
        x="490"
        y="458"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        add reaction
      </text>

      <text
        x="470"
        y="490"
        textAnchor="middle"
        fill="#F5F5E8"
        fontSize="7"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        Edge Functions / HTTP Actions / Cloud Functions
      </text>

      {/* Internal wiring arrows: Storage & Database → Functions */}
      <path
        d="M373 182 L373 260 Q373 270 380 275 L420 298"
        stroke="#F5C518"
        strokeWidth="1"
        strokeDasharray="4 3"
        fill="none"
        opacity="0.2"
      />
      <path
        d="M567 262 L567 275 Q567 285 555 292 L520 308"
        stroke="#F5C518"
        strokeWidth="1"
        strokeDasharray="4 3"
        fill="none"
        opacity="0.2"
      />

      {/* ============================================================ */}
      {/* ANIMATED FLOW: Backend → Viewer                               */}
      {/* ============================================================ */}
      <line
        x1="660"
        y1="420"
        x2="722"
        y2="420"
        stroke="#0E9A57"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.3"
      />
      <circle r="4" fill="#0E9A57" opacity="0.9">
        <animateMotion
          dur="1.8s"
          repeatCount="indefinite"
          path="M660,420 L722,420"
        />
      </circle>
      <circle r="4" fill="#0E9A57" opacity="0.4">
        <animateMotion
          dur="1.8s"
          repeatCount="indefinite"
          begin="0.6s"
          path="M660,420 L722,420"
        />
      </circle>
      <path
        d="M718 415 L726 420 L718 425"
        stroke="#0E9A57"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="691"
        y="410"
        textAnchor="middle"
        fill="#0E9A57"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        HTTPS
      </text>

      {/* Reactions feedback (Viewer → Backend) */}
      <line
        x1="722"
        y1="445"
        x2="660"
        y2="445"
        stroke="#F5C518"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.2"
      />
      <circle r="3" fill="#F5C518" opacity="0.6">
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          path="M722,445 L660,445"
        />
      </circle>
      <path
        d="M664 442 L656 445 L664 448"
        stroke="#F5C518"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <text
        x="691"
        y="460"
        textAnchor="middle"
        fill="#F5C518"
        fontSize="7"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        reactions
      </text>

      {/* ============================================================ */}
      {/* THE VIEWER                                                    */}
      {/* ============================================================ */}
      <rect
        x="728"
        y="2"
        width="210"
        height="536"
        rx="16"
        fill="rgba(26,26,46,0.6)"
        stroke="#0E9A57"
        strokeWidth="1.5"
        strokeDasharray="8 4"
      />
      <text
        x="833"
        y="28"
        textAnchor="middle"
        fill="#0E9A57"
        fontSize="11"
        fontFamily="var(--font-jetbrains-mono), monospace"
        fontWeight="700"
        letterSpacing="0.1em"
      >
        THE VIEWER
      </text>

      {/* Static SPA box */}
      <rect
        x="742"
        y="48"
        width="182"
        height="200"
        rx="12"
        fill="rgba(14,154,87,0.05)"
        stroke="#0E9A57"
        strokeWidth="1"
        opacity="0.6"
      />
      {/* Browser icon */}
      <rect
        x="808"
        y="62"
        width="50"
        height="34"
        rx="4"
        stroke="#0E9A57"
        strokeWidth="1.5"
        fill="none"
      />
      <line
        x1="808"
        y1="72"
        x2="858"
        y2="72"
        stroke="#0E9A57"
        strokeWidth="1"
        opacity="0.5"
      />
      <circle cx="814" cy="67" r="1.5" fill="#D92B2B" opacity="0.6" />
      <circle cx="820" cy="67" r="1.5" fill="#F5C518" opacity="0.6" />
      <circle cx="826" cy="67" r="1.5" fill="#0E9A57" opacity="0.6" />
      {/* Play triangle */}
      <path d="M828 80 L838 86 L828 92Z" fill="#0E9A57" opacity="0.5" />
      <text
        x="833"
        y="116"
        textAnchor="middle"
        fill="#F5F5E8"
        fontSize="12"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="600"
      >
        openloom.live
      </text>
      <text
        x="833"
        y="132"
        textAnchor="middle"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        Static SPA · GitHub Pages
      </text>

      {/* "Does NOT have" list */}
      {/* X marks */}
      <text
        x="757"
        y="162"
        fill="#D92B2B"
        fontSize="10"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        ✕
      </text>
      <text
        x="772"
        y="162"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        No backend creds
      </text>

      <text
        x="757"
        y="178"
        fill="#D92B2B"
        fontSize="10"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        ✕
      </text>
      <text
        x="772"
        y="178"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        No DB access
      </text>

      <text
        x="757"
        y="194"
        fill="#D92B2B"
        fontSize="10"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        ✕
      </text>
      <text
        x="772"
        y="194"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        No server logic
      </text>

      <text
        x="757"
        y="210"
        fill="#D92B2B"
        fontSize="10"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        ✕
      </text>
      <text
        x="772"
        y="210"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        No write access
      </text>

      <text
        x="757"
        y="226"
        fill="#D92B2B"
        fontSize="10"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        ✕
      </text>
      <text
        x="772"
        y="226"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        No user sessions
      </text>

      {/* Self-host box */}
      <rect
        x="742"
        y="268"
        width="182"
        height="60"
        rx="10"
        fill="rgba(14,154,87,0.05)"
        stroke="#0E9A57"
        strokeWidth="1"
        opacity="0.4"
      />
      <text
        x="833"
        y="296"
        textAnchor="middle"
        fill="#0E9A57"
        fontSize="10"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="600"
        opacity="0.7"
      >
        Self-hostable
      </text>
      <text
        x="833"
        y="314"
        textAnchor="middle"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        Fork → Build → Deploy
      </text>

      {/* "Replaceable" label at bottom */}
      <rect
        x="756"
        y="500"
        width="154"
        height="24"
        rx="6"
        fill="rgba(14,154,87,0.08)"
      />
      <text
        x="833"
        y="516"
        textAnchor="middle"
        fill="#0E9A57"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.6"
      >
        REPLACEABLE — no lock-in
      </text>

      {/* ============================================================ */}
      {/* BOTTOM BRACKET: "your infrastructure"                         */}
      {/* ============================================================ */}
      <line
        x1="2"
        y1="550"
        x2="670"
        y2="550"
        stroke="#F5F5E8"
        strokeWidth="1"
        opacity="0.1"
      />
      <line
        x1="2"
        y1="545"
        x2="2"
        y2="550"
        stroke="#F5F5E8"
        strokeWidth="1"
        opacity="0.1"
      />
      <line
        x1="670"
        y1="545"
        x2="670"
        y2="550"
        stroke="#F5F5E8"
        strokeWidth="1"
        opacity="0.1"
      />
      <text
        x="336"
        y="558"
        textAnchor="middle"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.2"
      >
        your infrastructure — you own this
      </text>
    </svg>
  );
}
