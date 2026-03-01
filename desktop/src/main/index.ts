import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  shell,
  safeStorage,
  systemPreferences,
} from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { Client } from 'pg'

// Simple encrypted settings store using Electron's safeStorage
function getStorePath(): string {
  const dir = join(app.getPath('userData'), 'config')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

function loadSettings(): Record<string, unknown> {
  const filePath = getStorePath()
  if (!existsSync(filePath)) return {}
  try {
    const encrypted = readFileSync(filePath)
    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(encrypted)
      return JSON.parse(decrypted)
    }
    return JSON.parse(encrypted.toString('utf-8'))
  } catch {
    return {}
  }
}

function saveSettings(data: Record<string, unknown>): void {
  const filePath = getStorePath()
  const json = JSON.stringify(data)
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(filePath, safeStorage.encryptString(json))
  } else {
    writeFileSync(filePath, json, 'utf-8')
  }
}

let settings = {} as Record<string, unknown>

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Thari.video',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC handler for direct PostgreSQL DDL execution
ipcMain.handle(
  'execute-sql',
  async (_event, ref: string, password: string, sql: string) => {
    const client = new Client({
      host: `db.${ref}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password,
      ssl: true,
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
    })
    try {
      await client.connect()
      await client.query(sql)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: `Database operation failed: ${e instanceof Error ? e.message : String(e)}`,
      }
    } finally {
      await client.end()
    }
  },
)

// IPC handler for microphone permission (required on macOS)
ipcMain.handle('request-mic-access', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone')
    if (status === 'granted') return true
    return systemPreferences.askForMediaAccess('microphone')
  }
  return true
})

// IPC handler for permission statuses
ipcMain.handle('get-permission-status', () => {
  if (process.platform === 'darwin') {
    return {
      screen: systemPreferences.getMediaAccessStatus('screen'),
      microphone: systemPreferences.getMediaAccessStatus('microphone'),
      camera: systemPreferences.getMediaAccessStatus('camera'),
    }
  }
  return { screen: 'granted', microphone: 'granted', camera: 'granted' }
})

// IPC handler for camera permission (required on macOS)
ipcMain.handle('request-camera-access', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('camera')
    if (status === 'granted') return true
    return systemPreferences.askForMediaAccess('camera')
  }
  return true
})

// IPC handler to open Screen Recording settings pane on macOS
ipcMain.handle('open-screen-recording-settings', async () => {
  if (process.platform === 'darwin') {
    // Trigger a screen capture attempt so macOS registers the app
    // in the Screen Recording permission list
    try {
      await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
    } catch {
      // Expected to fail if permission not yet granted
    }
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    )
  }
})

// IPC handler for desktop sources (screen recording)
ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 240, height: 135 },
    fetchWindowIcons: true,
  })
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    appIcon: s.appIcon?.toDataURL() || undefined,
    display_id: s.display_id || undefined,
  }))
})

// IPC handlers for settings
ipcMain.handle('get-settings', () => {
  return settings
})

ipcMain.handle('save-settings', (_event, incoming: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(incoming)) {
    settings[key] = value
  }
  saveSettings(settings)
  return settings
})

ipcMain.handle('clear-settings', () => {
  settings = {}
  saveSettings(settings)
  return {}
})

app.whenReady().then(() => {
  settings = loadSettings()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
