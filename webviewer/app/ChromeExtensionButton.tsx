"use client";

import { useState, useEffect, useCallback } from "react";

const EXTENSION_ZIP_URL = "/release/openloom-chrome.zip";

/* ------------------------------------------------------------------ */
/* Install dialog                                                      */
/* ------------------------------------------------------------------ */

function InstallDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps = [
    {
      num: "1",
      title: "Unzip the download",
      desc: (
        <>
          Extract{" "}
          <strong className="text-[var(--cotton)]/80">
            openloom-chrome.zip
          </strong>{" "}
          to a folder on your computer.
        </>
      ),
    },
    {
      num: "2",
      title: "Open chrome://extensions",
      desc: (
        <>
          Paste{" "}
          <code className="rounded bg-[var(--deep-black)] px-1.5 py-0.5 font-mono text-xs text-[var(--emerald)]">
            chrome://extensions
          </code>{" "}
          into your Chrome address bar and hit Enter.
        </>
      ),
    },
    {
      num: "3",
      title: "Enable Developer mode",
      desc: (
        <>
          Toggle{" "}
          <strong className="text-[var(--cotton)]/80">Developer mode</strong>{" "}
          on using the switch in the top-right corner.
        </>
      ),
    },
    {
      num: "4",
      title: "Load unpacked",
      desc: (
        <>
          Click{" "}
          <strong className="text-[var(--cotton)]/80">Load unpacked</strong>{" "}
          and select the folder you unzipped.
        </>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--deep-black)]/90 backdrop-blur-sm animate-[fadeIn_0.3s_ease]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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

        {/* Chrome icon */}
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--crimson)]/10">
          <ChromeIcon className="h-6 w-6" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-[var(--cotton)]">
          Install Chrome Extension
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-[var(--cotton)]/60">
          The extension isn&apos;t on the Chrome Web Store yet, so you&apos;ll
          load it manually. It only takes a minute.
        </p>

        {/* Steps */}
        <div className="mb-6 space-y-4">
          {steps.map((s) => (
            <div key={s.num} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--cotton)]/[0.06] font-mono text-xs font-bold text-[var(--cotton)]/60">
                {s.num}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--cotton)]/80">
                  {s.title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-[var(--cotton)]/50">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
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
/* Chrome logo SVG                                                     */
/* ------------------------------------------------------------------ */

function ChromeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z" fill="none" />
      <path d="M24 4c5.52 0 10.47 2.24 14.07 5.86L24 24 13.54 6.67A19.9 19.9 0 0124 4z" fill="#DB4437" />
      <path d="M38.07 9.86A19.93 19.93 0 0144 24c0 7.13-3.74 13.38-9.36 16.92L24 24l14.07-14.14z" fill="#F4B400" />
      <path d="M34.64 40.92A19.9 19.9 0 0124 44C12.95 44 4 35.05 4 24c0-6.63 3.22-12.5 8.18-16.15L24 24l10.64 16.92z" fill="#0F9D58" />
      <circle cx="24" cy="24" r="8" fill="#4285F4" />
      <circle cx="24" cy="24" r="5.5" fill="white" />
      <circle cx="24" cy="24" r="3.5" fill="#4285F4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hero CTA section                                                    */
/* ------------------------------------------------------------------ */

export default function HeroCTA() {
  const [showDialog, setShowDialog] = useState(false);

  const handleExtensionClick = useCallback(() => {
    const a = document.createElement("a");
    a.href = EXTENSION_ZIP_URL;
    a.download = "openloom-chrome.zip";
    a.click();

    setTimeout(() => setShowDialog(true), 800);
  }, []);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {/* Primary CTA — Chrome Extension */}
        <button
          onClick={handleExtensionClick}
          className="flex items-center rounded-lg bg-[var(--crimson)] px-6 py-3 text-base font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(217,43,43,0.3)] active:scale-[0.97]"
        >
          <ChromeIcon className="mr-2 h-5 w-5" />
          Download Chrome Extension
        </button>

        {/* How it works */}
        <a
          href="#how-it-works"
          className="rounded-lg border border-[var(--cotton)]/15 px-6 py-3 text-base font-medium text-[var(--cotton)]/70 transition-all hover:border-[var(--cotton)]/30 hover:text-[var(--cotton)]"
        >
          How it works
        </a>
      </div>

      {showDialog && <InstallDialog onClose={() => setShowDialog(false)} />}
    </>
  );
}
