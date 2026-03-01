import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'
import fs from 'fs'

const MAIN_JS = path.join(__dirname, '../../out/main/index.js')

const MOCK_SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'test-project-123',
  private_key_id: 'key123',
  private_key:
    '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA2a2rwplBQLZ8LMzz\n-----END RSA PRIVATE KEY-----\n',
  client_email: 'test@test-project-123.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
})

// 1×1 red pixel PNG — enough for source thumbnails
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=='

function getSettingsDir(): string {
  const possibleDirs = [
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'thari-video', 'config'),
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'Electron', 'config'),
  ]
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) return dir
  }
  return possibleDirs[1]
}

function clearSettings() {
  const dir = getSettingsDir()
  const file = path.join(dir, 'settings.json')
  if (fs.existsSync(file)) fs.unlinkSync(file)
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Replace IPC handlers in the main process with test doubles. */
async function mockIPC(app: ElectronApplication) {
  await app.evaluate(({ ipcMain }, thumbnail) => {
    // Permissions — all granted
    ipcMain.removeHandler('get-permission-status')
    ipcMain.handle('get-permission-status', () => ({
      screen: 'granted',
      microphone: 'granted',
      camera: 'granted',
    }))

    ipcMain.removeHandler('request-mic-access')
    ipcMain.handle('request-mic-access', () => true)

    ipcMain.removeHandler('request-camera-access')
    ipcMain.handle('request-camera-access', () => true)

    // Desktop sources — one screen, one window
    ipcMain.removeHandler('get-desktop-sources')
    ipcMain.handle('get-desktop-sources', () => [
      { id: 'screen:1:0', name: 'Main Display', thumbnail, display_id: '1' },
      { id: 'window:42:0', name: 'Test Window', thumbnail, appIcon: thumbnail },
    ])

    // Firestore — always succeed (short-code uniqueness + video insert)
    ipcMain.removeHandler('firestore-query-by-field')
    ipcMain.handle('firestore-query-by-field', () => ({ ok: true, data: [] }))

    ipcMain.removeHandler('firestore-insert')
    ipcMain.handle('firestore-insert', () => ({ ok: true }))

    // Storage — succeed with a mock URL
    ipcMain.removeHandler('storage-upload')
    ipcMain.handle(
      'storage-upload',
      (_e: unknown, remotePath: string) => ({
        ok: true,
        url: `https://storage.googleapis.com/test-bucket/${remotePath}`,
      }),
    )
  }, PIXEL)
}

/**
 * Override navigator.mediaDevices.getUserMedia in the renderer so the full
 * compositor → mixer → recorder pipeline runs with synthetic streams.
 */
async function mockMedia(page: Page) {
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async (
      constraints: MediaStreamConstraints,
    ): Promise<MediaStream> => {
      const v = constraints.video
      // Desktop / screen capture (Electron-specific mandatory constraint)
      if (v && typeof v === 'object' && 'mandatory' in v) {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#1A1A2E'
        ctx.fillRect(0, 0, 640, 480)
        ctx.fillStyle = '#F5F5E8'
        ctx.font = '32px sans-serif'
        ctx.fillText('Mock Screen', 180, 250)
        const stream = canvas.captureStream(30)

        // Add a silent audio track if the caller requested audio
        if (constraints.audio !== false) {
          try {
            const audioCtx = new AudioContext()
            const osc = audioCtx.createOscillator()
            osc.frequency.value = 0
            const dest = audioCtx.createMediaStreamDestination()
            osc.connect(dest)
            osc.start()
            for (const t of dest.stream.getAudioTracks()) stream.addTrack(t)
          } catch {
            /* audio may not be available */
          }
        }
        return stream
      }

      // Camera
      if (v) {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 320
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#0E9A57'
        ctx.beginPath()
        ctx.arc(160, 160, 140, 0, Math.PI * 2)
        ctx.fill()
        return canvas.captureStream(30)
      }

      // Microphone
      if (constraints.audio) {
        const audioCtx = new AudioContext()
        const osc = audioCtx.createOscillator()
        osc.frequency.value = 0
        const dest = audioCtx.createMediaStreamDestination()
        osc.connect(dest)
        osc.start()
        return dest.stream
      }

      throw new Error('Unsupported constraints in mock')
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let app: ElectronApplication
let page: Page

test.describe('Record Flow', () => {
  test.beforeEach(async () => {
    clearSettings()
    app = await electron.launch({ args: [MAIN_JS] })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Seed settings — provisioned so we skip the setup wizard
    await page.evaluate(
      (sa) =>
        window.api.saveSettings({
          firebaseProjectId: 'test-project-123',
          serviceAccountJson: sa,
          isProvisioned: true,
        }),
      MOCK_SERVICE_ACCOUNT,
    )

    // Replace IPC handlers before reload
    await mockIPC(app)

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Inject browser-level media mocks (lost on reload, so must be after)
    await mockMedia(page)
  })

  test.afterEach(async () => {
    await app.close()
  })

  // ---- Idle state ----

  test('idle state shows Start Recording button', async () => {
    await page.getByTestId('tab-record').click()
    await expect(page.getByTestId('recording-view')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible()
  })

  // ---- Source picker ----

  test('source picker lists screens and windows', async () => {
    await page.getByTestId('tab-record').click()
    await page.getByRole('button', { name: 'Start Recording' }).click()

    await expect(page.getByText('Choose a source')).toBeVisible()
    await expect(page.getByText('Main Display')).toBeVisible()

    // Switch to Windows tab
    await page.getByRole('button', { name: 'Windows' }).click()
    await expect(page.getByText('Test Window')).toBeVisible()
  })

  test('camera and mic toggles in source picker', async () => {
    await page.getByTestId('tab-record').click()
    await page.getByRole('button', { name: 'Start Recording' }).click()
    await expect(page.getByText('Choose a source')).toBeVisible()

    // Camera defaults to ON
    const cameraBtn = page.getByRole('button', { name: 'Camera on' })
    await expect(cameraBtn).toBeVisible()

    // Toggle camera OFF
    await cameraBtn.click()
    await expect(page.getByRole('button', { name: 'Camera off' })).toBeVisible()

    // Mic defaults to ON
    const micBtn = page.getByRole('button', { name: 'Mic on' })
    await expect(micBtn).toBeVisible()

    // Toggle mic OFF
    await micBtn.click()
    await expect(page.getByRole('button', { name: 'Mic off' })).toBeVisible()
  })

  // ---- HD toggle ----

  test('HD toggle in source picker defaults on and can be toggled', async () => {
    await page.getByTestId('tab-record').click()
    await page.getByRole('button', { name: 'Start Recording' }).click()
    await expect(page.getByText('Choose a source')).toBeVisible()

    // HD defaults to ON
    const hdBtn = page.getByRole('button', { name: 'HD on' })
    await expect(hdBtn).toBeVisible()

    // Toggle HD OFF
    await hdBtn.click()
    await expect(page.getByRole('button', { name: 'HD off' })).toBeVisible()

    // Toggle HD back ON
    await page.getByRole('button', { name: 'HD off' }).click()
    await expect(page.getByRole('button', { name: 'HD on' })).toBeVisible()
  })

  // ---- Full record → review → upload flow ----

  test('full flow: record, review, upload', async () => {
    test.setTimeout(30_000)

    // Navigate to record tab → idle
    await page.getByTestId('tab-record').click()
    await expect(page.getByTestId('recording-view')).toBeVisible()

    // Click Start Recording → source picker
    await page.getByRole('button', { name: 'Start Recording' }).click()
    await expect(page.getByText('Choose a source')).toBeVisible()

    // Select a source → countdown starts
    await page.getByText('Main Display').click()
    await expect(page.getByText('3')).toBeVisible({ timeout: 5_000 })

    // Wait for countdown to finish → recording controls appear
    const stopBtn = page.getByRole('button', { name: 'Stop recording' })
    await expect(stopBtn).toBeVisible({ timeout: 10_000 })

    // Verify the mic toggle is visible during recording
    await expect(page.getByRole('button', { name: 'Mute mic' })).toBeVisible()

    // Let the recorder capture a couple of chunks
    await page.waitForTimeout(2_000)

    // Stop recording → review screen
    await stopBtn.click()
    await expect(page.getByText('Review Recording')).toBeVisible({ timeout: 5_000 })

    // Verify review controls
    await expect(page.getByPlaceholder('Recording title (optional)')).toBeVisible()
    await expect(page.getByRole('button', { name: /Discard/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Upload/ })).toBeVisible()

    // Enter a title and upload
    await page.getByPlaceholder('Recording title (optional)').fill('Test Recording')
    await page.getByRole('button', { name: /Upload/ }).click()

    // Upload progress → complete with share URL
    await expect(page.getByText('Upload Complete!')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/thari\.video/)).toBeVisible({ timeout: 5_000 })

    // Share URL stays visible with copy and new recording buttons
    await expect(page.getByRole('button', { name: /Copy Link/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /New Recording/ })).toBeVisible()

    // Clicking "New Recording" returns to idle
    await page.getByRole('button', { name: /New Recording/ }).click()
    await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible()
  })

  // ---- Discard ----

  test('discard returns to idle', async () => {
    test.setTimeout(20_000)

    await page.getByTestId('tab-record').click()
    await page.getByRole('button', { name: 'Start Recording' }).click()
    await page.getByText('Main Display').click()

    // Wait for recording to start
    const stopBtn = page.getByRole('button', { name: 'Stop recording' })
    await expect(stopBtn).toBeVisible({ timeout: 10_000 })

    // Stop → review
    await stopBtn.click()
    await expect(page.getByText('Review Recording')).toBeVisible({ timeout: 5_000 })

    // Discard → back to idle
    await page.getByRole('button', { name: /Discard/ }).click()
    await expect(page.getByTestId('recording-view')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible()
  })

  // ---- Mic toggle during recording ----

  test('mic can be muted and unmuted during recording', async () => {
    test.setTimeout(20_000)

    await page.getByTestId('tab-record').click()
    await page.getByRole('button', { name: 'Start Recording' }).click()
    await page.getByText('Main Display').click()

    // Wait for recording phase
    await expect(page.getByRole('button', { name: 'Mute mic' })).toBeVisible({
      timeout: 10_000,
    })

    // Mute
    await page.getByRole('button', { name: 'Mute mic' }).click()
    await expect(page.getByRole('button', { name: 'Unmute mic' })).toBeVisible()

    // Unmute
    await page.getByRole('button', { name: 'Unmute mic' }).click()
    await expect(page.getByRole('button', { name: 'Mute mic' })).toBeVisible()

    // Clean up — stop recording
    await page.getByRole('button', { name: 'Stop recording' }).click()
    await expect(page.getByText('Review Recording')).toBeVisible({ timeout: 5_000 })
  })
})
