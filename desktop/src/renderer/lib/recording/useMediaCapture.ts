import { useState, useCallback, useRef } from 'react'

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
    ): Promise<MediaStreams> => {
      const maxWidth = enableHD ? 1920 : 1280
      const maxHeight = enableHD ? 1080 : 720

      // Screen capture using Electron's desktopCapturer source ID
      const screen = await navigator.mediaDevices
        .getUserMedia({
          audio: {
            // @ts-expect-error Electron-specific constraint
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
            },
          },
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
        .catch(async () => {
          // Audio capture may fail on macOS — retry without audio
          return navigator.mediaDevices.getUserMedia({
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
        })

      // Check if system audio track is alive — on macOS it often arrives
      // with readyState=ended because loopback audio isn't natively supported
      const screenAudioTracks = screen.getAudioTracks()
      const systemAudioDead = screenAudioTracks.length > 0 &&
        screenAudioTracks.every((t) => t.readyState === 'ended')

      // Remove dead audio tracks from the screen stream so the mixer
      // doesn't try to use them
      if (systemAudioDead) {
        screenAudioTracks.forEach((t) => screen.removeTrack(t))
      }

      let camera: MediaStream | null = null
      if (enableCamera) {
        try {
          camera = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 320, facingMode: 'user' },
          })
        } catch {
          console.warn('Camera not available')
        }
      }

      // Always attempt mic capture when enabled — this is the primary audio
      // source on macOS since system audio capture is unreliable
      let mic: MediaStream | null = null
      if (enableMic) {
        try {
          await window.api.requestMicAccess()
          mic = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          })
        } catch {
          /* mic not available */
        }
      }

      const hasLiveAudio =
        (!systemAudioDead && screenAudioTracks.length > 0) ||
        (mic !== null && mic.getAudioTracks().some((t) => t.readyState === 'live'))

      const result: MediaStreams = { screen, camera, mic, systemAudioDead, hasLiveAudio }
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
