import type { AppSettings, PipConfig, RecordingPhase } from '../lib/types'
import type {
  ExtensionMessage,
  StateUpdateMessage,
  DeployProgressMessage,
} from '../lib/messages'
import type { ProvisioningStep } from '../lib/provisioning/types'
import { initBackend, validateConnection, fileUpload, fileDelete, dbInsert, dbQuery, dbDelete, getShareURL, isShortCodeTaken } from '../lib/backend/index'
import { generateShortCode } from '../lib/recording/shortCode'
import { encryptUrl } from '../lib/crypto'
import { getBlob, deleteBlob } from '../lib/idb'
import { deployFirebase } from '../lib/provisioning/firebase'
import { deployConvex } from '../lib/provisioning/convex'
import { deploySupabase } from '../lib/provisioning/supabase'

// ─── State ──────────────────────────────────────────────────────────────────

interface AppState {
  phase: RecordingPhase
  elapsed: number
  blobId: string | null
  error: string | null
  shareURL: string | null
  uploadProgress: number
}

let state: AppState = {
  phase: 'idle',
  elapsed: 0,
  blobId: null,
  error: null,
  shareURL: null,
  uploadProgress: 0,
}

let settings: AppSettings = {}

// ─── Side Panel Setup ───────────────────────────────────────────────────────

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

// ─── Keep-alive alarm ───────────────────────────────────────────────────────

const KEEP_ALIVE_ALARM = 'openloom-keepalive'

function startKeepAlive() {
  chrome.alarms.create(KEEP_ALIVE_ALARM, { periodInMinutes: 0.4 }) // ~24s
}

function stopKeepAlive() {
  chrome.alarms.clear(KEEP_ALIVE_ALARM)
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEP_ALIVE_ALARM) {
    // Just keeping the SW alive — no-op
  }
})

// ─── State broadcast ────────────────────────────────────────────────────────

function broadcastState(extraSettings?: AppSettings) {
  const msg: StateUpdateMessage = {
    type: 'STATE_UPDATE',
    state: { ...state },
    settings: extraSettings,
  }
  chrome.runtime.sendMessage(msg).catch(() => {})
}

function updateState(partial: Partial<AppState>) {
  Object.assign(state, partial)
  broadcastState()
}

// ─── Settings management ────────────────────────────────────────────────────

async function loadSettings(): Promise<AppSettings> {
  const result = await chrome.storage.local.get('settings')
  settings = (result.settings as AppSettings) || {}
  // Ensure backend modules are initialized with current credentials
  await initBackend(settings)
  return settings
}

async function saveSettings(incoming: AppSettings): Promise<AppSettings> {
  settings = { ...settings, ...incoming }
  await chrome.storage.local.set({ settings })
  return settings
}

async function clearSettings(): Promise<void> {
  settings = {}
  await chrome.storage.local.remove('settings')
}

// ─── Offscreen document management ─────────────────────────────────────────

let offscreenCreating: Promise<void> | null = null

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  })
  if (existingContexts.length > 0) return

  if (offscreenCreating) {
    await offscreenCreating
    return
  }

  offscreenCreating = chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.DISPLAY_MEDIA, chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Screen recording with camera PiP and microphone audio',
  })
  await offscreenCreating
  offscreenCreating = null
}

async function closeOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  })
  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument()
  }
}

// ─── Message routing ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then((result) => sendResponse(result))
      .catch((e) => {
        console.error('[sw] Message handler error:', e)
        sendResponse({ error: e instanceof Error ? e.message : String(e) })
      })
    return true // async response
  },
)

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    // ─── Settings ─────────────────────────────────────
    case 'GET_SETTINGS':
      return loadSettings()

    case 'SAVE_SETTINGS':
      return saveSettings(message.settings)

    case 'DISCONNECT':
      await clearSettings()
      updateState({
        phase: 'idle',
        elapsed: 0,
        blobId: null,
        error: null,
        shareURL: null,
        uploadProgress: 0,
      })
      broadcastState(settings)
      return { ok: true }

    // ─── Connection validation ────────────────────────
    case 'VALIDATE_CONNECTION':
      return handleValidateConnection(message.provider, message.credential)

    // ─── Provisioning ─────────────────────────────────
    case 'DEPLOY_BACKEND':
      return handleDeployBackend(message.provider)

    // ─── Recording ────────────────────────────────────
    case 'START_RECORDING':
      return handleStartRecording(message.camera, message.mic, message.hd, message.cameraDeviceId, message.micDeviceId, message.pipConfig)

    case 'STOP_RECORDING':
      return handleStopRecording()

    case 'SET_MIC_MUTED':
      // Forward to offscreen
      return chrome.runtime.sendMessage({ type: 'SET_MIC_MUTED', muted: message.muted })

    // ─── Offscreen events ─────────────────────────────
    case 'CAPTURE_STARTED':
      updateState({ phase: 'recording', elapsed: 0 })
      return { ok: true }

    case 'ELAPSED_UPDATE':
      updateState({ elapsed: message.seconds })
      return { ok: true }

    case 'PREVIEW_FRAME':
    case 'MIC_LEVEL':
      chrome.runtime.sendMessage(message).catch(() => {})
      return { ok: true }

    case 'RECORDING_STOPPED':
      stopKeepAlive()
      await closeOffscreenDocument()
      updateState({ phase: 'review', blobId: message.blobId })
      return { ok: true }

    // ─── Upload ───────────────────────────────────────
    case 'UPLOAD_RECORDING':
      return handleUpload(message.title, message.password)

    // ─── Library ──────────────────────────────────────
    case 'LIST_VIDEOS':
      return handleListVideos()

    case 'DELETE_VIDEO':
      return handleDeleteVideo(message.shortCode)

    // ─── State ────────────────────────────────────────
    case 'GET_STATE':
      return { state, settings }

    default:
      return { error: 'Unknown message type' }
  }
}

// ─── Handler implementations ────────────────────────────────────────────────

async function handleValidateConnection(
  provider: string,
  credential: string,
): Promise<unknown> {
  // Temporarily save provider so backend module knows which to use
  await saveSettings({ provider: provider as AppSettings['provider'] })

  const result = await validateConnection(settings, credential)

  if (!result.ok) {
    // Revert provider on failure
    await saveSettings({ provider: undefined })
  }

  return result
}

async function handleDeployBackend(provider: string): Promise<unknown> {
  startKeepAlive()

  try {
    await loadSettings()

    const onProgress = (steps: ProvisioningStep[]) => {
      const msg: DeployProgressMessage = { type: 'DEPLOY_PROGRESS', steps }
      chrome.runtime.sendMessage(msg).catch(() => {})
    }

    let ok = false

    if (provider === 'firebase') {
      ok = await deployFirebase(settings, onProgress)
    } else if (provider === 'convex') {
      ok = await deployConvex(settings, onProgress)
    } else if (provider === 'supabase') {
      ok = await deploySupabase(settings, onProgress)
    }

    return { ok }
  } finally {
    stopKeepAlive()
  }
}

async function handleStartRecording(
  camera: boolean,
  mic: boolean,
  hd: boolean,
  cameraDeviceId?: string,
  micDeviceId?: string,
  pipConfig?: PipConfig,
): Promise<unknown> {
  try {
    startKeepAlive()
    updateState({ phase: 'countdown', error: null })

    // Create offscreen document
    await ensureOffscreenDocument()

    // Small delay for offscreen to be ready
    await new Promise((r) => setTimeout(r, 200))

    // Tell offscreen to start capturing (countdown happens in the side panel UI)
    // The offscreen document handles getDisplayMedia + compositor + recording
    const result = await chrome.runtime.sendMessage({
      type: 'CAPTURE_AND_RECORD',
      camera,
      mic,
      hd,
      cameraDeviceId,
      micDeviceId,
      pipConfig,
    })

    if (result && !result.ok) {
      throw new Error(result.error || 'Failed to start recording')
    }

    return { ok: true }
  } catch (e) {
    stopKeepAlive()
    updateState({
      phase: 'idle',
      error: e instanceof Error ? e.message : 'Failed to start recording',
    })
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function handleStopRecording(): Promise<unknown> {
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function handleUpload(
  title: string,
  password?: string,
): Promise<unknown> {
  startKeepAlive()
  updateState({ phase: 'uploading', uploadProgress: 0 })

  try {
    await loadSettings()

    updateState({ uploadProgress: 10 })

    // Generate unique short code
    const shortCode = await generateShortCode((code) =>
      isShortCodeTaken(settings, code),
    )

    updateState({ uploadProgress: 20 })

    // Read the blob directly from IndexedDB (same extension origin as offscreen)
    const blob = await getBlob(state.blobId!)
    if (!blob) {
      throw new Error('Recording blob not found in storage')
    }
    const blobData = await blob.arrayBuffer()

    updateState({ uploadProgress: 30 })

    // Upload video file
    const contentType = blob.type || 'video/webm'
    const ext = contentType === 'video/mp4' ? 'mp4' : 'webm'
    const remotePath = `videos/${shortCode}.${ext}`
    const uploadResult = await fileUpload(
      settings,
      remotePath,
      blobData,
      contentType,
    )

    if (!uploadResult.ok) {
      throw new Error(uploadResult.error || 'Upload failed')
    }

    updateState({ uploadProgress: 70 })

    // Determine storage URL
    const provider = settings.provider || 'firebase'
    let finalStorageUrl = uploadResult.url!
    if (provider === 'convex' && settings.convexHttpActionsUrl) {
      finalStorageUrl = `${settings.convexHttpActionsUrl}/video?code=${shortCode}`
    }

    // Encrypt if password provided
    let videoStorageUrl = finalStorageUrl
    let isProtected: boolean | undefined
    let passwordSalt: string | undefined

    if (password) {
      const { encrypted, salt } = await encryptUrl(finalStorageUrl, password)
      videoStorageUrl = encrypted
      isProtected = true
      passwordSalt = salt
    }

    // Insert video metadata
    const doc: Record<string, unknown> = {
      short_code: shortCode,
      title: title || 'Untitled Recording',
      description: null,
      storage_url: videoStorageUrl,
      view_count: 0,
      duration_ms: state.elapsed * 1000,
      capture_mode: 'screen',
      created_at: new Date().toISOString(),
    }

    if (uploadResult.storageId) {
      doc.storage_id = uploadResult.storageId
    }
    if (isProtected) {
      doc.is_protected = true
      doc.password_salt = passwordSalt ?? null
    }

    await dbInsert(settings, 'videos', shortCode, doc)

    updateState({ uploadProgress: 100 })

    const shareURL = getShareURL(settings, shortCode)
    updateState({ shareURL })

    // Clean up blob from IDB
    if (state.blobId) {
      deleteBlob(state.blobId).catch(() => {})
    }

    return { ok: true, shareURL }
  } catch (e) {
    updateState({
      phase: 'review',
      error: e instanceof Error ? e.message : 'Upload failed',
      uploadProgress: 0,
    })
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    stopKeepAlive()
  }
}

async function handleListVideos(): Promise<unknown> {
  await loadSettings()
  const result = await dbQuery(settings, 'videos', 'created_at', 'desc')
  if (!result.ok) return { error: result.error }
  return { videos: result.data || [] }
}

async function handleDeleteVideo(shortCode: string): Promise<unknown> {
  await loadSettings()
  const provider = settings.provider || 'firebase'

  if (provider === 'firebase' || provider === 'supabase') {
    await fileDelete(settings, `videos/${shortCode}.webm`)
    await fileDelete(settings, `videos/${shortCode}.mp4`)
  }

  return dbDelete(settings, 'videos', shortCode)
}

// ─── Startup ────────────────────────────────────────────────────────────────

// Restore state on SW restart
chrome.storage.session.get('appState').then((result) => {
  if (result.appState) {
    state = result.appState as AppState
  }
})

// Persist state periodically to survive SW suspension
setInterval(() => {
  chrome.storage.session.set({ appState: state }).catch(() => {})
}, 5000)

// Load settings on startup
loadSettings()
