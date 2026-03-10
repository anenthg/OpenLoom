# OpenLoom

Open-source, self-hosted alternative to Loom. Record your screen, share a link, keep your data.

Your recordings live on **your own Supabase project** — no third-party servers, no vendor lock-in.

<video src="https://gfenficriyjfcuhdsjbw.supabase.co/storage/v1/object/public/videos/demo.mp4" controls width="100%"></video>

---

## How it works

```
Chrome Extension                 Supabase (yours)                 Web Viewer
+--------------+   upload video  +-------------------+   fetch    +-----------+
|  Side Panel  | ───────────────>|  Storage bucket   |            |  Next.js  |
|  + Offscreen |   insert meta   |  PostgreSQL       |<───────────|  (static) |
|  Document    | ───────────────>|  Edge Functions   |───────────>|           |
+--------------+   provision     +-------------------+   serve    +-----------+
```

1. **Record** — Click the extension icon, pick a tab or window, hit record
2. **Store** — Video uploads directly to your Supabase project with a shareable link
3. **Watch** — Anyone with the link watches via the web viewer, which fetches directly from your Supabase

No central server sits between the recorder and the viewer.

---

## Features

- **Screen + Camera PiP** — Capture your screen with a configurable camera overlay (drag to reposition, resize)
- **Self-hosted** — All data stays in your Supabase project
- **Microphone + system audio** — Record narration with a live audio meter and mute toggle
- **HD recording** — Up to 1080p capture with VP9/WebM encoding
- **Instant sharing** — Shareable link copied to clipboard after upload
- **Password protection** — Optionally encrypt shared links with AES-256-GCM
- **One-click setup** — Paste a Supabase connection string and the extension provisions storage, database tables, and edge functions automatically via the Management API
- **Privacy-first** — No analytics, no telemetry, no account required

---

## Tech stack

| Component | Technology |
|-----------|-----------|
| Chrome extension | TypeScript, React 19, Tailwind CSS 4, Vite, Chrome APIs (sidePanel, offscreen, storage) |
| Recording pipeline | getDisplayMedia, getUserMedia, Canvas compositor, MediaRecorder (VP9/Opus) |
| Web viewer | Next.js 16, static export, GitHub Pages |
| Backend | Supabase (Storage, PostgreSQL, Edge Functions) |
| CI/CD | GitHub Actions (extension release on `ext-v*` tag, web viewer auto-deploy) |

---

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project (free tier works)

### Install the Chrome extension

Download the latest zip from the [Releases page](https://github.com/anenthg/OpenLoom/releases/latest).

1. Unzip `openloom-chrome.zip` to a folder
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the unzipped folder

On first launch the setup wizard will ask for your Supabase connection string. It then:
1. Verifies your Supabase project access
2. Creates the `videos` storage bucket
3. Creates database tables
4. Deploys edge functions via the Management API

### Web viewer (local development)

```bash
cd webviewer
npm install
npm run dev
```

Runs on `http://localhost:3000`. Video links follow the pattern `/v/{encodedProject}/{shortCode}`.

---

## Project structure

```
├── extension/                Chrome extension
│   ├── src/sidepanel/        React UI (recording setup, library, settings)
│   ├── src/offscreen/        Media capture, canvas compositor, recorder
│   ├── src/service-worker/   Message routing, state management, provisioning
│   ├── src/lib/              Shared types, backend clients, recording utilities
│   ├── src/options/          Extension options page
│   └── src/permissions/      Permission request page
├── webviewer/                Next.js web viewer + marketing site
│   ├── app/                  App Router pages (home, technology, pricing, privacy)
│   ├── app/v/[...slug]/      Video player route
│   └── lib/                  API client, types
├── desktop/                  Electron desktop app (paused — coming back later)
├── .github/workflows/        CI/CD
│   ├── release-extension.yml   Extension release (ext-v* tags)
│   └── deploy-pages.yml       Web viewer deploy to GitHub Pages
└── LICENSE
```

---

## Building the extension

```bash
cd extension
npm install
npm run build
```

The built extension is output to `extension/dist/`. Load it as an unpacked extension in Chrome.

### Creating a release

Tag and push to trigger the GitHub Actions release workflow:

```bash
git tag ext-v0.1.3
git push origin ext-v0.1.3
```

The workflow builds the extension, creates `openloom-chrome.zip`, and publishes it as a GitHub Release.

---

## Web viewer deployment

The web viewer auto-deploys to GitHub Pages on push to `main` when files in `webviewer/` change.

To build manually:

```bash
cd webviewer
npm run build
```

Produces a static export in `webviewer/out/` that can be deployed to any static host.

---

## Backend support

| Provider | Status |
|----------|--------|
| **Supabase** | Supported — fully integrated with auto-provisioning |
| Firebase | Coming soon |
| Convex | Coming soon |

---

## Privacy

- The extension collects **no analytics, telemetry, or personal data**
- The marketing site (openloom.live) uses [GoatCounter](https://www.goatcounter.com) — cookieless, privacy-friendly, open-source analytics
- Video player pages (`/v/...`) are **excluded** from analytics
- Full [Privacy Policy](https://openloom.live/privacy)

---

## Contributing

PRs and issues are welcome.

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Open a pull request

---

## License

[MIT](./LICENSE) — Anenth Guru
