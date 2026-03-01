import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Video, VideoInsert } from './types'

let client: SupabaseClient | null = null

export function initClient(url: string, key: string): SupabaseClient {
  client = createClient(url, key)
  return client
}

export function getClient(): SupabaseClient {
  if (!client) throw new Error('Supabase client not initialized')
  return client
}

export function resetClient(): void {
  client = null
}

// --- Connection validation ---

export async function validateConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!client) return { ok: false, error: 'Client not initialized' }

  try {
    // Try a simple RPC or query. If the table doesn't exist yet (not provisioned),
    // we'll get a 404/relation error — that's fine, it means the connection works.
    // A 401/403 means bad credentials.
    const { error } = await client.from('videos').select('id').limit(1)

    if (!error) return { ok: true }

    // Table doesn't exist yet — connection is valid, just not provisioned
    if (error.code === '42P01' || error.message?.includes('relation') || error.code === 'PGRST204') {
      return { ok: true }
    }

    // Auth failure
    if (error.message?.includes('Invalid API key') || error.code === '401' || error.code === '403') {
      return { ok: false, error: 'Invalid credentials. Check your Service Role Key.' }
    }

    // Other error — connection likely works but something else is off
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Connection failed: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }
}

// --- Video DB operations ---

export async function insertVideo(video: VideoInsert): Promise<Video> {
  const { data, error } = await getClient()
    .from('videos')
    .insert(video)
    .select()
    .single()

  if (error) throw new Error(`Insert failed: ${error.message}`)
  return data as Video
}

export async function listVideos(): Promise<Video[]> {
  const { data, error } = await getClient()
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Query failed: ${error.message}`)
  return (data ?? []) as Video[]
}

export async function deleteVideo(id: string, shortCode: string): Promise<void> {
  // Delete from storage first
  const { error: storageError } = await getClient()
    .storage
    .from('videos')
    .remove([`${shortCode}.webm`, `${shortCode}.mp4`])

  if (storageError) {
    console.warn('Storage delete failed (may not exist):', storageError.message)
  }

  // Then delete from DB
  const { error } = await getClient()
    .from('videos')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Delete failed: ${error.message}`)
}

export async function isShortCodeTaken(code: string): Promise<boolean> {
  const { data, error } = await getClient()
    .from('videos')
    .select('id')
    .eq('short_code', code)
    .limit(1)

  if (error) throw new Error(`Short code check failed: ${error.message}`)
  return (data?.length ?? 0) > 0
}

// --- Storage operations ---

export async function uploadVideo(
  shortCode: string,
  file: File | Blob,
  contentType = 'video/webm',
): Promise<string> {
  const ext = contentType === 'video/mp4' ? 'mp4' : 'webm'
  const path = `${shortCode}.${ext}`

  const { error } = await getClient()
    .storage
    .from('videos')
    .upload(path, file, {
      contentType,
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return getPublicURL(shortCode, ext)
}

export function getPublicURL(shortCode: string, ext = 'webm'): string {
  const { data } = getClient()
    .storage
    .from('videos')
    .getPublicUrl(`${shortCode}.${ext}`)

  return data.publicUrl
}

// --- Share URL ---

export function getShareURL(supabaseRef: string, shortCode: string): string {
  return `https://thari.video/v/${supabaseRef}/${shortCode}`
}
