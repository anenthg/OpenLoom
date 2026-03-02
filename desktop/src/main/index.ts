import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  nativeImage,
  net,
  session,
  shell,
  safeStorage,
  systemPreferences,
} from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { deployCloudFunction, CLOUD_FUNCTION_VERSION } from './deploy-cloud-function'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin') as typeof import('firebase-admin')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getFirestore } = require('firebase-admin/firestore') as { getFirestore: typeof import('firebase-admin/firestore').getFirestore }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Storage: GCSStorage } = require('@google-cloud/storage')

// Simple encrypted settings store using Electron's safeStorage
function getStorePath(): string {
  const dir = join(app.getPath('userData'), 'config')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

function loadSettings(): Record<string, unknown> {
  const filePath = getStorePath()
  if (!existsSync(filePath)) return {}
  try {
    const encrypted = readFileSync(filePath)
    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(encrypted)
      return JSON.parse(decrypted)
    }
    return JSON.parse(encrypted.toString('utf-8'))
  } catch {
    return {}
  }
}

function saveSettings(data: Record<string, unknown>): void {
  const filePath = getStorePath()
  const json = JSON.stringify(data)
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(filePath, safeStorage.encryptString(json))
  } else {
    writeFileSync(filePath, json, 'utf-8')
  }
}

let settings = {} as Record<string, unknown>

// Firebase Admin SDK state
let firebaseApp: ReturnType<typeof admin.initializeApp> | null = null
let resolvedBucket: string | null = null

function getFirebaseApp() {
  if (!firebaseApp) throw new Error('Firebase not initialized')
  return firebaseApp
}

function initFirebase(serviceAccountJson: string, bucketName?: string) {
  // Delete existing app if any
  if (firebaseApp) {
    firebaseApp.delete().catch(() => {})
    firebaseApp = null
  }

  const serviceAccount = JSON.parse(serviceAccountJson)
  const bucket = bucketName || resolvedBucket || `${serviceAccount.project_id}.firebasestorage.app`
  firebaseApp = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucket,
    },
    `thari-${Date.now()}`,
  )
  return firebaseApp
}

function bucketCandidates(projectId: string): string[] {
  return [
    `${projectId}.firebasestorage.app`,
    `${projectId}.appspot.com`,
  ]
}

async function detectOrCreateBucket(serviceAccount: { project_id: string; client_email: string; private_key: string }): Promise<string> {
  const projectId = serviceAccount.project_id
  const gcs = new GCSStorage({ credentials: serviceAccount, projectId })

  // 1. Try known naming conventions with a lightweight object-level call
  const candidates = bucketCandidates(projectId)
  for (const name of candidates) {
    try {
      await gcs.bucket(name).getFiles({ maxResults: 1 })
      return name
    } catch {
      // try next
    }
  }

  // 2. List all project buckets and pick the first one
  try {
    const [buckets] = await gcs.getBuckets()
    if (buckets.length > 0) {
      const match = buckets.find((b: { name: string }) => b.name.includes(projectId))
      return match ? match.name : buckets[0].name
    }
  } catch {
    // listing may require storage.buckets.list — not always available
  }

  // 3. No bucket found — auto-create one
  const createName = `${projectId}.appspot.com`
  try {
    await gcs.createBucket(createName, { location: 'US' })
    return createName
  } catch {
    // .appspot.com may be reserved; try a plain name
  }

  const fallbackName = `${projectId}-recordings`
  try {
    await gcs.createBucket(fallbackName, { location: 'US' })
    return fallbackName
  } catch (e) {
    throw new Error(
      `Could not find or create a storage bucket for project "${projectId}". ` +
      `Tried existing: ${candidates.join(', ')}. ` +
      `Tried creating: ${createName}, ${fallbackName}. ` +
      `Error: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

/** Return the Firestore instance, using a named database if configured. */
function getFirestoreDB() {
  const fbApp = getFirebaseApp()
  const dbId = settings.firestoreDbId as string | undefined
  if (dbId) return getFirestore(fbApp, dbId)
  return fbApp.firestore()
}

/**
 * Create a Firestore database in Native Mode via the REST API.
 * Used when the project's default database is in Datastore Mode.
 */
async function createFirestoreNativeDB(
  serviceAccount: { project_id: string; client_email: string; private_key: string },
  databaseId: string,
): Promise<void> {
  const credential = admin.credential.cert(serviceAccount as unknown as string)
  const { access_token } = await credential.getAccessToken()

  const projectId = serviceAccount.project_id
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=${databaseId}`

  const createRes = await net.fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'FIRESTORE_NATIVE',
      locationId: 'nam5',
    }),
  })

  if (!createRes.ok) {
    const body = await createRes.json() as { error?: { code?: number; message?: string } }
    // 409 = already exists — that's fine, we'll just use it
    if (body.error?.code === 409) return
    throw new Error(body.error?.message || createRes.statusText)
  }

  // Poll the long-running operation until done (max 60 s)
  const operation = await createRes.json() as { name: string; done?: boolean }
  if (operation.done) return

  const opName = operation.name
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000))

    const pollRes = await net.fetch(
      `https://firestore.googleapis.com/v1/${opName}`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    )
    if (pollRes.ok) {
      const op = await pollRes.json() as { done?: boolean }
      if (op.done) return
    }
  }
  throw new Error('Timed out waiting for Firestore database creation')
}

function createWindow(): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Thari.video',
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC handler: Validate Firebase connection
ipcMain.handle('validate-firebase', async (_event, serviceAccountJson: string) => {
  try {
    const fbApp = initFirebase(serviceAccountJson)
    const serviceAccount = JSON.parse(serviceAccountJson)
    const projectId = serviceAccount.project_id

    // Test Firestore access — handle missing or Datastore Mode databases
    try {
      const db = fbApp.firestore()
      await db.collection('videos').limit(1).get()
    } catch (fsErr) {
      const msg = String(fsErr)

      const isDatastoreMode = msg.includes('Datastore Mode')
      const isNotFound = msg.includes('NOT_FOUND')

      if (isDatastoreMode || isNotFound) {
        // NOT_FOUND → no database exists → create the (default) database
        // Datastore Mode → default exists but wrong mode → create a named database
        const dbId = isDatastoreMode ? 'thari' : '(default)'

        try {
          await createFirestoreNativeDB(serviceAccount, dbId)
        } catch (createErr) {
          // Permission denied — guide the user to set it up manually
          const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore`
          if (isNotFound) {
            throw new Error(
              `Firestore is not enabled for this project. ` +
              `Please visit ${consoleUrl} to set up Firestore in Native mode, then connect again.`,
            )
          } else {
            throw new Error(
              `This project's Firestore is in Datastore Mode. ` +
              `Please create a new database in Native mode at ${consoleUrl} , then connect again.`,
            )
          }
        }

        if (isDatastoreMode) {
          settings.firestoreDbId = dbId
          saveSettings(settings)
        }

        // Verify the new database works (retry — newly created DBs
        // may take a few seconds before they accept queries)
        const db = isDatastoreMode ? getFirestore(fbApp, dbId) : fbApp.firestore()
        let lastErr: unknown
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            await db.collection('videos').limit(1).get()
            lastErr = null
            break
          } catch (e) {
            lastErr = e
            await new Promise((r) => setTimeout(r, 2000))
          }
        }
        if (lastErr) throw lastErr
      } else {
        throw fsErr
      }
    }

    // Detect the correct storage bucket name
    resolvedBucket = await detectOrCreateBucket(serviceAccount)

    // Persist so we skip detection on next startup
    settings.resolvedBucket = resolvedBucket
    saveSettings(settings)

    // Re-init with the correct bucket so storage calls work
    initFirebase(serviceAccountJson, resolvedBucket)

    return { ok: true, projectId }
  } catch (e) {
    return {
      ok: false,
      error: `Firebase connection failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
})

// IPC handler: Firestore insert
ipcMain.handle(
  'firestore-insert',
  async (_event, collection: string, docId: string, data: Record<string, unknown>) => {
    try {
      const db = getFirestoreDB()
      await db.collection(collection).doc(docId).set(data)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: `Firestore insert failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },
)

// IPC handler: Firestore query (ordered)
ipcMain.handle(
  'firestore-query',
  async (_event, collection: string, orderBy: string, direction: string) => {
    try {
      const db = getFirestoreDB()
      const dir = direction === 'asc' ? 'asc' : 'desc'
      const snapshot = await db.collection(collection).orderBy(orderBy, dir).get()
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: `Firestore query failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },
)

// IPC handler: Firestore query by field
ipcMain.handle(
  'firestore-query-by-field',
  async (_event, collection: string, field: string, value: string) => {
    try {
      const db = getFirestoreDB()
      const snapshot = await db.collection(collection).where(field, '==', value).limit(1).get()
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: `Firestore query failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },
)

// IPC handler: Firestore delete
ipcMain.handle(
  'firestore-delete',
  async (_event, collection: string, docId: string) => {
    try {
      const db = getFirestoreDB()
      await db.collection(collection).doc(docId).delete()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: `Firestore delete failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },
)

// IPC handler: Storage upload (receives ArrayBuffer from renderer)
ipcMain.handle(
  'storage-upload',
  async (_event, remotePath: string, fileData: ArrayBuffer, contentType: string) => {
    const buffer = Buffer.from(fileData)
    const fbApp = getFirebaseApp()

    // Try the default (configured) bucket first
    const defaultBucket = fbApp.storage().bucket()
    try {
      await defaultBucket.file(remotePath).save(buffer, {
        metadata: { contentType },
        public: true,
      })
      const publicUrl = `https://storage.googleapis.com/${defaultBucket.name}/${remotePath}`
      return { ok: true, url: publicUrl }
    } catch (primaryErr) {
      const errStr = primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
      // If bucket not found, try the other candidate before giving up
      if (!errStr.includes('does not exist')) {
        return { ok: false, error: `Storage upload failed (bucket: ${defaultBucket.name}): ${errStr}` }
      }

      // Try to discover the real bucket via full detection
      const saJson = settings.serviceAccountJson as string | undefined
      if (!saJson) {
        return { ok: false, error: `Storage upload failed (bucket: ${defaultBucket.name}): ${errStr}` }
      }
      const sa = JSON.parse(saJson)

      try {
        const detectedName = await detectOrCreateBucket(sa)
        const gcs = new GCSStorage({ credentials: sa, projectId: sa.project_id })
        const altBucket = gcs.bucket(detectedName)
        await altBucket.file(remotePath).save(buffer, {
          metadata: { contentType },
          public: true,
        })
        // This bucket works — persist it and re-init so future calls use it
        resolvedBucket = detectedName
        settings.resolvedBucket = detectedName
        saveSettings(settings)
        initFirebase(saJson, detectedName)

        const publicUrl = `https://storage.googleapis.com/${detectedName}/${remotePath}`
        return { ok: true, url: publicUrl }
      } catch (fallbackErr) {
        const fbStr = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        return {
          ok: false,
          error: `Storage upload failed (bucket: ${defaultBucket.name}): ${fbStr}`,
        }
      }
    }
  },
)

// IPC handler: Storage delete
ipcMain.handle('storage-delete', async (_event, remotePath: string) => {
  try {
    const bucket = getFirebaseApp().storage().bucket()
    await bucket.file(remotePath).delete().catch(() => {})
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Storage delete failed: ${e instanceof Error ? e.message : String(e)}` }
  }
})

// IPC handler: Storage get public URL
ipcMain.handle('storage-get-public-url', async (_event, remotePath: string) => {
  try {
    const bucket = getFirebaseApp().storage().bucket()
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${remotePath}`
    return { ok: true, url: publicUrl }
  } catch (e) {
    return { ok: false, error: `Failed to get URL: ${e instanceof Error ? e.message : String(e)}` }
  }
})

// IPC handler for microphone permission (required on macOS)
ipcMain.handle('request-mic-access', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone')
    if (status === 'granted') return true
    return systemPreferences.askForMediaAccess('microphone')
  }
  return true
})

// IPC handler for permission statuses
ipcMain.handle('get-permission-status', () => {
  if (process.platform === 'darwin') {
    return {
      screen: systemPreferences.getMediaAccessStatus('screen'),
      microphone: systemPreferences.getMediaAccessStatus('microphone'),
      camera: systemPreferences.getMediaAccessStatus('camera'),
    }
  }
  return { screen: 'granted', microphone: 'granted', camera: 'granted' }
})

// IPC handler for camera permission (required on macOS)
ipcMain.handle('request-camera-access', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('camera')
    if (status === 'granted') return true
    return systemPreferences.askForMediaAccess('camera')
  }
  return true
})

// IPC handler to open Screen Recording settings pane on macOS
ipcMain.handle('open-screen-recording-settings', async () => {
  if (process.platform === 'darwin') {
    try {
      await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
    } catch {
      // Expected to fail if permission not yet granted
    }
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    )
  }
})

// IPC handler for desktop sources (screen recording)
ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 240, height: 135 },
    fetchWindowIcons: true,
  })
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.isEmpty() ? '' : s.thumbnail.toDataURL(),
    appIcon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : undefined,
    display_id: s.display_id || undefined,
  }))
})

// IPC handler: Deploy Cloud Function
ipcMain.handle('deploy-cloud-function', async (event) => {
  try {
    const currentVersion = settings.cloudFunctionVersion as string | undefined
    if (currentVersion === CLOUD_FUNCTION_VERSION) {
      return { ok: true, skipped: true } // Already deployed at current version
    }

    const serviceAccountJson = settings.serviceAccountJson as string | undefined
    if (!serviceAccountJson) {
      return { ok: false, error: 'No service account configured' }
    }

    const sa = JSON.parse(serviceAccountJson)
    const projectId = sa.project_id
    const firestoreDbId = settings.firestoreDbId as string | undefined

    const bucket = (settings.resolvedBucket as string | undefined) || `${projectId}.firebasestorage.app`

    const result = await deployCloudFunction(
      {
        serviceAccountJson,
        projectId,
        firestoreDbId,
        storageBucket: bucket,
      },
      (stage) => {
        event.sender.send('deploy-progress', stage)
      },
    )

    if (result.ok) {
      settings.cloudFunctionVersion = CLOUD_FUNCTION_VERSION
      if (result.functionUrl) {
        settings.cloudFunctionUrl = result.functionUrl
      }
      saveSettings(settings)
    }

    return result
  } catch (e) {
    return {
      ok: false,
      error: `Deploy failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
})

// IPC handlers for settings
ipcMain.handle('get-settings', () => {
  return settings
})

ipcMain.handle('save-settings', (_event, incoming: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(incoming)) {
    settings[key] = value
  }
  saveSettings(settings)
  return settings
})

ipcMain.handle('clear-settings', () => {
  settings = {}
  saveSettings(settings)
  resolvedBucket = null
  // Clean up Firebase app and database references
  if (firebaseApp) {
    firebaseApp.delete().catch(() => {})
    firebaseApp = null
  }
  return {}
})

app.whenReady().then(async () => {
  // Grant Chromium-level permissions for media devices (camera, mic).
  // macOS TCC permissions are handled separately via systemPreferences,
  // but Chromium's renderer also needs its own permission grants for
  // getUserMedia to enumerate and access devices.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(true)
  })
  session.defaultSession.setPermissionCheckHandler(() => {
    return true
  })

  settings = loadSettings()

  // Re-initialize Firebase if service account exists in settings
  const serviceAccountJson = settings.serviceAccountJson as string | undefined
  if (serviceAccountJson) {
    try {
      const sa = JSON.parse(serviceAccountJson)
      const savedBucket = settings.resolvedBucket as string | undefined

      // Initialize immediately so Firestore is available while we resolve storage
      initFirebase(serviceAccountJson, savedBucket)

      // Then detect/create the correct storage bucket
      const bucket = await detectOrCreateBucket(sa)
      resolvedBucket = bucket
      if (bucket !== savedBucket) {
        settings.resolvedBucket = bucket
        saveSettings(settings)
        initFirebase(serviceAccountJson, bucket)
      }
    } catch {
      // Bucket detection failed but Firebase is still initialized for Firestore
    }
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
