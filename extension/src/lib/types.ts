export type BackendProvider = 'firebase' | 'convex' | 'supabase'

export interface AppSettings {
  provider?: BackendProvider
  // Firebase fields
  firebaseProjectId?: string
  serviceAccountJson?: string
  isProvisioned?: boolean
  cloudFunctionVersion?: string
  cloudFunctionUrl?: string
  firestoreDbId?: string
  resolvedBucket?: string
  // Convex fields
  convexDeployKey?: string
  convexDeploymentUrl?: string
  convexDeploymentName?: string
  convexHttpActionsUrl?: string
  convexFunctionsVersion?: string
  // Supabase fields
  supabaseProjectUrl?: string
  supabaseProjectRef?: string
  supabaseAccessToken?: string
  supabaseServiceRoleKey?: string
  supabaseAnonKey?: string
  supabaseFunctionsVersion?: string
  supabaseFileSizeLimit?: number // bytes; detected during provisioning
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
  is_protected?: boolean
  password_salt?: string
}

export interface VideoInsert {
  short_code: string
  title: string
  description?: string | null
  storage_url: string
  duration_ms?: number | null
  capture_mode: 'screen' | 'window' | 'tab'
  is_protected?: boolean
  password_salt?: string
}

export type RecordingPhase =
  | 'idle'
  | 'preparing'
  | 'countdown'
  | 'recording'
  | 'review'
  | 'uploading'

export interface PipConfig {
  x: number // normalized 0-1
  y: number // normalized 0-1
  size: number // normalized 0-1
}

export const DEFAULT_PIP_CONFIG: PipConfig = {
  x: 0.85,
  y: 0.85,
  size: 0.12,
}
