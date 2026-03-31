# Refactor: Provider Interface & Clean Separation

## Context
Provider-specific logic (Convex URL construction, file deletion branching, size limits) has leaked into `service-worker/index.ts` and `backend/index.ts` uses if/else chains. This makes it fragile to add providers and risks regressions when adding common video processing features. The goal is a clean boundary: providers implement a formal interface, common code (recording, processing, enrichment) never touches provider details.

## Design

### New `StorageProvider` interface
**File:** `extension/src/lib/backend/provider.ts` (new, ~50 lines)

```typescript
export interface StorageProvider {
  init(settings: AppSettings): Promise<void>
  validateConnection(credential: string): Promise<ConnectionResult>

  // Database CRUD
  insert(collection: string, docId: string, data: Record<string, unknown>): Promise<OpResult>
  query(collection: string, orderBy: string, direction: string): Promise<QueryResult>
  queryByField(collection: string, field: string, value: string): Promise<QueryResult>
  delete(collection: string, docId: string): Promise<OpResult>

  // Storage
  upload(remotePath: string, data: Blob, contentType: string, onProgress?: (fraction: number) => void): Promise<UploadResult>
  deleteFile(remotePath: string): Promise<OpResult>

  // Provider identity
  getShareUrlPrefix(settings: AppSettings): string        // e.g. "c-deploymentName"
  getFileSizeLimit(settings: AppSettings): number          // bytes
  resolveStorageUrl(settings: AppSettings, shortCode: string, uploadResult: UploadResult): string
  deletesFilesOnVideoRemove: boolean                       // Convex: true (mutation handles it), others: false
}

export interface OpResult { ok: boolean; error?: string }
export interface QueryResult extends OpResult { data?: Record<string, unknown>[] }
export interface UploadResult extends OpResult { url?: string; storageId?: string }
export interface ConnectionResult extends OpResult {
  // Provider-specific fields (sidepanel reads these — backward compat)
  projectId?: string; firestoreDbId?: string; resolvedBucket?: string
  deploymentUrl?: string; deploymentName?: string; httpActionsUrl?: string
  projectRef?: string; serviceRoleKey?: string; anonKey?: string
}
```

### Provider factory functions
Each provider file gets a `create*Provider(): StorageProvider` factory at the bottom that wraps existing functions. Existing exports stay (no breaking changes).

### Registry in `backend/index.ts`
Replace ~262 lines of if/else dispatch with ~90 lines:

```typescript
import { createFirebaseProvider } from './firebase'
import { createConvexProvider } from './convex'
import { createSupabaseProvider } from './supabase'

const providers: Record<BackendProvider, StorageProvider> = {
  firebase: createFirebaseProvider(),
  convex: createConvexProvider(),
  supabase: createSupabaseProvider(),
}

function getProvider(settings: AppSettings): StorageProvider {
  return providers[settings.provider || 'firebase']
}

// All facade functions delegate to getProvider(settings).method(...)
```

Public function signatures (`initBackend`, `dbInsert`, `fileUpload`, `getShareURL`, etc.) stay identical — no caller changes needed.

New exports added: `getFileSizeLimit(settings)`, `resolveStorageUrl(settings, shortCode, uploadResult)`, `shouldDeleteFilesOnVideoRemove(settings)`.

## Changes

### 1. Create `provider.ts` interface
**File:** `extension/src/lib/backend/provider.ts` (new)
- `StorageProvider` interface + result types as shown above

### 2. Add factory to `firebase.ts`
**File:** `extension/src/lib/backend/firebase.ts`
- Add `createFirebaseProvider()` at bottom (~40 lines)
- Wraps existing `firebaseInsert`, `firebaseQuery`, etc.
- `getShareUrlPrefix`: returns `"f-${projectId}"`
- `getFileSizeLimit`: returns `524_288_000` (500 MB)
- `resolveStorageUrl`: returns `uploadResult.url` as-is
- `deletesFilesOnVideoRemove`: `false`

### 3. Add factory to `convex.ts`
**File:** `extension/src/lib/backend/convex.ts`
- Add `createConvexProvider()` at bottom (~45 lines)
- `getShareUrlPrefix`: returns `"c-${settings.convexDeploymentName}"`
- `getFileSizeLimit`: returns `524_288_000` (500 MB)
- `resolveStorageUrl`: returns `${settings.convexHttpActionsUrl}/video?code=${shortCode}`
- `deletesFilesOnVideoRemove`: `true` (Convex mutation handles storage cleanup)

### 4. Add factory to `supabase.ts`
**File:** `extension/src/lib/backend/supabase.ts`
- Add `createSupabaseProvider()` at bottom (~40 lines)
- `getShareUrlPrefix`: returns `"s-${settings.supabaseProjectRef}"`
- `getFileSizeLimit`: returns `settings.supabaseFileSizeLimit ?? 52_428_800`
- `resolveStorageUrl`: returns `uploadResult.url` as-is
- `deletesFilesOnVideoRemove`: `false`

### 5. Rewrite `backend/index.ts`
**File:** `extension/src/lib/backend/index.ts`
- Replace if/else chains with registry lookup (~90 lines replacing ~262)
- Same public API signatures — zero caller impact
- `getShareURL` uses `provider.getShareUrlPrefix(settings)` + base64url encoding (shared logic)
- Add `getFileSizeLimit`, `resolveStorageUrl`, `shouldDeleteFilesOnVideoRemove` exports

### 6. Clean up `service-worker/index.ts`
**File:** `extension/src/service-worker/index.ts` — four targeted edits:

| Location | Current (provider-specific) | After (provider-agnostic) |
|----------|---------------------------|--------------------------|
| Line 209 (ELAPSED_UPDATE) | `settings.supabaseFileSizeLimit ?? (provider === 'supabase' ? 52MB : 500MB)` | `getFileSizeLimit(settings)` |
| Lines 413-417 (handleUpload) | `if (provider === 'convex') { url = httpActionsUrl + ... }` | `resolveStorageUrl(settings, shortCode, uploadResult)` |
| Lines 487-489 (handleDeleteVideo) | `if (provider === 'firebase' \|\| provider === 'supabase') { fileDelete(...) }` | `if (!shouldDeleteFilesOnVideoRemove(settings)) { fileDelete(...) }` |
| Lines 296-302 (handleDeployBackend) | Three-way if/else for deploy functions | `deployers[provider](settings, onProgress)` map lookup |

## Execution Order
1. `provider.ts` — interface definition (no existing code changes)
2. `firebase.ts`, `convex.ts`, `supabase.ts` — add factory functions (additive, nothing breaks)
3. `backend/index.ts` — rewrite to registry pattern
4. `service-worker/index.ts` — remove leaked provider logic

Steps 1-2 are additive. Steps 3-4 are the actual refactor but preserve identical public APIs.

## What This Does NOT Change
- **Provisioning stays in separate files.** Deploy functions are not on `StorageProvider` (they're one-time infra setup, not runtime CRUD). A `deployers` map in the service worker is sufficient.
- **`AppSettings` stays flat.** Discriminated unions would cascade changes everywhere. Not worth it.
- **Existing provider function exports stay.** Factories delegate to them. Tests and other imports unaffected.
- **Recording, composition, audio mixing** — untouched. Already provider-agnostic.

## Adding a 4th Provider After This Refactor
1. Create `backend/newprovider.ts` implementing `StorageProvider`
2. Create `provisioning/newprovider.ts`
3. Add `'newprovider'` to `BackendProvider` union in `types.ts`
4. Register in `backend/index.ts` providers map (1 line)
5. Register in `service-worker/index.ts` deployers map (1 line)
6. Add UI in `SetupWizard.tsx`

No hunting for if/else chains. No touching upload/delete/processing logic.

## Verification
- `cd extension && npm run build` passes (typecheck + vite build)
- All 13 existing E2E tests pass (`npx playwright test`)
- Manual test: record → upload → share link works (with any configured provider)
