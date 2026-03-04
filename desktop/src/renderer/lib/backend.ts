import type { AppSettings, Video, VideoInsert } from './types'

// --- Connection validation ---

export async function validateConnection(
  credential: string,
): Promise<{ ok: boolean; projectId?: string; deploymentName?: string; deploymentUrl?: string; httpActionsUrl?: string; error?: string }> {
  return window.api.validateConnection(credential)
}

// --- Video DB operations ---

export async function insertVideo(video: VideoInsert, storageId?: string): Promise<Video> {
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

  if (storageId) {
    doc.storage_id = storageId
  }

  const result = await window.api.dbInsert('videos', video.short_code, doc)
  if (!result.ok) throw new Error(`Insert failed: ${result.error}`)

  return { id: video.short_code, ...doc } as unknown as Video
}

export async function listVideos(): Promise<Video[]> {
  const result = await window.api.dbQuery('videos', 'created_at', 'desc')
  if (!result.ok) throw new Error(`Query failed: ${result.error}`)
  return (result.data ?? []) as unknown as Video[]
}

export async function deleteVideo(shortCode: string): Promise<void> {
  const settings = await window.api.getSettings()
  const provider = settings.provider || 'firebase'

  if (provider === 'firebase') {
    // Delete from storage first (try both extensions)
    await window.api.fileDelete(`videos/${shortCode}.webm`)
    await window.api.fileDelete(`videos/${shortCode}.mp4`)
  }
  // For Convex, storage deletion is handled in the mutation

  // Delete from database
  const result = await window.api.dbDelete('videos', shortCode)
  if (!result.ok) throw new Error(`Delete failed: ${result.error}`)
}

export async function isShortCodeTaken(code: string): Promise<boolean> {
  const result = await window.api.dbQueryByField('videos', 'short_code', code)
  if (!result.ok) throw new Error(`Short code check failed: ${result.error}`)
  return (result.data?.length ?? 0) > 0
}

// --- Storage operations ---

export async function uploadVideo(
  shortCode: string,
  file: Blob,
  contentType = 'video/webm',
): Promise<{ storageUrl: string; storageId?: string }> {
  const ext = contentType === 'video/mp4' ? 'mp4' : 'webm'
  const remotePath = `videos/${shortCode}.${ext}`

  // Convert Blob to ArrayBuffer for IPC transfer
  const arrayBuffer = await file.arrayBuffer()

  const result = await window.api.fileUpload(remotePath, arrayBuffer, contentType) as {
    ok: boolean; url?: string; storageId?: string; error?: string
  }
  if (!result.ok) throw new Error(`Upload failed: ${result.error}`)
  return { storageUrl: result.url!, storageId: result.storageId }
}

// --- Share URL ---

export function getShareURL(settings: AppSettings, shortCode: string): string {
  const provider = settings.provider || 'firebase'

  if (provider === 'convex') {
    const deploymentName = settings.convexDeploymentName || ''
    const encoded = btoa(`c-${deploymentName}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `https://openloom.live/v/${encoded}/${shortCode}`
  }

  // Firebase
  const projectId = settings.firebaseProjectId || ''
  const encoded = btoa(`f-${projectId}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `https://openloom.live/v/${encoded}/${shortCode}`
}
