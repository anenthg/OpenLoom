/**
 * Firebase backend for OpenLoom Chrome Extension.
 *
 * Replaces Firebase Admin SDK (Node-only) with direct GCP REST APIs
 * and SubtleCrypto-based JWT signing so everything runs in a service-worker
 * or page context.
 */

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let cachedProjectId: string | null = null
let cachedDbId: string | null = null
let cachedBucket: string | null = null

// Service-account fields needed for token minting
let saClientEmail: string | null = null
let saPrivateKey: CryptoKey | null = null

// OAuth2 token cache
let cachedAccessToken: string | null = null
let tokenExpiresAt = 0

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Import a PEM-encoded PKCS#8 RSA private key into a CryptoKey suitable for
 * RS256 (RSASSA-PKCS1-v1_5 + SHA-256) signing.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Strip PEM header/footer and whitespace
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/[\r\n\s]/g, '')

  // Base64 decode to DER bytes
  const binaryStr = atob(b64)
  const der = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    der[i] = binaryStr.charCodeAt(i)
  }

  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/**
 * Base64url-encode a Uint8Array (no padding).
 */
function b64url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Base64url-encode a UTF-8 string.
 */
function b64urlString(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Mint a Google OAuth2 access token using the service-account credentials.
 * Tokens are cached for 50 minutes (they are valid for 60).
 */
async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken
  }

  if (!saClientEmail || !saPrivateKey) {
    throw new Error('Firebase not initialized — call initFirebase first')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = b64urlString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64urlString(
    JSON.stringify({
      iss: saClientEmail,
      scope: [
        'https://www.googleapis.com/auth/datastore',
        'https://www.googleapis.com/auth/devstorage.full_control',
        'https://www.googleapis.com/auth/cloud-platform',
      ].join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )

  const signingInput = new TextEncoder().encode(`${header}.${payload}`)
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', saPrivateKey, signingInput),
  )

  const jwt = `${header}.${payload}.${b64url(signature)}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}`,
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`OAuth2 token request failed: ${tokenRes.status} ${text}`)
  }

  const body = (await tokenRes.json()) as { access_token: string; expires_in: number }
  cachedAccessToken = body.access_token
  // Cache for 50 minutes (token is valid for 60)
  tokenExpiresAt = Date.now() + 50 * 60 * 1000
  return cachedAccessToken
}

/**
 * Initialise the Firebase backend module with a parsed service-account JSON.
 */
export async function initFirebase(settings: {
  serviceAccountJson?: string
  firestoreDbId?: string
  resolvedBucket?: string
}): Promise<void> {
  const saJson = settings.serviceAccountJson
  if (!saJson) throw new Error('No service account JSON provided')

  const sa = JSON.parse(saJson) as {
    project_id: string
    client_email: string
    private_key: string
  }

  cachedProjectId = sa.project_id
  saClientEmail = sa.client_email
  saPrivateKey = await importPrivateKey(sa.private_key)
  cachedDbId = settings.firestoreDbId || '(default)'
  cachedBucket = settings.resolvedBucket || null

  // Reset token cache so a fresh token is minted
  cachedAccessToken = null
  tokenExpiresAt = 0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProjectId(): string {
  if (!cachedProjectId) throw new Error('Firebase not initialized')
  return cachedProjectId
}

function getDbId(): string {
  return cachedDbId || '(default)'
}

function firestoreBase(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/${getDbId()}/documents`
}

// ---------------------------------------------------------------------------
// Firestore value marshalling
// ---------------------------------------------------------------------------

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields: Record<string, FirestoreValue> } }
  | { arrayValue: { values: FirestoreValue[] } }

function toFirestoreValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) }
    return { doubleValue: v }
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFirestoreValue) } }
  }
  if (typeof v === 'object') {
    const fields: Record<string, FirestoreValue> = {}
    for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
      fields[key] = toFirestoreValue(val)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(v) }
}

function fromFirestoreValue(v: FirestoreValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue)
  if ('mapValue' in v) {
    const obj: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(v.mapValue.fields || {})) {
      obj[key] = fromFirestoreValue(val)
    }
    return obj
  }
  return null
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {}
  for (const [key, val] of Object.entries(data)) {
    fields[key] = toFirestoreValue(val)
  }
  return fields
}

function fromFirestoreDoc(doc: {
  name: string
  fields?: Record<string, FirestoreValue>
}): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  // Extract document ID from the name path
  const parts = doc.name.split('/')
  result.id = parts[parts.length - 1]
  if (doc.fields) {
    for (const [key, val] of Object.entries(doc.fields)) {
      result[key] = fromFirestoreValue(val)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Firestore CRUD
// ---------------------------------------------------------------------------

export async function firebaseInsert(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken()
    const url = `${firestoreBase()}/${collection}/${docId}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: toFirestoreFields(data) }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Firestore insert failed: ${res.status} ${text}`)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Firebase insert failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function firebaseQuery(
  collection: string,
  orderBy: string,
  direction: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  try {
    const token = await getAccessToken()
    const dir = direction === 'asc' ? 'ASCENDING' : 'DESCENDING'
    const url = `${firestoreBase()}:runQuery`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          orderBy: [{ field: { fieldPath: orderBy }, direction: dir }],
        },
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Firestore query failed: ${res.status} ${text}`)
    }
    const results = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, FirestoreValue> } }>
    const data = results
      .filter((r) => r.document)
      .map((r) => fromFirestoreDoc(r.document!))
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: `Firebase query failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function firebaseQueryByField(
  collection: string,
  field: string,
  value: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> {
  try {
    const token = await getAccessToken()
    const url = `${firestoreBase()}:runQuery`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: 'EQUAL',
              value: toFirestoreValue(value),
            },
          },
          limit: 1,
        },
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Firestore query failed: ${res.status} ${text}`)
    }
    const results = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, FirestoreValue> } }>
    const data = results
      .filter((r) => r.document)
      .map((r) => fromFirestoreDoc(r.document!))
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: `Firebase query failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function firebaseDelete(
  collection: string,
  docId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken()
    const url = `${firestoreBase()}/${collection}/${docId}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Firestore delete failed: ${res.status} ${text}`)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Firebase delete failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ---------------------------------------------------------------------------
// Storage REST operations
// ---------------------------------------------------------------------------

function getBucket(): string {
  if (cachedBucket) return cachedBucket
  return `${getProjectId()}.firebasestorage.app`
}

export async function firebaseUpload(
  remotePath: string,
  fileData: Blob,
  contentType: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const token = await getAccessToken()
    const bucket = getBucket()
    const encodedPath = encodeURIComponent(remotePath)
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodedPath}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
      },
      body: fileData,
    })

    if (!res.ok) {
      const text = await res.text()

      // If the bucket doesn't exist, try to detect the real one
      if (text.includes('does not exist') || res.status === 404) {
        const detectedBucket = await detectBucket()
        if (detectedBucket) {
          cachedBucket = detectedBucket
          // Retry with detected bucket
          const retryUrl = `https://storage.googleapis.com/upload/storage/v1/b/${detectedBucket}/o?uploadType=media&name=${encodedPath}`
          const retryRes = await fetch(retryUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': contentType,
            },
            body: fileData,
          })
          if (!retryRes.ok) {
            const retryText = await retryRes.text()
            throw new Error(`Storage upload failed (bucket: ${detectedBucket}): ${retryRes.status} ${retryText}`)
          }
          // Make the uploaded object publicly readable
          await makeObjectPublic(detectedBucket, remotePath, token)
          const publicUrl = `https://storage.googleapis.com/${detectedBucket}/${remotePath}`
          return { ok: true, url: publicUrl }
        }
        throw new Error(`Storage upload failed: ${res.status} ${text}`)
      }

      throw new Error(`Storage upload failed: ${res.status} ${text}`)
    }

    // Make the uploaded object publicly readable
    await makeObjectPublic(bucket, remotePath, token)
    const publicUrl = `https://storage.googleapis.com/${bucket}/${remotePath}`
    return { ok: true, url: publicUrl }
  } catch (e) {
    return { ok: false, error: `Firebase upload failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/**
 * Make a GCS object publicly readable by granting allUsers READER access.
 */
async function makeObjectPublic(bucket: string, objectPath: string, token: string): Promise<void> {
  const encodedPath = encodeURIComponent(objectPath)
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}/acl`
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entity: 'allUsers', role: 'READER' }),
  }).catch(() => {
    // Best-effort; uniform bucket-level access may be enabled instead
  })
}

export async function firebaseDeleteFile(
  remotePath: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken()
    const bucket = getBucket()
    const encodedPath = encodeURIComponent(remotePath)
    const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}`

    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    // Ignore errors — file may not exist
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Firebase file delete failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export function firebaseGetPublicUrl(remotePath: string): { ok: boolean; url?: string } {
  const bucket = getBucket()
  const publicUrl = `https://storage.googleapis.com/${bucket}/${remotePath}`
  return { ok: true, url: publicUrl }
}

// ---------------------------------------------------------------------------
// Bucket detection
// ---------------------------------------------------------------------------

function bucketCandidates(projectId: string): string[] {
  return [
    `${projectId}.firebasestorage.app`,
    `${projectId}.appspot.com`,
  ]
}

async function detectBucket(): Promise<string | null> {
  try {
    const token = await getAccessToken()
    const projectId = getProjectId()
    const candidates = bucketCandidates(projectId)

    // Try known naming conventions
    for (const name of candidates) {
      try {
        const res = await fetch(
          `https://storage.googleapis.com/storage/v1/b/${name}/o?maxResults=1`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (res.ok) return name
      } catch {
        // try next
      }
    }

    // List all project buckets and pick the best one
    try {
      const res = await fetch(
        `https://storage.googleapis.com/storage/v1/b?project=${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) {
        const body = (await res.json()) as { items?: Array<{ name: string }> }
        if (body.items && body.items.length > 0) {
          const match = body.items.find((b) => b.name.includes(projectId))
          return match ? match.name : body.items[0].name
        }
      }
    } catch {
      // listing may not be available
    }

    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Connection validation
// ---------------------------------------------------------------------------

/**
 * Create a Firestore database in Native Mode via the REST API.
 */
async function createFirestoreNativeDB(
  token: string,
  projectId: string,
  databaseId: string,
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=${databaseId}`

  const createRes = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'FIRESTORE_NATIVE',
      locationId: 'nam5',
    }),
  })

  if (!createRes.ok) {
    const body = (await createRes.json()) as { error?: { code?: number; message?: string } }
    // 409 = already exists — that's fine
    if (body.error?.code === 409) return
    throw new Error(body.error?.message || createRes.statusText)
  }

  // Poll the long-running operation until done (max 60 s)
  const operation = (await createRes.json()) as { name: string; done?: boolean }
  if (operation.done) return

  const opName = operation.name
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const pollRes = await fetch(`https://firestore.googleapis.com/v1/${opName}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (pollRes.ok) {
      const op = (await pollRes.json()) as { done?: boolean }
      if (op.done) return
    }
  }
  throw new Error('Timed out waiting for Firestore database creation')
}

export async function validateFirebaseConnection(
  serviceAccountJson: string,
): Promise<{
  ok: boolean
  projectId?: string
  firestoreDbId?: string
  resolvedBucket?: string
  error?: string
}> {
  try {
    const sa = JSON.parse(serviceAccountJson) as {
      project_id: string
      client_email: string
      private_key: string
    }
    const projectId = sa.project_id

    // Temporarily init to get an access token
    await initFirebase({ serviceAccountJson })
    const token = await getAccessToken()

    // Test Firestore access
    let firestoreDbId: string | undefined
    const dbId = '(default)'
    const testUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/videos?pageSize=1`
    const testRes = await fetch(testUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!testRes.ok) {
      const text = await testRes.text()
      const isDatastoreMode = text.includes('Datastore Mode') || text.includes('FAILED_PRECONDITION')
      const isNotFound = text.includes('NOT_FOUND') || testRes.status === 404

      if (isDatastoreMode || isNotFound) {
        const createDbId = isDatastoreMode ? 'openloom' : '(default)'

        try {
          await createFirestoreNativeDB(token, projectId, createDbId)
        } catch (createErr) {
          const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore`
          if (isNotFound) {
            throw new Error(
              `Firestore is not enabled for this project. ` +
              `Please visit ${consoleUrl} to set up Firestore in Native mode, then connect again.`,
            )
          } else {
            throw new Error(
              `This project's Firestore is in Datastore Mode. ` +
              `Please create a new database in Native mode at ${consoleUrl}, then connect again.`,
            )
          }
        }

        if (isDatastoreMode) {
          firestoreDbId = createDbId
          cachedDbId = createDbId
        }

        // Verify the new database works (retry — newly created DBs may take a few seconds)
        const verifyDbId = firestoreDbId || dbId
        const verifyUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${verifyDbId}/documents/videos?pageSize=1`
        let lastErr: string | null = null
        for (let attempt = 0; attempt < 10; attempt++) {
          const verifyRes = await fetch(verifyUrl, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (verifyRes.ok || verifyRes.status === 404) {
            // 404 on the collection (not the DB) is fine — means the DB exists
            lastErr = null
            break
          }
          lastErr = await verifyRes.text()
          await new Promise((r) => setTimeout(r, 2000))
        }
        if (lastErr) throw new Error(`Firestore verification failed: ${lastErr}`)
      } else {
        throw new Error(`Firestore access failed: ${testRes.status} ${text}`)
      }
    }

    // Detect storage bucket
    const detectedBucket = await detectBucket()
    if (detectedBucket) {
      cachedBucket = detectedBucket
    }

    return {
      ok: true,
      projectId,
      firestoreDbId,
      resolvedBucket: detectedBucket || undefined,
    }
  } catch (e) {
    return {
      ok: false,
      error: `Firebase connection failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
