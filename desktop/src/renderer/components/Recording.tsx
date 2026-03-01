import { useState, useEffect } from 'react'
import { useRecordingMachine } from '../lib/recording/useRecordingMachine'
import SourcePicker from './recording/SourcePicker'
import Countdown from './recording/Countdown'
import RecordingControls from './recording/RecordingControls'
import ReviewPlayer from './recording/ReviewPlayer'
import UploadProgress from './recording/UploadProgress'
import PermissionGate from './recording/PermissionGate'
import { RecordIcon } from './icons'

export default function Recording() {
  // null = checking, false = show gate, true = show recording UI
  const [permissionsCleared, setPermissionsCleared] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.getPermissionStatus().then((statuses) => {
      if (statuses.screen === 'granted' && statuses.microphone === 'granted') {
        setPermissionsCleared(true)
      } else {
        setPermissionsCleared(false)
      }
    })
  }, [])

  if (permissionsCleared === null) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Checking permissions…
      </div>
    )
  }

  if (!permissionsCleared) {
    return <PermissionGate onContinue={() => setPermissionsCleared(true)} />
  }

  return <RecordingInner />
}

function RecordingInner() {
  const state = useRecordingMachine()

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6">
        <p className="text-[var(--crimson)] mb-4">{state.error}</p>
        <button
          onClick={state.reset}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  switch (state.phase) {
    case 'idle':
      return (
        <div
          data-testid="recording-view"
          className="flex flex-col items-center justify-center h-full text-zinc-500"
        >
          <RecordIcon className="w-12 h-12 text-[var(--crimson)] mb-3" />
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">Recording</h2>
          <button
            onClick={state.startSourceSelect}
            className="px-6 py-3 bg-[var(--crimson)] text-white rounded-lg font-medium transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(217,43,43,0.3)] active:scale-[0.97] inline-flex items-center gap-2"
          >
            <RecordIcon className="w-4 h-4" />
            Start Recording
          </button>
        </div>
      )

    case 'sourceSelect':
      return (
        <SourcePicker
          sources={state.sources}
          enableCamera={state.enableCamera}
          enableMic={state.enableMic}
          enableHD={state.enableHD}
          onToggleCamera={state.toggleCamera}
          onToggleMic={state.toggleMic}
          onToggleHD={state.toggleHD}
          onSelect={state.selectSource}
        />
      )

    case 'countdown':
      return <Countdown value={state.countdownValue} />

    case 'recording':
      return state.canvas ? (
        <RecordingControls
          canvas={state.canvas}
          elapsedSeconds={state.elapsedSeconds}
          hasLiveAudio={state.hasLiveAudio}
          onStop={state.stopRecording}
          onToggleMic={state.setMicMuted}
        />
      ) : null

    case 'review':
      return state.recordedBlob ? (
        <ReviewPlayer
          blob={state.recordedBlob}
          duration={state.elapsedSeconds}
          onDiscard={state.discard}
          onUpload={state.upload}
        />
      ) : null

    case 'uploading':
      return (
        <UploadProgress
          progress={state.uploadProgress}
          shareURL={state.shareURL}
          onNewRecording={state.reset}
        />
      )

    default:
      return null
  }
}
