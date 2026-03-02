import { useState, useRef, useEffect } from 'react'
import type { DeviceInfo } from '../../lib/recording/useDeviceList'

interface DeviceDropdownProps {
  enabled: boolean
  devices: DeviceInfo[]
  selectedDeviceId: string | null
  onToggle: () => void
  onSelectDevice: (id: string | null) => void
  icon: React.ReactNode
  offIcon: React.ReactNode
  label: string
}

export default function DeviceDropdown({
  enabled,
  devices,
  selectedDeviceId,
  onToggle,
  onSelectDevice,
  icon,
  offIcon,
  label,
}: DeviceDropdownProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId)
  const displayName = selectedDevice?.label || label

  if (!enabled) {
    return (
      <button
        onClick={onToggle}
        title={`${label} off`}
        className="p-2 rounded-lg transition-colors bg-[var(--crimson)]/20 text-[var(--crimson)]"
      >
        {offIcon}
      </button>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors bg-[var(--emerald)]/20 text-[var(--emerald)] text-xs"
      >
        {icon}
        <span className="max-w-[120px] truncate">{displayName}</span>
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 opacity-60">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {devices.map((device) => (
            <button
              key={device.deviceId}
              onClick={() => {
                onSelectDevice(device.deviceId)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-zinc-700 ${
                device.deviceId === selectedDeviceId
                  ? 'text-[var(--emerald)]'
                  : 'text-zinc-300'
              }`}
            >
              {device.label}
            </button>
          ))}
          <div className="border-t border-zinc-700" />
          <button
            onClick={() => {
              onSelectDevice(null)
              setOpen(false)
            }}
            className="w-full text-left px-3 py-2 text-xs text-[var(--crimson)] transition-colors hover:bg-zinc-700"
          >
            Turn off
          </button>
        </div>
      )}
    </div>
  )
}
