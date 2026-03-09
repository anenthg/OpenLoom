import { test, expect } from '@playwright/test'
import { chromeMockScript, type MockConfig } from './chrome-mock'

const SIDEPANEL = '/sidepanel/index.html'

/**
 * Helper: inject Chrome API mocks with the given config and navigate to the sidepanel.
 */
async function openSidepanel(
  page: import('@playwright/test').Page,
  config: MockConfig = {},
) {
  await page.addInitScript(chromeMockScript, config)
  await page.goto(SIDEPANEL)
  await page.waitForLoadState('domcontentloaded')
}

// ---------------------------------------------------------------------------
// Setup Wizard — Provider Selection
// ---------------------------------------------------------------------------

test.describe('Convex Setup Wizard', () => {
  test('Convex option is visible and clickable', async ({ page }) => {
    await openSidepanel(page)

    const convexBtn = page.getByRole('button', { name: /Convex/i })
    await expect(convexBtn).toBeVisible()
    // Should NOT be disabled / "coming soon"
    await expect(convexBtn).toBeEnabled()
  })

  test('Convex form appears after provider selection', async ({ page }) => {
    await openSidepanel(page)

    await page.getByRole('button', { name: /Convex/i }).click()

    await expect(page.getByText('Connect your Convex project')).toBeVisible()
    await expect(page.getByPlaceholder('prod:happy-animal-123|...')).toBeVisible()
  })

  test('connect button disabled when deploy key empty', async ({ page }) => {
    await openSidepanel(page)
    await page.getByRole('button', { name: /Convex/i }).click()

    await expect(page.getByTestId('connect-button')).toBeDisabled()

    // Fill a key → should become enabled
    await page.getByPlaceholder('prod:happy-animal-123|...').fill('prod:test-key|secret')
    await expect(page.getByTestId('connect-button')).toBeEnabled()
  })

  test('back button returns to provider selection', async ({ page }) => {
    await openSidepanel(page)
    await page.getByRole('button', { name: /Convex/i }).click()

    await page.getByText('← Change provider').click()

    // Provider list visible again
    await expect(page.getByRole('button', { name: /Supabase/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Convex/i })).toBeVisible()
  })

  test('successful validation transitions to provisioning', async ({ page }) => {
    await openSidepanel(page, {
      validateResult: {
        ok: true,
        deploymentUrl: 'https://test-deployment.convex.cloud',
        deploymentName: 'test-deployment',
        httpActionsUrl: 'https://test-deployment.convex.site',
      },
    })

    await page.getByRole('button', { name: /Convex/i }).click()
    await page.getByPlaceholder('prod:happy-animal-123|...').fill('prod:test-key|secret')
    await page.getByTestId('connect-button').click()

    // Should transition to provisioning screen
    await expect(page.getByTestId('provisioning-screen')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Setting up Convex')).toBeVisible()
  })

  test('failed validation shows error message', async ({ page }) => {
    await openSidepanel(page, {
      validateResult: {
        ok: false,
        error: 'Invalid deploy key -- authentication failed',
      },
    })

    await page.getByRole('button', { name: /Convex/i }).click()
    await page.getByPlaceholder('prod:happy-animal-123|...').fill('prod:bad-key|wrong')
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('error-message')).toContainText('Invalid deploy key')
  })
})

// ---------------------------------------------------------------------------
// Provisioning — Convex Deploy Steps
// ---------------------------------------------------------------------------

test.describe('Convex Provisioning', () => {
  const convexSettings: MockConfig['initialSettings'] = {
    provider: 'convex',
    convexDeployKey: 'prod:test-deployment|secret-key-value',
    convexDeploymentUrl: 'https://test-deployment.convex.cloud',
    convexDeploymentName: 'test-deployment',
    convexHttpActionsUrl: 'https://test-deployment.convex.site',
    isProvisioned: false,
  }

  test('provisioning screen shows all 4 Convex steps', async ({ page }) => {
    await openSidepanel(page, { initialSettings: convexSettings })

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()
    await expect(page.getByText('Setting up Convex')).toBeVisible()
    await expect(page.getByTestId('step-verify-access')).toBeVisible()
    await expect(page.getByTestId('step-push-functions')).toBeVisible()
    await expect(page.getByTestId('step-wait-schema')).toBeVisible()
    await expect(page.getByTestId('step-finalize')).toBeVisible()
  })

  test('successful provisioning completes all steps', async ({ page }) => {
    await openSidepanel(page, {
      initialSettings: convexSettings,
      deployBehavior: 'success',
    })

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()

    // Wait for the Continue button (all steps done)
    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 10000 })

    // All 4 steps should show green checkmarks
    for (const stepId of ['verify-access', 'push-functions', 'wait-schema', 'finalize']) {
      const step = page.getByTestId(`step-${stepId}`)
      await expect(step).toBeVisible()
      await expect(step.locator('text=✓')).toBeVisible()
    }
  })

  test('clicking Continue after success marks provisioned', async ({ page }) => {
    await openSidepanel(page, {
      initialSettings: convexSettings,
      deployBehavior: 'success',
    })

    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('provisioning-continue').click()

    // Should transition to the main Layout (provisioned state)
    // The provisioning screen should be gone
    await expect(page.getByTestId('provisioning-screen')).not.toBeVisible({ timeout: 5000 })
  })

  test('deploy failure shows error and retry button', async ({ page }) => {
    await openSidepanel(page, {
      initialSettings: convexSettings,
      deployBehavior: 'failure',
      deployErrorMessage: 'start_push failed: 500 {"code":"InternalServerError"}',
    })

    await expect(page.getByTestId('provisioning-screen')).toBeVisible()

    // Retry and Disconnect buttons should appear
    await expect(page.getByTestId('provisioning-retry')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('provisioning-disconnect')).toBeVisible()

    // Error details expandable
    await page.getByText('Show details').click()
    await expect(page.getByText('start_push failed')).toBeVisible()
  })

  test('retry restarts provisioning after failure', async ({ page }) => {
    await openSidepanel(page, {
      initialSettings: convexSettings,
      deployBehavior: 'failure',
    })

    await expect(page.getByTestId('provisioning-retry')).toBeVisible({ timeout: 10000 })

    // Switch to success behavior, then retry
    await page.evaluate(() => {
      (window as any).__chromeMock.deployBehavior = 'success'
    })
    await page.getByTestId('provisioning-retry').click()

    // Should complete successfully this time
    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 10000 })
  })

  test('disconnect returns to setup wizard', async ({ page }) => {
    await openSidepanel(page, {
      initialSettings: convexSettings,
      deployBehavior: 'failure',
    })

    await expect(page.getByTestId('provisioning-disconnect')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('provisioning-disconnect').click()

    // Should return to the setup wizard provider selection
    await expect(page.getByRole('button', { name: /Supabase/i })).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// End-to-end: Provider Selection → Provisioning → Done
// ---------------------------------------------------------------------------

test.describe('Convex E2E flow', () => {
  test('full flow: select Convex → enter key → validate → provision → done', async ({ page }) => {
    await openSidepanel(page, {
      validateResult: {
        ok: true,
        deploymentUrl: 'https://test-deployment.convex.cloud',
        deploymentName: 'test-deployment',
        httpActionsUrl: 'https://test-deployment.convex.site',
      },
      deployBehavior: 'success',
    })

    // Step 1: Select Convex provider
    await page.getByRole('button', { name: /Convex/i }).click()
    await expect(page.getByText('Connect your Convex project')).toBeVisible()

    // Step 2: Enter deploy key and connect
    await page.getByPlaceholder('prod:happy-animal-123|...').fill('prod:test-deployment|secret-key')
    await page.getByTestId('connect-button').click()

    // Step 3: Provisioning starts
    await expect(page.getByTestId('provisioning-screen')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Setting up Convex')).toBeVisible()

    // Step 4: All steps complete
    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 10000 })

    // Step 5: Click Continue → transitions to main app
    await page.getByTestId('provisioning-continue').click()
    await expect(page.getByTestId('provisioning-screen')).not.toBeVisible({ timeout: 5000 })
  })
})
