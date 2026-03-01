"use client";

import { useEffect } from "react";

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
              ~/thari/technology
            </span>
          </div>

          <h1 className="font-sans text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-[var(--cotton)]">
            How Thari Works
            <br />
            <span className="text-[var(--cotton)]/50">Under the Hood</span>
          </h1>

          <div className="mt-6 font-mono text-sm leading-relaxed">
            <div className="text-[var(--mustard)]">
              <span className="text-[var(--emerald)]">$</span> A complete
              technical breakdown of the end-to-end workflow. From recording on
              your desktop to playback in any browser — no trust required.
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
              When you download Thari Desktop, you get a native macOS
              application that runs entirely on your hardware. During the initial
              setup, you connect it to your own Firebase project. The app stores
              a{" "}
              <strong className="text-[var(--cotton)]">
                Firebase service account key
              </strong>{" "}
              — the only credential capable of writing to your Firebase — in
              your application&apos;s sandboxed container. This key never leaves
              your computer.
            </p>

            <p>
              Nothing is uploaded until you explicitly choose to share a
              recording. When you do, the desktop app encodes the video into
              WebM, chunks it into segments, and uploads them directly to your
              Firebase Cloud Storage — authenticated by the service account key
              that only your machine has.
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
                ~/Library/Application Support/Thari/
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-[var(--cotton)]/60">
              <code>{`├── config.json                  # Your Firebase project ID & settings
├── service-account-key.json     # Firebase Admin SDK credential
│                                # ⚠ NEVER uploaded. NEVER shared.
├── preferences.json             # Recording defaults (resolution, fps, etc.)
└── temp/                        # Raw recordings before encoding
    └── recording-2024-01-15/    # Cleaned up after upload
        ├── raw-capture.mov
        └── encoded/
            ├── chunk-000.webm
            ├── chunk-001.webm
            └── chunk-002.webm`}</code>
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
                The service account key is the crown jewel.
              </strong>{" "}
              It grants admin write access to your Firebase project. Because it
              lives only on your machine, no one else — not even Thari&apos;s
              infrastructure — can modify your recordings, delete your data, or
              access your storage directly.
            </p>
          </div>
        </div>
      </section>

      <div className="stripe-divider mx-auto max-w-xs opacity-20" />

      {/* ---------------------------------------------------------------- */}
      {/* INSIDE YOUR FIREBASE                                             */}
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
              02 — YOUR FIREBASE
            </span>
          </div>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
            data-delay="100"
          >
            Inside Your Firebase Project
          </h2>

          <p
            className="mb-12 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="200"
          >
            When you set up Thari, you create a standard Firebase project (or
            use an existing one). The desktop app provisions four resources
            inside it. Here&apos;s exactly what each one stores and why.
          </p>

          {/* Firebase entities grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cloud Storage */}
            <div
              className="stripe-hover-border rounded-2xl border border-[var(--mustard)]/10 bg-[var(--mustard)]/[0.03] p-6"
              data-reveal
              data-delay="0"
            >
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[var(--mustard)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M4 4h16v16H4z"
                    rx="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 9h16M9 4v16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
            <div
              className="stripe-hover-border rounded-2xl border border-[var(--mustard)]/10 bg-[var(--mustard)]/[0.03] p-6"
              data-reveal
              data-delay="120"
            >
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[var(--mustard)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
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
      ├── is_protected: true
      ├── password_hash: "bcrypt:..."
      ├── view_count: 142
      ├── duration_ms: 45200
      ├── capture_mode: "window"
      ├── created_at: "2024-01-15T..."
      │
      └─ reactions (subcollection)
          └─ {id}
              ├── emoji: "🔥"
              ├── timestamp: 12.5
              └── created_at: "..."`}</code>
              </pre>
            </div>

            {/* Cloud Functions */}
            <div
              className="stripe-hover-border rounded-2xl border border-[var(--emerald)]/15 bg-[var(--emerald)]/[0.03] p-6"
              data-reveal
              data-delay="240"
            >
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[var(--emerald)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
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
                controlled gateway — validates requests, enforces password
                protection, rate-limits reactions, and serves chunk URLs with
                temporary signed access.
              </p>
              <p className="text-sm leading-relaxed text-[var(--cotton)]/50">
                Cloud Functions read from Firestore and generate signed Storage
                URLs. They never expose raw credentials or direct database
                paths.
              </p>
            </div>

            {/* Security Rules */}
            <div
              className="stripe-hover-border rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.02] p-6"
              data-reveal
              data-delay="360"
            >
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[var(--cotton)]/70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
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
                outside world goes through Cloud Functions, which enforce your
                access policies.
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
            Every Thari instance exposes exactly{" "}
            <strong className="text-[var(--cotton)]">six HTTPS endpoints</strong>.
            These are the only way anyone — including the official viewer — can
            interact with your recordings. No backdoors, no admin panels, no
            hidden routes.
          </p>

          {/* Base URL */}
          <div
            className="mb-8 overflow-hidden rounded-xl border border-[var(--emerald)]/15 bg-black/20"
            data-reveal
            data-delay="300"
          >
            <div className="border-b border-[var(--cotton)]/5 px-5 py-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--emerald)]/60">
                Base URL Pattern
              </span>
            </div>
            <div className="px-5 py-4 font-mono text-sm">
              <span className="text-[var(--cotton)]/40">https://</span>
              <span className="text-[var(--cotton)]/60">us-central1-</span>
              <span className="text-[var(--mustard)]">
                {"{your-project-id}"}
              </span>
              <span className="text-[var(--cotton)]/60">
                .cloudfunctions.net/
              </span>
              <span className="text-[var(--crimson)]">thari</span>
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
                    endpoint: "/v/{code}",
                    purpose:
                      "Fetch video metadata — title, duration, view count, protection status",
                    color: "var(--emerald)",
                  },
                  {
                    method: "POST",
                    endpoint: "/v/{code}/verify",
                    purpose:
                      "Verify a password for protected videos. Returns { ok: boolean }",
                    color: "var(--mustard)",
                  },
                  {
                    method: "POST",
                    endpoint: "/v/{code}/view",
                    purpose:
                      "Increment the view counter. Fire-and-forget, no response body",
                    color: "var(--mustard)",
                  },
                  {
                    method: "GET",
                    endpoint: "/v/{code}/manifest",
                    purpose:
                      "Get the ordered list of chunk URLs for video assembly",
                    color: "var(--emerald)",
                  },
                  {
                    method: "GET",
                    endpoint: "/v/{code}/reactions",
                    purpose:
                      "Fetch all timestamped emoji reactions for the video",
                    color: "var(--emerald)",
                  },
                  {
                    method: "POST",
                    endpoint: "/v/{code}/reactions",
                    purpose:
                      "Add a new emoji reaction at a specific timestamp",
                    color: "var(--mustard)",
                  },
                ].map((ep, i) => (
                  <tr
                    key={ep.endpoint + ep.method}
                    className={
                      i < 5 ? "border-b border-[var(--cotton)]/5" : ""
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
                      {ep.endpoint}
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
              The <code className="font-mono text-[var(--emerald)]">/manifest</code> endpoint
              returns signed Cloud Storage URLs that{" "}
              <strong className="text-[var(--cotton)]">expire after a short
              window</strong>. The chunk URLs can&apos;t be bookmarked or shared
              separately — they&apos;re regenerated on every manifest request.
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
            The Thari web player at{" "}
            <code className="font-mono text-[var(--emerald)]">thari.video</code>{" "}
            is a completely stateless single-page application. It carries{" "}
            <strong className="text-[var(--cotton)]">zero secrets</strong> and
            has <strong className="text-[var(--cotton)]">zero special
            access</strong>. It&apos;s a static site deployed on a CDN — nothing
            more.
          </p>

          {/* What the viewer doesn't have */}
          <div
            className="mb-10 grid gap-4 sm:grid-cols-2"
            data-reveal
            data-delay="300"
          >
            {[
              {
                label: "Zero Firebase credentials",
                desc: "Can't read Firestore or Storage directly",
              },
              {
                label: "Zero server-side logic",
                desc: "Static HTML/JS/CSS deployed on a CDN",
              },
              {
                label: "Zero persistent state",
                desc: "No cookies, sessions, or user accounts",
              },
              {
                label: "Zero write access",
                desc: "Only calls Cloud Functions over HTTPS",
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
                code="https://thari.video/v/{project-id}/{video-code}"
                desc="Extract the Firebase project ID and video code from the path."
              />
              <PlaybackStep
                n={2}
                color="var(--mustard)"
                title="Construct the API base"
                code="https://us-central1-{project-id}.cloudfunctions.net/thari"
                desc="The viewer now knows where to send requests."
              />
              <PlaybackStep
                n={3}
                color="var(--emerald)"
                title="Fetch metadata"
                code="GET /v/{code} → { title, is_protected, duration_ms, ... }"
                desc="If protected, show a password form. Otherwise, proceed."
              />
              <PlaybackStep
                n={4}
                color="var(--emerald)"
                title="Fetch the manifest"
                code="GET /v/{code}/manifest → { chunks: [url1, url2, ...] }"
                desc="Get the list of signed chunk URLs."
              />
              <PlaybackStep
                n={5}
                color="var(--crimson)"
                title="Download & assemble"
                code="Promise.all(chunks.map(fetch)) → Blob → URL.createObjectURL"
                desc="All chunks download in parallel, concatenate into a single WebM blob in the browser."
              />
              <PlaybackStep
                n={6}
                color="var(--emerald)"
                title="Play"
                code="<video src={blobUrl} /> → Plyr initializes"
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
            The viewer literally does not know your Firebase admin credentials,
            your Firestore structure, or your Storage bucket name. It only knows
            the public Cloud Functions URL — the same URL available to anyone
            with the link.
          </p>
        </div>
      </section>

      <div className="stripe-divider mx-auto max-w-xs opacity-20" />

      {/* ---------------------------------------------------------------- */}
      {/* DEPLOY YOUR OWN VIEWER                                           */}
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
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12v9M8 17l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-mono text-sm font-bold text-[var(--cotton)]/60">
              05 — SELF-HOST
            </span>
          </div>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
            data-delay="100"
          >
            Deploy Your Own Viewer
          </h2>

          <p
            className="mb-6 text-base leading-relaxed text-[var(--cotton)]/70"
            data-reveal
            data-delay="200"
          >
            Because the viewer is just a static web app with{" "}
            <strong className="text-[var(--cotton)]">
              no built-in secrets
            </strong>
            , you can fork and deploy your own instance. This gives you full
            control and eliminates any dependency on{" "}
            <code className="font-mono text-[var(--emerald)]">thari.video</code>.
          </p>

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
                deploy your viewer
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
              <code>
                <span className="text-[var(--cotton)]/40"># 1. Fork the repository</span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70">
                  {" "}
                  git clone https://github.com/niceBoy0419/openloom-viewer.git
                </span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70"> cd openloom-viewer</span>
                {"\n\n"}
                <span className="text-[var(--cotton)]/40"># 2. Install & build</span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70"> npm install</span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70"> npm run build</span>
                {"\n\n"}
                <span className="text-[var(--cotton)]/40">
                  # 3. Deploy to any static host
                </span>
                {"\n"}
                <span className="text-[var(--emerald)]">$</span>
                <span className="text-[var(--cotton)]/70">
                  {" "}
                  netlify deploy --prod
                </span>
                {"\n"}
                <span className="text-[var(--cotton)]/40">
                  # or: vercel --prod
                </span>
                {"\n"}
                <span className="text-[var(--cotton)]/40">
                  # or: npx wrangler pages deploy out/
                </span>
              </code>
            </pre>
          </div>

          {/* Benefits grid */}
          <div
            className="grid gap-4 sm:grid-cols-2"
            data-reveal
            data-delay="400"
          >
            {[
              {
                title: "Your own domain",
                desc: "watch.yourcompany.com instead of thari.video",
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
                desc: "Even if thari.video goes offline, your recordings are accessible",
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
            data-delay="500"
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
              your data lives on your Firebase. Your viewer can live anywhere.
              The two are connected only by public HTTPS endpoints. Swap the
              viewer, and nothing about your data or infrastructure changes.
            </p>
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
            Own your recordings
          </h2>
          <p className="mt-4 text-lg text-[var(--cotton)]/50">
            No middleman. No vendor lock-in. Your Firebase, your machine, your
            rules.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/niceBoy0419/openloom/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[var(--crimson)] px-10 py-4 text-lg font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_40px_rgba(217,43,43,0.3)] active:scale-[0.97]"
            >
              Download for Mac
            </a>
            <a
              href="https://github.com/niceBoy0419/openloom"
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
            thari (தறி) — Tamil for loom. Design inspired by Bhavani Jamakkalam
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
          </span>
        </div>
      </footer>
    </main>
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
      aria-label="Architecture diagram showing data flow between Desktop App, Firebase Project, and Web Viewer"
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
        Thari Desktop
      </text>

      {/* Lock icon + Service key */}
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
        Service Account Key
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
        Chunk Uploader
      </text>
      <text
        x="44"
        y="224"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        Firebase Admin SDK
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
      {/* ANIMATED FLOW: Machine → Firebase                             */}
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
      {/* YOUR FIREBASE PROJECT                                         */}
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
        YOUR FIREBASE PROJECT
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

      {/* Cloud Storage */}
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
        Cloud Storage
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
        chunk-000.webm
      </text>
      <text
        x="310"
        y="126"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        chunk-001.webm
      </text>
      <text
        x="310"
        y="138"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        chunk-002.webm
      </text>
      <text
        x="310"
        y="150"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        ...
      </text>

      {/* Cloud Firestore */}
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
        Cloud Firestore
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
        is_protected
      </text>
      <text
        x="502"
        y="150"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        password_hash
      </text>
      <text
        x="502"
        y="162"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        view_count
      </text>
      <text
        x="502"
        y="174"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        duration_ms
      </text>
      <text
        x="502"
        y="186"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        capture_mode
      </text>
      <text
        x="492"
        y="204"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.35"
      >
        reactions/{"{id}"}
      </text>
      <text
        x="502"
        y="218"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        emoji
      </text>
      <text
        x="502"
        y="230"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        timestamp
      </text>
      <text
        x="502"
        y="242"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.3"
      >
        created_at
      </text>

      {/* Security Rules */}
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
        Security Rules
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

      {/* Cloud Functions — THE GATEWAY */}
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
        Cloud Functions
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
        /v/{"{code}"}
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
        y="404"
        fill="#F5C518"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        POST
      </text>
      <text
        x="346"
        y="404"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /v/{"{code}"}/verify
      </text>
      <text
        x="490"
        y="404"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        password check
      </text>

      <text
        x="304"
        y="422"
        fill="#F5C518"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        POST
      </text>
      <text
        x="346"
        y="422"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /v/{"{code}"}/view
      </text>
      <text
        x="490"
        y="422"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        increment views
      </text>

      <text
        x="310"
        y="440"
        fill="#0E9A57"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        GET
      </text>
      <text
        x="346"
        y="440"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /v/{"{code}"}/manifest
      </text>
      <text
        x="510"
        y="440"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        chunk URLs
      </text>

      <text
        x="310"
        y="458"
        fill="#0E9A57"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        GET
      </text>
      <text
        x="346"
        y="458"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /v/{"{code}"}/reactions
      </text>
      <text
        x="510"
        y="458"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        fetch reactions
      </text>

      <text
        x="304"
        y="476"
        fill="#F5C518"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.5"
      >
        POST
      </text>
      <text
        x="346"
        y="476"
        fill="#F5F5E8"
        fontSize="9"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.4"
      >
        /v/{"{code}"}/reactions
      </text>
      <text
        x="510"
        y="476"
        fill="#F5F5E8"
        fontSize="8"
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity="0.25"
      >
        add reaction
      </text>

      {/* Internal wiring arrows: Storage & Firestore → Functions */}
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
      {/* ANIMATED FLOW: Firebase → Viewer                              */}
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

      {/* Reactions feedback (Viewer → Firebase) */}
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
        thari.video
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
        Static SPA
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
        No Firebase creds
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
