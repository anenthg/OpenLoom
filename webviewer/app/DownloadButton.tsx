"use client";

import { useState, useEffect, useRef } from "react";

const RELEASE_URL =
  "https://github.com/anenthg/OpenLoom/releases/latest/download";

const DOWNLOAD_OPTIONS = [
  { label: "Apple Silicon", file: "OpenLoom-0.2.0-arm64.dmg", note: "M1, M2, M3, M4" },
  { label: "Intel", file: "OpenLoom-0.2.0.dmg", note: "Older Macs" },
];

export default function DownloadButton() {
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
