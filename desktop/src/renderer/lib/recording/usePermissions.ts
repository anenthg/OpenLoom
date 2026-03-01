import { useState, useEffect, useCallback } from 'react'
import type { PermissionStatus } from '../types'

export interface PermissionEntry {
  key: 'screen' | 'microphone' | 'camera'
  label: string
  status: PermissionStatus
  mandatory: boolean
  instruction: string
  requestable: boolean
}

interface UsePermissionsReturn {
  permissions: PermissionEntry[]
  allMandatoryGranted: boolean
  loading: boolean
  refresh: () => Promise<void>
  requestPermission: (key: 'screen' | 'microphone' | 'camera') => Promise<void>
}

export function usePermissions(): UsePermissionsReturn {
  const [statuses, setStatuses] = useState<Record<string, PermissionStatus>>({
    screen: 'not-determined',
    microphone: 'not-determined',
    camera: 'not-determined',
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const result = await window.api.getPermissionStatus()
    setStatuses(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Re-check when user returns from System Settings
  useEffect(() => {
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const requestPermission = useCallback(
    async (key: 'screen' | 'microphone' | 'camera') => {
      if (key === 'screen') {
        await window.api.openScreenRecordingSettings()
        return
      }

      const status = statuses[key]
      if (status === 'denied' || status === 'restricted') {
        // Can't re-prompt — open System Settings
        await window.api.openScreenRecordingSettings()
        return
      }

      // not-determined — trigger OS prompt
      if (key === 'microphone') {
        await window.api.requestMicAccess()
      } else {
        await window.api.requestCameraAccess()
      }
      await refresh()
    },
    [statuses, refresh],
  )

  const permissions: PermissionEntry[] = [
    {
      key: 'screen',
      label: 'Screen Recording',
      status: statuses.screen as PermissionStatus,
      mandatory: true,
      instruction: 'Open System Settings and grant Screen Recording access to Thari.video.',
      requestable: false,
    },
    {
      key: 'microphone',
      label: 'Microphone',
      status: statuses.microphone as PermissionStatus,
      mandatory: true,
      instruction:
        statuses.microphone === 'not-determined'
          ? 'Click Grant Access to allow microphone recording.'
          : 'Open System Settings and grant Microphone access to Thari.video.',
      requestable: statuses.microphone === 'not-determined',
    },
    {
      key: 'camera',
      label: 'Camera',
      status: statuses.camera as PermissionStatus,
      mandatory: false,
      instruction:
        statuses.camera === 'not-determined'
          ? 'Click Grant Access to enable camera overlay.'
          : 'Open System Settings and grant Camera access to Thari.video.',
      requestable: statuses.camera === 'not-determined',
    },
  ]

  const allMandatoryGranted = permissions
    .filter((p) => p.mandatory)
    .every((p) => p.status === 'granted')

  return { permissions, allMandatoryGranted, loading, refresh, requestPermission }
}
