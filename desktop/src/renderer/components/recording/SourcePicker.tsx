import { useState } from 'react'
import type { DesktopSource } from '../../lib/types'
import type { DeviceInfo } from '../../lib/recording/useDeviceList'
import { CameraIcon, CameraOffIcon, MicIcon, MicOffIcon, HDIcon } from '../icons'
import DeviceDropdown from './DeviceDropdown'

interface SourcePickerProps {
  sources: DesktopSource[]
  enableCamera: boolean
  enableMic: boolean
  enableHD: boolean
  cameras: DeviceInfo[]
  microphones: DeviceInfo[]
  selectedCameraId: string | null
  selectedMicId: string | null
  onToggleCamera: () => void
  onToggleMic: () => void
  onToggleHD: () => void
  onSelectCamera: (id: string | null) => void
  onSelectMic: (id: string | null) => void
  onSelect: (sourceId: string) => void
}

type Tab = 'screens' | 'windows'

export default function SourcePicker({
  sources,
  enableCamera,
  enableMic,
  enableHD,
  cameras,
  microphones,
  selectedCameraId,
  selectedMicId,
  onToggleCamera,
  onToggleMic,
  onToggleHD,
  onSelectCamera,
  onSelectMic,
  onSelect,
}: SourcePickerProps) {
  const screens = sources.filter((s) => s.id.startsWith('screen:'))
  const windows = sources.filter((s) => s.id.startsWith('window:'))
  const [tab, setTab] = useState<Tab>(screens.length > 0 ? 'screens' : 'windows')

  const items = tab === 'screens' ? screens : windows

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex gap-1 mb-4 border-b border-zinc-800">
        {screens.length > 0 && (
          <button
            onClick={() => setTab('screens')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              tab === 'screens'
                ? 'text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Screens
            {tab === 'screens' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--crimson)] rounded-full" />
            )}
          </button>
        )}
        {windows.length > 0 && (
          <button
            onClick={() => setTab('windows')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              tab === 'windows'
                ? 'text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Windows
            {tab === 'windows' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--crimson)] rounded-full" />
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2">
          {items.map((source) => (
            <button
              key={source.id}
              onClick={() => onSelect(source.id)}
              className="stripe-hover-border rounded-lg border border-zinc-700 hover:border-[var(--crimson)] overflow-hidden transition-all duration-200 bg-zinc-900 hover:bg-zinc-800"
            >
              {source.thumbnail ? (
                <img
                  src={source.thumbnail}
                  alt={source.name}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                  No preview
                </div>
              )}
              <div className="px-2 py-1.5 text-xs text-zinc-300 truncate flex items-center gap-1.5">
                {tab === 'windows' && source.appIcon && (
                  <img src={source.appIcon} alt="" className="w-3.5 h-3.5" />
                )}
                {source.name}
              </div>
            </button>
          ))}
        </div>
        {tab === 'windows' && (
          <p className="text-xs text-zinc-600 mt-3">
            Some apps (e.g. Chrome) hide their windows from capture. Use the Screens tab to
            record them.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-200">Choose a source</h2>
        <div className="flex gap-2 items-center">
          <DeviceDropdown
            enabled={enableCamera}
            devices={cameras}
            selectedDeviceId={selectedCameraId}
            onToggle={onToggleCamera}
            onSelectDevice={onSelectCamera}
            icon={<CameraIcon className="w-4 h-4" />}
            offIcon={<CameraOffIcon className="w-5 h-5" />}
            label="Camera"
          />
          <DeviceDropdown
            enabled={enableMic}
            devices={microphones}
            selectedDeviceId={selectedMicId}
            onToggle={onToggleMic}
            onSelectDevice={onSelectMic}
            icon={<MicIcon className="w-4 h-4" />}
            offIcon={<MicOffIcon className="w-5 h-5" />}
            label="Microphone"
          />
          <button
            onClick={onToggleHD}
            title={enableHD ? 'HD on' : 'HD off'}
            className={`p-2 rounded-lg transition-colors ${
              enableHD
                ? 'bg-[var(--emerald)]/20 text-[var(--emerald)]'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            <HDIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
