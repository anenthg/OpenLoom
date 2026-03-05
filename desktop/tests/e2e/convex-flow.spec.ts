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

test.describe('Convex Setup Wizard', () => {
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

  test('Convex form appears after provider selection', async () => {
    await page.getByText('Convex', { exact: true }).click()

    await expect(page.getByText('Connect your Convex project')).toBeVisible()
    await expect(page.getByPlaceholder('prod:happy-animal-123|...')).toBeVisible()
  })

  test('connect button disabled when deploy key empty', async () => {
    await page.getByText('Convex', { exact: true }).click()

    // Empty → disabled
    await expect(page.getByTestId('connect-button')).toBeDisabled()

    // Fill deploy key → enabled
    await page.getByPlaceholder('prod:happy-animal-123|...').fill('prod:test-key|secret')
    await expect(page.getByTestId('connect-button')).toBeEnabled()
  })

  test('successful validation shows provisioning screen', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('validate-connection')
      ipcMain.handle('validate-connection', async () => ({
        ok: true,
        deploymentUrl: 'https://test-deployment.convex.cloud',
        deploymentName: 'test-deployment',
        httpActionsUrl: 'https://test-deployment.convex.site',
      }))
    })

    await page.getByText('Convex', { exact: true }).click()
    await page.getByPlaceholder('prod:happy-animal-123|...').fill('prod:test-key|secret')
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
  })

  test('failed validation shows error', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('validate-connection')
      ipcMain.handle('validate-connection', async () => ({
        ok: false,
        error: 'Invalid deploy key',
      }))
    })

    await page.getByText('Convex', { exact: true }).click()
    await page.getByPlaceholder('prod:happy-animal-123|...').fill('prod:bad-key')
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 15000 })
  })
})

// --- Provisioning Tests ---

test.describe('Convex Provisioning', () => {
  test.beforeEach(async () => {
    clearSettings()
    app = await electron.launch({ args: [MAIN_JS] })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Seed Convex settings with isProvisioned: false
    await page.evaluate(() =>
      window.api.saveSettings({
        provider: 'convex',
        convexDeployKey: 'prod:test-key|secret',
        convexDeploymentUrl: 'https://test-deployment.convex.cloud',
        convexDeploymentName: 'test-deployment',
        convexHttpActionsUrl: 'https://test-deployment.convex.site',
        isProvisioned: false,
      }),
    )
    // Individual tests mock IPC handlers before reload
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('provisioning screen shows Convex steps', async () => {
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
    await expect(page.getByText('Setting up Convex')).toBeVisible()
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
        error: 'npx convex deploy failed',
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
})
