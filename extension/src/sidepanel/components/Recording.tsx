import { useState, useEffect, useCallback } from 'react'
import type { AppSettings, PipConfig, RecordingPhase } from '../../lib/types'
import type { StateUpdateMessage } from '../../lib/messages'
import RecordingSetup from './RecordingSetup'
import PipLayoutPreview from './PipLayoutPreview'
import RecordingIndicator from './RecordingIndicator'
import Countdown from './Countdown'
import ReviewPlayer from './ReviewPlayer'
import UploadProgress from './UploadProgress'

interface Props {
  settings: AppSettings
}

export default function Recording({ settings }: Props) {
  const [phase, setPhase] = useState<RecordingPhase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [blobId, setBlobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shareURL, setShareURL] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [countdownValue, setCountdownValue] = useState(3)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [micBars, setMicBars] = useState<number[]>([])
  const [showPipLayout, setShowPipLayout] = useState(false)
  const [pendingRecordingConfig, setPendingRecordingConfig] = useState<{
    camera: boolean; mic: boolean; hd: boolean; cameraDeviceId?: string; micDeviceId?: string
  } | null>(null)

  // Request current state on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' })
  }, [])

  // Listen for state updates
  useEffect(() => {
    const listener = (message: { type: string; state?: StateUpdateMessage['state']; settings?: StateUpdateMessage['settings']; dataUrl?: string; bars?: number[] }) => {
      if (message.type === 'STATE_UPDATE' && message.state) {
        const s = message.state
        setPhase(s.phase)
        setElapsed(s.elapsed)
        setBlobId(s.blobId)
        setError(s.error)
        setShareURL(s.shareURL)
        setUploadProgress(s.uploadProgress)
      }
      if (message.type === 'PREVIEW_FRAME' && message.dataUrl) {
        setPreviewDataUrl(message.dataUrl)
      }
      if (message.type === 'MIC_LEVEL' && message.bars) {
        setMicBars(message.bars)
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // Countdown timer (local, runs 3-2-1 then SW takes over)
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdownValue(3)

    const interval = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 1
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  // Clear preview and mic bars when leaving recording phase
  useEffect(() => {
    if (phase !== 'recording') {
      setPreviewDataUrl(null)
      setMicBars([])
    }
  }, [phase])

  const handleRecordingStart = useCallback((config: {
    camera: boolean; mic: boolean; hd: boolean; cameraDeviceId?: string; micDeviceId?: string
  }) => {
    if (config.camera) {
      setPendingRecordingConfig(config)
      setShowPipLayout(true)
    } else {
      chrome.runtime.sendMessage({ type: 'START_RECORDING', ...config })
    }
  }, [])

  const handlePipContinue = useCallback((pipConfig: PipConfig) => {
    if (pendingRecordingConfig) {
      chrome.runtime.sendMessage({ type: 'START_RECORDING', ...pendingRecordingConfig, pipConfig })
    }
    setShowPipLayout(false)
    setPendingRecordingConfig(null)
  }, [pendingRecordingConfig])

  const handlePipBack = useCallback(() => {
    setShowPipLayout(false)
    setPendingRecordingConfig(null)
  }, [])

  const handleNewRecording = useCallback(() => {
    setPhase('idle')
    setBlobId(null)
    setShareURL(null)
    setUploadProgress(0)
    setError(null)
    setPreviewDataUrl(null)
    chrome.runtime.sendMessage({ type: 'GET_STATE' })
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={handleNewRecording}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  let content: React.ReactNode

  if (showPipLayout) {
    content = <PipLayoutPreview onContinue={handlePipContinue} onBack={handlePipBack} cameraDeviceId={pendingRecordingConfig?.cameraDeviceId} />
  } else switch (phase) {
    case 'idle':
      content = <RecordingSetup onStart={handleRecordingStart} />
      break

    case 'countdown':
      content = <Countdown value={countdownValue} />
      break

    case 'recording':
      content = <RecordingIndicator elapsed={elapsed} previewDataUrl={previewDataUrl} micBars={micBars} />
      break

    case 'review':
      content = (
        <ReviewPlayer
          blobId={blobId!}
          duration={elapsed}
          onDiscard={handleNewRecording}
          onUpload={(title, password) => {
            chrome.runtime.sendMessage({
              type: 'UPLOAD_RECORDING',
              title,
              password,
            })
          }}
        />
      )
      break

    case 'uploading':
      content = (
        <UploadProgress
          progress={uploadProgress}
          shareURL={shareURL}
          onNewRecording={handleNewRecording}
        />
      )
      break

    default:
      content = <RecordingSetup onStart={handleRecordingStart} />
  }

  return content
}
