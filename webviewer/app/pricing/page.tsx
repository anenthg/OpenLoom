"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HeroCTA from "../ChromeExtensionButton";

/* ------------------------------------------------------------------ */
/* Types & Data                                                       */
/* ------------------------------------------------------------------ */

type Provider = "supabase" | "convex" | "firebase";

interface ShortVersionCard {
  label: string;
  color: string;
  value: string;
  subtitle: string;
  details: string[];
}

interface BreakdownItem {
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: React.ReactNode;
  stats: { value: string; label: string }[];
  callout?: { title: string; body: string };
}

interface ViewingBudgetRow {
  video: string;
  views: string;
}

interface SourceLink {
  label: string;
  href: string;
}

interface CostPerMinute {
  hd: string;
  nonHd: string;
  note: string;
}

interface ProviderConfig {
  name: string;
  color: string;
  badge: string;
  status: "available" | "coming-soon";
  tagline: string;
  shortVersion: ShortVersionCard[];
  breakdown: BreakdownItem[];
  viewingBudget: {
    freeEgress: string;
    description: string;
    rows: ViewingBudgetRow[];
  };
  costPerMinute: CostPerMinute;
  tldr: {
    summary: React.ReactNode;
    footnote: string;
  };
  sourceLinks: SourceLink[];
}

/* SVG icon helpers */
const CloudIcon = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01" strokeLinecap="round" />
  </svg>
);
const DatabaseIcon = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);
const FunctionsIcon = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const PROVIDERS: Record<Provider, ProviderConfig> = {
  supabase: {
    name: "Supabase",
    color: "var(--emerald)",
    badge: "Developer friendly",
    status: "available",
    tagline:
      "Supabase gives you Postgres + Storage + Edge Functions on a generous free tier. Here\u2019s what you get.",
    shortVersion: [
      {
        label: "HD Mode",
        color: "var(--crimson)",
        value: "~33m",
        subtitle: "of recording for free",
        details: ["1920 \u00d7 1080 \u00b7 5 Mbps", "~30 MB / minute"],
      },
      {
        label: "Non-HD Mode",
        color: "var(--mustard)",
        value: "~1h",
        subtitle: "of recording for free",
        details: ["1280 \u00d7 720 \u00b7 2.5 Mbps", "~15 MB / minute"],
      },
      {
        label: "Beyond Free",
        color: "var(--emerald)",
        value: "$25",
        subtitle: "per month (Pro plan)",
        details: ["100 GB storage", "250 GB bandwidth"],
      },
    ],
    breakdown: [
      {
        title: "File Storage",
        badge: "bottleneck",
        badgeColor: "var(--mustard)",
        description:
          "Where your video files live. 1 GB free storage is the main constraint.",
        icon: CloudIcon,
        stats: [
          { value: "1 GB", label: "free storage" },
          { value: "2 GB", label: "free egress / month" },
        ],
        callout: {
          title: "Inactivity pause",
          body: "Free-tier Supabase projects are paused after 7 days of inactivity. Your data is preserved but the project must be manually resumed. Keep this in mind if sharing links to recordings.",
        },
      },
      {
        title: "Database (Postgres)",
        badge: "not a concern",
        badgeColor: "var(--emerald)",
        description:
          "Stores video metadata. 500 MB is more than enough for thousands of recordings.",
        icon: DatabaseIcon,
        stats: [
          { value: "500 MB", label: "database space" },
          { value: "2", label: "free projects" },
        ],
      },
      {
        title: "Edge Functions",
        badge: "not a concern",
        badgeColor: "var(--crimson)",
        description:
          "Serverless functions to serve your videos. 500K invocations is plenty for personal or team use.",
        icon: FunctionsIcon,
        stats: [
          { value: "500K", label: "invocations / month" },
          { value: "100", label: "concurrent connections" },
        ],
      },
    ],
    viewingBudget: {
      freeEgress: "2 GB",
      description:
        "2 GB of free egress per month is limited. Videos will eat through this quickly.",
      rows: [
        { video: "2 min HD (~60 MB)", views: "~33" },
        { video: "5 min HD (~150 MB)", views: "~13" },
        { video: "5 min non-HD (~75 MB)", views: "~26" },
        { video: "10 min HD (~300 MB)", views: "~6" },
      ],
    },
    tldr: {
      summary: (
        <>
          Supabase&apos;s free tier gives you{" "}
          <span className="text-[var(--cotton)]">1 GB of storage</span> and{" "}
          <span className="text-[var(--cotton)]">2 GB of egress</span>. That&apos;s
          about 33 minutes of HD recording and very limited viewing. Great for
          testing, but you&apos;ll likely need the Pro plan ($25/mo) for real
          usage.
        </>
      ),
      footnote:
        "For the most generous free tier, consider Firebase — 5 GB storage and 100 GB egress at zero cost.",
    },
    costPerMinute: {
      hd: "$0.0075",
      nonHd: "$0.00375",
      note: "Based on Pro plan ($25/mo for 100 GB storage)",
    },
    sourceLinks: [
      {
        label: "Supabase Pricing",
        href: "https://supabase.com/pricing",
      },
      {
        label: "Supabase Storage Docs",
        href: "https://supabase.com/docs/guides/storage",
      },
    ],
  },

  convex: {
    name: "Convex",
    color: "var(--crimson)",
    badge: "Developer friendly",
    status: "available",
    tagline:
      "OpenLoom supports Convex as an alternative backend. Here\u2019s what the free tier looks like.",
    shortVersion: [
      {
        label: "HD Mode",
        color: "var(--crimson)",
        value: "~33m",
        subtitle: "of recording for free",
        details: ["1920 \u00d7 1080 \u00b7 5 Mbps", "~30 MB / minute"],
      },
      {
        label: "Non-HD Mode",
        color: "var(--mustard)",
        value: "~1h",
        subtitle: "of recording for free",
        details: ["1280 \u00d7 720 \u00b7 2.5 Mbps", "~15 MB / minute"],
      },
      {
        label: "Beyond Free",
        color: "var(--emerald)",
        value: "$25",
        subtitle: "per dev / month (Pro plan)",
        details: ["100 GB storage", "50 GB bandwidth"],
      },
    ],
    breakdown: [
      {
        title: "File Storage",
        badge: "bottleneck",
        badgeColor: "var(--mustard)",
        description:
          "Where your video files live. 1 GB free storage and 1 GB egress are tight constraints.",
        icon: CloudIcon,
        stats: [
          { value: "1 GB", label: "free storage" },
          { value: "1 GB", label: "free egress / month" },
        ],
      },
      {
        title: "Database",
        badge: "not a concern",
        badgeColor: "var(--emerald)",
        description:
          "Stores video metadata. 0.5 GB is sufficient for video metadata.",
        icon: DatabaseIcon,
        stats: [
          { value: "0.5 GB", label: "database space" },
          { value: "1M", label: "documents" },
        ],
      },
      {
        title: "Functions",
        badge: "not a concern",
        badgeColor: "var(--crimson)",
        description:
          "Serverless functions that serve your videos. 1M calls should handle normal usage comfortably.",
        icon: FunctionsIcon,
        stats: [
          { value: "1M", label: "function calls / month" },
          { value: "25M", label: "bandwidth (actions)" },
        ],
      },
    ],
    viewingBudget: {
      freeEgress: "1 GB",
      description:
        "1 GB of free egress per month is very limited. You\u2019ll hit this quickly with video content.",
      rows: [
        { video: "2 min HD (~60 MB)", views: "~16" },
        { video: "5 min HD (~150 MB)", views: "~6" },
        { video: "5 min non-HD (~75 MB)", views: "~13" },
        { video: "10 min HD (~300 MB)", views: "~3" },
      ],
    },
    tldr: {
      summary: (
        <>
          Convex&apos;s free tier gives you{" "}
          <span className="text-[var(--cotton)]">1 GB of storage</span> and{" "}
          <span className="text-[var(--cotton)]">1 GB of egress</span>. That&apos;s
          about 33 minutes of HD recording and very few free views. Best for
          prototyping — real usage needs the Pro plan ($25/dev/mo).
        </>
      ),
      footnote:
        "For the most generous free tier, consider Firebase — 5 GB storage and 100 GB egress at zero cost.",
    },
    costPerMinute: {
      hd: "$0.0075",
      nonHd: "$0.00375",
      note: "Based on Pro plan ($25/dev/mo for 100 GB storage)",
    },
    sourceLinks: [
      {
        label: "Convex Pricing",
        href: "https://www.convex.dev/pricing",
      },
      {
        label: "Convex Limits Docs",
        href: "https://docs.convex.dev/production/state/limits",
      },
    ],
  },

  firebase: {
    name: "Firebase",
    color: "var(--mustard)",
    badge: "Cost effective",
    status: "available",
    tagline:
      "OpenLoom is free and open source. Your recordings live on Firebase\u2019s generous free tier \u2014 here\u2019s exactly what you get.",
    shortVersion: [
      {
        label: "HD Mode",
        color: "var(--crimson)",
        value: "~3h",
        subtitle: "of recording for free",
        details: ["1920 \u00d7 1080 \u00b7 5 Mbps", "~30 MB / minute"],
      },
      {
        label: "Non-HD Mode",
        color: "var(--mustard)",
        value: "~6h",
        subtitle: "of recording for free",
        details: ["1280 \u00d7 720 \u00b7 2.5 Mbps", "~15 MB / minute"],
      },
      {
        label: "Beyond Free",
        color: "var(--emerald)",
        value: "$0.02",
        subtitle: "per GB / month after 5 GB",
        details: ["50 GB of recordings", "would cost ~$1/month"],
      },
    ],
    breakdown: [
      {
        title: "Cloud Storage",
        badge: "bottleneck",
        badgeColor: "var(--mustard)",
        description:
          "Where your video files live. This is the only limit that matters for most users.",
        icon: CloudIcon,
        stats: [
          { value: "5 GB", label: "free storage" },
          { value: "100 GB", label: "free egress / month" },
        ],
        callout: {
          title: "Region matters",
          body: "The 5 GB free storage only applies to US regions: us-central1, us-east1, or us-west1. Pick one of these when creating your Storage bucket. Any other region is billed from the first byte.",
        },
      },
      {
        title: "Cloud Firestore",
        badge: "not a concern",
        badgeColor: "var(--emerald)",
        description:
          "Stores video metadata, view counts, and emoji reactions. Each recording is a few KB \u2014 you\u2019d need thousands of recordings before this matters.",
        icon: DatabaseIcon,
        stats: [
          { value: "1 GiB", label: "stored data" },
          { value: "50K", label: "reads / day" },
          { value: "20K", label: "writes / day" },
        ],
      },
      {
        title: "Cloud Functions",
        badge: "not a concern",
        badgeColor: "var(--crimson)",
        description:
          "The public API that serves your videos. Each view triggers one invocation. You\u2019d need ~65,000 views per day to hit the limit.",
        icon: FunctionsIcon,
        stats: [
          { value: "2M", label: "invocations / month" },
          { value: "400K", label: "GB-seconds compute" },
        ],
      },
    ],
    viewingBudget: {
      freeEgress: "100 GB",
      description:
        "100 GB of free egress per month means your videos can be watched plenty of times before you pay a cent.",
      rows: [
        { video: "2 min HD (~60 MB)", views: "~1,600" },
        { video: "5 min HD (~150 MB)", views: "~660" },
        { video: "5 min non-HD (~75 MB)", views: "~1,300" },
        { video: "10 min HD (~300 MB)", views: "~330" },
      ],
    },
    tldr: {
      summary: (
        <>
          Storage is the only limit that matters. Pick a US region, get 5 GB
          free. That&apos;s{" "}
          <span className="text-[var(--cotton)]">3 hours of HD</span> or{" "}
          <span className="text-[var(--cotton)]">6 hours of 720p</span>{" "}
          recording without spending anything. Everything else — Firestore,
          Functions, egress — is free for normal usage.
        </>
      ),
      footnote:
        "If you outgrow 5 GB, it\u2019s $0.02/GB/month. That\u2019s about the cost of a packet of biscuits for 50 GB of recordings.",
    },
    costPerMinute: {
      hd: "$0.0006",
      nonHd: "$0.0003",
      note: "Based on $0.02/GB storage (pay-as-you-go beyond 5 GB free)",
    },
    sourceLinks: [
      {
        label: "GCP Always Free tier",
        href: "https://docs.cloud.google.com/free/docs/free-cloud-features",
      },
      {
        label: "Firebase Pricing",
        href: "https://firebase.google.com/pricing",
      },
    ],
  },
};

const LOOM_PLANS = [
  {
    name: "Starter",
    price: "Free",
    limits: "5 min limit, 100 videos max, basic analytics",
  },
  {
    name: "Business",
    price: "$15/user/mo",
    limits: "Unlimited recording & storage, custom branding",
  },
  {
    name: "Business + AI",
    price: "$20/user/mo",
    limits: "AI summaries, auto-chapters, filler word removal",
  },
  {
    name: "Enterprise",
    price: "Custom",
    limits: "SSO, SCIM, audit logs, advanced admin controls",
  },
];

/* ------------------------------------------------------------------ */
/* Scroll reveal hook — re-triggers on provider change                */
/* ------------------------------------------------------------------ */

function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    // Reset all revealed elements so they can animate again
    els.forEach((el) => el.removeAttribute("data-visible"));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const [provider, setProvider] = useState<Provider>("supabase");
  const config = PROVIDERS[provider];

  useScrollReveal([provider]);

  return (
    <main className="overflow-x-hidden">
      {/* -------------------------------------------------------------- */}
      {/* HERO                                                           */}
      {/* -------------------------------------------------------------- */}
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
              ~/openloom/pricing
            </span>
          </div>

          <h1 className="font-sans text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-[var(--cotton)]">
            What It Costs
            <br />
            <span className="text-[var(--cotton)]/50">
              Spoiler: probably nothing.
            </span>
          </h1>

          <div className="mt-6 font-mono text-sm leading-relaxed">
            <div className="text-[var(--mustard)]">
              <span className="text-[var(--emerald)]">$</span> {config.tagline}
            </div>
          </div>

          {/* Provider toggle */}
          <div className="mt-8 flex flex-wrap gap-2">
            {(Object.keys(PROVIDERS) as Provider[]).map((p) => {
              const pc = PROVIDERS[p];
              const isActive = p === provider;
              return (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`relative rounded-full px-5 py-2 font-mono text-sm font-medium transition-all ${
                    isActive
                      ? "text-[var(--warp-indigo)]"
                      : "border border-[var(--cotton)]/15 text-[var(--cotton)]/50 hover:border-[var(--cotton)]/30 hover:text-[var(--cotton)]/70"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: pc.color }
                      : undefined
                  }
                >
                  {pc.name}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-[var(--warp-indigo)]/30 text-[var(--warp-indigo)]"
                        : `text-[var(--cotton)]/40`
                    }`}
                    style={!isActive ? { backgroundColor: `color-mix(in srgb, ${pc.color} 12%, transparent)` } : undefined}
                  >
                    {pc.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Coming soon banner */}
          {config.status === "coming-soon" && (
            <div className="mt-4 rounded-lg border border-[var(--mustard)]/20 bg-[var(--mustard)]/[0.06] px-4 py-2.5 font-mono text-xs text-[var(--mustard)]">
              Coming soon — pricing shown for planning purposes
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* THE SHORT VERSION                                              */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2
            className="mb-4 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
          >
            The Short Version
          </h2>
          <p
            className="mx-auto mb-16 max-w-2xl text-center text-lg text-[var(--cotton)]/50"
            data-reveal
            data-delay="100"
          >
            {provider === "firebase"
              ? "A fresh Firebase project on the Blaze plan gives you real recording time at zero cost. You only pay if you outgrow the free tier."
              : `Here\u2019s what ${config.name}\u2019s free tier means for recording time.`}
          </p>

          <div
            key={provider}
            className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
            data-reveal
            data-delay="200"
          >
            {config.shortVersion.map((card) => (
              <div
                key={card.label}
                className="stripe-hover-border rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] p-8 text-center"
              >
                <p
                  className="font-mono text-xs uppercase tracking-widest"
                  style={{ color: card.color }}
                >
                  {card.label}
                </p>
                <p className="mt-3 text-5xl font-bold text-[var(--cotton)]">
                  {card.value}
                </p>
                <p className="mt-1 text-sm text-[var(--cotton)]/40">
                  {card.subtitle}
                </p>
                <div className="mt-4 space-y-1 text-xs text-[var(--cotton)]/30">
                  {card.details.map((d, i) => (
                    <p key={i}>{d}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {provider !== "firebase" && (
            <p
              className="mt-6 text-center text-sm text-[var(--cotton)]/40"
              data-reveal
              data-delay="300"
            >
              Firebase offers ~3h HD free vs {config.shortVersion[0].value} here.{" "}
              <button
                onClick={() => setProvider("firebase")}
                className="border-b border-dotted border-[var(--mustard)]/40 text-[var(--mustard)] transition-colors hover:border-[var(--mustard)]"
              >
                Compare Firebase
              </button>
            </p>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* FREE TIER BREAKDOWN                                            */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2
            className="mb-4 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
          >
            {config.name} Free Tier{" "}
            <span className="text-[var(--cotton)]/40">Breakdown</span>
          </h2>
          <p
            className="mx-auto mb-16 max-w-2xl text-center text-lg text-[var(--cotton)]/50"
            data-reveal
            data-delay="100"
          >
            {provider === "firebase"
              ? "The Blaze plan is pay-as-you-go but includes no-cost quotas. Here\u2019s what matters for OpenLoom."
              : `${config.name}\u2019s free tier includes these limits. Here\u2019s what matters for OpenLoom.`}
          </p>

          <div
            key={provider + "-breakdown"}
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
            data-reveal
            data-delay="200"
          >
            {config.breakdown.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] p-6 md:p-8"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${item.badgeColor} 10%, transparent)`,
                      color: item.badgeColor,
                    }}
                  >
                    {item.icon}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--cotton)]">
                        {item.title}
                      </h3>
                      <span
                        className="rounded-full px-3 py-1 font-mono text-xs"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${item.badgeColor} 10%, transparent)`,
                          color: item.badgeColor,
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--cotton)]/50">
                      {item.description}
                    </p>
                    <div
                      className={`mt-4 grid gap-4 ${
                        item.stats.length === 3
                          ? "sm:grid-cols-3"
                          : "sm:grid-cols-2"
                      }`}
                    >
                      {item.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg bg-[var(--cotton)]/[0.03] px-4 py-3"
                        >
                          <p
                            className="font-mono text-2xl font-bold"
                            style={{ color: item.badgeColor }}
                          >
                            {stat.value}
                          </p>
                          <p className="text-xs text-[var(--cotton)]/40">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                    {item.callout && (
                      <div
                        className="mt-4 rounded-lg border px-4 py-3"
                        style={{
                          borderColor: `color-mix(in srgb, ${item.badgeColor} 15%, transparent)`,
                          backgroundColor: `color-mix(in srgb, ${item.badgeColor} 4%, transparent)`,
                        }}
                      >
                        <p
                          className="text-xs font-medium"
                          style={{ color: item.badgeColor }}
                        >
                          {item.callout.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--cotton)]/40">
                          {item.callout.body}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* VIEWING BUDGET                                                 */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2
            className="mb-4 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
          >
            Viewing Budget
          </h2>
          <p
            className="mx-auto mb-16 max-w-2xl text-center text-lg text-[var(--cotton)]/50"
            data-reveal
            data-delay="100"
          >
            {config.viewingBudget.description}
          </p>

          <div
            key={provider + "-budget"}
            className="mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500"
            data-reveal
            data-delay="200"
          >
            <div className="mb-4 text-center">
              <span
                className="inline-block rounded-full px-4 py-1.5 font-mono text-sm font-medium"
                style={{
                  backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)`,
                  color: config.color,
                }}
              >
                {config.viewingBudget.freeEgress} free egress / month
              </span>
            </div>
            <div className="rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] p-6 md:p-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--cotton)]/8">
                    <th className="pb-3 text-left font-mono text-xs uppercase tracking-widest text-[var(--cotton)]/30">
                      Video
                    </th>
                    <th className="pb-3 text-right font-mono text-xs uppercase tracking-widest text-[var(--cotton)]/30">
                      Free views / month
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--cotton)]/60">
                  {config.viewingBudget.rows.map((row, i) => (
                    <tr
                      key={row.video}
                      className={
                        i < config.viewingBudget.rows.length - 1
                          ? "border-b border-[var(--cotton)]/5"
                          : ""
                      }
                    >
                      <td className="py-3">{row.video}</td>
                      <td className="py-3 text-right font-mono text-[var(--cotton)]">
                        {row.views}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* VS LOOM                                                        */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-4 text-center text-4xl font-bold tracking-tight text-[var(--cotton)]"
            data-reveal
          >
            vs Loom
          </h2>
          <p
            className="mx-auto mb-16 max-w-2xl text-center text-lg text-[var(--cotton)]/50"
            data-reveal
            data-delay="100"
          >
            How does self-hosted OpenLoom compare to Loom&apos;s SaaS plans?
          </p>

          <div
            key={provider + "-loom"}
            className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
            data-reveal
            data-delay="200"
          >
            {/* Left: OpenLoom + Provider */}
            <div className="rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] p-6 md:p-8">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xl font-bold text-[var(--cotton)]">
                  OpenLoom + {config.name}
                </h3>
                <span className="rounded-full bg-[var(--emerald)]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--emerald)]">
                  Open Source
                </span>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-[var(--cotton)]/[0.03] px-4 py-3">
                  <p className="font-mono text-3xl font-bold text-[var(--emerald)]">
                    $0
                  </p>
                  <p className="text-xs text-[var(--cotton)]/40">
                    within the free tier
                  </p>
                </div>
                <div className="space-y-2 text-sm text-[var(--cotton)]/50">
                  <p>
                    &bull; {config.shortVersion[0].value} HD recording free
                  </p>
                  <p>
                    &bull; {config.viewingBudget.freeEgress} egress / month
                  </p>
                  <p>&bull; Unlimited video length</p>
                  <p>&bull; Self-hosted — you own the data</p>
                  <p>&bull; No per-user pricing</p>
                </div>
                <div className="rounded-lg border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] px-4 py-3">
                  <p className="text-xs text-[var(--cotton)]/30">
                    Beyond free tier
                  </p>
                  <p className="mt-1 font-mono text-sm text-[var(--cotton)]/60">
                    {provider === "firebase"
                      ? "$0.02/GB/month — ~$1/mo for 50 GB"
                      : `${config.name} Pro: ${config.shortVersion[2].subtitle}`}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] px-4 py-3">
                  <p className="text-xs text-[var(--cotton)]/30">
                    Cost per minute of recording
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-mono text-lg font-bold" style={{ color: config.color }}>
                        {config.costPerMinute.hd}
                      </p>
                      <p className="text-[10px] text-[var(--cotton)]/40">
                        per min &middot; HD (1080p)
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-lg font-bold" style={{ color: config.color }}>
                        {config.costPerMinute.nonHd}
                      </p>
                      <p className="text-[10px] text-[var(--cotton)]/40">
                        per min &middot; 720p
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-[var(--cotton)]/25">
                    {config.costPerMinute.note}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Loom SaaS */}
            <div className="rounded-2xl border border-[var(--cotton)]/8 bg-[var(--cotton)]/[0.03] p-6 md:p-8">
              <h3 className="mb-4 text-xl font-bold text-[var(--cotton)]">
                Loom SaaS
              </h3>
              <div className="space-y-3">
                {LOOM_PLANS.map((plan) => (
                  <div
                    key={plan.name}
                    className="rounded-lg bg-[var(--cotton)]/[0.03] px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="font-medium text-[var(--cotton)]">
                        {plan.name}
                      </p>
                      <p className="font-mono text-sm text-[var(--cotton)]/60">
                        {plan.price}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--cotton)]/40">
                      {plan.limits}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison callout */}
          <div
            className="mt-8 rounded-2xl border border-[var(--emerald)]/15 bg-[var(--emerald)]/[0.04] p-6 md:p-8"
            data-reveal
            data-delay="300"
          >
            <p className="text-center text-lg text-[var(--cotton)]/70">
              For a team of 10, Loom Business costs{" "}
              <span className="font-bold text-[var(--cotton)]">
                $1,800/year
              </span>
              . OpenLoom + {config.name}:{" "}
              <span className="font-bold text-[var(--emerald)]">
                $0/year
              </span>{" "}
              within the free tier.
            </p>
          </div>

          {/* Fair disclaimer */}
          <p
            className="mt-4 text-center text-xs text-[var(--cotton)]/30"
            data-reveal
            data-delay="350"
          >
            Loom includes managed hosting, transcription, and AI features.
            OpenLoom&apos;s value is ownership and cost savings.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* TL;DR                                                          */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-[var(--warp-indigo)] px-6 py-24">
        <div
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
          data-reveal
        >
          <h2 className="text-4xl font-bold tracking-tight text-[var(--cotton)]">
            TL;DR
          </h2>
          <p
            key={provider + "-tldr"}
            className="mt-6 text-lg leading-relaxed text-[var(--cotton)]/50 animate-in fade-in duration-500"
          >
            {config.tldr.summary}
          </p>
          <p className="mt-4 text-sm text-[var(--cotton)]/30">
            {config.tldr.footnote}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <HeroCTA />
            <Link
              href="/technology"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--cotton)]/15 px-6 py-3 text-base font-medium text-[var(--cotton)]/70 transition-all hover:border-[var(--cotton)]/30 hover:text-[var(--cotton)]"
            >
              How it works
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* FOOTER                                                         */}
      {/* -------------------------------------------------------------- */}
      <footer className="border-t border-[var(--cotton)]/5 bg-[var(--warp-indigo)] px-6 py-8">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between text-sm text-[var(--cotton)]/40">
          <span className="font-mono text-xs text-[var(--cotton)]/25">
            Source:{" "}
            {config.sourceLinks.map((link, i) => (
              <span key={link.href}>
                {i > 0 && <> &middot; </>}
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-dotted border-[var(--cotton)]/25 transition-colors hover:text-[var(--cotton)]/40"
                >
                  {link.label}
                </a>
              </span>
            ))}
          </span>
          <span className="font-mono text-xs text-[var(--cotton)]/25">
            Estimates based on VP9/WebM at stated bitrates
            {" · "}
            <Link
              href="/privacy"
              className="transition-colors hover:text-[var(--cotton)]/40"
            >
              Privacy
            </Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
