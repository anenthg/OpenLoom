export interface AppSettings {
  supabaseURL?: string
  supabaseRef?: string
  serviceRoleKey?: string
  databasePassword?: string
  isProvisioned?: boolean
}

export interface Video {
  id: string
  short_code: string
  title: string
  description: string | null
  storage_url: string
  view_count: number
  duration_ms: number | null
  capture_mode: 'screen' | 'window' | 'tab'
  created_at: string
}

export interface VideoInsert {
  short_code: string
  title: string
  description?: string | null
  storage_url: string
  duration_ms?: number | null
  capture_mode: 'screen' | 'window' | 'tab'
}

export interface DesktopSource {
  id: string
  name: string
  thumbnail: string
  appIcon?: string
  display_id?: string
}

export type RecordingPhase =
  | 'idle'
  | 'sourceSelect'
  | 'countdown'
  | 'recording'
  | 'review'
  | 'uploading'

export type PermissionStatus = 'not-determined' | 'granted' | 'denied' | 'restricted'

export interface PermissionStatuses {
  screen: PermissionStatus
  microphone: PermissionStatus
  camera: PermissionStatus
}

export interface IElectronAPI {
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<AppSettings>
  clearSettings: () => Promise<Record<string, never>>
  executeDDL: (
    ref: string,
    password: string,
    sql: string,
  ) => Promise<{ ok: boolean; error?: string }>
  getDesktopSources: () => Promise<DesktopSource[]>
  requestMicAccess: () => Promise<boolean>
  getPermissionStatus: () => Promise<PermissionStatuses>
  requestCameraAccess: () => Promise<boolean>
  openScreenRecordingSettings: () => Promise<void>
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
