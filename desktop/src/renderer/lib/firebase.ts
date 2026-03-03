import type { Video, VideoInsert } from './types'

// --- Connection validation ---

export async function validateConnection(
  serviceAccountJson: string,
): Promise<{ ok: boolean; projectId?: string; error?: string }> {
  return window.api.validateFirebaseConnection(serviceAccountJson)
}

// --- Video DB operations ---

export async function insertVideo(video: VideoInsert): Promise<Video> {
  const doc: Record<string, unknown> = {
    short_code: video.short_code,
    title: video.title,
    description: video.description ?? null,
    storage_url: video.storage_url,
    view_count: 0,
    duration_ms: video.duration_ms ?? null,
    capture_mode: video.capture_mode,
    created_at: new Date().toISOString(),
  }

  const result = await window.api.firestoreInsert('videos', video.short_code, doc)
  if (!result.ok) throw new Error(`Insert failed: ${result.error}`)

  return { id: video.short_code, ...doc } as unknown as Video
}

export async function listVideos(): Promise<Video[]> {
  const result = await window.api.firestoreQuery('videos', 'created_at', 'desc')
  if (!result.ok) throw new Error(`Query failed: ${result.error}`)
  return (result.data ?? []) as unknown as Video[]
}

export async function deleteVideo(shortCode: string): Promise<void> {
  // Delete from storage first (try both extensions)
  await window.api.storageDelete(`videos/${shortCode}.webm`)
  await window.api.storageDelete(`videos/${shortCode}.mp4`)

  // Then delete from Firestore
  const result = await window.api.firestoreDelete('videos', shortCode)
  if (!result.ok) throw new Error(`Delete failed: ${result.error}`)
}

export async function isShortCodeTaken(code: string): Promise<boolean> {
  // Since short_code IS the document ID, we can query by field or just check doc existence
  const result = await window.api.firestoreQueryByField('videos', 'short_code', code)
  if (!result.ok) throw new Error(`Short code check failed: ${result.error}`)
  return (result.data?.length ?? 0) > 0
}

// --- Storage operations ---

export async function uploadVideo(
  shortCode: string,
  file: Blob,
  contentType = 'video/webm',
): Promise<string> {
  const ext = contentType === 'video/mp4' ? 'mp4' : 'webm'
  const remotePath = `videos/${shortCode}.${ext}`

  // Convert Blob to ArrayBuffer for IPC transfer
  const arrayBuffer = await file.arrayBuffer()

  const result = await window.api.storageUpload(remotePath, arrayBuffer, contentType)
  if (!result.ok) throw new Error(`Upload failed: ${result.error}`)
  return result.url!
}

// --- Share URL ---

export function getShareURL(projectId: string, shortCode: string): string {
  const encoded = btoa(`f-${projectId}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `https://openloom.live/v/${encoded}/${shortCode}`
}
