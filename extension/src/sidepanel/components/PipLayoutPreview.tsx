import { useState, useCallback, useRef, useEffect } from 'react'
import type { PipConfig } from '../../lib/types'
import { DEFAULT_PIP_CONFIG } from '../../lib/types'
import { loadPreferences, savePreferences } from '../../lib/preferences'

interface Props {
  onContinue: (pipConfig: PipConfig) => void
  onBack: () => void
  cameraDeviceId?: string
}

const MIN_SIZE = 0.05
const MAX_SIZE = 0.25
const SIZE_STEP = 0.02


export default function PipLayoutPreview({ onContinue, onBack, cameraDeviceId }: Props) {
  const [config, setConfig] = useState<PipConfig>(DEFAULT_PIP_CONFIG)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const draggingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Load saved PIP config on mount
  useEffect(() => {
    loadPreferences().then((prefs) => {
      if (prefs.pipConfig) setConfig(prefs.pipConfig)
      setPrefsLoaded(true)
    })
  }, [])

  // Start camera preview
  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const constraints: MediaTrackConstraints = { width: 320, height: 320 }
        if (cameraDeviceId) constraints.deviceId = { exact: cameraDeviceId }
        const stream = await navigator.mediaDevices.getUserMedia({ video: constraints })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      } catch {
        // Camera unavailable — circle will show dark background
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [cameraDeviceId])

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val))

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const halfSize = config.size / 2
    const nx = clamp((e.clientX - rect.left) / rect.width, halfSize, 1 - halfSize)
    const ny = clamp((e.clientY - rect.top) / rect.height, halfSize, 1 - halfSize)
    setConfig((prev) => ({ ...prev, x: nx, y: ny }))
  }, [config.size])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  const adjustSize = (delta: number) => {
    setConfig((prev) => {
      const newSize = clamp(prev.size + delta, MIN_SIZE, MAX_SIZE)
      const halfSize = newSize / 2
      return {
        size: newSize,
        x: clamp(prev.x, halfSize, 1 - halfSize),
        y: clamp(prev.y, halfSize, 1 - halfSize),
      }
    })
  }

  // Convert normalized to % for positioning
  const pipLeft = `${(config.x - config.size / 2) * 100}%`
  const pipTop = `${(config.y - config.size / 2) * 100}%`
  const pipW = `${config.size * 100}%`

  if (!prefsLoaded) return null

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-5">
      <div className="text-center">
        <h2 className="text-lg font-bold text-zinc-100 mb-1">Camera Position</h2>
        <p className="text-xs text-zinc-500">Drag the circle to position your camera</p>
      </div>

      {/* Screen mockup (16:9) */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[300px] bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden select-none"
        style={{ aspectRatio: '16 / 9' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Rule-of-thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-zinc-700/40" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-zinc-700/40" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-zinc-700/40" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-zinc-700/40" />
        </div>

        {/* Draggable PIP circle with live camera */}
        <div
          className="absolute rounded-full border-2 border-white/30 overflow-hidden cursor-grab active:cursor-grabbing touch-none bg-zinc-800"
          style={{ left: pipLeft, top: pipTop, width: pipW, aspectRatio: '1' }}
          onPointerDown={handlePointerDown}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover pointer-events-none scale-[1.15]"
          />
        </div>
      </div>

      {/* Size controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => adjustSize(-SIZE_STEP)}
          disabled={config.size <= MIN_SIZE}
          className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-lg font-medium transition-colors"
        >
          −
        </button>
        <span className="text-xs text-zinc-400 w-12 text-center">{Math.round(config.size * 100)}%</span>
        <button
          onClick={() => adjustSize(SIZE_STEP)}
          disabled={config.size >= MAX_SIZE}
          className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-lg font-medium transition-colors"
        >
          +
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            savePreferences({ pipConfig: config })
            onContinue(config)
          }}
          className="px-5 py-2.5 bg-[var(--crimson)] hover:brightness-110 active:scale-[0.97] text-white rounded-lg text-sm font-semibold transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
