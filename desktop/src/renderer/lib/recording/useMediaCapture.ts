import { useState, useCallback, useRef } from 'react'

interface MediaStreams {
  screen: MediaStream
  camera: MediaStream | null
  mic: MediaStream | null
}

export function useMediaCapture() {
  const [streams, setStreams] = useState<MediaStreams | null>(null)
  const streamsRef = useRef<MediaStreams | null>(null)

  const acquire = useCallback(
    async (
      sourceId: string,
      enableCamera: boolean,
      enableMic: boolean,
    ): Promise<MediaStreams> => {
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
              maxWidth: 1920,
              maxHeight: 1080,
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
                maxWidth: 1920,
                maxHeight: 1080,
              },
            },
          })
        })

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

      let mic: MediaStream | null = null
      if (enableMic) {
        try {
          // Request microphone permission on macOS before getUserMedia
          await window.api.requestMicAccess()
          mic = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          })
        } catch {
          console.warn('Microphone not available')
        }
      }

      const result = { screen, camera, mic }
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
