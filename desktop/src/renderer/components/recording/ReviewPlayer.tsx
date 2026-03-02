import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { TrashIcon, UploadIcon } from '../icons'

interface ReviewPlayerProps {
  blob: Blob
  duration: number
  onDiscard: () => void
  onUpload: (title: string) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

export default function ReviewPlayer({
  blob,
  duration,
  onDiscard,
  onUpload,
}: ReviewPlayerProps) {
  const [title, setTitle] = useState('')
  const blobUrl = useMemo(() => URL.createObjectURL(blob), [blob])
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [ready, setReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [realDuration, setRealDuration] = useState(duration)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)

  // WebM blobs from MediaRecorder lack duration metadata, so
  // video.duration is often Infinity. We already know the duration from
  // the recording timer, so use that as the default and just mark ready
  // once the video can play. No seek-to-end hack needed here (unlike the
  // web viewer which doesn't know the duration upfront).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onCanPlay = () => {
      if (v.duration && isFinite(v.duration)) {
        setRealDuration(v.duration)
      }
      setReady(true)
    }

    // If already ready (cached blob), handle immediately
    if (v.readyState >= 3) {
      onCanPlay()
    } else {
      v.addEventListener('canplay', onCanPlay)
    }

    return () => {
      v.removeEventListener('canplay', onCanPlay)
    }
  }, [])

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (v) setCurrentTime(v.currentTime)
  }, [])

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current
      const bar = progressRef.current
      if (!v || !bar) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      v.currentTime = ratio * realDuration
    },
    [realDuration],
  )

  const onProgressHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setHoverProgress(ratio * realDuration)
    },
    [realDuration],
  )

  const progress = realDuration > 0 ? (currentTime / realDuration) * 100 : 0

  return (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4">Review Recording</h2>

      <div className="flex-1 bg-black rounded-lg overflow-hidden mb-4 flex flex-col min-h-0">
        {/* Video with native controls for reliable audio playback */}
        <div className="flex-1 min-h-0 relative">
          <video
            ref={videoRef}
            src={blobUrl}
            controls
            className="w-full h-full object-contain"
            onTimeUpdate={onTimeUpdate}
            style={{ opacity: ready ? 1 : 0 }}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              Loading…
            </div>
          )}
        </div>

        {/* Custom progress bar overlay — more visible than native */}
        <div
          ref={progressRef}
          className="group relative h-1.5 bg-zinc-700 cursor-pointer hover:h-2.5 transition-all shrink-0"
          onClick={seek}
          onMouseMove={onProgressHover}
          onMouseLeave={() => setHoverProgress(null)}
        >
          {hoverProgress !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded pointer-events-none z-10"
              style={{ left: `${(hoverProgress / realDuration) * 100}%` }}
            >
              {formatTime(hoverProgress)}
            </div>
          )}
          <div
            className="absolute inset-y-0 left-0 bg-[var(--crimson)] rounded-r-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[var(--crimson)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-zinc-400 mb-4">
        Duration: {formatTime(realDuration)}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Recording title (optional)"
        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[var(--crimson)] mb-4"
      />

      <div className="flex gap-3">
        <button
          onClick={onDiscard}
          className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <TrashIcon className="w-4 h-4" />
          Discard
        </button>
        <button
          onClick={() => onUpload(title)}
          className="flex-1 px-4 py-2 bg-[var(--crimson)] hover:brightness-110 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          Upload
        </button>
      </div>
    </div>
  )
}
