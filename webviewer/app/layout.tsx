import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import Link from "next/link";
import HeaderCTA from "./HeaderCTA";
import HeaderStripe from "./HeaderStripe";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenLoom — Open Source Video Messaging",
  description: "Open-source Loom alternative you self-host. Own your threads.",
  metadataBase: new URL("https://www.openloom.live"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OpenLoom — Open Source Video Messaging",
    description: "Open-source Loom alternative you self-host. Own your threads.",
    url: "https://www.openloom.live",
    siteName: "OpenLoom",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenLoom — Open Source Video Messaging",
    description: "Open-source Loom alternative you self-host. Own your threads.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OpenLoom",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "macOS, Windows, Linux",
  description:
    "Open-source Loom alternative you self-host. Record your screen, store on your own Supabase, share instantly.",
  url: "https://www.openloom.live",
  downloadUrl: "https://github.com/anenthg/OpenLoom/releases",
  softwareVersion: "1.0",
  author: {
    "@type": "Organization",
    name: "OpenLoom",
    url: "https://www.openloom.live",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: undefined, // Add when you have reviews
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-[var(--warp-indigo)] text-[var(--cotton)]`}
      >
        <header className="sticky top-0 z-50">
          <nav className="flex h-14 items-center justify-between bg-[var(--warp-indigo)] px-6">
            <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between">
              <Link
                href="/"
                className="font-mono text-[1.575rem] font-bold tracking-tight"
              >
                <span className="text-[var(--cotton)]">Open</span>
                <span className="text-[var(--cotton)]/40">Loom</span>
              </Link>
              <HeaderCTA />
            </div>
          </nav>
          <HeaderStripe />
        </header>
        {children}

        {/* GoatCounter — privacy-friendly, cookieless analytics */}
        {/* Excludes /v/ video player pages (other people's content) */}
        <Script id="goatcounter-config" strategy="afterInteractive">
          {`window.goatcounter = {
            path: function(p) {
              if (p.startsWith('/v/')) return null;
              return p;
            }
          }`}
        </Script>
        <Script
          data-goatcounter="https://openloom.goatcounter.com/count"
          src="//gc.zgo.at/count.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
