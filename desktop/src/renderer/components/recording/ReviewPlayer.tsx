import { useState, useRef, useEffect, useCallback } from 'react'
import { PauseIcon, PlayIcon, TrashIcon, UploadIcon, VolumeIcon, VolumeMuteIcon } from '../icons'

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [realDuration, setRealDuration] = useState(duration)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [draggingProgress, setDraggingProgress] = useState(false)

  // Load the blob into the video element and mark ready once it can play.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let revoke: string | null = null
    let cancelled = false

    console.log('[review-player] Blob received:', { size: blob.size, type: blob.type })

    const onCanPlay = () => {
      console.log('[review-player] canplay fired, duration:', v.duration, 'readyState:', v.readyState)
      if (v.duration && isFinite(v.duration)) {
        setRealDuration(v.duration)
      }
      setReady(true)
    }

    const onError = () => {
      const e = v.error
      console.error('[review-player] Video error:', e?.code, e?.message)
      // If loading fails, still mark ready so UI isn't stuck on "Loading…"
      setReady(true)
    }

    const onLoadedData = () => {
      console.log('[review-player] loadeddata fired, readyState:', v.readyState, 'duration:', v.duration)
    }

    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('error', onError)
    v.addEventListener('loadeddata', onLoadedData)

    // Read blob into ArrayBuffer to create a contiguous blob.
    // MediaRecorder's chunked blobs can cause range request failures.
    blob.arrayBuffer().then((buffer) => {
      if (cancelled) return
      console.log('[review-player] ArrayBuffer read, size:', buffer.byteLength)
      const fresh = new Blob([buffer], { type: blob.type || 'video/webm' })
      const url = URL.createObjectURL(fresh)
      revoke = url
      console.log('[review-player] Setting video src:', url)
      v.src = url
      v.load()
    }).catch((err) => {
      console.error('[review-player] Failed to read blob:', err)
      setReady(true)
    })

    return () => {
      cancelled = true
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('error', onError)
      v.removeEventListener('loadeddata', onLoadedData)
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [blob])

  // Sync play/pause state from video element events
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEnded)

    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onEnded)
    }
  }, [])

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (v && !draggingProgress) setCurrentTime(v.currentTime)
  }, [draggingProgress])

  const togglePlayPause = useCallback(() => {
    const v = videoRef.current
    if (!v || !ready) return
    if (v.paused || v.ended) {
      v.play().catch(() => { /* ignore autoplay errors */ })
    } else {
      v.pause()
    }
  }, [ready])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const next = !muted
    v.muted = next
    setMuted(next)
  }, [muted])

  const changeVolume = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current
      const bar = volumeRef.current
      if (!v || !bar) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      v.volume = ratio
      setVolume(ratio)
      if (ratio > 0 && muted) {
        v.muted = false
        setMuted(false)
      }
    },
    [muted],
  )

  // --- Progress bar scrubbing (mousedown → mousemove → mouseup) ---
  const seekFromEvent = useCallback(
    (clientX: number) => {
      const bar = progressRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const time = ratio * realDuration
      setCurrentTime(time)
      const v = videoRef.current
      if (v) v.currentTime = time
    },
    [realDuration],
  )

  const onProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setDraggingProgress(true)
      seekFromEvent(e.clientX)

      const onMouseMove = (ev: MouseEvent) => seekFromEvent(ev.clientX)
      const onMouseUp = (ev: MouseEvent) => {
        seekFromEvent(ev.clientX)
        setDraggingProgress(false)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [seekFromEvent],
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
  const volumeDisplay = muted ? 0 : volume

  return (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4">Review Recording</h2>

      <div className="flex-1 bg-black rounded-lg overflow-hidden mb-4 flex flex-col min-h-0">
        {/* Video area — click to play/pause */}
        <div
          className="flex-1 min-h-0 relative cursor-pointer"
          onClick={togglePlayPause}
        >
          <video
            ref={videoRef}
            preload="auto"
            className="w-full h-full object-contain"
            onTimeUpdate={onTimeUpdate}
            style={{ opacity: ready ? 1 : 0 }}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              Loading…
            </div>
          )}
          {/* Big play button overlay when paused */}
          {ready && !playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                <PlayIcon className="w-7 h-7 text-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div
          ref={progressRef}
          className="group relative h-1.5 bg-zinc-700 cursor-pointer hover:h-2.5 transition-all shrink-0"
          onMouseDown={onProgressMouseDown}
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

        {/* Controls bar */}
        <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900/80 shrink-0">
          {/* Play / Pause */}
          <button
            onClick={togglePlayPause}
            className="text-zinc-300 hover:text-white transition-colors"
          >
            {playing ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
          </button>

          {/* Time */}
          <span className="text-xs text-zinc-400 font-mono min-w-[5rem] select-none">
            {formatTime(currentTime)} / {formatTime(realDuration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <button
            onClick={toggleMute}
            className="text-zinc-300 hover:text-white transition-colors"
          >
            {muted || volume === 0 ? (
              <VolumeMuteIcon className="w-4 h-4" />
            ) : (
              <VolumeIcon className="w-4 h-4" />
            )}
          </button>
          <div
            ref={volumeRef}
            className="w-16 h-1 bg-zinc-700 rounded-full cursor-pointer relative"
            onClick={changeVolume}
          >
            <div
              className="absolute inset-y-0 left-0 bg-zinc-400 rounded-full"
              style={{ width: `${volumeDisplay * 100}%` }}
            />
          </div>
        </div>
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
