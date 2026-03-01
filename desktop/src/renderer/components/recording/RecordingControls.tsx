import { useRef, useEffect, useState } from 'react'

interface RecordingControlsProps {
  canvas: HTMLCanvasElement
  elapsedSeconds: number
  onStop: () => void
  onToggleMic: (muted: boolean) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function RecordingControls({
  canvas,
  elapsedSeconds,
  onStop,
  onToggleMic,
}: RecordingControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [micMuted, setMicMuted] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (container && canvas) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.objectFit = 'contain'
      canvas.style.borderRadius = '8px'
      container.appendChild(canvas)
      return () => {
        if (container.contains(canvas)) {
          container.removeChild(canvas)
        }
      }
    }
  }, [canvas])

  const handleMicToggle = () => {
    const newMuted = !micMuted
    setMicMuted(newMuted)
    onToggleMic(newMuted)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div
        ref={containerRef}
        className="flex-1 bg-black rounded-lg overflow-hidden mb-4"
      />

      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-lg">{formatTime(elapsedSeconds)}</span>
        </div>

        <button
          onClick={handleMicToggle}
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            micMuted
              ? 'bg-red-600/20 text-red-400'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {micMuted ? 'Muted' : 'Mic'}
        </button>

        <button
          onClick={onStop}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  )
}
