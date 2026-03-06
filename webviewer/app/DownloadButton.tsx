"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const RELEASE_URL =
  "https://github.com/anenthg/OpenLoom/releases/latest/download";

const MAC_OPTIONS = [
  { label: "Apple Silicon", file: "OpenLoom-arm64.dmg", note: "M1, M2, M3, M4" },
  { label: "Intel", file: "OpenLoom-x64.dmg", note: "Older Macs" },
];

const WIN_OPTIONS = [
  { label: "Windows (64-bit)", file: "OpenLoom-x64.exe", note: "Windows 10+" },
];

const AppleIcon = () => (
  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const WindowsIcon = () => (
  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .08V5.67L20 3zm-10 9.34l10-.08V21l-10-1.67V12.34zM3 12.25l6 .09v6.33l-6-1.07V12.25z" />
  </svg>
);

type Platform = "mac" | "win";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "win";
  return "mac";
}

function isMacFile(file: string) {
  return file.endsWith(".dmg") || file.endsWith(".zip");
}

function isWinFile(file: string) {
  return file.endsWith(".exe");
}

/* ------------------------------------------------------------------ */
/* Mac install dialog                                                  */
/* ------------------------------------------------------------------ */

function MacInstallDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const command = "xattr -cr /Applications/OpenLoom.app";

  const copy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [command]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--deep-black)]/90 backdrop-blur-sm animate-[fadeIn_0.3s_ease]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-[var(--cotton)]/10 bg-[var(--warp-indigo)] p-8 shadow-2xl shadow-black/60 animate-[slideUp_0.3s_ease]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--cotton)]/30 transition-colors hover:text-[var(--cotton)]/70"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {/* Warning icon */}
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mustard)]/10">
          <svg className="h-6 w-6 text-[var(--mustard)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-[var(--cotton)]">
          Before you install
        </h2>

        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/60">
          OpenLoom is not code-signed yet, so macOS will show a message saying
          the app <strong className="text-[var(--cotton)]/80">&ldquo;is damaged and can&rsquo;t be opened.&rdquo;</strong> This
          is expected &mdash; nothing is actually wrong with the file.
        </p>

        <p className="mb-4 text-sm leading-relaxed text-[var(--cotton)]/60">
          After installing, open <strong className="text-[var(--cotton)]/80">Terminal</strong> and
          run this command to clear the quarantine flag:
        </p>

        {/* Command block */}
        <div className="group relative mb-5 rounded-lg border border-[var(--cotton)]/10 bg-[var(--deep-black)] px-4 py-3">
          <code className="block font-mono text-sm text-[var(--emerald)]">
            {command}
          </code>
          <button
            onClick={copy}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--cotton)]/40 transition-colors hover:bg-[var(--cotton)]/[0.08] hover:text-[var(--cotton)]/70"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-[var(--cotton)]/60">
          Then open OpenLoom normally. You only need to do this once.
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-[var(--crimson)] px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Windows install dialog                                              */
/* ------------------------------------------------------------------ */

function WindowsInstallDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--deep-black)]/90 backdrop-blur-sm animate-[fadeIn_0.3s_ease]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-[var(--cotton)]/10 bg-[var(--warp-indigo)] p-8 shadow-2xl shadow-black/60 animate-[slideUp_0.3s_ease]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--cotton)]/30 transition-colors hover:text-[var(--cotton)]/70"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {/* Warning icon */}
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mustard)]/10">
          <svg className="h-6 w-6 text-[var(--mustard)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-[var(--cotton)]">
          Before you install
        </h2>

        <p className="mb-5 text-sm leading-relaxed text-[var(--cotton)]/60">
          OpenLoom is not code-signed yet, so your browser and Windows may show
          security warnings. This is expected &mdash; nothing is actually wrong
          with the file.
        </p>

        {/* Step 1 */}
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-[var(--cotton)]/80">
            1. Browser download warning
          </p>
          <p className="text-sm leading-relaxed text-[var(--cotton)]/60">
            Your browser may block the download. In the downloads bar, click
            the <strong className="text-[var(--cotton)]/80">&ldquo;&#x22EF;&rdquo;</strong> menu
            or <strong className="text-[var(--cotton)]/80">&ldquo;Show more&rdquo;</strong> &rarr; <strong className="text-[var(--cotton)]/80">&ldquo;Keep&rdquo;</strong> or <strong className="text-[var(--cotton)]/80">&ldquo;Keep anyway&rdquo;</strong>.
          </p>
        </div>

        {/* Step 2 */}
        <div className="mb-5">
          <p className="mb-1 text-sm font-medium text-[var(--cotton)]/80">
            2. Windows SmartScreen
          </p>
          <p className="text-sm leading-relaxed text-[var(--cotton)]/60">
            When you run the installer, Windows will
            show <strong className="text-[var(--cotton)]/80">&ldquo;Windows protected your PC&rdquo;</strong>.
            Click <strong className="text-[var(--cotton)]/80">&ldquo;More info&rdquo;</strong> &rarr;
            then click <strong className="text-[var(--cotton)]/80">&ldquo;Run anyway&rdquo;</strong>.
            You only need to do this once.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-[var(--crimson)] px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Download button                                                     */
/* ------------------------------------------------------------------ */

export default function DownloadButton() {
  const [open, setOpen] = useState(false);
  const [showDialog, setShowDialog] = useState<"mac" | "win" | null>(null);
  const [platform, setPlatform] = useState<Platform>("mac");
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleDownloadClick = useCallback((file: string) => {
    setOpen(false);
    if (isMacFile(file)) {
      timerRef.current = setTimeout(() => setShowDialog("mac"), 1000);
    } else if (isWinFile(file)) {
      timerRef.current = setTimeout(() => setShowDialog("win"), 1000);
    }
  }, []);

  const isMac = platform === "mac";
  const defaultFile = WIN_OPTIONS[0].file;

  return (
    <>
      <div ref={ref} className="relative">
        <div className="flex">
          <a
            href={`${RELEASE_URL}/${defaultFile}`}
            onClick={() => handleDownloadClick(defaultFile)}
            className="flex items-center rounded-l-lg bg-[var(--crimson)] px-6 py-3 text-base font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(217,43,43,0.3)] active:scale-[0.97]"
          >
            <WindowsIcon />
            Download for Windows
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center rounded-r-lg border-l border-white/20 bg-[var(--crimson)] px-2.5 py-3 text-white transition-all hover:brightness-110 active:scale-[0.97]"
            aria-label="Choose platform or architecture"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--cotton)]/10 bg-[var(--warp-indigo)] shadow-xl shadow-black/40">
            {WIN_OPTIONS.map((opt) => (
              <a
                key={opt.file}
                href={`${RELEASE_URL}/${opt.file}`}
                onClick={() => handleDownloadClick(opt.file)}
                className="flex items-center justify-between px-4 py-3 text-sm text-[var(--cotton)] transition-colors hover:bg-[var(--cotton)]/[0.08]"
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-xs text-[var(--cotton)]/40">{opt.note}</span>
              </a>
            ))}
            {/* Mac — coming soon */}
            <div className="border-t border-[var(--cotton)]/10">
              {MAC_OPTIONS.map((opt) => (
                <div
                  key={opt.file}
                  className="flex items-center justify-between px-4 py-3 text-sm text-[var(--cotton)]/30"
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs">Coming soon</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showDialog === "win" && <WindowsInstallDialog onClose={() => setShowDialog(null)} />}
    </>
  );
}
