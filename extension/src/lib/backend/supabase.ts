/**
 * Supabase backend for OpenLoom Chrome Extension.
 *
 * Ported from desktop/src/main/supabase-backend.ts.
 * Uses global `fetch` instead of Electron's `net.fetch`.
 */

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let supabaseProjectUrl: string | null = null
let supabaseServiceRoleKey: string | null = null

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

export function initSupabase(projectUrl: string, serviceRoleKey: string): void {
  supabaseProjectUrl = projectUrl.replace(/\/+$/, '')
  supabaseServiceRoleKey = serviceRoleKey
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getProjectUrl(): string {
  if (!supabaseProjectUrl) throw new Error('Supabase not initialized')
  return supabaseProjectUrl
}

function getServiceRoleKey(): string {
  if (!supabaseServiceRoleKey) throw new Error('Supabase service role key not set')
  return supabaseServiceRoleKey
}

function authHeaders(): Record<string, string> {
  const key = getServiceRoleKey()
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
  }
}

// ---------------------------------------------------------------------------
// Connection validation
// ---------------------------------------------------------------------------

export async function validateSupabaseConnection(
  projectUrl: string,
  accessToken: string,
): Promise<{
  ok: boolean
  projectRef?: string
  serviceRoleKey?: string
  anonKey?: string
  error?: string
}> {
  try {
    const url = projectUrl.replace(/\/+$/, '')

    // Parse project ref from URL (e.g. https://abcdefgh.supabase.co -> abcdefgh)
    const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co$/)
    if (!match) {
      return { ok: false, error: 'Invalid Supabase project URL. Expected format: https://<project-ref>.supabase.co' }
    }
    const projectRef = match[1]

    // Verify project access via Management API
    const projectRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!projectRes.ok) {
      if (projectRes.status === 401 || projectRes.status === 403) {
        return { ok: false, error: 'Invalid access token — authentication failed' }
      }
      if (projectRes.status === 404) {
        return { ok: false, error: 'Project not found. Check your Project URL.' }
      }
      const text = await projectRes.text()
      return { ok: false, error: `Supabase connection failed: ${projectRes.status} ${text}` }
    }

    // Fetch API keys
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!keysRes.ok) {
      const text = await keysRes.text()
      return { ok: false, error: `Failed to fetch API keys: ${keysRes.status} ${text}` }
    }

    const keys = (await keysRes.json()) as Array<{ name: string; api_key: string }>
    const serviceRoleEntry = keys.find((k) => k.name === 'service_role')
    const anonEntry = keys.find((k) => k.name === 'anon')

    if (!serviceRoleEntry) {
      return { ok: false, error: 'Could not find service_role key for this project' }
    }

    return {
      ok: true,
      projectRef,
      serviceRoleKey: serviceRoleEntry.api_key,
      anonKey: anonEntry?.api_key,
    }
  } catch (e) {
    return { ok: false, error: `Supabase connection failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ---------------------------------------------------------------------------
// Database CRUD via PostgREST
// ---------------------------------------------------------------------------

export async function supabaseInsert(
  collection: string,
  _docId: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getProjectUrl()}/rest/v1/${collection}`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`PostgREST insert failed: ${res.status} ${text}`)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Supabase insert failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function supabaseQuery(
  collection: string,
  orderBy: string,
  direction: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  try {
    const dir = direction === 'asc' ? 'asc' : 'desc'
    const res = await fetch(
      `${getProjectUrl()}/rest/v1/${collection}?select=*&order=${orderBy}.${dir}`,
      {
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
      },
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`PostgREST query failed: ${res.status} ${text}`)
    }
    const rows = (await res.json()) as Record<string, unknown>[]
    // Map id field for compatibility
    const mapped = rows.map((row) => ({
      ...row,
      id: row.short_code || row.id,
    }))
    return { ok: true, data: mapped }
  } catch (e) {
    return { ok: false, error: `Supabase query failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function supabaseQueryByField(
  collection: string,
  field: string,
  value: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  try {
    const res = await fetch(
      `${getProjectUrl()}/rest/v1/${collection}?${field}=eq.${encodeURIComponent(value)}&limit=1`,
      {
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
      },
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`PostgREST query failed: ${res.status} ${text}`)
    }
    const rows = (await res.json()) as Record<string, unknown>[]
    const mapped = rows.map((row) => ({
      ...row,
      id: row.short_code || row.id,
    }))
    return { ok: true, data: mapped }
  } catch (e) {
    return { ok: false, error: `Supabase query failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function supabaseDelete(
  collection: string,
  docId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${getProjectUrl()}/rest/v1/${collection}?short_code=eq.${encodeURIComponent(docId)}`,
      {
        method: 'DELETE',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
      },
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`PostgREST delete failed: ${res.status} ${text}`)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Supabase delete failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ---------------------------------------------------------------------------
// Storage operations
// ---------------------------------------------------------------------------

export async function supabaseUpload(
  remotePath: string,
  fileData: Blob,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    // remotePath is "videos/shortCode.webm" — first segment is the bucket name
    const slashIdx = remotePath.indexOf('/')
    const bucket = slashIdx > 0 ? remotePath.slice(0, slashIdx) : 'videos'
    const filePath = slashIdx > 0 ? remotePath.slice(slashIdx + 1) : remotePath

    const totalSize = fileData.size
    const baseUrl = getProjectUrl()
    const headers = authHeaders()

    // --- TUS resumable upload ---

    // 1. Create upload session
    const metadataFields = [
      `bucketName ${btoa(bucket)}`,
      `objectName ${btoa(filePath)}`,
      `contentType ${btoa(contentType)}`,
    ]

    const createRes = await fetch(`${baseUrl}/storage/v1/upload/resumable`, {
      method: 'POST',
      headers: {
        ...headers,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(totalSize),
        'Upload-Metadata': metadataFields.join(','),
        'x-upsert': 'true',
      },
    })

    if (!createRes.ok) {
      const text = await createRes.text()
      const sizeMB = (totalSize / 1024 / 1024).toFixed(1)
      if (createRes.status === 413) {
        throw new Error(
          `File too large (${sizeMB} MB). Supabase free plan allows up to 50 MB per upload. ` +
          `Use SD quality, record a shorter clip, or upgrade to a paid Supabase plan.`
        )
      }
      throw new Error(`TUS create failed: ${createRes.status} ${text}`)
    }

    const uploadUrl = createRes.headers.get('Location')
    if (!uploadUrl) {
      throw new Error('TUS create response missing Location header')
    }

    // 2. Upload in 6MB chunks with retry + exponential backoff
    const CHUNK_SIZE = 6 * 1024 * 1024
    const MAX_RETRIES = 5
    let offset = 0

    while (offset < totalSize) {
      const end = Math.min(offset + CHUNK_SIZE, totalSize)
      const chunk = await fileData.slice(offset, end).arrayBuffer()

      let success = false
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          // Exponential backoff: 2s, 4s, 8s, 16s
          await new Promise((r) => setTimeout(r, Math.min(2000 * 2 ** (attempt - 1), 16000)))
        }

        try {
          const patchRes = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': String(offset),
              'Content-Type': 'application/offset+octet-stream',
            },
            body: chunk,
          })

          if (patchRes.ok || patchRes.status === 204) {
            const newOffset = patchRes.headers.get('Upload-Offset')
            offset = newOffset ? parseInt(newOffset, 10) : end
            success = true
            break
          }

          // Non-retryable status
          if (patchRes.status >= 400 && patchRes.status < 500 && patchRes.status !== 409) {
            const text = await patchRes.text()
            throw new Error(`TUS upload failed: ${patchRes.status} ${text}`)
          }
        } catch (e) {
          if (attempt === MAX_RETRIES - 1) throw e
        }

        // Resume: ask server for current offset
        try {
          const headRes = await fetch(uploadUrl, {
            method: 'HEAD',
            headers: {
              ...headers,
              'Tus-Resumable': '1.0.0',
            },
          })
          const serverOffset = headRes.headers.get('Upload-Offset')
          if (serverOffset) offset = parseInt(serverOffset, 10)
        } catch {
          // HEAD failed — retry with current offset
        }
      }

      if (!success) {
        throw new Error('TUS upload failed after max retries')
      }

      onProgress?.(offset / totalSize)
    }

    const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${filePath}`
    return { ok: true, url: publicUrl }
  } catch (e) {
    return { ok: false, error: `Supabase upload failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function supabaseDeleteFile(
  remotePath: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // remotePath is "videos/shortCode.webm" — first segment is the bucket name
    const slashIdx = remotePath.indexOf('/')
    const bucket = slashIdx > 0 ? remotePath.slice(0, slashIdx) : 'videos'
    const filePath = slashIdx > 0 ? remotePath.slice(slashIdx + 1) : remotePath
    await fetch(
      `${getProjectUrl()}/storage/v1/object/${bucket}/${filePath}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      },
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Supabase file delete failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function supabaseGetFileUrl(
  remotePath: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const slashIdx = remotePath.indexOf('/')
  const bucket = slashIdx > 0 ? remotePath.slice(0, slashIdx) : 'videos'
  const filePath = slashIdx > 0 ? remotePath.slice(slashIdx + 1) : remotePath
  const publicUrl = `${getProjectUrl()}/storage/v1/object/public/${bucket}/${filePath}`
  return { ok: true, url: publicUrl }
}
