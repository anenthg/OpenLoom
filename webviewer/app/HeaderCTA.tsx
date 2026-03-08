"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function HeaderCTA() {
  const pathname = usePathname();
  const isViewer = pathname.startsWith("/v/");

  if (isViewer) {
    return (
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md bg-[var(--crimson)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
      >
        <svg className="h-4 w-4" viewBox="0 0 48 48" fill="none">
          <path d="M24 4c5.52 0 10.47 2.24 14.07 5.86L24 24 13.54 6.67A19.9 19.9 0 0124 4z" fill="#DB4437" />
          <path d="M38.07 9.86A19.93 19.93 0 0144 24c0 7.13-3.74 13.38-9.36 16.92L24 24l14.07-14.14z" fill="#F4B400" />
          <path d="M34.64 40.92A19.9 19.9 0 0124 44C12.95 44 4 35.05 4 24c0-6.63 3.22-12.5 8.18-16.15L24 24l10.64 16.92z" fill="#0F9D58" />
          <circle cx="24" cy="24" r="8" fill="#4285F4" />
          <circle cx="24" cy="24" r="5.5" fill="white" />
          <circle cx="24" cy="24" r="3.5" fill="#4285F4" />
        </svg>
        Get the Chrome Extension
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <a
        href="https://github.com/anenthg/OpenLoom"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-[var(--crimson)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
      >
        View on GitHub
      </a>
    </div>
  );
}
