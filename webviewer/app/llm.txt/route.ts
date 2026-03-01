const CONTENT = `# Thari (thari.video)

> thari (தறி) — Tamil for "loom". An open-source, self-hosted alternative to Loom.
> Design inspired by Bhavani Jamakkalam, a traditional handloom carpet from Tamil Nadu, India.

## What is Thari?

Thari is an open-source screen recording and sharing platform. Users record their screen via a macOS desktop app, and recordings are stored on their own Firebase project — no third-party servers, no vendor lock-in. Viewers watch recordings through the Thari web player, which fetches video data directly from the creator's Firebase instance.

The project has two parts:
1. **Desktop app** (macOS) — records screen, camera, and uploads to Firebase
2. **Web player** (this repo) — a Next.js app that plays back shared recordings

This repository is the **web player**.

## Architecture

Thari follows a federated model. There is no central server.

\`\`\`
Desktop App ──(upload video)──▶ Creator's Firebase
                                       │
Viewer browser ◀──(stream video)────────┘
               ──(post reactions)──────▶
\`\`\`

- The desktop app records and uploads video to the user's own Firebase Cloud Storage.
- Metadata (title, description, view count, duration, capture mode) is stored in Firestore.
- A Firebase Cloud Function (\`/thari\`) exposes a public API for the web player.
- The web player fetches metadata, downloads all chunks, concatenates them into a single Blob, and plays via Plyr.
- Viewers can leave timestamped emoji reactions that are stored back in Firestore.

### URL scheme

\`\`\`
https://thari.video/v/{firebase-project-id}/{video-code}
\`\`\`

- \`firebase-project-id\`: the creator's Firebase project ID
- \`video-code\`: unique identifier for the recording

The web player uses the project ID to construct the Cloud Function URL: \`https://us-central1-{projectId}.cloudfunctions.net/thari\`

## Tech stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript 5)
- **Styling**: Tailwind CSS 4, custom CSS variables, glassmorphism effects
- **Video player**: Plyr 3.8
- **Fonts**: Space Grotesk (body), JetBrains Mono (code/logo)
- **Deployment**: Netlify with @netlify/plugin-nextjs
- **Testing**: Playwright for E2E tests

## Project structure

\`\`\`
app/
├── layout.tsx              Root layout (fonts, header with logo + CTA)
├── page.tsx                Landing page (hero, features, how-it-works, CTA, footer)
├── HeaderCTA.tsx           Context-aware header button (Download on viewer, GitHub elsewhere)
├── globals.css             Design system (colors, Jamakkalam patterns, animations)
├── icon.svg                Favicon (Jamakkalam stripe pattern)
└── v/[...slug]/
    ├── page.tsx            Server wrapper
    └── ViewerClient.tsx    Full video viewer (player, reactions, metadata, password gate)

lib/
├── api.ts                  Firebase Cloud Functions API client
├── mock.ts                 Mock API layer for local development
└── reactions.ts            Reaction emoji definitions and types
\`\`\`

## API endpoints (Firebase Cloud Functions)

All endpoints are relative to \`https://us-central1-{projectId}.cloudfunctions.net/thari\`:

| Method | Path                    | Description                        |
|--------|-------------------------|------------------------------------|
| GET    | /v/{code}               | Fetch video metadata               |
| POST   | /v/{code}/verify        | Verify password for protected video|
| POST   | /v/{code}/view          | Increment view count               |
| GET    | /v/{code}/reactions     | Fetch all reactions                |
| POST   | /v/{code}/reactions     | Add a timestamped emoji reaction   |
| GET    | /v/{code}/manifest      | Fetch chunk manifest (URL list)    |

## Data models

### VideoMeta
\`\`\`typescript
interface VideoMeta {
  title: string;
  description: string | null;
  video_url: string | null;
  is_protected: boolean;
  view_count: number;
  duration_ms: number | null;
  capture_mode: string;        // "screen" | "window" | "tab"
  created_at: string;          // ISO 8601
}
\`\`\`

### Reaction
\`\`\`typescript
interface Reaction {
  id: string;
  emoji: string;               // one of: 👍 ❤️ 🔥 😂 👏 🎉
  timestamp: number;           // seconds into the video
  created_at: string;          // ISO 8601
}
\`\`\`

### VideoManifest
\`\`\`typescript
interface VideoManifest {
  chunks: string[];            // ordered list of chunk URLs
}
\`\`\`

## Video playback flow

1. Parse URL to extract \`projectId\` and \`code\`
2. Fetch metadata via \`GET /v/{code}\`
3. If \`is_protected\`, show password gate → verify via \`POST /v/{code}/verify\`
4. Increment view count via \`POST /v/{code}/view\`
5. Fetch manifest via \`GET /v/{code}/manifest\`
6. Download all chunks in parallel, concatenate into a single WebM Blob
7. Create object URL, bind to \`<video>\` element
8. Initialize Plyr player with custom controls
9. Apply WebM duration fix (seek to end and back for browsers that report Infinity)
10. Fetch reactions, render as colored dots on the Plyr progress bar
11. User reactions are optimistically added with floating emoji animation

## Design system

### Brand name origin
"Thari" (தறி) means "loom" in Tamil. The visual identity draws from **Bhavani Jamakkalam**, a traditional handloom carpet woven in Bhavani, Tamil Nadu. The stripe patterns, color palette, and textile metaphors throughout the UI reference this heritage.

### Color palette
| Token         | Hex       | Usage                          |
|---------------|-----------|--------------------------------|
| Warp Indigo   | #1A1A2E   | Primary background             |
| Cotton        | #F5F5E8   | Primary text, light accents    |
| Crimson       | #D92B2B   | CTAs, recording indicator      |
| Mustard       | #F5C518   | Secondary accent, Firebase     |
| Emerald       | #0E9A57   | Tertiary accent, player/watch  |
| Deep Black    | #0A0A12   | Stripe accent, dark overlay    |

### Typography
- **Space Grotesk**: headings and body text (CSS var: \`--font-space-grotesk\`)
- **JetBrains Mono**: code, logo wordmark, monospace elements (CSS var: \`--font-jetbrains-mono\`)

### Key CSS patterns
- \`.jamakkalam-stripes\`: repeating-linear-gradient with symmetrical stripe clusters (290px repeat)
- \`.glass-terminal\`: glassmorphism card with backdrop-blur(24px)
- \`.stripe-divider\`: thin Jamakkalam stripe bar used as section divider
- \`.stripe-hover-border\`: ::after pseudo-element with scaleX hover animation on cards
- \`[data-reveal]\`: scroll-triggered fade-in-up via IntersectionObserver

## Features

- **Screen + Camera recording** (via desktop app)
- **Self-hosted storage** on user's own Firebase (5 GB free tier)
- **Instant sharing** with shareable links
- **Password protection** for sensitive recordings
- **Timestamped emoji reactions** (👍 ❤️ 🔥 😂 👏 🎉) displayed on video timeline
- **View counting** and metadata display
- **Responsive** web player with Plyr controls (speed, PiP, fullscreen)

## Development

\`\`\`bash
npm install
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
\`\`\`

Mock mode activates automatically on localhost, providing fake data without a Firebase backend. Set \`NEXT_PUBLIC_USE_MOCK=true\` to force mock mode in other environments.

### Mock special codes
- \`00000\` → returns "not found"
- \`99999\` → returns password-protected video (password: "demo")
- Any other code → returns standard mock video

## Links

- Website: https://thari.video
- GitHub: https://github.com/niceBoy0419/openloom
- Releases: https://github.com/niceBoy0419/openloom/releases
`;

export async function GET() {
  return new Response(CONTENT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
