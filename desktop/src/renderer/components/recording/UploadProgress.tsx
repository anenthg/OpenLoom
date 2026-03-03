import { useState } from 'react'
import { UploadIcon, CheckCircleIcon, LinkIcon, ClipboardIcon, CheckIcon, RecordIcon } from '../icons'

interface UploadProgressProps {
  progress: number
  shareURL: string | null
  onNewRecording: () => void
}

export default function UploadProgress({ progress, shareURL, onNewRecording }: UploadProgressProps) {
  const isComplete = progress >= 100
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (!shareURL) return
    await navigator.clipboard.writeText(shareURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      {isComplete ? (
        <CheckCircleIcon className="w-10 h-10 text-[var(--emerald)] mb-4" />
      ) : (
        <UploadIcon className="w-10 h-10 text-[var(--crimson)] animate-pulse mb-4" />
      )}

      <h2 className="text-lg font-semibold text-zinc-200 mb-6">
        {isComplete ? 'Upload Complete!' : 'Uploading...'}
      </h2>

      {!isComplete && (
        <>
          <div className="w-full max-w-md bg-zinc-800 rounded-full h-3 mb-4">
            <div
              className="bg-[var(--crimson)] h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-zinc-400 mb-4">{progress}%</p>
        </>
      )}

      {shareURL && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="text-center">
            <p className="text-sm text-zinc-400 mb-2">Share link:</p>
            <a
              href={shareURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--crimson)] hover:brightness-110 text-sm break-all inline-flex items-center gap-1.5"
            >
              <LinkIcon className="w-4 h-4 shrink-0" />
              {shareURL}
            </a>
          </div>

          <button
            onClick={copyToClipboard}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              copied
                ? 'bg-[var(--emerald)]/20 text-[var(--emerald)]'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardIcon className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>

          <button
            onClick={onNewRecording}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--crimson)] text-white rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.97]"
          >
            <RecordIcon className="w-4 h-4" />
            New Recording
          </button>
        </div>
      )}
    </div>
  )
}
