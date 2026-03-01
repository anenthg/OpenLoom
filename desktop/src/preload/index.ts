import { contextBridge, ipcRenderer } from 'electron'

export interface AppSettings {
  supabaseURL?: string
  supabaseRef?: string
  serviceRoleKey?: string
  databasePassword?: string
  isProvisioned?: boolean
}

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('save-settings', settings),
  clearSettings: (): Promise<Record<string, never>> =>
    ipcRenderer.invoke('clear-settings'),
  executeDDL: (
    ref: string,
    password: string,
    sql: string,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('execute-sql', ref, password, sql),
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
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
