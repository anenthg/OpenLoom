import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'
import fs from 'fs'

let app: ElectronApplication
let page: Page

const MAIN_JS = path.join(__dirname, '../../out/main/index.js')

function getSettingsDir(): string {
  const possibleDirs = [
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'thari-video', 'config'),
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'Electron', 'config'),
  ]
  // Return whichever exists, or fallback to the Electron default
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

// --- Setup Wizard Tests ---

test.describe('Setup Wizard', () => {
  test.beforeEach(async () => {
    clearSettings()
    app = await electron.launch({ args: [MAIN_JS] })
    page = await app.firstWindow()
    // Clear settings via the app's own IPC to handle encrypted files
    await page.evaluate(() => window.api.clearSettings())
    // Reload to pick up the cleared state
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('appears on fresh launch', async () => {
    await expect(page.getByText('Welcome to Thari.video')).toBeVisible()
    await expect(page.getByTestId('supabase-url')).toBeVisible()
    await expect(page.getByTestId('service-role-key')).toBeVisible()
    await expect(page.getByTestId('database-password')).toBeVisible()
  })

  test('connect button is disabled when fields are empty', async () => {
    await expect(page.getByTestId('connect-button')).toBeDisabled()
  })

  test('invalid URL format shows error', async () => {
    await page.getByTestId('supabase-url').fill('not-a-valid-url')
    await page.getByTestId('service-role-key').fill('somekey')
    await page.getByTestId('database-password').fill('somepassword')
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('error-message')).toContainText(
      'Invalid Supabase URL',
    )
  })

  test('valid credentials with successful validation shows provisioning', async () => {
    // Intercept the Supabase REST call to simulate a successful connection
    await page.route('**/rest/v1/videos**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([]) }),
    )

    // Mock the DB connection validation in the main process
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('execute-sql')
      ipcMain.handle('execute-sql', async () => ({ ok: true }))
    })

    await fillCredentials(page)
    await page.getByTestId('connect-button').click()

    // After connecting, provisioning screen should appear (isProvisioned is false)
    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
  })

  test('failed validation shows connection error', async () => {
    // Wait for the wizard to be fully rendered
    await expect(page.getByTestId('supabase-url')).toBeVisible()

    // Intercept to simulate auth failure
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid API key' }),
      }),
    )

    await fillCredentials(page)
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 15000 })
  })
})

// --- Provisioning Tests ---

test.describe('Provisioning', () => {
  test.beforeEach(async () => {
    clearSettings()
    app = await electron.launch({ args: [MAIN_JS] })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    // Seed settings with isProvisioned: false
    await page.evaluate(() =>
      window.api.saveSettings({
        supabaseURL: 'https://testproject.supabase.co',
        supabaseRef: 'testproject',
        serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        databasePassword: 'test_password',
        isProvisioned: false,
      }),
    )
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('provisioning screen appears when isProvisioned is false', async () => {
    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
    await expect(page.getByTestId('step-tables')).toBeVisible()
    await expect(page.getByTestId('step-storage')).toBeVisible()
  })
})

// --- Sidebar & Settings Tests (pre-seeded settings, bypass wizard) ---

test.describe('Sidebar & Settings', () => {
  test.beforeEach(async () => {
    clearSettings()
    app = await electron.launch({ args: [MAIN_JS] })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    // Seed settings via the app's own IPC (handles encryption properly)
    // isProvisioned: true to skip provisioning and go straight to Layout
    await page.evaluate(() =>
      window.api.saveSettings({
        supabaseURL: 'https://testproject.supabase.co',
        supabaseRef: 'testproject',
        serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        databasePassword: 'test_password',
        isProvisioned: true,
      }),
    )
    // Reload so the app picks up the seeded settings
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('sidebar appears when settings exist', async () => {
    await expect(page.getByTestId('sidebar')).toBeVisible()
    await expect(page.getByTestId('tab-library')).toBeVisible()
    await expect(page.getByTestId('tab-record')).toBeVisible()
    await expect(page.getByTestId('tab-settings')).toBeVisible()
  })

  test('navigation switches views', async () => {
    await expect(page.getByTestId('library-view')).toBeVisible()

    await page.getByTestId('tab-record').click()
    await expect(page.getByTestId('recording-view')).toBeVisible()

    await page.getByTestId('tab-settings').click()
    await expect(page.getByTestId('settings-view')).toBeVisible()

    await page.getByTestId('tab-library').click()
    await expect(page.getByTestId('library-view')).toBeVisible()
  })

  test('settings shows connection info', async () => {
    await page.getByTestId('tab-settings').click()

    await expect(page.getByTestId('settings-url')).toContainText(
      'https://testproject.supabase.co',
    )
    await expect(page.getByTestId('settings-ref')).toContainText('testproject')
  })

  test('settings shows re-provision button', async () => {
    await page.getByTestId('tab-settings').click()
    await expect(page.getByTestId('reprovision-button')).toBeVisible()
  })

  test('disconnect returns to setup wizard', async () => {
    await page.getByTestId('tab-settings').click()
    await page.getByTestId('disconnect-button').click()

    await expect(page.getByText('Welcome to Thari.video')).toBeVisible()
  })
})

async function fillCredentials(page: Page) {
  await page.getByTestId('supabase-url').fill('https://testproject.supabase.co')
  await page.getByTestId('service-role-key').fill('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test')
  await page.getByTestId('database-password').fill('test_password')
}
