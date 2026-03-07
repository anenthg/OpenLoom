import { useState } from 'react'
import { MicIcon, MicOffIcon, StopIcon } from './icons'

interface Props {
  elapsed: number
  previewDataUrl: string | null
  micBars: number[]
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function AudioMeter({ bars, muted }: { bars: number[]; muted: boolean }) {
  if (bars.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-[3px] h-6 px-1">
      {bars.map((level, i) => {
        const height = muted ? 2 : Math.max(2, (level / 100) * 24)
        const isActive = !muted && level > 5
        return (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all duration-100"
            style={{
              height: `${height}px`,
              backgroundColor: isActive
                ? level > 70 ? 'var(--crimson)' : 'var(--emerald)'
                : 'rgba(113, 113, 122, 0.4)',
            }}
          />
        )
      })}
    </div>
  )
}

export default function RecordingIndicator({ elapsed, previewDataUrl, micBars }: Props) {
  const [micMuted, setMicMuted] = useState(false)

  const handleMicToggle = () => {
    const newMuted = !micMuted
    setMicMuted(newMuted)
    chrome.runtime.sendMessage({ type: 'SET_MIC_MUTED', muted: newMuted })
  }

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
  }

  return (
    <div className="flex flex-col items-center h-full p-4 pt-6">
      {/* Live preview */}
      <div className="w-full rounded-xl overflow-hidden bg-zinc-900 mb-6">
        {previewDataUrl ? (
          <img
            src={previewDataUrl}
            alt="Live preview"
            className="w-full h-auto rounded-xl"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            Starting preview...
          </div>
        )}
      </div>

      {/* Pulsing red dot and timer */}
      <div className="flex items-center gap-3 mb-4">
        <span className="w-4 h-4 rounded-full bg-[var(--crimson)] animate-pulse" />
        <span className="font-mono text-4xl font-bold text-[var(--crimson)]">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Audio meter */}
      <div className="mb-4">
        <AudioMeter bars={micBars} muted={micMuted} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={handleMicToggle}
          title={micMuted ? 'Unmute mic' : 'Mute mic'}
          className={`p-3 rounded-full transition-all ${
            micMuted
              ? 'bg-[var(--crimson)]/20 text-[var(--crimson)]'
              : 'text-[var(--emerald)] hover:bg-zinc-800'
          }`}
        >
          {micMuted ? (
            <MicOffIcon className="w-6 h-6" />
          ) : (
            <MicIcon className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={handleStop}
          title="Stop recording"
          className="p-4 rounded-full bg-[var(--crimson)] text-white transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.3)]"
        >
          <StopIcon className="w-7 h-7" />
        </button>
      </div>
    </div>
  )
}
