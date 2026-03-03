# OpenLoom

Open-source, self-hosted alternative to Loom. Record your screen, share a link, keep your data.

Your recordings live on **your own Firebase project** — no third-party servers, no vendor lock-in.

> *thari (தறி)* — Tamil for loom. Design inspired by [Bhavani Jamakkalam](https://en.wikipedia.org/wiki/Bhavani_Jamakkalam).

---

## How it works

```
Desktop App                      Firebase (yours)                 Web Viewer
+-----------+    upload video    +-------------------+    fetch    +-----------+
|  Electron | ──────────────────>|  Cloud Storage    |            |  Next.js  |
|  + React  |    insert meta    |  Firestore        |<───────────|  + Plyr   |
|           | ──────────────────>|  Cloud Functions  |───────────>|           |
+-----------+    deploy func    +-------------------+   serve    +-----------+
```

1. **Record** — Open the desktop app, pick a screen/window/tab, hit record
2. **Store** — Video uploads to your Firebase project with a shareable short link
3. **Watch** — Anyone with the link watches via the web viewer, which fetches directly from your Firebase

No central server sits between the recorder and the viewer.

---

## Features

- **Screen + Camera PiP** — Capture your screen with a draggable camera overlay
- **Self-hosted** — All data stays in your Firebase project (free tier includes 5 GB storage)
- **Instant sharing** — Shareable link copied to clipboard the moment you stop recording
- **Emoji reactions** — Viewers leave timestamped reactions that appear on the video timeline
- **Playback controls** — Speed adjustment, PiP, fullscreen via Plyr
- **One-click setup** — Paste a service account key and the app provisions everything

---

## Tech stack

| Component | Technology |
|-----------|-----------|
| Desktop app | Electron 33, React 19, Tailwind CSS 4, electron-vite 3 |
| Web viewer | Next.js 16, Plyr, Tailwind CSS 4 |
| Cloud functions | Firebase Functions v5, Node.js 20 |
| Packaging | electron-builder 25 (DMG + ZIP for macOS) |
| CI/CD | GitHub Actions (release on tag push) |

---

## Getting started

### Prerequisites

- Node.js 20+
- A Firebase project on the Blaze (pay-as-you-go) plan
- A service account key JSON for that project

### Install the desktop app

Download the latest DMG from the [Releases page](https://github.com/anenthg/OpenLoom/releases/latest) — pick **Apple Silicon** (M1/M2/M3/M4) or **Intel** depending on your Mac.

> **macOS Gatekeeper note:** The app is not yet code-signed. macOS may show *"OpenLoom is damaged and can't be opened"*. To fix this, run the following after dragging the app to `/Applications`:
>
> ```bash
> xattr -cr /Applications/OpenLoom.app
> ```

On first launch the setup wizard will ask for your service account key. It then:
1. Verifies Firestore and Cloud Storage access
2. Detects or creates a storage bucket
3. Deploys the Cloud Function that serves the public API

### Web viewer

```bash
cd webviewer
npm install
npm run dev
```

Runs on `http://localhost:3001`. Video links follow the pattern `/v/{projectId}/{shortCode}`.

---

## Project structure

```
├── desktop/                 Electron desktop app
│   ├── src/main/            Main process (Firebase Admin, IPC)
│   ├── src/preload/         Context bridge
│   ├── src/renderer/        React UI (recording, library, settings)
│   └── cloud-functions/     Reference copy of deployed function source
├── webviewer/               Next.js web viewer + landing site
│   ├── app/                 App Router pages
│   ├── app/v/[...slug]/     Video player route
│   └── lib/                 API client, types, mock data
├── .github/workflows/       CI/CD (release.yml)
├── ARCHITECTURE.md          Detailed technical architecture
└── firebase.md              Firebase services & permissions guide
```

---

## Building for release

### Manual build

```bash
cd desktop
npm run release
```

Produces DMG and ZIP installers for macOS (arm64 + x64) in `desktop/release/`.

### Automated release via GitHub Actions

Tag a version and push:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow builds the installers and publishes them as a GitHub Release.

---

## Deployment (web viewer)

The web viewer is configured for Netlify:

```bash
cd webviewer
npm run build
```

The `netlify.toml` at the repo root handles build settings. Alternatively, deploy the static export from `webviewer/.next` to any static host.

---

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Process architecture, recording pipeline, data flow
- **[firebase.md](./firebase.md)** — Firebase/GCP services, permissions, provisioning details

---

## Contributing

PRs and issues are welcome. This project is in early development (v0.2.0).

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Open a pull request

---

## License

[MIT](./LICENSE) — Anenth Guru
