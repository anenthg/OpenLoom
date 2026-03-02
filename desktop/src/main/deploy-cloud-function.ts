import { net } from 'electron'
import { deflateRawSync } from 'zlib'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin') as typeof import('firebase-admin')

export const CLOUD_FUNCTION_VERSION = '1.0.2'

// ---------------------------------------------------------------------------
// Embedded Cloud Function source (v1 SDK — works on both 1st & 2nd gen)
// ---------------------------------------------------------------------------

const FUNCTION_INDEX_JS = `
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const DB_ID = process.env.FIRESTORE_DB_ID || "(default)";
function getDb() {
  if (DB_ID && DB_ID !== "(default)") {
    return admin.firestore().databaseId === DB_ID
      ? admin.firestore()
      : require("firebase-admin/firestore").getFirestore(admin.app(), DB_ID);
  }
  return admin.firestore();
}

function json(res, data, status) {
  status = status || 200;
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.status(status).json(data);
}

exports.thari = functions.https.onRequest(function (req, res) {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  var db = getDb();
  var path = req.path;

  // GET /v/:code
  var videoMatch = path.match(/^\\/v\\/([\\w-]+)$/);
  if (videoMatch && req.method === "GET") {
    var code = videoMatch[1];
    return db.collection("videos").doc(code).get().then(function (doc) {
      if (!doc.exists) return json(res, { error: "Video not found" }, 404);
      json(res, doc.data());
    }).catch(function (e) { json(res, { error: e.message }, 500); });
  }

  // POST /v/:code/view
  var viewMatch = path.match(/^\\/v\\/([\\w-]+)\\/view$/);
  if (viewMatch && req.method === "POST") {
    var code2 = viewMatch[1];
    var ref = db.collection("videos").doc(code2);
    return ref.get().then(function (doc) {
      if (!doc.exists) return json(res, { error: "Video not found" }, 404);
      return ref.update({ view_count: admin.firestore.FieldValue.increment(1) })
        .then(function () { json(res, { ok: true }); });
    }).catch(function (e) { json(res, { error: e.message }, 500); });
  }

  // GET /v/:code/reactions
  var reactionsMatch = path.match(/^\\/v\\/([\\w-]+)\\/reactions$/);
  if (reactionsMatch && req.method === "GET") {
    var code3 = reactionsMatch[1];
    return db.collection("videos").doc(code3).collection("reactions")
      .orderBy("created_at", "asc").get()
      .then(function (snapshot) {
        var reactions = snapshot.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        json(res, reactions);
      }).catch(function (e) { json(res, { error: e.message }, 500); });
  }

  // POST /v/:code/reactions
  if (reactionsMatch && req.method === "POST") {
    var code4 = reactionsMatch[1];
    var body = req.body || {};
    if (!body.emoji || typeof body.timestamp !== "number") {
      return json(res, { error: "emoji and timestamp are required" }, 400);
    }
    return db.collection("videos").doc(code4).collection("reactions")
      .add({ emoji: body.emoji, timestamp: body.timestamp, created_at: admin.firestore.FieldValue.serverTimestamp() })
      .then(function (docRef) {
        return docRef.get().then(function (created) {
          json(res, Object.assign({ id: docRef.id }, created.data()), 201);
        });
      }).catch(function (e) { json(res, { error: e.message }, 500); });
  }

  json(res, { error: "Not found" }, 404);
});
`.trim()

const FUNCTION_PACKAGE_JSON = JSON.stringify(
  {
    name: 'thari-cloud-function',
    version: '1.0.0',
    private: true,
    main: 'index.js',
    engines: { node: '20' },
    dependencies: {
      'firebase-admin': '^12.0.0',
      'firebase-functions': '^4.9.0',
    },
  },
  null,
  2,
)

// ---------------------------------------------------------------------------
// In-memory ZIP creation (manual ZIP format, DEFLATE via Node.js zlib)
// ---------------------------------------------------------------------------

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date): { time: number; dateVal: number } {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f)
  const dateVal =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f)
  return { time, dateVal }
}

interface ZipEntry {
  name: string
  content: Buffer
}

function createZipBuffer(entries: ZipEntry[]): Buffer {
  const now = new Date()
  const { time, dateVal } = dosDateTime(now)
  const parts: Buffer[] = []
  const centralDir: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf-8')
    const uncompressed = entry.content
    const compressed = deflateRawSync(uncompressed)
    const crc = crc32(uncompressed)

    // Local file header
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // signature
    localHeader.writeUInt16LE(20, 4) // version needed
    localHeader.writeUInt16LE(0, 6) // flags
    localHeader.writeUInt16LE(8, 8) // compression: DEFLATE
    localHeader.writeUInt16LE(time, 10) // mod time
    localHeader.writeUInt16LE(dateVal, 12) // mod date
    localHeader.writeUInt32LE(crc, 14) // crc32
    localHeader.writeUInt32LE(compressed.length, 18) // compressed size
    localHeader.writeUInt32LE(uncompressed.length, 22) // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26) // file name length
    localHeader.writeUInt16LE(0, 28) // extra field length

    parts.push(localHeader, nameBytes, compressed)

    // Central directory entry
    const cdEntry = Buffer.alloc(46)
    cdEntry.writeUInt32LE(0x02014b50, 0) // signature
    cdEntry.writeUInt16LE(20, 4) // version made by
    cdEntry.writeUInt16LE(20, 6) // version needed
    cdEntry.writeUInt16LE(0, 8) // flags
    cdEntry.writeUInt16LE(8, 10) // compression: DEFLATE
    cdEntry.writeUInt16LE(time, 12) // mod time
    cdEntry.writeUInt16LE(dateVal, 14) // mod date
    cdEntry.writeUInt32LE(crc, 16) // crc32
    cdEntry.writeUInt32LE(compressed.length, 20) // compressed size
    cdEntry.writeUInt32LE(uncompressed.length, 24) // uncompressed size
    cdEntry.writeUInt16LE(nameBytes.length, 28) // file name length
    cdEntry.writeUInt16LE(0, 30) // extra field length
    cdEntry.writeUInt16LE(0, 32) // file comment length
    cdEntry.writeUInt16LE(0, 34) // disk number start
    cdEntry.writeUInt16LE(0, 36) // internal file attributes
    cdEntry.writeUInt32LE(0, 38) // external file attributes
    cdEntry.writeUInt32LE(offset, 42) // relative offset of local header

    centralDir.push(cdEntry, nameBytes)

    offset += localHeader.length + nameBytes.length + compressed.length
  }

  const cdOffset = offset
  let cdSize = 0
  for (const buf of centralDir) cdSize += buf.length

  // End of central directory
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // disk with CD
  eocd.writeUInt16LE(entries.length, 8) // entries on disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(cdSize, 12) // size of central directory
  eocd.writeUInt32LE(cdOffset, 16) // offset of central directory
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...parts, ...centralDir, eocd])
}

// ---------------------------------------------------------------------------
// Deployment helpers (Cloud Functions v2 / 2nd gen)
// ---------------------------------------------------------------------------

interface DeployParams {
  serviceAccountJson: string
  projectId: string
  firestoreDbId?: string
  storageBucket: string
}

interface DeployResult {
  ok: boolean
  error?: string
  enableUrls?: { label: string; url: string }[]
  functionUrl?: string
}

function log(msg: string, data?: unknown): void {
  const ts = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[deploy-cf ${ts}] ${msg}`, data)
  } else {
    console.log(`[deploy-cf ${ts}] ${msg}`)
  }
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  log(`Getting access token for SA: ${sa.client_email}, project: ${sa.project_id}`)
  const credential = admin.credential.cert(sa)
  const { access_token } = await credential.getAccessToken()
  log(`Access token obtained (${access_token.substring(0, 20)}...)`)
  return access_token
}

async function resolveProjectNumber(token: string, projectId: string): Promise<string> {
  const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`
  log(`Resolving project number for: ${projectId}`)
  const res = await net.fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    log(`Failed to resolve project number: ${res.status} ${res.statusText}`, body)
    return projectId // fallback to project ID string
  }
  const data = (await res.json()) as { projectNumber?: string }
  log(`Project number resolved: ${data.projectNumber}`)
  return data.projectNumber || projectId
}

async function enableApi(
  token: string,
  projectIdentifier: string,
  apiName: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const url = `https://serviceusage.googleapis.com/v1/projects/${projectIdentifier}/services/${apiName}:enable`
  log(`Enabling API: ${apiName} via ${url}`)
  const res = await net.fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const body = await res.text()
    log(`Enable API ${apiName} failed: ${res.status} ${res.statusText}`, body)
    return { ok: false, status: res.status, error: body }
  }
  const body = await res.json()
  log(`Enable API ${apiName} succeeded`, body)
  return { ok: true, status: res.status }
}

class DeployActionError extends Error {
  enableUrls: { label: string; url: string }[]
  constructor(message: string, enableUrls: { label: string; url: string }[]) {
    super(message)
    this.enableUrls = enableUrls
  }
}

function apiNotEnabledError(projectId: string): DeployActionError {
  return new DeployActionError(
    'Required APIs are not enabled. Please enable them in the GCP Console, then retry.',
    [
      {
        label: 'Enable Cloud Functions API',
        url: `https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=${projectId}`,
      },
      {
        label: 'Enable Cloud Build API',
        url: `https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=${projectId}`,
      },
      {
        label: 'Enable Artifact Registry API',
        url: `https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=${projectId}`,
      },
      {
        label: 'Enable Cloud Run API',
        url: `https://console.cloud.google.com/apis/library/run.googleapis.com?project=${projectId}`,
      },
    ],
  )
}

function missingRoleError(projectId: string, saEmail: string): DeployActionError {
  return new DeployActionError(
    `The service account lacks Cloud Functions permissions. ` +
    `Grant the "Cloud Functions Developer" role to ${saEmail}, then retry.`,
    [
      {
        label: 'Open IAM Settings',
        url: `https://console.cloud.google.com/iam-admin/iam?project=${projectId}`,
      },
    ],
  )
}

async function tryEnableApis(token: string, projectId: string): Promise<void> {
  const apis = [
    'cloudfunctions.googleapis.com',
    'cloudbuild.googleapis.com',
    'artifactregistry.googleapis.com',
    'run.googleapis.com',
  ]

  // Best-effort: try to enable via Service Usage API.
  // The SA likely lacks permission — that's fine, we just log and move on.
  const projectNumber = await resolveProjectNumber(token, projectId)
  log(`Using project identifier for Service Usage: ${projectNumber} (original: ${projectId})`)

  for (const api of apis) {
    let result = await enableApi(token, projectNumber, api)
    if (!result.ok && projectNumber !== projectId) {
      result = await enableApi(token, projectId, api)
    }
    if (result.ok) {
      log(`Successfully enabled ${api}`)
    } else {
      log(`Could not enable ${api} (SA lacks permission) — will attempt deployment anyway`)
    }
  }
}

async function checkCloudFunctionsAccess(
  token: string,
  projectId: string,
  saEmail: string,
): Promise<void> {
  // Use a lightweight v2 list call to determine: API not enabled vs SA lacks permission
  const listUrl = `https://cloudfunctions.googleapis.com/v2/projects/${projectId}/locations/us-central1/functions`
  log(`Checking Cloud Functions v2 access: ${listUrl}`)
  const res = await net.fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.text()
  log(`Cloud Functions v2 access check: ${res.status}`, body.substring(0, 500))

  if (res.ok) return // API enabled and SA has access

  const isHtml = body.toLowerCase().includes('<!doctype') || body.toLowerCase().includes('<html')

  if (isHtml) {
    // HTML error = API not enabled at all
    log('HTML response — API not enabled')
    throw apiNotEnabledError(projectId)
  }

  if (res.status === 403) {
    const lowerBody = body.toLowerCase()
    if (lowerBody.includes('has not been used') || lowerBody.includes('is disabled')) {
      log('API not enabled (JSON 403)')
      throw apiNotEnabledError(projectId)
    }
    // API is enabled but SA lacks permission
    log('API enabled but SA lacks Cloud Functions permissions')
    throw missingRoleError(projectId, saEmail)
  }
}

async function uploadSourceToGCS(
  token: string,
  _projectId: string,
  bucketName: string,
  zipBuffer: Buffer,
): Promise<{ bucket: string; object: string }> {
  const objectName = `cloud-function-source/thari-${Date.now()}.zip`
  const gcsUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`
  log(`Uploading source to GCS: gs://${bucketName}/${objectName} (${zipBuffer.length} bytes)`)

  const res = await net.fetch(gcsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/zip',
    },
    body: zipBuffer as unknown as BodyInit,
  })

  if (!res.ok) {
    const body = await res.text()
    log(`GCS upload failed: ${res.status}`, body)
    throw new Error(`Failed to upload source to GCS: ${res.statusText}`)
  }

  log(`Source uploaded to gs://${bucketName}/${objectName}`)
  return { bucket: bucketName, object: objectName }
}

type FunctionState = 'none' | 'v1' | 'v2'

async function checkFunctionState(
  token: string,
  functionName: string,
): Promise<FunctionState> {
  // Check v2 first
  const v2Url = `https://cloudfunctions.googleapis.com/v2/${functionName}`
  log(`Checking if v2 function exists: ${v2Url}`)
  const v2Res = await net.fetch(v2Url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (v2Res.ok) {
    const fn = (await v2Res.json()) as { environment?: string }
    log(`Function found via v2 API, environment: ${fn.environment}`)
    // v2 API can return v1 functions too — check the environment field
    if (fn.environment === 'GEN_1') {
      return 'v1'
    }
    return 'v2'
  }

  // Check v1 endpoint as fallback
  const v1Url = `https://cloudfunctions.googleapis.com/v1/${functionName}`
  log(`Checking if v1 function exists: ${v1Url}`)
  const v1Res = await net.fetch(v1Url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (v1Res.ok) {
    log('Function exists as v1 (1st gen)')
    return 'v1'
  }

  log('Function does not exist')
  return 'none'
}

async function deleteV1Function(
  token: string,
  functionName: string,
): Promise<void> {
  // Delete via v1 API since it's a v1 function
  const url = `https://cloudfunctions.googleapis.com/v1/${functionName}`
  log(`Deleting v1 function: ${url}`)
  const res = await net.fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    log(`Delete v1 function failed: ${res.status}`, body)
    throw new Error(`Failed to delete existing v1 function: ${res.status}`)
  }
  const op = (await res.json()) as { name: string }
  log(`Delete operation started: ${op.name}`)

  // Poll until deletion completes
  const start = Date.now()
  while (Date.now() - start < 120_000) {
    await new Promise((r) => setTimeout(r, 5_000))
    const pollRes = await net.fetch(
      `https://cloudfunctions.googleapis.com/v1/${op.name}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (pollRes.ok) {
      const pollOp = (await pollRes.json()) as { done?: boolean; error?: { message?: string } }
      if (pollOp.error) {
        throw new Error(`Delete v1 function failed: ${pollOp.error.message}`)
      }
      if (pollOp.done) {
        log('V1 function deleted successfully')
        return
      }
    }
  }
  throw new Error('Timed out waiting for v1 function deletion')
}

async function createOrUpdateFunction(
  token: string,
  projectId: string,
  source: { bucket: string; object: string },
  firestoreDbId: string | undefined,
): Promise<string> {
  const parent = `projects/${projectId}/locations/us-central1`
  const functionName = `${parent}/functions/thari`
  const state = await checkFunctionState(token, functionName)

  // If a v1 function exists, delete it first — v2 API can't update a v1 function
  if (state === 'v1') {
    log('Existing v1 function detected — deleting before creating v2...')
    await deleteV1Function(token, functionName)
  }

  const body = {
    name: functionName,
    buildConfig: {
      runtime: 'nodejs20',
      entryPoint: 'thari',
      source: {
        storageSource: {
          bucket: source.bucket,
          object: source.object,
        },
      },
    },
    serviceConfig: {
      availableMemory: '256Mi',
      timeoutSeconds: 60,
      environmentVariables: {
        FIRESTORE_DB_ID: firestoreDbId || '(default)',
      },
      ingressSettings: 'ALLOW_ALL',
      allTrafficOnLatestRevision: true,
    },
  }

  let url: string
  let method: string

  if (state === 'v2') {
    url = `https://cloudfunctions.googleapis.com/v2/${functionName}?updateMask=buildConfig,serviceConfig`
    method = 'PATCH'
    log(`Updating existing v2 function: ${method} ${url}`)
  } else {
    url = `https://cloudfunctions.googleapis.com/v2/${parent}/functions?functionId=thari`
    method = 'POST'
    log(`Creating new v2 function: ${method} ${url}`)
  }
  log('Function payload:', body)

  const res = await net.fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    log(`Create/update function failed: ${res.status}`, errText)
    let errBody: { error?: { code?: number; message?: string; status?: string } } = {}
    try { errBody = JSON.parse(errText) } catch { /* */ }

    // Function already exists on create — fall back to update
    if (state !== 'v2' && errBody.error?.code === 409) {
      log('Function already exists (409), falling back to PATCH')
      const patchUrl = `https://cloudfunctions.googleapis.com/v2/${functionName}?updateMask=buildConfig,serviceConfig`
      const patchRes = await net.fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!patchRes.ok) {
        const patchText = await patchRes.text()
        log(`Fallback PATCH failed: ${patchRes.status}`, patchText)
        let patchErr: { error?: { message?: string } } = {}
        try { patchErr = JSON.parse(patchText) } catch { /* */ }
        throw new Error(patchErr.error?.message || patchRes.statusText)
      }
      const op = (await patchRes.json()) as { name: string }
      log(`Fallback PATCH succeeded, operation: ${op.name}`)
      return op.name
    }

    const errMsg = errBody.error?.message || ''

    // Detect actAs permission error — SA needs Service Account User role
    if (errMsg.includes('iam.serviceaccounts.actAs')) {
      const targetMatch = errMsg.match(/serviceAccounts\/([\w.@-]+)/)
      const targetSa = targetMatch?.[1] || 'the default compute service account'
      throw new DeployActionError(
        `Grant the "Service Account User" role to your service account on ${targetSa}, then retry.`,
        [
          {
            label: 'Open IAM Settings',
            url: `https://console.cloud.google.com/iam-admin/iam?project=${projectId}`,
          },
        ],
      )
    }

    // Check for API not enabled errors
    if (
      errMsg.includes('has not been used') ||
      errMsg.includes('is disabled')
    ) {
      throw apiNotEnabledError(projectId)
    }

    throw new Error(errBody.error?.message || res.statusText)
  }

  const operation = (await res.json()) as { name: string }
  log(`Function ${state === 'v2' ? 'update' : 'create'} succeeded, operation: ${operation.name}`)
  return operation.name
}

async function pollOperation(
  token: string,
  operationName: string,
  timeoutMs = 300_000,
): Promise<string | undefined> {
  const start = Date.now()
  const interval = 5_000
  let pollCount = 0

  log(`Polling operation (v2): ${operationName} (timeout: ${timeoutMs}ms)`)

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, interval))
    pollCount++

    const res = await net.fetch(
      `https://cloudfunctions.googleapis.com/v2/${operationName}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.ok) {
      const op = (await res.json()) as {
        done?: boolean
        error?: { message?: string; code?: number }
        metadata?: unknown
        response?: { url?: string; serviceConfig?: { uri?: string } }
      }
      log(`Poll #${pollCount}: done=${op.done}`, op.error || op.metadata || '')
      if (op.error) {
        throw new Error(`Deployment failed: ${op.error.message}`)
      }
      if (op.done) {
        log(`Operation completed after ${pollCount} polls (${Math.round((Date.now() - start) / 1000)}s)`)
        // Extract function URL from operation response
        const functionUrl = op.response?.url || op.response?.serviceConfig?.uri
        if (functionUrl) {
          log(`Function URL: ${functionUrl}`)
        }
        return functionUrl
      }
    } else {
      log(`Poll #${pollCount}: HTTP ${res.status}`)
    }
  }

  throw new Error('Deployment timed out. Please try again.')
}

async function getFunctionUrl(
  token: string,
  functionName: string,
): Promise<string | undefined> {
  const url = `https://cloudfunctions.googleapis.com/v2/${functionName}`
  log(`Fetching function details for URL: ${url}`)
  const res = await net.fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    log(`Failed to fetch function: ${res.status}`)
    return undefined
  }
  const fn = (await res.json()) as { url?: string; serviceConfig?: { uri?: string } }
  const fnUrl = fn.url || fn.serviceConfig?.uri
  log(`Function URL from GET: ${fnUrl}`)
  return fnUrl
}

async function setPublicAccess(
  token: string,
  projectId: string,
  functionName: string,
): Promise<void> {
  // v2 functions are backed by Cloud Run — we need to set allUsers → roles/run.invoker
  // on the underlying Cloud Run service for unauthenticated access.

  // Step 1: Get function details to find the Cloud Run service
  const fnUrl = `https://cloudfunctions.googleapis.com/v2/${functionName}`
  log(`Fetching function details for Cloud Run service: ${fnUrl}`)
  const fnRes = await net.fetch(fnUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!fnRes.ok) {
    throw new Error(`Failed to get function details: ${fnRes.status}`)
  }
  const fn = (await fnRes.json()) as {
    serviceConfig?: { service?: string; uri?: string }
  }

  let serviceName = fn.serviceConfig?.service
  log(`Cloud Run service from function: ${serviceName}`)

  if (!serviceName) {
    throw new Error('Could not determine Cloud Run service name from function')
  }

  // Expand short service name to full resource path if needed
  // Short name example: "thari" → full: "projects/{p}/locations/us-central1/services/thari"
  if (!serviceName.startsWith('projects/')) {
    serviceName = `projects/${projectId}/locations/us-central1/services/${serviceName}`
    log(`Expanded service name: ${serviceName}`)
  }

  // Step 2: Set IAM policy on the Cloud Run service
  const iamUrl = `https://run.googleapis.com/v2/${serviceName}:setIamPolicy`
  log(`Setting public access on Cloud Run service: ${iamUrl}`)
  const iamRes = await net.fetch(iamUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      policy: {
        bindings: [
          {
            role: 'roles/run.invoker',
            members: ['allUsers'],
          },
        ],
      },
    }),
  })

  if (!iamRes.ok) {
    const body = await iamRes.text()
    log(`setIamPolicy on Cloud Run failed: ${iamRes.status}`, body)

    if (iamRes.status === 403) {
      throw new DeployActionError(
        `The service account lacks permission to make the function publicly accessible. ` +
        `Grant the "Cloud Run Admin" role to the service account, then retry.`,
        [
          {
            label: 'Open IAM Settings',
            url: `https://console.cloud.google.com/iam-admin/iam?project=${projectId}`,
          },
        ],
      )
    }

    throw new Error(`Failed to set public access: ${body}`)
  }

  log('Public access set successfully — allUsers can invoke the function')
}

// ---------------------------------------------------------------------------
// Main deployment function
// ---------------------------------------------------------------------------

export async function deployCloudFunction(params: DeployParams): Promise<DeployResult> {
  const { serviceAccountJson, projectId, firestoreDbId, storageBucket } = params

  const sa = JSON.parse(serviceAccountJson)
  const saEmail = sa.client_email || 'unknown'

  log('=== Starting Cloud Function deployment (v2 / 2nd gen) ===')
  log(`Project: ${projectId}, SA: ${saEmail}, Bucket: ${storageBucket}, Firestore DB: ${firestoreDbId || '(default)'}`)

  try {
    const token = await getAccessToken(serviceAccountJson)

    // Best-effort: try to enable APIs (SA likely lacks permission, that's OK)
    log('Step 1/5: Attempting to enable APIs (best-effort)...')
    await tryEnableApis(token, projectId)
    log('Step 1/5: Done')

    // Pre-check: verify the SA can actually access Cloud Functions v2 API
    log('Step 2/5: Checking Cloud Functions v2 access...')
    await checkCloudFunctionsAccess(token, projectId, saEmail)
    log('Step 2/5: Cloud Functions v2 access confirmed')

    // Build ZIP and upload source to GCS
    log('Step 3/5: Building ZIP and uploading source to GCS...')
    const zipBuffer = createZipBuffer([
      { name: 'index.js', content: Buffer.from(FUNCTION_INDEX_JS, 'utf-8') },
      { name: 'package.json', content: Buffer.from(FUNCTION_PACKAGE_JSON, 'utf-8') },
    ])
    log(`ZIP built (${zipBuffer.length} bytes)`)

    const source = await uploadSourceToGCS(token, projectId, storageBucket, zipBuffer)
    log('Step 3/5: Source uploaded to GCS')

    // Create or update the function (v2 API)
    log('Step 4/5: Creating/updating function (v2)...')
    const operationName = await createOrUpdateFunction(
      token,
      projectId,
      source,
      firestoreDbId,
    )

    // Poll until deployment completes — returns function URL if available
    log('Step 4/5: Waiting for deployment to complete...')
    let functionUrl = await pollOperation(token, operationName)
    log('Step 4/5: Deployment complete')

    // If URL wasn't in the operation response, fetch it from the function
    const functionName = `projects/${projectId}/locations/us-central1/functions/thari`
    if (!functionUrl) {
      functionUrl = await getFunctionUrl(token, functionName)
    }

    // Set public access on the Cloud Run service (required for unauthenticated web viewer)
    // Retry a few times — Cloud Run service may not be ready immediately after deployment
    log('Step 5/5: Setting public access on Cloud Run service...')
    let publicAccessSet = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await setPublicAccess(token, projectId, functionName)
        publicAccessSet = true
        break
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('unable to queue') && attempt < 3) {
          log(`Step 5/5: Attempt ${attempt} failed (service not ready), retrying in 10s...`)
          await new Promise((r) => setTimeout(r, 10_000))
        } else {
          throw e // re-throw on final attempt or non-retryable errors
        }
      }
    }
    if (publicAccessSet) log('Step 5/5: Public access configured')

    log('=== Cloud Function deployment finished (v2) ===')
    if (functionUrl) log(`Function URL: ${functionUrl}`)

    return { ok: true, functionUrl }
  } catch (e) {
    if (e instanceof DeployActionError) {
      log(`=== Cloud Function deployment BLOCKED: ${e.message} ===`)
      return {
        ok: false,
        error: e.message,
        enableUrls: e.enableUrls,
      }
    }
    const errMsg = e instanceof Error ? e.message : String(e)
    log(`=== Cloud Function deployment FAILED: ${errMsg} ===`)
    return {
      ok: false,
      error: `Cloud Function deployment failed: ${errMsg}`,
    }
  }
}
