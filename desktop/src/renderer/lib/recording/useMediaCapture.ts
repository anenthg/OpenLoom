import { useState, useCallback, useRef } from 'react'

async function acquireMic(micDeviceId: string | null): Promise<MediaStream | null> {
  try {
    const audioConstraints: MediaTrackConstraints = micDeviceId
      ? { deviceId: { exact: micDeviceId }, echoCancellation: true, noiseSuppression: true }
      : { echoCancellation: true, noiseSuppression: true }
    return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return null
    }
  }
}

export interface MediaStreams {
  screen: MediaStream
  camera: MediaStream | null
  mic: MediaStream | null
  /** true when system audio track was provided but arrived dead (macOS limitation) */
  systemAudioDead: boolean
  /** true when at least one live audio source is connected */
  hasLiveAudio: boolean
}

export function useMediaCapture() {
  const [streams, setStreams] = useState<MediaStreams | null>(null)
  const streamsRef = useRef<MediaStreams | null>(null)

  const acquire = useCallback(
    async (
      sourceId: string,
      enableCamera: boolean,
      enableMic: boolean,
      enableHD: boolean = true,
      cameraDeviceId: string | null = null,
      micDeviceId: string | null = null,
    ): Promise<MediaStreams> => {
      const maxWidth = enableHD ? 1920 : 1280
      const maxHeight = enableHD ? 1080 : 720

      // Screen capture — video only. Requesting system audio via
      // desktopCapturer corrupts Chromium's audio subsystem on macOS,
      // causing subsequently-acquired mic tracks to die asynchronously.
      // System audio is silent on macOS without BlackHole anyway.
      const screen = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-expect-error Electron-specific constraint
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth,
            maxHeight,
          },
        },
      })

      // Acquire mic AFTER screen capture. Safe because we skipped system
      // audio above — Chromium's audio subsystem stays clean.
      let mic: MediaStream | null = null
      if (enableMic) {
        await window.api.requestMicAccess()
        mic = await acquireMic(micDeviceId)
      }

      let camera: MediaStream | null = null
      if (enableCamera) {
        try {
          const videoConstraints: MediaTrackConstraints = cameraDeviceId
            ? { deviceId: { exact: cameraDeviceId }, width: 320, height: 320 }
            : { width: 320, height: 320, facingMode: 'user' }
          camera = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
          })
        } catch {
          console.warn('Camera not available')
        }
      }

      const hasLiveAudio =
        mic !== null && mic.getAudioTracks().some((t) => t.readyState === 'live')

      const result: MediaStreams = { screen, camera, mic, systemAudioDead: false, hasLiveAudio }
      streamsRef.current = result
      setStreams(result)
      return result
    },
    [],
  )

  const release = useCallback(() => {
    const s = streamsRef.current
    if (s) {
      s.screen.getTracks().forEach((t) => t.stop())
      s.camera?.getTracks().forEach((t) => t.stop())
      s.mic?.getTracks().forEach((t) => t.stop())
    }
    streamsRef.current = null
    setStreams(null)
  }, [])

  return { streams, acquire, release }
}
