import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'
import fs from 'fs'

let app: ElectronApplication
let page: Page

const MAIN_JS = path.join(__dirname, '../../out/main/index.js')

function getSettingsDir(): string {
  const possibleDirs = [
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'openloom', 'config'),
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

// --- Setup Wizard Tests ---

test.describe('Supabase Setup Wizard', () => {
  test.beforeEach(async () => {
    clearSettings()
    app = await electron.launch({ args: [MAIN_JS] })
    page = await app.firstWindow()
    await page.evaluate(() => window.api.clearSettings())
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('provider selection shows Supabase option', async () => {
    await expect(page.getByText('Choose your backend provider')).toBeVisible()
    await expect(page.getByText('Supabase', { exact: true })).toBeVisible()
    await expect(page.getByText('1 GB storage, 2 GB egress free')).toBeVisible()
  })

  test('Supabase form appears after selection', async () => {
    await page.getByText('Supabase', { exact: true }).click()

    await expect(page.getByText('Connect your Supabase project')).toBeVisible()
    await expect(page.getByPlaceholder('https://abcdefgh.supabase.co')).toBeVisible()
    await expect(page.getByPlaceholder('sbp_...')).toBeVisible()
  })

  test('connect button disabled when fields empty', async () => {
    await page.getByText('Supabase', { exact: true }).click()

    // Both fields empty → disabled
    await expect(page.getByTestId('connect-button')).toBeDisabled()

    // Fill only URL → still disabled
    await page.getByPlaceholder('https://abcdefgh.supabase.co').fill('https://test.supabase.co')
    await expect(page.getByTestId('connect-button')).toBeDisabled()

    // Clear URL, fill only token → still disabled
    await page.getByPlaceholder('https://abcdefgh.supabase.co').fill('')
    await page.getByPlaceholder('sbp_...').fill('sbp_test_token')
    await expect(page.getByTestId('connect-button')).toBeDisabled()

    // Fill both → enabled
    await page.getByPlaceholder('https://abcdefgh.supabase.co').fill('https://test.supabase.co')
    await expect(page.getByTestId('connect-button')).toBeEnabled()
  })

  test('invalid URL format shows error', async () => {
    await page.getByText('Supabase', { exact: true }).click()

    await page.getByPlaceholder('https://abcdefgh.supabase.co').fill('not-a-url')
    await page.getByPlaceholder('sbp_...').fill('sbp_test_token')
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('error-message')).toContainText('Invalid Project URL')
  })

  test('successful validation shows provisioning screen', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('validate-connection')
      ipcMain.handle('validate-connection', async () => ({
        ok: true,
        projectRef: 'test-ref',
        serviceRoleKey: 'test-key',
        anonKey: 'test-anon',
      }))
    })

    await page.getByText('Supabase', { exact: true }).click()
    await page.getByPlaceholder('https://abcdefgh.supabase.co').fill('https://test-ref.supabase.co')
    await page.getByPlaceholder('sbp_...').fill('sbp_test_token')
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
  })

  test('failed validation shows error', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('validate-connection')
      ipcMain.handle('validate-connection', async () => ({
        ok: false,
        error: 'Invalid credentials',
      }))
    })

    await page.getByText('Supabase', { exact: true }).click()
    await page.getByPlaceholder('https://abcdefgh.supabase.co').fill('https://test-ref.supabase.co')
    await page.getByPlaceholder('sbp_...').fill('sbp_test_token')
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 15000 })
  })

  test('change provider returns to provider selection', async () => {
    await page.getByText('Supabase', { exact: true }).click()
    await expect(page.getByText('Connect your Supabase project')).toBeVisible()

    await page.getByText('← Change provider').click()
    await expect(page.getByText('Choose your backend provider')).toBeVisible()
  })
})

// --- Provisioning Tests ---

test.describe('Supabase Provisioning', () => {
  test.beforeEach(async () => {
    clearSettings()
    app = await electron.launch({ args: [MAIN_JS] })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Seed Supabase settings with isProvisioned: false
    await page.evaluate(() =>
      window.api.saveSettings({
        provider: 'supabase',
        supabaseProjectUrl: 'https://test-ref.supabase.co',
        supabaseProjectRef: 'test-ref',
        supabaseAccessToken: 'sbp_test_token',
        supabaseServiceRoleKey: 'test-service-role-key',
        supabaseAnonKey: 'test-anon-key',
        isProvisioned: false,
      }),
    )
    // Individual tests mock IPC handlers before reload
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('provisioning screen shows Supabase steps', async () => {
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
    await expect(page.getByText('Setting up Supabase')).toBeVisible()
    await expect(page.getByTestId('step-verify-access')).toBeVisible()
    await expect(page.getByTestId('step-verify-storage')).toBeVisible()
    await expect(page.getByTestId('step-deploy-functions')).toBeVisible()
  })

  test('successful provisioning flow', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('db-query')
      ipcMain.handle('db-query', async () => ({ ok: true, data: [] }))

      ipcMain.removeHandler('deploy-backend-functions')
      ipcMain.handle('deploy-backend-functions', async () => ({ ok: true }))
    })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 15000 })
  })

  test('deploy failure shows error with retry', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('db-query')
      ipcMain.handle('db-query', async () => ({ ok: true, data: [] }))

      ipcMain.removeHandler('deploy-backend-functions')
      ipcMain.handle('deploy-backend-functions', async () => ({
        ok: false,
        error: 'Database setup failed: column does not exist',
      }))
    })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
    await expect(page.getByTestId('provisioning-retry')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('provisioning-disconnect')).toBeVisible()

    // Click retry → provisioning restarts
    await page.getByTestId('provisioning-retry').click()
    await expect(page.getByTestId('step-verify-access')).toBeVisible()
  })

  test('access verification failure', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('db-query')
      ipcMain.handle('db-query', async () => ({
        ok: false,
        error: '401 authentication failed',
      }))
    })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
    await expect(page.getByTestId('provisioning-retry')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('provisioning-disconnect')).toBeVisible()
  })

  test('provisioning continue navigates to main app', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('db-query')
      ipcMain.handle('db-query', async () => ({ ok: true, data: [] }))

      ipcMain.removeHandler('deploy-backend-functions')
      ipcMain.handle('deploy-backend-functions', async () => ({ ok: true }))
    })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('provisioning-continue').click()

    await expect(page.getByTestId('sidebar')).toBeVisible()
  })
})
