# Architecture

Thari is a self-hosted, open-source screen recording tool. It has two halves — a **desktop app** that records and uploads, and a **web viewer** that plays back and collects reactions. They share no backend server; everything runs on the user's own Firebase project.

```
Desktop App                      Firebase (user-owned)                Web Viewer
+-----------+    upload video    +-------------------+    fetch meta   +-----------+
|  Electron | ─────────────────>|  Cloud Storage    |                 |  Next.js  |
|  + React  |    insert meta    |  Firestore        |<────────────── |  + Plyr   |
|           | ─────────────────>|  Cloud Functions  |────────────────>|           |
+-----------+    deploy func    +-------------------+    serve API    +-----------+
```

---

## Desktop App

### Tech stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33 |
| UI | React 19 + Tailwind CSS 4 |
| Build | electron-vite 3 (bundles main, preload, renderer separately) |
| Backend SDK | firebase-admin 12 (runs in main process only) |
| Storage SDK | @google-cloud/storage (bucket detection and creation) |
| Packaging | electron-builder 25 (DMG for macOS) |

### Process architecture

Electron runs three isolated contexts:

```
┌─────────────────────────────────────────────────┐
│  Main Process (Node.js)                         │
│  - Firebase Admin SDK (Firestore, Storage)      │
│  - Cloud Function deployment (REST API calls)   │
│  - Encrypted settings (electron.safeStorage)    │
│  - desktopCapturer for source listing           │
│  - macOS permission handling                    │
├─────────────────────────────────────────────────┤
│  Preload (contextBridge)                        │
│  - Exposes `window.api` to renderer             │
│  - Maps each method to an ipcRenderer.invoke()  │
├─────────────────────────────────────────────────┤
│  Renderer (Chromium, sandboxed)                 │
│  - React UI (Vite dev server on port 5180)      │
│  - MediaRecorder, Canvas 2D, Web Audio API      │
│  - No direct access to Node.js or Firebase SDK  │
└─────────────────────────────────────────────────┘
```

All Firebase operations happen in the main process. The renderer calls them through IPC:

```
renderer → window.api.firestoreInsert(...)
         → ipcRenderer.invoke('firestore-insert', ...)
         → main process handler
         → firebase-admin SDK
```

### App phases

The root `App.tsx` renders one of four screens based on setup state:

```
loading → setup-wizard → provisioning → main-layout
            │                 │              │
            │ paste SA JSON   │ verify       │ Library / Record / Settings
            │ validate        │ Firestore    │
            │                 │ Storage      │
            │                 │ deploy CF    │
```

- **SetupWizard** — user pastes a Firebase service account JSON. The app validates connectivity and detects/creates the Firestore database and Storage bucket.
- **Provisioning** — verifies Firestore access, Storage access, and deploys the Cloud Function. Shows actionable error buttons if APIs or roles are missing.
- **Layout** — three-tab interface: Library (list/delete videos), Record, Settings (disconnect).

### Recording pipeline

Recording involves four cooperating modules in the renderer:

```
useRecordingMachine (state orchestrator)
  │
  ├── useMediaCapture        → acquires raw MediaStreams
  │     screen stream          (desktopCapturer + getUserMedia)
  │     camera stream          (getUserMedia video)
  │     mic stream             (getUserMedia audio)
  │
  ├── canvasCompositor       → composites into a single video stream
  │     draws screen to canvas every 33ms (setInterval, not rAF)
  │     overlays camera as circular PiP (bottom-right, 160px diameter)
  │     captures canvas at 30fps via captureStream()
  │
  ├── audioMixer             → mixes system audio + mic
  │     AudioContext + MediaStreamDestination
  │     GainNode on mic for mute/unmute (gain = 0 or 1)
  │
  └── recorder               → encodes the final stream
        MediaRecorder (WebM container, VP9 preferred, VP8 fallback)
        HD: 5 Mbps, SD: 2.5 Mbps
        collects chunks, returns Blob on stop
```

**Why `setInterval` instead of `requestAnimationFrame`?** Drawing must continue when the Electron window is unfocused or minimized. `rAF` pauses when the window is hidden; `setInterval` does not.

**macOS audio caveat:** System audio capture is unreliable — tracks often arrive with `readyState === 'ended'`. The pipeline detects dead system audio and falls back to microphone-only. The UI shows an indicator when system audio is unavailable.

### Recording flow

```
1. User clicks "Start Recording"
2. Source picker shows screens and windows (desktopCapturer)
3. User picks source, toggles camera/mic/HD
4. 3-second countdown
5. Recording starts:
   - Canvas compositor draws screen + camera PiP
   - Audio mixer combines system audio + mic
   - MediaRecorder encodes combined stream
6. User clicks Stop
7. Review screen: play back, enter title
8. Upload:
   a. Generate 8-char alphanumeric short code (crypto.getRandomValues)
   b. Check Firestore for collisions (retry up to 10x)
   c. Upload WebM to Cloud Storage → get public URL
   d. Insert metadata doc into Firestore `videos/{shortCode}`
   e. Build share link: https://thari.video/v/{projectId}/{shortCode}
9. Show share link with copy button
```

### Cloud Function deployment

The Cloud Function source is **embedded as string constants** in the desktop app — no file system paths or CLI tools needed. During provisioning:

1. Build an in-memory ZIP (manual ZIP format using Node.js `zlib.deflateRawSync`)
2. Upload ZIP to Cloud Storage (`cloud-function-source/thari-{timestamp}.zip`)
3. Call Cloud Functions v2 REST API to create/update the function
4. Poll the long-running operation until complete
5. Store the deployed version in settings for idempotent re-deploys

If a v1 (1st gen) function exists from a prior deployment, it is detected and deleted before creating the v2 function.

### Settings storage

Settings (including the service account JSON) are encrypted at rest using Electron's `safeStorage` API, which delegates to the OS keychain on macOS. The encrypted file lives at:

```
~/Library/Application Support/thari-video/config/settings.json
```

### Key files

| File | Purpose |
|------|---------|
| `src/main/index.ts` | Main process: all IPC handlers, Firebase init, bucket detection |
| `src/main/deploy-cloud-function.ts` | Cloud Function deployment via v2 REST API |
| `src/preload/index.ts` | IPC bridge (`window.api`) |
| `src/renderer/App.tsx` | Root phase router |
| `src/renderer/components/Provisioning.tsx` | Infrastructure setup UI |
| `src/renderer/components/Recording.tsx` | Recording orchestrator |
| `src/renderer/components/recording/SourcePicker.tsx` | Screen/window picker with camera/mic/HD toggles |
| `src/renderer/components/recording/RecordingControls.tsx` | Live recording UI (canvas, timer, stop) |
| `src/renderer/components/recording/ReviewPlayer.tsx` | Post-recording preview and title entry |
| `src/renderer/components/recording/UploadProgress.tsx` | Upload progress bar and share link |
| `src/renderer/lib/recording/useRecordingMachine.ts` | State machine for the full recording lifecycle |
| `src/renderer/lib/recording/useMediaCapture.ts` | MediaStream acquisition (screen, camera, mic) |
| `src/renderer/lib/recording/canvasCompositor.ts` | Screen + camera PiP canvas composition |
| `src/renderer/lib/recording/audioMixer.ts` | System audio + mic mixing via Web Audio API |
| `src/renderer/lib/recording/recorder.ts` | MediaRecorder wrapper (WebM VP9/VP8) |
| `src/renderer/lib/firebase.ts` | High-level helpers: insertVideo, listVideos, uploadVideo, etc. |
| `src/renderer/lib/provisioning.ts` | Three-step provisioning runner |
| `src/renderer/lib/types.ts` | Shared TypeScript interfaces |

---

## Web Viewer

### Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Video player | Plyr 3.8 |
| Styling | Tailwind CSS 4 |
| Fonts | Space Grotesk (headings), JetBrains Mono (code) |
| Hosting | Netlify (static export) |

### Routing

```
/                          → Landing page (marketing site)
/technology                → Technical deep-dive page
/v/{projectId}/{shortCode} → Video viewer (catch-all route)
/llm.txt                   → Machine-readable project description
```

The video route uses a catch-all `[...slug]` segment. The client component parses `slug[0]` as the project ID and `slug[1]` as the short code.

### Video viewer flow

```
1. Parse URL → projectId + shortCode
2. Fetch metadata:
   GET https://us-central1-{projectId}.cloudfunctions.net/thari/v/{shortCode}
3. Increment view count:
   POST .../thari/v/{shortCode}/view
4. Fetch video blob from storage_url (public GCS URL)
5. Initialize Plyr with controls: play, progress, volume, speed, PiP, fullscreen
6. Fetch reactions:
   GET .../thari/v/{shortCode}/reactions
7. Render reaction markers on the progress bar (density histogram)
8. User can add reactions (emoji bar below video):
   POST .../thari/v/{shortCode}/reactions { emoji, timestamp }
   → Optimistic UI update + floating emoji animation
```

**Duration workaround:** Some WebM files don't report duration correctly. The viewer seeks to a very large position (`1e101`), waits for the `timeupdate` event to get the real duration, then seeks back to 0.

### API client

`lib/api.ts` builds the Cloud Function URL from the project ID:

```typescript
function apiBaseUrl(projectId: string): string {
  return `https://us-central1-${projectId}.cloudfunctions.net/thari`
}
```

Every API call goes directly to the user's Firebase project. The web viewer has no backend of its own — it's a static site.

### Reactions

Six emoji reactions: `👍 ❤️ 🔥 😂 👏 🎉`

Each reaction is stored as a Firestore document in `videos/{code}/reactions` with:
- `emoji` — the emoji string
- `timestamp` — playhead position in seconds when the reaction was added
- `created_at` — server timestamp

The viewer renders a timeline histogram on the progress bar, showing reaction density at each point in the video. Individual markers scale in size based on how many reactions fall in that segment.

Reactions are added optimistically — the UI updates immediately and the server call fires asynchronously. A 500ms throttle prevents spam.

### Key files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout, metadata, header |
| `app/page.tsx` | Landing page |
| `app/v/[...slug]/page.tsx` | Video route wrapper |
| `app/v/[...slug]/ViewerClient.tsx` | Full video player with reactions |
| `lib/api.ts` | Cloud Function API client |
| `lib/reactions.ts` | Emoji definitions and Reaction type |

---

## Cloud Function

A single HTTP function named `thari` deployed to `us-central1` as a 2nd gen Cloud Function (runs on Cloud Run). It serves four endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v/:code` | Return video metadata from Firestore |
| POST | `/v/:code/view` | Atomically increment `view_count` |
| GET | `/v/:code/reactions` | List all reactions ordered by `created_at` |
| POST | `/v/:code/reactions` | Add a reaction (`{ emoji, timestamp }`) |

All responses include `Access-Control-Allow-Origin: *` for cross-origin access.

The function uses the v1 Firebase Functions SDK (`functions.https.onRequest`) which is compatible with both 1st and 2nd gen runtimes. It supports named Firestore databases via the `FIRESTORE_DB_ID` environment variable.

Runtime: Node.js 20, 256Mi memory, 60s timeout.

---

## Data model

### Firestore

```
videos/
  {short_code}/                    # document
    short_code: string
    title: string
    description: string | null
    storage_url: string            # public GCS URL
    view_count: number             # incremented atomically
    duration_ms: number | null
    capture_mode: 'screen' | 'window' | 'tab'
    created_at: string             # ISO timestamp

    reactions/                     # subcollection
      {auto-id}/
        emoji: string
        timestamp: number          # seconds into video
        created_at: Timestamp      # Firestore server timestamp
```

### Cloud Storage

```
gs://{bucket}/
  videos/{short_code}.webm        # recorded video file (publicly readable)
  cloud-function-source/           # deployment artifacts (internal)
```

---

## How the pieces connect

The desktop app and web viewer never communicate directly. Firebase is the only shared state:

1. **Desktop uploads** a video file to Cloud Storage and writes metadata to Firestore.
2. **Desktop generates** a share URL: `https://thari.video/v/{projectId}/{shortCode}`.
3. **Web viewer** receives this URL, extracts the project ID, and calls the user's Cloud Function to fetch metadata.
4. **Cloud Function** reads from Firestore and returns the metadata including the `storage_url`.
5. **Web viewer** loads the video directly from the public Cloud Storage URL.
6. **Reactions** flow back through the Cloud Function into the Firestore subcollection.
7. **Desktop app** can see updated `view_count` when it lists videos in the Library tab.

The project ID in the URL is what makes this work across different users' Firebase projects — each user's videos are served by their own Cloud Function and storage bucket.

---

## Testing

### Desktop E2E tests

Framework: Playwright with Electron support.

```
tests/e2e/
  setup-flow.spec.ts     # Setup wizard, provisioning, navigation
  record-flow.spec.ts    # Full recording pipeline
```

Tests mock the main process IPC handlers (Firebase operations return fake success) and inject synthetic MediaStreams (canvas + silent audio) so recordings work without real screen capture.

### Web viewer E2E tests

Framework: Playwright.

```
webviewer/e2e/
  hero-canvas.spec.ts         # Landing page canvas animations
  screenshot.spec.ts          # Visual regression
  framer-screenshot.spec.ts   # Component screenshots
  framer-inspect.spec.ts      # Layout inspection
```

Dev server runs on port 3001. Tests are headless by default.

---

## Development setup

### Desktop app

```bash
cd desktop
npm install
npm run dev          # electron-vite dev (hot reload on renderer)
```

The dev server starts Vite on port 5180 for the renderer. Main process changes require a restart.

### Web viewer

```bash
cd webviewer
npm install
npm run dev          # Next.js dev server on port 3001
```

### Running tests

```bash
# Desktop E2E
cd desktop
npx playwright test

# Web viewer E2E
cd webviewer
npx playwright test
```

---

## Nuances for contributors

### The main process is the backend

All Firebase SDK calls happen in the Electron main process, not in the renderer. The renderer is sandboxed and communicates exclusively through `window.api` (defined in the preload script). If you need to add a new Firebase operation, you need to:
1. Add an IPC handler in `src/main/index.ts`
2. Expose it in `src/preload/index.ts`
3. Add the type signature to `IElectronAPI` in `src/renderer/lib/types.ts`

### Canvas compositor uses setInterval

The screen + camera PiP composition uses `setInterval(draw, 33)` instead of `requestAnimationFrame`. This is intentional — `rAF` stops firing when the window is unfocused, which would freeze the recording. Don't replace it with `rAF`.

### System audio is unreliable on macOS

Electron's `desktopCapturer` can request system audio, but macOS often delivers dead tracks. The code in `useMediaCapture.ts` detects this (`readyState === 'ended'` or silent analysis) and falls back gracefully. If you're testing on macOS and recordings have no audio, this is expected behavior without a virtual audio driver.

### The Cloud Function source is embedded

The function code lives as a JavaScript string in `deploy-cloud-function.ts`, not as a separate deployable project. The `cloud-functions/` directory is a reference copy for local development. If you change the function logic, you must update the embedded string — they are not synced automatically.

### Version-gated deployment

`CLOUD_FUNCTION_VERSION` in `deploy-cloud-function.ts` controls whether the function is redeployed. The desktop app stores the last deployed version in settings and skips deployment if it matches. When you change the embedded function source, bump this version string.

### Short codes are the primary key

Videos are stored in Firestore with `short_code` as the document ID (not a random Firestore auto-ID). This means the short code must be unique. The generator retries up to 10 times on collision. The share URL relies on this: `/v/{projectId}/{shortCode}`.

### The web viewer is fully static

The Next.js web viewer has no server-side data fetching. All API calls happen client-side via the Cloud Function. This means the viewer can be deployed as a static site (Netlify, Vercel, GitHub Pages). The tradeoff is no SSR for video metadata — the initial load shows a loading spinner.

### Bucket detection is complex

Firebase projects can have storage buckets named in several patterns (`.firebasestorage.app`, `.appspot.com`, or custom). The main process tries known patterns, then lists all buckets, then creates one as a last resort. If you're debugging storage issues, check the `resolvedBucket` value in settings.

### Provisioning errors are actionable

When deployment fails due to missing GCP permissions, the error includes clickable buttons that open the relevant GCP Console page. These are rendered by the `Provisioning.tsx` component when a step has `actions` in its error state. See `firebase.md` for the full list of permission scenarios.
