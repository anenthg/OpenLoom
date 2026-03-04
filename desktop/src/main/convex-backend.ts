import { net } from 'electron'

let convexDeploymentUrl: string | null = null
let convexDeployKey: string | null = null

export function initConvex(deployKey: string, deploymentUrl: string): void {
  convexDeployKey = deployKey
  convexDeploymentUrl = deploymentUrl
}

function getConvexUrl(): string {
  if (!convexDeploymentUrl) throw new Error('Convex not initialized')
  return convexDeploymentUrl
}

function getDeployKey(): string {
  if (!convexDeployKey) throw new Error('Convex deploy key not set')
  return convexDeployKey
}

async function convexQuery(
  functionPath: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const url = `${getConvexUrl()}/api/query`
  const res = await net.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Convex ${getDeployKey()}`,
    },
    body: JSON.stringify({ path: functionPath, args }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Convex query failed: ${res.status} ${text}`)
  }
  const body = (await res.json()) as { status: string; value?: unknown; errorMessage?: string }
  if (body.status === 'error') throw new Error(body.errorMessage || 'Convex query error')
  return body.value
}

async function convexMutation(
  functionPath: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const url = `${getConvexUrl()}/api/mutation`
  const res = await net.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Convex ${getDeployKey()}`,
    },
    body: JSON.stringify({ path: functionPath, args }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Convex mutation failed: ${res.status} ${text}`)
  }
  const body = (await res.json()) as { status: string; value?: unknown; errorMessage?: string }
  if (body.status === 'error') throw new Error(body.errorMessage || 'Convex mutation error')
  return body.value
}

// --- Connection validation ---

export async function validateConvexConnection(
  deployKey: string,
): Promise<{ ok: boolean; deploymentUrl?: string; deploymentName?: string; httpActionsUrl?: string; error?: string }> {
  try {
    // Extract deployment URL from deploy key
    // Deploy keys have the format: prod:<deployment>|<secret>
    // The deployment URL is https://<deployment>.convex.cloud
    const parts = deployKey.split('|')
    if (parts.length < 2) {
      return { ok: false, error: 'Invalid deploy key format' }
    }
    const prefix = parts[0] // e.g., "prod:happy-animal-123"
    const colonIdx = prefix.indexOf(':')
    if (colonIdx < 0) {
      return { ok: false, error: 'Invalid deploy key format — expected "prod:<deployment>|<secret>"' }
    }
    const deploymentName = prefix.slice(colonIdx + 1)
    const deploymentUrl = `https://${deploymentName}.convex.cloud`
    const httpActionsUrl = `https://${deploymentName}.convex.site`

    // Test connectivity by querying a simple endpoint
    const res = await net.fetch(`${deploymentUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Convex ${deployKey}`,
      },
      body: JSON.stringify({ path: 'videos:list', args: {} }),
    })

    // 400 "function not found" is expected before deployment — means connection works
    if (res.ok || res.status === 400) {
      return { ok: true, deploymentUrl, deploymentName, httpActionsUrl }
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Invalid deploy key — authentication failed' }
    }

    const text = await res.text()
    return { ok: false, error: `Convex connection failed: ${res.status} ${text}` }
  } catch (e) {
    return { ok: false, error: `Convex connection failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// --- Database CRUD ---

export async function convexInsert(
  _collection: string,
  _docId: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await convexMutation('videos:insert', data)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Convex insert failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function convexQuery_(
  _collection: string,
  _orderBy: string,
  _direction: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  try {
    const result = await convexQuery('videos:list')
    const docs = (result as Array<Record<string, unknown>>) || []
    // Map Convex _id to id for compatibility
    const mapped = docs.map((doc) => ({
      ...doc,
      id: doc.short_code || doc._id,
    }))
    return { ok: true, data: mapped }
  } catch (e) {
    return { ok: false, error: `Convex query failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function convexQueryByField(
  _collection: string,
  _field: string,
  value: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  try {
    const result = await convexQuery('videos:getByShortCode', { shortCode: value })
    if (result) {
      const doc = result as Record<string, unknown>
      return { ok: true, data: [{ ...doc, id: doc.short_code || doc._id }] }
    }
    return { ok: true, data: [] }
  } catch (e) {
    return { ok: false, error: `Convex query failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function convexDelete(
  _collection: string,
  docId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await convexMutation('videos:remove', { shortCode: docId })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Convex delete failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// --- Storage operations ---

export async function convexUpload(
  _remotePath: string,
  fileData: ArrayBuffer,
  contentType: string,
): Promise<{ ok: boolean; url?: string; storageId?: string; error?: string }> {
  try {
    // Step 1: Get an upload URL from Convex
    const uploadUrlResult = await convexMutation('videos:generateUploadUrl')
    const uploadUrl = uploadUrlResult as string
    if (!uploadUrl) throw new Error('Failed to get upload URL from Convex')

    // Step 2: Upload the file to the Convex storage URL
    const uploadRes = await net.fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: Buffer.from(fileData) as unknown as BodyInit,
    })

    if (!uploadRes.ok) {
      const text = await uploadRes.text()
      throw new Error(`File upload failed: ${uploadRes.status} ${text}`)
    }

    const { storageId } = (await uploadRes.json()) as { storageId: string }

    return { ok: true, storageId, url: storageId }
  } catch (e) {
    return { ok: false, error: `Convex upload failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function convexDeleteFile(
  _remotePath: string,
): Promise<{ ok: boolean; error?: string }> {
  // File deletion is handled as part of video deletion in the Convex mutation
  return { ok: true }
}

export async function convexGetFileUrl(
  _remotePath: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  // For Convex, public URLs go through the HTTP action proxy
  // This is a placeholder — the actual URL is constructed during insert
  return { ok: true, url: '' }
}
