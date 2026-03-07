import type { AppSettings, PipConfig, RecordingPhase, Video } from './types'
import type { ProvisioningStep } from './provisioning/types'

// ─── Side Panel → Service Worker ────────────────────────────────────────────

export interface StartRecordingMessage {
  type: 'START_RECORDING'
  camera: boolean
  mic: boolean
  hd: boolean
  cameraDeviceId?: string
  micDeviceId?: string
  pipConfig?: PipConfig
}

export interface StopRecordingMessage {
  type: 'STOP_RECORDING'
}

export interface UploadRecordingMessage {
  type: 'UPLOAD_RECORDING'
  title: string
  password?: string
}

export interface GetStateMessage {
  type: 'GET_STATE'
}

export interface ValidateConnectionMessage {
  type: 'VALIDATE_CONNECTION'
  provider: string
  credential: string
}

export interface DeployBackendMessage {
  type: 'DEPLOY_BACKEND'
  provider: string
}

export interface ListVideosMessage {
  type: 'LIST_VIDEOS'
}

export interface DeleteVideoMessage {
  type: 'DELETE_VIDEO'
  shortCode: string
}

export interface SaveSettingsMessage {
  type: 'SAVE_SETTINGS'
  settings: AppSettings
}

export interface GetSettingsMessage {
  type: 'GET_SETTINGS'
}

export interface DisconnectMessage {
  type: 'DISCONNECT'
}

export interface SetMicMutedMessage {
  type: 'SET_MIC_MUTED'
  muted: boolean
}

// ─── Service Worker → Offscreen ─────────────────────────────────────────────

export interface CaptureAndRecordMessage {
  type: 'CAPTURE_AND_RECORD'
  camera: boolean
  mic: boolean
  hd: boolean
  cameraDeviceId?: string
  micDeviceId?: string
  pipConfig?: PipConfig
}

export interface StopCaptureMessage {
  type: 'STOP_CAPTURE'
}

export interface ReadBlobMessage {
  type: 'READ_BLOB'
  blobId: string
}

// ─── Offscreen → Service Worker ─────────────────────────────────────────────

export interface CaptureStartedMessage {
  type: 'CAPTURE_STARTED'
}

export interface RecordingStoppedMessage {
  type: 'RECORDING_STOPPED'
  blobId: string | null
}

export interface ElapsedUpdateMessage {
  type: 'ELAPSED_UPDATE'
  seconds: number
}

export interface PreviewFrameMessage {
  type: 'PREVIEW_FRAME'
  dataUrl: string
}

export interface MicLevelMessage {
  type: 'MIC_LEVEL'
  bars: number[]
}

// ─── Service Worker → Side Panel ────────────────────────────────────────────

export interface StateUpdateMessage {
  type: 'STATE_UPDATE'
  state: {
    phase: RecordingPhase
    elapsed: number
    blobId: string | null
    error: string | null
    shareURL: string | null
    uploadProgress: number
  }
  settings?: AppSettings
}

export interface DeployProgressMessage {
  type: 'DEPLOY_PROGRESS'
  steps: ProvisioningStep[]
}

export interface UploadCompleteMessage {
  type: 'UPLOAD_COMPLETE'
  shareURL: string
}

export interface VideosListMessage {
  type: 'VIDEOS_LIST'
  videos: Video[]
}

export interface SettingsResultMessage {
  type: 'SETTINGS_RESULT'
  settings: AppSettings
}

// ─── Union types ────────────────────────────────────────────────────────────

export type SidePanelMessage =
  | StartRecordingMessage
  | StopRecordingMessage
  | UploadRecordingMessage
  | GetStateMessage
  | ValidateConnectionMessage
  | DeployBackendMessage
  | ListVideosMessage
  | DeleteVideoMessage
  | SaveSettingsMessage
  | GetSettingsMessage
  | DisconnectMessage
  | SetMicMutedMessage

export type OffscreenMessage =
  | CaptureAndRecordMessage
  | StopCaptureMessage
  | ReadBlobMessage

export type OffscreenResponse =
  | CaptureStartedMessage
  | RecordingStoppedMessage
  | ElapsedUpdateMessage
  | PreviewFrameMessage
  | MicLevelMessage

export type ServiceWorkerMessage =
  | StateUpdateMessage
  | DeployProgressMessage
  | UploadCompleteMessage
  | VideosListMessage
  | SettingsResultMessage

export type ExtensionMessage =
  | SidePanelMessage
  | OffscreenMessage
  | OffscreenResponse
  | ServiceWorkerMessage
