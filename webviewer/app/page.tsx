"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
              own hosted{" "}
              <span className="relative group cursor-default border-b border-dotted border-[var(--mustard)]/50">
                backend infra
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded bg-[var(--deep-black)] px-3 py-1.5 text-xs text-[var(--cotton)] opacity-0 transition-opacity group-hover:opacity-100 border border-[var(--cotton)]/10">
                  Firebase — and soon Supabase
                </span>
              </span>
              {" "}— no third-party servers, no vendor lock-in.
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <DownloadButton />
            <a
              href="#how-it-works"
              className="rounded-lg border border-[var(--cotton)]/15 px-6 py-3 text-base font-medium text-[var(--cotton)]/70 transition-all hover:border-[var(--cotton)]/30 hover:text-[var(--cotton)]"
            >
              How it works
            </a>
          </div>

          {/* Install note */}
          <p className="mt-4 max-w-lg font-mono text-xs leading-relaxed text-[var(--cotton)]/30">
            Not code-signed yet. If macOS says the app is damaged, run{" "}
            <code className="rounded bg-[var(--cotton)]/[0.08] px-1.5 py-0.5 text-[var(--cotton)]/50">
              xattr -cr /Applications/OpenLoom.app
            </code>
          </p>

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

      {/* ---------------------------------------------------------------- */}
      {/* GET STARTED — interactive tutorial tabs                          */}
      {/* ---------------------------------------------------------------- */}
      <GetStartedSection />

      {/* PRODUCT MOCKUP (commented out)
      <section className="relative bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl" data-reveal>
          <div className="overflow-hidden rounded-2xl border border-[var(--cotton)]/8 bg-[var(--warp-indigo)] shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 border-b border-[var(--cotton)]/5 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[var(--crimson)]" />
              <span className="h-3 w-3 rounded-full bg-[var(--mustard)]" />
              <span className="h-3 w-3 rounded-full bg-[var(--emerald)]" />
              <span className="ml-3 font-mono text-xs text-[var(--cotton)]/30">
                openloom.live/v/abc123/48271
              </span>
            </div>
            <div className="flex aspect-video items-center justify-center bg-black/30">
              <div className="flex flex-col items-center gap-3 text-[var(--cotton)]/30">
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" fill="currentColor" />
                </svg>
                <span className="text-sm">Your recording plays here</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      */}

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
                desc: "Recordings live on your own Firebase project. 5 GB storage included in the free tier. Supabase is coming soon.",
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
                Open the desktop app, choose your capture mode, and hit record. Video chunks stream to your Firebase.
              </p>
            </div>
            <div className="text-center">
              <span className="font-mono text-sm font-bold text-[var(--mustard)]">02 — Store</span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cotton)]/50">
                Firebase stores your video chunks, metadata, and reactions. Everything lives on your own project.
              </p>
            </div>
            <div className="text-center">
              <span className="font-mono text-sm font-bold text-[var(--emerald)]">03 — Watch</span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cotton)]/50">
                Share a link. The OpenLoom web player fetches directly from your Firebase, via a public API — no middleman.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center" data-reveal data-delay="400">
            <Link
              href="/technology"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--cotton)]/10 px-5 py-2.5 text-sm font-medium text-[var(--cotton)]/60 transition-all hover:border-[var(--cotton)]/20 hover:text-[var(--cotton)]"
            >
              Deep dive into the architecture
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

      {/* ---------------------------------------------------------------- */}
      {/* FOOTER                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[var(--cotton)]/5 bg-[var(--warp-indigo)] px-6 py-8">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between text-sm text-[var(--cotton)]/40">
          <span className="font-mono text-xs text-[var(--cotton)]/25">
            Design is inspired by enduring heritage of the{" "}
            <a
              href="https://en.wikipedia.org/wiki/Bhavani_Jamakkalam"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--cotton)]/40"
            >
              Bhavani Jamakkalam
            </a>
            .
          </span>
          <span className="font-mono text-xs text-[var(--cotton)]/25">
            A weekend project by{" "}
            <a
              href="https://x.com/anenth"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--cotton)]/40"
            >
              @anenth
            </a>
            , pair-programmed with Claude Code.
          </span>
        </div>
      </footer>
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
        viewBox="0 0 720 165"
        fill="none"
        className="w-full"
        aria-label="Data flow: Desktop App uploads to Firebase, OpenLoom Player reads from Firebase"
      >
        {/* ---- Node: Desktop App (center 75) ---- */}
        <rect x="0" y="5" width="150" height="100" rx="16" fill="#1A1A2E" stroke="#D92B2B" strokeWidth="2" />
        <rect x="55" y="25" width="40" height="28" rx="4" stroke="#D92B2B" strokeWidth="1.5" fill="none" />
        <line x1="75" y1="53" x2="75" y2="61" stroke="#D92B2B" strokeWidth="1.5" />
        <line x1="63" y1="61" x2="87" y2="61" stroke="#D92B2B" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="75" cy="39" r="4" fill="#D92B2B" className="animate-pulse" />
        <text x="75" y="89" textAnchor="middle" fill="#F5F5E8" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">
          Desktop App
        </text>

        {/* ---- Node: Firebase (center 360) ---- */}
        <rect x="285" y="5" width="150" height="100" rx="16" fill="#1A1A2E" stroke="#F5C518" strokeWidth="2" />
        <ellipse cx="360" cy="31" rx="20" ry="8" stroke="#F5C518" strokeWidth="1.5" fill="none" />
        <path d="M340 31v20c0 4.4 8.95 8 20 8s20-3.6 20-8V31" stroke="#F5C518" strokeWidth="1.5" fill="none" />
        <path d="M340 41c0 4.4 8.95 8 20 8s20-3.6 20-8" stroke="#F5C518" strokeWidth="1.5" fill="none" />
        <text x="360" y="89" textAnchor="middle" fill="#F5F5E8" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">
          Your Firebase
        </text>

        {/* ---- Node: OpenLoom Player (center 645) ---- */}
        <rect x="570" y="5" width="150" height="100" rx="16" fill="#1A1A2E" stroke="#0E9A57" strokeWidth="2" />
        <rect x="615" y="23" width="60" height="38" rx="4" stroke="#0E9A57" strokeWidth="1.5" fill="none" />
        <line x1="615" y1="31" x2="675" y2="31" stroke="#0E9A57" strokeWidth="1" />
        <path d="M638 36 L652 44 L638 52Z" fill="#0E9A57" />
        <text x="645" y="89" textAnchor="middle" fill="#F5F5E8" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">
          OpenLoom Player
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
    id: "desktop",
    label: "Desktop App Setup",
    color: "var(--crimson)",
    title: "Download & Configure",
    description:
      "Download the OpenLoom desktop app for macOS, open it, and connect your Firebase project. Paste your project ID, import your service account key, and you\u2019re ready to record.",
  },
  {
    id: "firebase",
    label: "Firebase Setup",
    color: "var(--mustard)",
    title: "Configure Firebase",
    description:
      "Create a Firebase project (or use an existing one), enable Cloud Storage and Cloud Firestore, deploy the provided Cloud Functions, and lock down your security rules.",
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
  if (id === "desktop") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (id === "firebase") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
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

function DesktopAppVisual() {
  return (
    <svg viewBox="0 0 480 300" fill="none" className="w-full" aria-label="Desktop app setup mockup">
      {/* Window chrome */}
      <rect x="0" y="0" width="480" height="300" rx="12" fill="#0A0A12" stroke="rgba(245,245,232,0.08)" strokeWidth="1" />
      <rect x="0" y="0" width="480" height="36" rx="12" fill="#141422" />
      <rect x="0" y="24" width="480" height="12" fill="#141422" />
      <circle cx="20" cy="18" r="5" fill="var(--crimson)" />
      <circle cx="36" cy="18" r="5" fill="var(--mustard)" />
      <circle cx="52" cy="18" r="5" fill="var(--emerald)" />
      <text x="240" y="22" textAnchor="middle" fill="rgba(245,245,232,0.4)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">OpenLoom Setup</text>

      {/* Step indicators */}
      <text x="100" y="68" textAnchor="middle" fill="var(--crimson)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" fontWeight="600">1. Download</text>
      <text x="240" y="68" textAnchor="middle" fill="var(--mustard)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" fontWeight="600">2. Configure</text>
      <text x="380" y="68" textAnchor="middle" fill="var(--emerald)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" fontWeight="600">3. Ready</text>
      <line x1="140" y1="64" x2="200" y2="64" stroke="rgba(245,245,232,0.1)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="280" y1="64" x2="340" y2="64" stroke="rgba(245,245,232,0.1)" strokeWidth="1" strokeDasharray="4 3" />

      {/* Form area */}
      <text x="60" y="110" fill="rgba(245,245,232,0.5)" fontSize="11" fontFamily="var(--font-space-grotesk), sans-serif">Firebase Project ID</text>
      <rect x="60" y="118" width="360" height="36" rx="8" fill="rgba(245,245,232,0.04)" stroke="rgba(245,245,232,0.1)" strokeWidth="1" />
      <text x="76" y="141" fill="rgba(245,245,232,0.25)" fontSize="12" fontFamily="var(--font-jetbrains-mono), monospace">my-openloom-project</text>

      <text x="60" y="180" fill="rgba(245,245,232,0.5)" fontSize="11" fontFamily="var(--font-space-grotesk), sans-serif">Service Account Key</text>
      <rect x="60" y="188" width="280" height="36" rx="8" fill="rgba(245,245,232,0.04)" stroke="rgba(245,245,232,0.1)" strokeWidth="1" />
      <text x="76" y="211" fill="rgba(245,245,232,0.25)" fontSize="12" fontFamily="var(--font-jetbrains-mono), monospace">service-account.json</text>
      <rect x="352" y="188" width="68" height="36" rx="8" fill="rgba(245,245,232,0.06)" stroke="rgba(245,245,232,0.12)" strokeWidth="1" />
      <text x="386" y="211" textAnchor="middle" fill="rgba(245,245,232,0.5)" fontSize="11" fontFamily="var(--font-space-grotesk), sans-serif">Browse</text>

      {/* Connect button */}
      <rect x="160" y="248" width="160" height="40" rx="10" fill="var(--crimson)" />
      <text x="240" y="273" textAnchor="middle" fill="white" fontSize="14" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">Connect</text>
    </svg>
  );
}

function FirebaseSetupVisual() {
  const items = [
    { label: "Cloud Storage", done: true },
    { label: "Cloud Firestore", done: true },
    { label: "Cloud Functions", done: true },
    { label: "Security Rules", done: false },
  ];
  return (
    <svg viewBox="0 0 480 300" fill="none" className="w-full" aria-label="Firebase setup checklist mockup">
      {/* Window chrome */}
      <rect x="0" y="0" width="480" height="300" rx="12" fill="#0A0A12" stroke="rgba(245,245,232,0.08)" strokeWidth="1" />
      <rect x="0" y="0" width="480" height="36" rx="12" fill="#141422" />
      <rect x="0" y="24" width="480" height="12" fill="#141422" />
      <circle cx="20" cy="18" r="5" fill="var(--crimson)" />
      <circle cx="36" cy="18" r="5" fill="var(--mustard)" />
      <circle cx="52" cy="18" r="5" fill="var(--emerald)" />
      <text x="240" y="22" textAnchor="middle" fill="rgba(245,245,232,0.4)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">Firebase Console</text>

      {/* Checklist items */}
      {items.map((item, i) => {
        const y = 56 + i * 44;
        return (
          <g key={item.label}>
            <rect x="40" y={y} width="400" height="36" rx="8" fill="rgba(245,245,232,0.03)" stroke="rgba(245,245,232,0.06)" strokeWidth="1" />
            {item.done ? (
              <>
                <circle cx="64" cy={y + 18} r="10" fill="var(--mustard)" opacity="0.15" />
                <path d={`M58 ${y + 18} l4 4 8-8`} stroke="var(--mustard)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <circle cx="64" cy={y + 18} r="10" stroke="rgba(245,245,232,0.15)" strokeWidth="1.5" fill="none" />
            )}
            <text x="88" y={y + 22} fill={item.done ? "rgba(245,245,232,0.7)" : "rgba(245,245,232,0.35)"} fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif">{item.label}</text>
            {item.done && <text x="400" y={y + 22} textAnchor="end" fill="var(--mustard)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.6">enabled</text>}
          </g>
        );
      })}

      {/* Terminal snippet */}
      <rect x="40" y="240" width="400" height="44" rx="8" fill="rgba(245,245,232,0.02)" stroke="rgba(245,245,232,0.06)" strokeWidth="1" />
      <text x="56" y="266" fill="var(--emerald)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace" opacity="0.8">$</text>
      <text x="72" y="266" fill="rgba(245,245,232,0.5)" fontSize="11" fontFamily="var(--font-jetbrains-mono), monospace">firebase deploy --only functions</text>
    </svg>
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
      <text x="96" y="92" fill="rgba(245,245,232,0.6)" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif">Quick walkthrough of the new dashboard</text>
      <line x1="40" y1="102" x2="440" y2="102" stroke="rgba(245,245,232,0.06)" strokeWidth="1" />

      {/* Body text */}
      <text x="40" y="128" fill="rgba(245,245,232,0.45)" fontSize="12" fontFamily="var(--font-space-grotesk), sans-serif">Hey team, here&apos;s a quick recording:</text>

      {/* Link preview card */}
      <rect x="40" y="142" width="400" height="100" rx="10" fill="rgba(245,245,232,0.03)" stroke="rgba(245,245,232,0.08)" strokeWidth="1" />
      {/* Thumbnail area */}
      <rect x="52" y="154" width="120" height="76" rx="6" fill="rgba(0,0,0,0.3)" />
      <path d="M100 182 L118 192 L100 202Z" fill="var(--emerald)" opacity="0.6" />
      {/* Link details */}
      <text x="188" y="175" fill="var(--emerald)" fontSize="12" fontFamily="var(--font-jetbrains-mono), monospace">openloom.live/v/abc123</text>
      <text x="188" y="195" fill="rgba(245,245,232,0.35)" fontSize="11" fontFamily="var(--font-space-grotesk), sans-serif">Dashboard walkthrough — 2:34</text>
      <text x="188" y="215" fill="rgba(245,245,232,0.25)" fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace">Recorded just now</text>

      {/* Send button */}
      <rect x="360" y="256" width="80" height="34" rx="8" fill="var(--emerald)" />
      <text x="400" y="278" textAnchor="middle" fill="white" fontSize="13" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="600">Send</text>
    </svg>
  );
}

const TAB_VISUALS = [DesktopAppVisual, FirebaseSetupVisual, ShareRecordingVisual];

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
/* Download split button with arch dropdown                            */
/* ------------------------------------------------------------------ */

const RELEASE_URL = "https://github.com/anenthg/OpenLoom/releases/latest/download";

const DOWNLOAD_OPTIONS = [
  { label: "Apple Silicon", file: "OpenLoom-0.1.0-arm64.dmg", note: "M1, M2, M3, M4" },
  { label: "Intel", file: "OpenLoom-0.1.0.dmg", note: "Older Macs" },
];

function DownloadButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className="flex">
        <a
          href={`${RELEASE_URL}/${DOWNLOAD_OPTIONS[0].file}`}
          className="flex items-center rounded-l-lg bg-[var(--crimson)] px-6 py-3 text-base font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(217,43,43,0.3)] active:scale-[0.97]"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Download for Mac
        </a>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center rounded-r-lg border-l border-white/20 bg-[var(--crimson)] px-2.5 py-3 text-white transition-all hover:brightness-110 active:scale-[0.97]"
          aria-label="Choose architecture"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--cotton)]/10 bg-[var(--warp-indigo)] shadow-xl shadow-black/40">
          {DOWNLOAD_OPTIONS.map((opt) => (
            <a
              key={opt.file}
              href={`${RELEASE_URL}/${opt.file}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3 text-sm text-[var(--cotton)] transition-colors hover:bg-[var(--cotton)]/[0.08]"
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs text-[var(--cotton)]/40">{opt.note}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
