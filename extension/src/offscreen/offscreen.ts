import type { PipConfig } from '../lib/types'
import { createCanvasCompositor, type CanvasCompositor } from '../lib/recording/canvasCompositor'
import { createAudioMixer, type AudioMixer } from '../lib/recording/audioMixer'
import { createRecorder, type Recorder } from '../lib/recording/recorder'
import { saveBlob } from '../lib/idb'

let compositor: CanvasCompositor | null = null
let mixer: AudioMixer | null = null
let recorder: Recorder | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let previewTimer: ReturnType<typeof setInterval> | null = null
let micLevelTimer: ReturnType<typeof setInterval> | null = null

function debugLog(msg: string) {
  console.log(`[offscreen] ${msg}`)
  chrome.runtime.sendMessage({ type: 'DEBUG_LOG', message: msg }).catch(() => {})
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_AND_RECORD') {
    handleCaptureAndRecord(message).then(() => sendResponse({ ok: true })).catch((e) => {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
    })
    return true // async response
  }

  if (message.type === 'STOP_CAPTURE') {
    handleStopCapture().then(() => sendResponse({ ok: true })).catch((e) => {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
    })
    return true
  }

  if (message.type === 'SET_MIC_MUTED') {
    mixer?.setMicMuted(message.muted)
    sendResponse({ ok: true })
    return false
  }

  if (message.type === 'READ_BLOB') {
    // Read blob from IDB and return as ArrayBuffer
    import('../lib/idb').then(({ getBlob }) => {
      getBlob(message.blobId).then((blob) => {
        if (!blob) {
          sendResponse({ ok: false, error: 'Blob not found' })
          return
        }
        blob.arrayBuffer().then((ab) => {
          sendResponse({ ok: true, data: ab, type: blob.type })
        })
      })
    })
    return true
  }
})

function describeStream(label: string, stream: MediaStream | null): string[] {
  const lines: string[] = []
  if (!stream) {
    lines.push(`${label}: null`)
    return lines
  }
  const vTracks = stream.getVideoTracks()
  const aTracks = stream.getAudioTracks()
  lines.push(`${label}: ${vTracks.length} video, ${aTracks.length} audio tracks`)
  vTracks.forEach((t, i) => {
    lines.push(`  video[${i}]: ${t.label} | state=${t.readyState} enabled=${t.enabled} muted=${t.muted}`)
  })
  aTracks.forEach((t, i) => {
    lines.push(`  audio[${i}]: ${t.label} | state=${t.readyState} enabled=${t.enabled} muted=${t.muted}`)
    const settings = t.getSettings()
    lines.push(`    settings: sampleRate=${settings.sampleRate} channelCount=${settings.channelCount} deviceId=${settings.deviceId?.slice(0, 12)}...`)
  })
  return lines
}

async function handleCaptureAndRecord(options: {
  camera: boolean
  mic: boolean
  hd: boolean
  cameraDeviceId?: string
  micDeviceId?: string
  pipConfig?: PipConfig
}) {
  const maxW = options.hd ? 1920 : 1280
  const maxH = options.hd ? 1080 : 720

  debugLog(`Options: camera=${options.camera} mic=${options.mic} hd=${options.hd} camId=${options.cameraDeviceId || 'default'} micId=${options.micDeviceId || 'default'}`)

  // Get display media (browser shows picker)
  debugLog('Calling getDisplayMedia...')
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: maxW }, height: { ideal: maxH } },
    audio: true,
  })
  describeStream('screenStream', screenStream).forEach(debugLog)

  // Track when user stops sharing via browser UI
  screenStream.getVideoTracks()[0].addEventListener('ended', () => {
    handleStopCapture()
  })

  // Optionally get camera
  let cameraStream: MediaStream | null = null
  if (options.camera) {
    debugLog('Requesting camera via getUserMedia...')
    try {
      const videoConstraints: MediaTrackConstraints = { width: 320, height: 320 }
      if (options.cameraDeviceId) videoConstraints.deviceId = { exact: options.cameraDeviceId }
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
      })
      describeStream('cameraStream', cameraStream).forEach(debugLog)
    } catch (e) {
      debugLog(`Camera getUserMedia FAILED: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Optionally get mic
  let micStream: MediaStream | null = null
  if (options.mic) {
    const micConstraints: MediaTrackConstraints = options.micDeviceId
      ? { deviceId: { exact: options.micDeviceId } }
      : {}
    debugLog(`Requesting mic via getUserMedia({ audio: ${JSON.stringify(micConstraints)} })...`)
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: Object.keys(micConstraints).length > 0 ? micConstraints : true })
      describeStream('micStream', micStream).forEach(debugLog)
    } catch (e) {
      debugLog(`Mic getUserMedia FAILED: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    debugLog('Mic disabled by user, skipping getUserMedia')
  }

  // Create compositor
  debugLog('Creating canvas compositor...')
  compositor = createCanvasCompositor(screenStream, cameraStream, maxW, maxH, options.pipConfig)
  describeStream('compositor.stream', compositor.stream).forEach(debugLog)

  // Create audio mixer
  debugLog('Creating audio mixer...')
  mixer = await createAudioMixer(screenStream, micStream)
  describeStream('mixer.audioStream', mixer.audioStream).forEach(debugLog)

  // Create recorder
  const bitrate = options.hd ? 5_000_000 : 2_500_000
  debugLog(`Creating recorder with bitrate=${bitrate}...`)
  recorder = createRecorder(compositor.stream, mixer.audioStream, bitrate)

  // Start recording
  recorder.start()
  debugLog('Recording started')

  // Start elapsed timer + audio level monitoring
  const startTime = Date.now()
  elapsedTimer = setInterval(() => {
    const seconds = Math.floor((Date.now() - startTime) / 1000)
    chrome.runtime.sendMessage({ type: 'ELAPSED_UPDATE', seconds })

    // Report audio levels every 2 seconds
    if (mixer && mixer.getDebugLevels && seconds % 2 === 0) {
      const levels = mixer.getDebugLevels()
      debugLog(`Audio levels — sys:${levels.system}% mic:${levels.mic}% out:${levels.output}%`)
    }
  }, 1000)

  // Start preview frame stream (5fps) and mic level stream
  startPreviewStream()
  startMicLevelStream()

  chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' })
}

function startPreviewStream() {
  stopPreviewStream()
  previewTimer = setInterval(() => {
    if (!compositor) return
    const dataUrl = compositor.capturePreviewFrame(400)
    if (dataUrl) {
      chrome.runtime.sendMessage({ type: 'PREVIEW_FRAME', dataUrl }).catch(() => {})
    }
  }, 200)
}

function stopPreviewStream() {
  if (previewTimer) {
    clearInterval(previewTimer)
    previewTimer = null
  }
}

function startMicLevelStream() {
  stopMicLevelStream()
  micLevelTimer = setInterval(() => {
    if (!mixer?.getMicBars) return
    const bars = mixer.getMicBars(12)
    chrome.runtime.sendMessage({ type: 'MIC_LEVEL', bars }).catch(() => {})
  }, 120)
}

function stopMicLevelStream() {
  if (micLevelTimer) {
    clearInterval(micLevelTimer)
    micLevelTimer = null
  }
}

async function handleStopCapture() {
  stopPreviewStream()
  stopMicLevelStream()

  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }

  let blobId: string | null = null

  if (recorder) {
    const blob = await recorder.stop()
    debugLog(`Recording stopped. Blob size=${blob.size} type=${blob.type}`)
    blobId = `recording-${Date.now()}`
    await saveBlob(blobId, blob)
    recorder.dispose()
    recorder = null
  }

  if (compositor) {
    compositor.dispose()
    compositor = null
  }

  if (mixer) {
    mixer.dispose()
    mixer = null
  }

  chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED', blobId })
}
