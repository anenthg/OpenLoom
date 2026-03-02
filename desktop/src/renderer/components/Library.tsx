import { useCallback, useEffect, useState } from 'react'
import { listVideos, deleteVideo, getShareURL } from '../lib/firebase'
import type { AppSettings, Video } from '../lib/types'
import { CheckIcon, ClockIcon, EyeIcon, FolderIcon, LinkIcon, TrashIcon } from './icons'

interface Props {
  settings: AppSettings
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const captureModeConfig: Record<string, { label: string; color: string }> = {
  screen: { label: 'S', color: 'bg-[var(--crimson)]' },
  window: { label: 'W', color: 'bg-[var(--mustard)]' },
  tab: { label: 'T', color: 'bg-[var(--emerald)]' },
}

export default function Library({ settings }: Props) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const data = await listVideos()
      setVideos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCopyLink = async (video: Video) => {
    if (!settings.firebaseProjectId) return
    const url = getShareURL(settings.firebaseProjectId, video.short_code)
    await navigator.clipboard.writeText(url)
    setCopiedId(video.short_code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (video: Video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return
    try {
      setDeletingId(video.short_code)
      await deleteVideo(video.short_code)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete video')
    } finally {
      setDeletingId(null)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div
        data-testid="library-view"
        className="flex items-center justify-center h-full"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-600 border-t-[var(--crimson)]" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        data-testid="library-view"
        className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3"
      >
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="px-3 py-1.5 text-sm rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-all duration-200"
        >
          Retry
        </button>
      </div>
    )
  }

  // Empty state
  if (videos.length === 0) {
    return (
      <div
        data-testid="library-view"
        className="flex flex-col items-center justify-center h-full text-zinc-500"
      >
        <FolderIcon className="w-12 h-12 mb-3 text-zinc-600" />
        <h2 className="text-lg font-semibold text-zinc-300">No recordings yet</h2>
        <p className="text-sm">Your recordings will appear here after uploading</p>
      </div>
    )
  }

  // Video list
  return (
    <div data-testid="library-view" className="p-4">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4">Library</h2>
      <div className="flex flex-col gap-2">
        {videos.map((video) => {
          const mode = captureModeConfig[video.capture_mode] ?? captureModeConfig.screen
          const isDeleting = deletingId === video.short_code
          const isCopied = copiedId === video.short_code

          return (
            <div
              key={video.id}
              className={`stripe-hover-border flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-all duration-200 ${
                isDeleting ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {/* Capture mode icon */}
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg ${mode.color} flex items-center justify-center text-white text-sm font-bold`}
              >
                {mode.label}
              </div>

              {/* Title + metadata */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {video.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatDuration(video.duration_ms)}
                  </span>
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-3 h-3" />
                    {video.view_count}
                  </span>
                  <span>·</span>
                  <span>{formatRelativeDate(video.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopyLink(video)}
                  title="Copy link"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all duration-200"
                >
                  {isCopied ? (
                    <CheckIcon className="w-4 h-4 text-green-400" />
                  ) : (
                    <LinkIcon className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(video)}
                  title="Delete"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-all duration-200 hover:shadow-[0_0_10px_rgba(248,113,113,0.15)]"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
