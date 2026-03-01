import { contextBridge, ipcRenderer } from 'electron'

export interface AppSettings {
  firebaseProjectId?: string
  serviceAccountJson?: string
  isProvisioned?: boolean
  cloudFunctionVersion?: string
  cloudFunctionUrl?: string
}

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('save-settings', settings),
  clearSettings: (): Promise<Record<string, never>> =>
    ipcRenderer.invoke('clear-settings'),
  validateFirebaseConnection: (
    serviceAccountJson: string,
  ): Promise<{ ok: boolean; projectId?: string; error?: string }> =>
    ipcRenderer.invoke('validate-firebase', serviceAccountJson),
  firestoreInsert: (
    collection: string,
    docId: string,
    data: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('firestore-insert', collection, docId, data),
  firestoreQuery: (
    collection: string,
    orderBy: string,
    direction: string,
  ): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> =>
    ipcRenderer.invoke('firestore-query', collection, orderBy, direction),
  firestoreQueryByField: (
    collection: string,
    field: string,
    value: string,
  ): Promise<{ ok: boolean; data?: Record<string, unknown>[]; error?: string }> =>
    ipcRenderer.invoke('firestore-query-by-field', collection, field, value),
  firestoreDelete: (
    collection: string,
    docId: string,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('firestore-delete', collection, docId),
  storageUpload: (
    remotePath: string,
    fileData: ArrayBuffer,
    contentType: string,
  ): Promise<{ ok: boolean; url?: string; error?: string }> =>
    ipcRenderer.invoke('storage-upload', remotePath, fileData, contentType),
  storageDelete: (remotePath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('storage-delete', remotePath),
  storageGetPublicUrl: (
    remotePath: string,
  ): Promise<{ ok: boolean; url?: string; error?: string }> =>
    ipcRenderer.invoke('storage-get-public-url', remotePath),
  requestMicAccess: (): Promise<boolean> => ipcRenderer.invoke('request-mic-access'),
  getPermissionStatus: (): Promise<{
    screen: string
    microphone: string
    camera: string
  }> => ipcRenderer.invoke('get-permission-status'),
  requestCameraAccess: (): Promise<boolean> => ipcRenderer.invoke('request-camera-access'),
  openScreenRecordingSettings: (): Promise<void> =>
    ipcRenderer.invoke('open-screen-recording-settings'),
  getDesktopSources: (): Promise<
    Array<{
      id: string
      name: string
      thumbnail: string
      appIcon?: string
      display_id?: string
    }>
  > => ipcRenderer.invoke('get-desktop-sources'),
  deployCloudFunction: (): Promise<{
    ok: boolean
    error?: string
    enableUrls?: { label: string; url: string }[]
  }> => ipcRenderer.invoke('deploy-cloud-function'),
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
