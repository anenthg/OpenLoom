/**
 * Live Convex provisioning E2E test.
 *
 * Requires a real deploy key in extension/.env.test:
 *   CONVEX_DEPLOY_KEY=prod:<deployment>|<secret>
 *
 * Uses page.exposeFunction to bridge Playwright (Node.js) and the
 * browser mock, making real HTTP calls to the Convex deployment API
 * while the UI renders live progress.
 *
 * Run:  npx playwright test tests/e2e/convex-live.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { chromeMockScript, type MockConfig } from './chrome-mock'
import fs from 'fs'
import path from 'path'

const SIDEPANEL = '/sidepanel/index.html'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

function loadDeployKey(): string | null {
  try {
    const envPath = path.resolve(process.cwd(), '.env.test')
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/^CONVEX_DEPLOY_KEY=(.+)$/m)
    return match?.[1]?.trim() || null
  } catch {
    return null
  }
}

const DEPLOY_KEY = loadDeployKey()

function parseDeployKey(key: string) {
  const parts = key.split('|')
  const prefix = parts[0]
  const name = prefix.slice(prefix.indexOf(':') + 1)
  return {
    deploymentName: name,
    deploymentUrl: `https://${name}.convex.cloud`,
    httpActionsUrl: `https://${name}.convex.site`,
  }
}

// ---------------------------------------------------------------------------
// Load Convex bundles (for the push step)
// ---------------------------------------------------------------------------

function loadBundles(): {
  SCHEMA_BUNDLE: string
  VIDEOS_BUNDLE: string
  REACTIONS_BUNDLE: string
  HTTP_BUNDLE: string
} {
  const bundlesPath = path.resolve(
    process.cwd(),
    'src/lib/provisioning/convex-bundles.generated.ts',
  )
  const content = fs.readFileSync(bundlesPath, 'utf-8')
  const jsContent = content.replace(/export const /g, 'var ')
  const fn = new Function(
    jsContent +
      '\nreturn { SCHEMA_BUNDLE, VIDEOS_BUNDLE, REACTIONS_BUNDLE, HTTP_BUNDLE };',
  )
  return fn()
}

// ---------------------------------------------------------------------------
// Convex API helpers (Node.js side)
// ---------------------------------------------------------------------------

function convexHeaders(adminKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Convex ${adminKey}`,
    'Convex-Client': 'npm-cli-1.32.0',
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Convex Live Provisioning', () => {
  // Skip entire suite if no deploy key
  test.skip(!DEPLOY_KEY, 'Skipping: CONVEX_DEPLOY_KEY not set in .env.test')

  const info = DEPLOY_KEY ? parseDeployKey(DEPLOY_KEY) : null

  /**
   * Expose real Convex API functions to the browser page.
   * Called from the overridden chrome mock via window.__deploy*.
   */
  async function exposeLiveDeployFunctions(page: Page) {
    if (!info || !DEPLOY_KEY) throw new Error('Missing deploy key')

    const deployKey = DEPLOY_KEY
    const deploymentUrl = info.deploymentUrl
    const headers = convexHeaders(deployKey)

    // Real validation
    await page.exposeFunction(
      '__liveValidateConnection',
      async (credential: string) => {
        try {
          const parts = credential.split('|')
          const prefix = parts[0]
          const colonIdx = prefix.indexOf(':')
          if (colonIdx < 0 || parts.length < 2) {
            return { ok: false, error: 'Invalid deploy key format' }
          }
          const name = prefix.slice(colonIdx + 1)
          const url = `https://${name}.convex.cloud`
          const siteUrl = `https://${name}.convex.site`

          const res = await fetch(`${url}/api/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Convex ${credential}`,
            },
            body: JSON.stringify({ path: 'videos:list', args: {} }),
          })

          if (res.ok || res.status === 400) {
            return {
              ok: true,
              deploymentUrl: url,
              deploymentName: name,
              httpActionsUrl: siteUrl,
            }
          }
          if (res.status === 401 || res.status === 403) {
            return { ok: false, error: 'Invalid deploy key — authentication failed' }
          }
          const text = await res.text()
          return { ok: false, error: `Connection failed: ${res.status} ${text}` }
        } catch (e: unknown) {
          return {
            ok: false,
            error: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
          }
        }
      },
    )

    // Step 1: Verify access
    await page.exposeFunction('__deployVerifyAccess', async () => {
      const res = await fetch(`${deploymentUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Convex ${deployKey}`,
        },
        body: JSON.stringify({ path: 'videos:list', args: {} }),
      })
      if (!res.ok && res.status !== 400) {
        throw new Error(`Verify access failed: ${res.status}`)
      }
      return true
    })

    // Step 2: Push schema & functions
    const bundles = loadBundles()
    await page.exposeFunction('__deployStartPush', async () => {
      const schemaModule = {
        path: 'schema.js',
        source: bundles.SCHEMA_BUNDLE,
        environment: 'isolate',
      }
      const functionModules = [
        { path: 'videos.js', source: bundles.VIDEOS_BUNDLE, environment: 'isolate' },
        { path: 'reactions.js', source: bundles.REACTIONS_BUNDLE, environment: 'isolate' },
        { path: 'http.js', source: bundles.HTTP_BUNDLE, environment: 'isolate' },
      ]

      const res = await fetch(`${deploymentUrl}/api/deploy2/start_push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          adminKey: deployKey,
          dryRun: false,
          functions: 'convex',
          appDefinition: {
            definition: null,
            dependencies: [],
            schema: {
              path: schemaModule.path,
              source: schemaModule.source,
              environment: schemaModule.environment,
            },
            changedModules: functionModules.map((m) => ({
              path: m.path,
              source: m.source,
              environment: m.environment,
            })),
            unchangedModuleHashes: [],
            udfServerVersion: '1.32.0',
          },
          componentDefinitions: [],
          nodeDependencies: [],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`start_push failed: ${res.status} ${text}`)
      }
      return await res.json()
    })

    // Step 3: Wait for schema
    await page.exposeFunction(
      '__deployWaitSchema',
      async (schemaChange: Record<string, unknown>) => {
        const start = Date.now()
        while (Date.now() - start < 60_000) {
          const res = await fetch(`${deploymentUrl}/api/deploy2/wait_for_schema`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              adminKey: deployKey,
              schemaChange,
              timeoutMs: 10_000,
              dryRun: false,
            }),
          })
          if (!res.ok) {
            const text = await res.text()
            throw new Error(`wait_for_schema failed: ${res.status} ${text}`)
          }
          const body = (await res.json()) as { type: string }
          if (body.type === 'complete') return true
          if (body.type === 'failed') throw new Error('Schema validation failed')
          // inProgress — keep polling
        }
        throw new Error('Timed out waiting for schema validation')
      },
    )

    // Step 4: Finish push (needs full start_push response)
    await page.exposeFunction(
      '__deployFinishPush',
      async (startPushResponse: Record<string, unknown>) => {
        const res = await fetch(`${deploymentUrl}/api/deploy2/finish_push`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            adminKey: deployKey,
            startPush: startPushResponse,
            dryRun: false,
          }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`finish_push failed: ${res.status} ${text}`)
        }
        return true
      },
    )

    // Step 5: Validate deployed functions
    await page.exposeFunction('__deployValidate', async () => {
      const res = await fetch(`${deploymentUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Convex ${deployKey}`,
        },
        body: JSON.stringify({ path: 'videos:list', args: {} }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Post-deploy validation failed: ${res.status} ${text}`)
      }
      return true
    })
  }

  test('full live flow: select Convex → enter key → validate → deploy → done', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    // 1. Expose real Convex API functions to the browser
    await exposeLiveDeployFunctions(page)

    // 2. Inject chrome mock (handles GET_SETTINGS, SAVE_SETTINGS, etc.)
    await page.addInitScript(chromeMockScript, {} as MockConfig)

    // 3. Override VALIDATE_CONNECTION and DEPLOY_BACKEND with live implementations
    await page.addInitScript(() => {
      const w = window as any
      const origSendMessage = w.chrome.runtime.sendMessage

      w.chrome.runtime.sendMessage = async (msg: any) => {
        // --- Live validation ---
        if (msg.type === 'VALIDATE_CONNECTION') {
          return await w.__liveValidateConnection(msg.credential)
        }

        // --- Live deployment ---
        if (msg.type === 'DEPLOY_BACKEND') {
          ;(async () => {
            const steps = [
              {
                id: 'verify-access',
                label: 'Verifying Convex deployment access...',
                status: 'pending',
              },
              {
                id: 'push-functions',
                label: 'Pushing schema & functions...',
                status: 'pending',
              },
              { id: 'wait-schema', label: 'Validating schema...', status: 'pending' },
              { id: 'finalize', label: 'Finalizing deployment...', status: 'pending' },
              {
                id: 'validate',
                label: 'Validating deployed functions...',
                status: 'pending',
              },
            ]
            const fire = w.__chromeMock.fireMessage
            const snap = () => steps.map((s: any) => ({ ...s }))

            try {
              // Step 1
              steps[0].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              await w.__deployVerifyAccess()
              steps[0].status = 'done'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })

              // Step 2
              steps[1].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              const pushResult = await w.__deployStartPush()
              steps[1].status = 'done'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })

              // Step 3
              steps[2].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              if (pushResult?.schemaChange)
                await w.__deployWaitSchema(pushResult.schemaChange)
              steps[2].status = 'done'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })

              // Step 4
              steps[3].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              await w.__deployFinishPush(pushResult)
              steps[3].status = 'done'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })

              // Step 5
              steps[4].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              await w.__deployValidate()
              steps[4].status = 'done'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
            } catch (e: any) {
              const active = steps.find((s: any) => s.status === 'running')
              if (active) {
                active.status = 'error'
                ;(active as any).error = e?.message || String(e)
              }
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
            }
          })()
          return { ok: true }
        }

        return origSendMessage(msg)
      }
    })

    // --- UI flow ---

    await page.goto(SIDEPANEL)
    await page.waitForLoadState('domcontentloaded')

    // Select Convex provider
    await page.getByRole('button', { name: /Convex/i }).click()
    await expect(page.getByText('Connect your Convex project')).toBeVisible()

    // Enter deploy key and connect (live validation)
    await page.getByPlaceholder('prod:happy-animal-123|...').fill(DEPLOY_KEY!)
    await page.getByTestId('connect-button').click()

    // Provisioning screen appears
    await expect(page.getByTestId('provisioning-screen')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Setting up Convex')).toBeVisible()

    // Wait for all 5 steps to complete (real deployment — may take 30-60s)
    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 90_000 })

    // Assert every step shows a green checkmark
    for (const stepId of [
      'verify-access',
      'push-functions',
      'wait-schema',
      'finalize',
      'validate',
    ]) {
      const step = page.getByTestId(`step-${stepId}`)
      await expect(step).toBeVisible()
      await expect(step.locator('text=✓')).toBeVisible()
    }

    // Click Continue → main app
    await page.getByTestId('provisioning-continue').click()
    await expect(page.getByTestId('provisioning-screen')).not.toBeVisible({ timeout: 5_000 })
  })
})
