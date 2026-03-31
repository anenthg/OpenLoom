/**
 * Provider-agnostic backend facade for OpenLoom Chrome Extension.
 *
 * Routes every call to the correct backend via the StorageProvider
 * interface. Adding a new provider requires only registering it in
 * the `providers` map below.
 */

import type { AppSettings, BackendProvider } from '../types'
import type { StorageProvider, ConnectionResult, OpResult, QueryResult, UploadResult } from './provider'
import { createFirebaseProvider } from './firebase'
import { createConvexProvider } from './convex'
import { createSupabaseProvider } from './supabase'

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const providers: Record<BackendProvider, StorageProvider> = {
  firebase: createFirebaseProvider(),
  convex: createConvexProvider(),
  supabase: createSupabaseProvider(),
}

function getProvider(settings: AppSettings): StorageProvider {
  return providers[settings.provider || 'firebase']
}

// ---------------------------------------------------------------------------
// Backend initialisation
// ---------------------------------------------------------------------------

export async function initBackend(settings: AppSettings): Promise<void> {
  return getProvider(settings).init(settings)
}

// ---------------------------------------------------------------------------
// Connection validation
// ---------------------------------------------------------------------------

export async function validateConnection(
  settings: AppSettings,
  credential: string,
): Promise<ConnectionResult> {
  return getProvider(settings).validateConnection(credential)
}

// ---------------------------------------------------------------------------
// Database CRUD
// ---------------------------------------------------------------------------

export async function dbInsert(
  settings: AppSettings,
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<OpResult> {
  return getProvider(settings).insert(collection, docId, data)
}

export async function dbQuery(
  settings: AppSettings,
  collection: string,
  orderBy: string,
  direction: string,
): Promise<QueryResult> {
  return getProvider(settings).query(collection, orderBy, direction)
}

export async function dbQueryByField(
  settings: AppSettings,
  collection: string,
  field: string,
  value: string,
): Promise<QueryResult> {
  return getProvider(settings).queryByField(collection, field, value)
}

export async function dbDelete(
  settings: AppSettings,
  collection: string,
  docId: string,
): Promise<OpResult> {
  return getProvider(settings).delete(collection, docId)
}

// ---------------------------------------------------------------------------
// File / storage operations
// ---------------------------------------------------------------------------

export async function fileUpload(
  settings: AppSettings,
  remotePath: string,
  fileData: Blob,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  return getProvider(settings).upload(remotePath, fileData, contentType, onProgress)
}

export async function fileDelete(
  settings: AppSettings,
  remotePath: string,
): Promise<OpResult> {
  return getProvider(settings).deleteFile(remotePath)
}

// ---------------------------------------------------------------------------
// Provider-aware helpers
// ---------------------------------------------------------------------------

export function getShareURL(settings: AppSettings, shortCode: string): string {
  const prefix = getProvider(settings).getShareUrlPrefix(settings)
  const encoded = btoa(prefix)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `https://openloom.live/v/${encoded}/${shortCode}`
}

export function getFileSizeLimit(settings: AppSettings): number {
  return getProvider(settings).getFileSizeLimit(settings)
}

export function resolveStorageUrl(
  settings: AppSettings,
  shortCode: string,
  uploadResult: UploadResult,
): string {
  return getProvider(settings).resolveStorageUrl(settings, shortCode, uploadResult)
}

export function shouldDeleteFilesOnVideoRemove(settings: AppSettings): boolean {
  return getProvider(settings).deletesFilesOnVideoRemove
}

// ---------------------------------------------------------------------------
// Short code check
// ---------------------------------------------------------------------------

export async function isShortCodeTaken(
  settings: AppSettings,
  code: string,
): Promise<boolean> {
  const result = await dbQueryByField(settings, 'videos', 'short_code', code)
  if (!result.ok) throw new Error(`Short code check failed: ${result.error}`)
  return (result.data?.length ?? 0) > 0
}
