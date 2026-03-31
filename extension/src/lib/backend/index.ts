/**
 * Provider-agnostic backend facade for OpenLoom Chrome Extension.
 *
 * Takes AppSettings and routes every call to the correct backend
 * (Firebase, Convex, or Supabase).
 */

import type { AppSettings } from '../types'

import {
  initFirebase,
  validateFirebaseConnection,
  firebaseInsert,
  firebaseQuery,
  firebaseQueryByField,
  firebaseDelete,
  firebaseUpload,
  firebaseDeleteFile,
} from './firebase'

import {
  initConvex,
  validateConvexConnection,
  convexInsert,
  convexQuery,
  convexQueryByField,
  convexDelete,
  convexUpload,
  convexDeleteFile,
} from './convex'

import {
  initSupabase,
  validateSupabaseConnection,
  supabaseInsert,
  supabaseQuery,
  supabaseQueryByField,
  supabaseDelete,
  supabaseUpload,
  supabaseDeleteFile,
} from './supabase'

// ---------------------------------------------------------------------------
// Backend initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise the correct backend module based on current settings.
 * Call this whenever settings change (e.g. after connection validation
 * or on extension startup when settings are loaded from storage).
 */
export async function initBackend(settings: AppSettings): Promise<void> {
  const provider = settings.provider || 'firebase'

  if (provider === 'convex') {
    if (settings.convexDeployKey && settings.convexDeploymentUrl) {
      initConvex(settings.convexDeployKey, settings.convexDeploymentUrl)
    }
    return
  }

  if (provider === 'supabase') {
    if (settings.supabaseProjectUrl && settings.supabaseServiceRoleKey) {
      initSupabase(settings.supabaseProjectUrl, settings.supabaseServiceRoleKey)
    }
    return
  }

  // Firebase
  if (settings.serviceAccountJson) {
    await initFirebase({
      serviceAccountJson: settings.serviceAccountJson,
      firestoreDbId: settings.firestoreDbId,
      resolvedBucket: settings.resolvedBucket,
    })
  }
}

// ---------------------------------------------------------------------------
// Connection validation
// ---------------------------------------------------------------------------

export async function validateConnection(
  settings: AppSettings,
  credential: string,
): Promise<{
  ok: boolean
  projectId?: string
  projectRef?: string
  deploymentUrl?: string
  deploymentName?: string
  httpActionsUrl?: string
  serviceRoleKey?: string
  anonKey?: string
  firestoreDbId?: string
  resolvedBucket?: string
  error?: string
}> {
  const provider = settings.provider || 'firebase'

  if (provider === 'convex') {
    const result = await validateConvexConnection(credential)
    if (result.ok && result.deploymentUrl) {
      initConvex(credential, result.deploymentUrl)
    }
    return result
  }

  if (provider === 'supabase') {
    const { projectUrl, accessToken } = JSON.parse(credential) as {
      projectUrl: string
      accessToken: string
    }
    const result = await validateSupabaseConnection(projectUrl, accessToken)
    if (result.ok && result.serviceRoleKey) {
      initSupabase(projectUrl, result.serviceRoleKey)
    }
    return {
      ok: result.ok,
      projectRef: result.projectRef,
      serviceRoleKey: result.serviceRoleKey,
      anonKey: result.anonKey,
      error: result.error,
    }
  }

  // Firebase
  const result = await validateFirebaseConnection(credential)
  return {
    ok: result.ok,
    projectId: result.projectId,
    firestoreDbId: result.firestoreDbId,
    resolvedBucket: result.resolvedBucket,
    error: result.error,
  }
}

// ---------------------------------------------------------------------------
// Database CRUD
// ---------------------------------------------------------------------------

export async function dbInsert(
  settings: AppSettings,
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const provider = settings.provider || 'firebase'
  if (provider === 'convex') return convexInsert(collection, docId, data)
  if (provider === 'supabase') return supabaseInsert(collection, docId, data)
  return firebaseInsert(collection, docId, data)
}

export async function dbQuery(
  settings: AppSettings,
  collection: string,
  orderBy: string,
  direction: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  const provider = settings.provider || 'firebase'
  if (provider === 'convex') return convexQuery(collection, orderBy, direction)
  if (provider === 'supabase') return supabaseQuery(collection, orderBy, direction)
  return firebaseQuery(collection, orderBy, direction)
}

export async function dbQueryByField(
  settings: AppSettings,
  collection: string,
  field: string,
  value: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  const provider = settings.provider || 'firebase'
  if (provider === 'convex') return convexQueryByField(collection, field, value)
  if (provider === 'supabase') return supabaseQueryByField(collection, field, value)
  return firebaseQueryByField(collection, field, value)
}

export async function dbDelete(
  settings: AppSettings,
  collection: string,
  docId: string,
): Promise<{ ok: boolean; error?: string }> {
  const provider = settings.provider || 'firebase'
  if (provider === 'convex') return convexDelete(collection, docId)
  if (provider === 'supabase') return supabaseDelete(collection, docId)
  return firebaseDelete(collection, docId)
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
): Promise<{ ok: boolean; url?: string; storageId?: string; error?: string }> {
  const provider = settings.provider || 'firebase'
  if (provider === 'convex') return convexUpload(remotePath, fileData, contentType, onProgress)
  if (provider === 'supabase') return supabaseUpload(remotePath, fileData, contentType, onProgress)
  return firebaseUpload(remotePath, fileData, contentType)
}

export async function fileDelete(
  settings: AppSettings,
  remotePath: string,
): Promise<{ ok: boolean; error?: string }> {
  const provider = settings.provider || 'firebase'
  if (provider === 'convex') return convexDeleteFile(remotePath)
  if (provider === 'supabase') return supabaseDeleteFile(remotePath)
  return firebaseDeleteFile(remotePath)
}

// ---------------------------------------------------------------------------
// Share URL
// ---------------------------------------------------------------------------

export function getShareURL(settings: AppSettings, shortCode: string): string {
  const provider = settings.provider || 'firebase'

  if (provider === 'convex') {
    if (!settings.convexDeploymentName) {
      throw new Error('Cannot generate share URL: Convex deployment name is not configured')
    }
    const encoded = btoa(`c-${settings.convexDeploymentName}`)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    return `https://openloom.live/v/${encoded}/${shortCode}`
  }

  if (provider === 'supabase') {
    const encoded = btoa(`s-${settings.supabaseProjectRef || ''}`)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    return `https://openloom.live/v/${encoded}/${shortCode}`
  }

  // Firebase
  const encoded = btoa(`f-${settings.firebaseProjectId || ''}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `https://openloom.live/v/${encoded}/${shortCode}`
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
