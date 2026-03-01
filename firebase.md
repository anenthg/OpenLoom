# Firebase & GCP Services

This document describes all Firebase/GCP services used by the desktop app, the permissions required for the service account, and the manual steps users may need to take during provisioning.

---

## Services Used

### 1. Cloud Firestore

Stores video metadata and viewer reactions.

**Collections:**

- `videos` — one document per recorded video (keyed by `short_code`)
  - Fields: `short_code`, `title`, `description`, `storage_url`, `view_count`, `duration_ms`, `capture_mode`, `created_at`
- `videos/{code}/reactions` — timestamped emoji reactions from viewers
  - Fields: `emoji`, `timestamp`, `created_at`

**Operations performed by the desktop app:**

- Insert, query, query-by-field, and delete documents in `videos`
- Create a Firestore Native Mode database via REST API (if one doesn't exist)

**Operations performed by the Cloud Function:**

- Read video documents
- Increment `view_count` atomically
- Read and write to the `reactions` subcollection

### 2. Cloud Storage

Stores recorded video files (`.webm` / `.mp4`).

**Bucket detection order:**

1. `{projectId}.firebasestorage.app`
2. `{projectId}.appspot.com`
3. Auto-creates `{projectId}-recordings` as fallback

**Operations:**

- Upload video files to `videos/{shortCode}.webm`
- Delete video files
- Generate public URLs (`https://storage.googleapis.com/{bucket}/{path}`)
- Upload Cloud Function source ZIP to `cloud-function-source/thari-{timestamp}.zip`

### 3. Cloud Functions (2nd gen)

A single HTTP function `thari` deployed to `us-central1` serves the public API for the web viewer.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v/:code` | Fetch video metadata |
| POST | `/v/:code/view` | Increment view count |
| GET | `/v/:code/reactions` | List reactions |
| POST | `/v/:code/reactions` | Add a reaction |

**Runtime:** Node.js 20, 256Mi memory, 60s timeout

**URL format:** `https://us-central1-{projectId}.cloudfunctions.net/thari`

---

## Service Account Permissions

The service account JSON provided during setup needs the following roles. The Firebase Admin SDK service account (`firebase-adminsdk-*`) typically has `roles/editor` which covers most of these, but some must be granted explicitly.

### Included with Editor role (usually no action needed)

| Role | Purpose |
|------|---------|
| Firestore read/write | CRUD on `videos` and `reactions` collections |
| Cloud Storage Admin | Upload, delete, and serve video files; upload function source |
| Cloud Resource Manager Viewer | Resolve project number during deployment |

### May require manual granting

| Role | Purpose | When needed |
|------|---------|-------------|
| **Cloud Functions Developer** | Create, update, and delete Cloud Functions | Deploying the API |
| **Service Account User** | `iam.serviceaccounts.actAs` on the default compute SA | Deploying the API (v2 functions run on Cloud Run under the default compute SA) |

---

## GCP APIs That Must Be Enabled

The deployment flow attempts to enable these automatically via the Service Usage API. If the service account lacks `serviceusage.services.enable` permission (common), the user must enable them manually from the GCP Console.

| API | Console link |
|-----|-------------|
| Cloud Functions API | `console.cloud.google.com/apis/library/cloudfunctions.googleapis.com` |
| Cloud Build API | `console.cloud.google.com/apis/library/cloudbuild.googleapis.com` |
| Artifact Registry API | `console.cloud.google.com/apis/library/artifactregistry.googleapis.com` |

---

## Provisioning Error Scenarios

During the "Deploying API" provisioning step, the user may encounter these actionable errors. Each is shown in the UI with buttons linking to the relevant GCP Console page.

### 1. Required APIs not enabled

**Error:** _"Required APIs are not enabled. Please enable them in the GCP Console, then retry."_

**Action:** Click the provided buttons to enable Cloud Functions, Cloud Build, and Artifact Registry APIs. Wait a minute for propagation, then click Retry.

### 2. Missing Cloud Functions Developer role

**Error:** _"The service account lacks Cloud Functions permissions. Grant the Cloud Functions Developer role to {sa-email}, then retry."_

**Action:** Open IAM settings, find the service account, add the **Cloud Functions Developer** role, then click Retry.

### 3. Missing Service Account User role

**Error:** _"Grant the Service Account User role to your service account on {compute-sa-email}, then retry."_

**Action:** Open IAM settings, find the service account, add the **Service Account User** (`roles/iam.serviceAccountUser`) role, then click Retry. This is needed because v2 Cloud Functions run on Cloud Run under the project's default compute service account.

---

## Billing

The project must be on the **Blaze (pay-as-you-go)** plan. Cloud Functions, Cloud Build, and Artifact Registry all require billing to be enabled.
