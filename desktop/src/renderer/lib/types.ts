export type BackendProvider = 'firebase' | 'convex'

export interface AppSettings {
  provider?: BackendProvider
  // Firebase fields
  firebaseProjectId?: string
  serviceAccountJson?: string // stringified service account key
  isProvisioned?: boolean
  cloudFunctionVersion?: string
  cloudFunctionUrl?: string
  // Convex fields
  convexDeployKey?: string
  convexDeploymentUrl?: string
  convexDeploymentName?: string
  convexHttpActionsUrl?: string
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
  validateFirebaseConnection: (
    serviceAccountJson: string,
  ) => Promise<{ ok: boolean; projectId?: string; error?: string }>
  firestoreInsert: (
    collection: string,
    docId: string,
    data: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  firestoreQuery: (
    collection: string,
    orderBy: string,
    direction: string,
  ) => Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }>
  firestoreQueryByField: (
    collection: string,
    field: string,
    value: string,
  ) => Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }>
  firestoreDelete: (
    collection: string,
    docId: string,
  ) => Promise<{ ok: boolean; error?: string }>
  storageUpload: (
    remotePath: string,
    fileData: ArrayBuffer,
    contentType: string,
  ) => Promise<{ ok: boolean; url?: string; error?: string }>
  storageDelete: (remotePath: string) => Promise<{ ok: boolean; error?: string }>
  storageGetPublicUrl: (
    remotePath: string,
  ) => Promise<{ ok: boolean; url?: string; error?: string }>
  getDesktopSources: () => Promise<DesktopSource[]>
  requestMicAccess: () => Promise<boolean>
  getPermissionStatus: () => Promise<PermissionStatuses>
  requestCameraAccess: () => Promise<boolean>
  openScreenRecordingSettings: () => Promise<void>
  deployCloudFunction: () => Promise<{
    ok: boolean
    skipped?: boolean
    error?: string
    enableUrls?: { label: string; url: string }[]
  }>
  onDeployProgress: (callback: (stage: string) => void) => void
  offDeployProgress: () => void
  // Provider-agnostic methods
  validateConnection: (
    credential: string,
  ) => Promise<{ ok: boolean; projectId?: string; deploymentName?: string; deploymentUrl?: string; httpActionsUrl?: string; error?: string }>
  dbInsert: (
    collection: string,
    docId: string,
    data: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  dbQuery: (
    collection: string,
    orderBy: string,
    direction: string,
  ) => Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }>
  dbQueryByField: (
    collection: string,
    field: string,
    value: string,
  ) => Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }>
  dbDelete: (
    collection: string,
    docId: string,
  ) => Promise<{ ok: boolean; error?: string }>
  fileUpload: (
    remotePath: string,
    fileData: ArrayBuffer,
    contentType: string,
  ) => Promise<{ ok: boolean; url?: string; error?: string }>
  fileDelete: (remotePath: string) => Promise<{ ok: boolean; error?: string }>
  fileGetPublicUrl: (
    remotePath: string,
  ) => Promise<{ ok: boolean; url?: string; error?: string }>
  deployBackendFunctions: () => Promise<{
    ok: boolean
    skipped?: boolean
    error?: string
    enableUrls?: { label: string; url: string }[]
  }>
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
