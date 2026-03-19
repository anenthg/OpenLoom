"use client";

const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/openloom/hmpllnbkmfmmjnfdllckpngaljppnoec?utm_source=website";

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
  return (
    <>
      {/* Primary CTA — Chrome Extension */}
      <a
        href={CHROME_WEB_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center rounded-lg bg-[var(--crimson)] px-6 py-3 text-base font-semibold text-white transition-all cursor-pointer hover:brightness-110 hover:shadow-[0_0_30px_rgba(217,43,43,0.3)] active:scale-[0.97]"
      >
        <ChromeIcon className="mr-2 h-5 w-5" />
        Add to Chrome
      </a>

      {/* See it in action */}
      <a
        href="https://openloom.live/v/cy1nZmVuZmljcml5amZjdWhkc2pidw/0tZYznu3"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg border border-[var(--emerald)]/20 px-6 py-3 text-base font-medium text-[var(--emerald)] transition-all hover:border-[var(--emerald)]/40 hover:bg-[var(--emerald)]/10"
      >
        See it in action
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
    </>
  );
}
