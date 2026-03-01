import { useState, useCallback, useRef, useEffect } from 'react'
import type { DesktopSource, RecordingPhase } from '../types'
import { useMediaCapture } from './useMediaCapture'
import { createCanvasCompositor, type CanvasCompositor } from './canvasCompositor'
import { createAudioMixer, type AudioMixer } from './audioMixer'
import { createRecorder, type Recorder } from './recorder'

export interface RecordingState {
  phase: RecordingPhase
  sources: DesktopSource[]
  enableCamera: boolean
  enableMic: boolean
  countdownValue: number
  elapsedSeconds: number
  recordedBlob: Blob | null
  canvas: HTMLCanvasElement | null
  error: string | null
  uploadProgress: number
  shareURL: string | null
}

export interface RecordingActions {
  startSourceSelect: () => Promise<void>
  toggleCamera: () => void
  toggleMic: () => void
  selectSource: (sourceId: string) => void
  stopRecording: () => void
  discard: () => void
  upload: (title: string) => Promise<void>
  setMicMuted: (muted: boolean) => void
  reset: () => void
}

export function useRecordingMachine(): RecordingState & RecordingActions {
  const [phase, setPhase] = useState<RecordingPhase>('idle')
  const [sources, setSources] = useState<DesktopSource[]>([])
  const [enableCamera, setEnableCamera] = useState(true)
  const [enableMic, setEnableMic] = useState(true)
  const [countdownValue, setCountdownValue] = useState(3)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [shareURL, setShareURL] = useState<string | null>(null)

  const { acquire, release } = useMediaCapture()
  const compositorRef = useRef<CanvasCompositor | null>(null)
  const mixerRef = useRef<AudioMixer | null>(null)
  const recorderRef = useRef<Recorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = null
    recorderRef.current?.dispose()
    recorderRef.current = null
    compositorRef.current?.dispose()
    compositorRef.current = null
    mixerRef.current?.dispose()
    mixerRef.current = null
    release()
  }, [release])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  const startSourceSelect = useCallback(async () => {
    try {
      const desktopSources = await window.api.getDesktopSources()
      setSources(desktopSources)
      setPhase('sourceSelect')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get sources')
    }
  }, [])

  const toggleCamera = useCallback(() => setEnableCamera((v) => !v), [])
  const toggleMic = useCallback(() => setEnableMic((v) => !v), [])

  const selectSource = useCallback(
    async (sourceId: string) => {
      try {
        const mediaStreams = await acquire(sourceId, enableCamera, enableMic)

        // Create compositor
        const comp = createCanvasCompositor(mediaStreams.screen, mediaStreams.camera)
        compositorRef.current = comp
        setCanvas(comp.canvas)

        // Create audio mixer
        const mixer = createAudioMixer(mediaStreams.screen, mediaStreams.mic)
        mixerRef.current = mixer

        // Create recorder
        const rec = createRecorder(comp.stream, mixer.destination)
        recorderRef.current = rec

        // Start countdown
        setPhase('countdown')
        setCountdownValue(3)

        let count = 3
        countdownRef.current = setInterval(() => {
          count--
          if (count <= 0) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            countdownRef.current = null
            rec.start()
            setElapsedSeconds(0)
            setPhase('recording')

            // Start elapsed timer
            const startTime = Date.now()
            timerRef.current = setInterval(() => {
              setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
            }, 1000)
          } else {
            setCountdownValue(count)
          }
        }, 1000)
      } catch (e) {
        cleanup()
        setError(e instanceof Error ? e.message : 'Failed to start recording')
        setPhase('idle')
      }
    },
    [acquire, enableCamera, enableMic, cleanup],
  )

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null

    if (recorderRef.current) {
      const blob = await recorderRef.current.stop()
      setRecordedBlob(blob)
    }

    compositorRef.current?.dispose()
    compositorRef.current = null
    mixerRef.current?.dispose()
    mixerRef.current = null
    release()

    setPhase('review')
  }, [release])

  const discard = useCallback(() => {
    setRecordedBlob(null)
    setCanvas(null)
    setShareURL(null)
    setError(null)
    setPhase('idle')
  }, [])

  const upload = useCallback(
    async (title: string) => {
      if (!recordedBlob) return

      setPhase('uploading')
      setUploadProgress(0)

      try {
        const { generateShortCode } = await import('./shortCode')
        const { uploadVideo, insertVideo, getShareURL } = await import('../supabase')

        setUploadProgress(10)
        const shortCode = await generateShortCode()

        setUploadProgress(30)
        const storageUrl = await uploadVideo(shortCode, recordedBlob)

        setUploadProgress(70)

        const settings = await window.api.getSettings()

        await insertVideo({
          short_code: shortCode,
          title: title || 'Untitled Recording',
          storage_url: storageUrl,
          duration_ms: elapsedSeconds * 1000,
          capture_mode: 'screen',
        })

        setUploadProgress(100)

        if (settings.supabaseRef) {
          setShareURL(getShareURL(settings.supabaseRef, shortCode))
        }

        setTimeout(() => {
          setRecordedBlob(null)
          setCanvas(null)
          setPhase('idle')
        }, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
        setPhase('review')
      }
    },
    [recordedBlob, elapsedSeconds],
  )

  const setMicMuted = useCallback((muted: boolean) => {
    mixerRef.current?.setMicMuted(muted)
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setPhase('idle')
    setSources([])
    setRecordedBlob(null)
    setCanvas(null)
    setError(null)
    setUploadProgress(0)
    setShareURL(null)
    setElapsedSeconds(0)
    setCountdownValue(3)
  }, [cleanup])

  return {
    phase,
    sources,
    enableCamera,
    enableMic,
    countdownValue,
    elapsedSeconds,
    recordedBlob,
    canvas,
    error,
    uploadProgress,
    shareURL,
    startSourceSelect,
    toggleCamera,
    toggleMic,
    selectSource,
    stopRecording,
    discard,
    upload,
    setMicMuted,
    reset,
  }
}
