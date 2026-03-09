import type { PipConfig } from './types'

export interface RecordingPreferences {
  camera?: boolean
  mic?: boolean
  hd?: boolean
  cameraDeviceId?: string
  micDeviceId?: string
  pipConfig?: PipConfig
}

const STORAGE_KEY = 'recordingPreferences'

export async function loadPreferences(): Promise<RecordingPreferences> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return (result[STORAGE_KEY] as RecordingPreferences) ?? {}
  } catch {
    return {}
  }
}

export async function savePreferences(partial: Partial<RecordingPreferences>): Promise<void> {
  const existing = await loadPreferences()
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...existing, ...partial } })
}
