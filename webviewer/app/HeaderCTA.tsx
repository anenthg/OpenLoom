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
        className="rounded-md bg-[var(--crimson)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
      >
        Download
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/technology"
        className="text-sm font-medium text-[var(--cotton)]/50 transition-colors hover:text-[var(--cotton)]"
      >
        Technology
      </Link>
      <a
        href="https://github.com/niceBoy0419/openloom/releases"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-[var(--crimson)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
      >
        View on GitHub
      </a>
    </div>
  );
}
