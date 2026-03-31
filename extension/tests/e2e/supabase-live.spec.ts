/**
 * Live Supabase provisioning E2E test.
 *
 * Requires real credentials in extension/.env.test:
 *   SUPABASE_PROJECT_URL=https://<ref>.supabase.co
 *   SUPABASE_ACCESS_TOKEN=sbp_...
 *
 * Uses page.exposeFunction to bridge Playwright (Node.js) and the
 * browser mock, making real HTTP calls to the Supabase Management
 * and Storage APIs while the UI renders live progress.
 *
 * Run:  npx playwright test tests/e2e/supabase-live.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { chromeMockScript, type MockConfig } from './chrome-mock'
import fs from 'fs'
import path from 'path'

const SIDEPANEL = '/sidepanel/index.html'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

function loadSupabaseEnv(): { projectUrl: string | null; accessToken: string | null } {
  try {
    const envPath = path.resolve(process.cwd(), '.env.test')
    const content = fs.readFileSync(envPath, 'utf-8')
    const urlMatch = content.match(/^SUPABASE_PROJECT_URL=(.+)$/m)
    const tokenMatch = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)
    return {
      projectUrl: urlMatch?.[1]?.trim() || null,
      accessToken: tokenMatch?.[1]?.trim() || null,
    }
  } catch {
    return { projectUrl: null, accessToken: null }
  }
}

const env = loadSupabaseEnv()
const PROJECT_URL = env.projectUrl
const ACCESS_TOKEN = env.accessToken

function parseProjectRef(url: string): string {
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co\/?$/)
  if (!match) throw new Error(`Invalid Supabase URL: ${url}`)
  return match[1]
}

// ---------------------------------------------------------------------------
// Load SQL & edge function source from provisioning file
// ---------------------------------------------------------------------------

function loadProvisioningSources(): {
  setupSql: string
  rpcSql: string
  edgeFunctionSource: string
} {
  const filePath = path.resolve(
    process.cwd(),
    'src/lib/provisioning/supabase.ts',
  )
  const content = fs.readFileSync(filePath, 'utf-8')

  function extractTemplateLiteral(varName: string): string {
    const regex = new RegExp(
      `const ${varName} = \`([\\s\\S]*?)\`\\.trim\\(\\)`,
    )
    const match = content.match(regex)
    if (!match?.[1]) throw new Error(`Could not extract ${varName} from provisioning source`)
    return match[1].trim()
  }

  return {
    setupSql: extractTemplateLiteral('SETUP_SQL'),
    rpcSql: extractTemplateLiteral('INCREMENT_VIEW_COUNT_SQL'),
    edgeFunctionSource: extractTemplateLiteral('EDGE_FUNCTION_SOURCE'),
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Supabase Live Provisioning', () => {
  test.skip(
    !PROJECT_URL || !ACCESS_TOKEN,
    'Skipping: SUPABASE_PROJECT_URL or SUPABASE_ACCESS_TOKEN not set in .env.test',
  )

  const projectRef = PROJECT_URL ? parseProjectRef(PROJECT_URL) : ''

  /**
   * Expose real Supabase API functions to the browser page.
   */
  async function exposeLiveDeployFunctions(page: Page) {
    if (!PROJECT_URL || !ACCESS_TOKEN) throw new Error('Missing Supabase credentials')

    const projectUrl = PROJECT_URL
    const accessToken = ACCESS_TOKEN
    const ref = projectRef

    // Pre-fetch API keys so deploy functions can use the service role key
    const keysRes = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/api-keys`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!keysRes.ok) throw new Error(`Failed to fetch API keys: ${keysRes.status}`)
    const keys = (await keysRes.json()) as Array<{ name: string; api_key: string }>
    const serviceRoleKey = keys.find((k) => k.name === 'service_role')?.api_key
    const anonKey = keys.find((k) => k.name === 'anon')?.api_key
    if (!serviceRoleKey) throw new Error('service_role key not found')

    // Load SQL & edge function source
    const sources = loadProvisioningSources()

    // --- Real validation ---
    await page.exposeFunction(
      '__liveValidateConnection',
      async (credential: string) => {
        try {
          const { projectUrl: pUrl, accessToken: aToken } = JSON.parse(credential) as {
            projectUrl: string
            accessToken: string
          }
          const url = pUrl.replace(/\/+$/, '')
          const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co$/)
          if (!match) {
            return { ok: false, error: 'Invalid Supabase project URL' }
          }
          const pRef = match[1]

          // Verify project access
          const projectRes = await fetch(
            `https://api.supabase.com/v1/projects/${pRef}`,
            { headers: { Authorization: `Bearer ${aToken}` } },
          )
          if (!projectRes.ok) {
            if (projectRes.status === 401 || projectRes.status === 403) {
              return { ok: false, error: 'Invalid access token — authentication failed' }
            }
            if (projectRes.status === 404) {
              return { ok: false, error: 'Project not found' }
            }
            const text = await projectRes.text()
            return { ok: false, error: `Connection failed: ${projectRes.status} ${text}` }
          }

          // Fetch API keys
          const kRes = await fetch(
            `https://api.supabase.com/v1/projects/${pRef}/api-keys`,
            { headers: { Authorization: `Bearer ${aToken}` } },
          )
          if (!kRes.ok) {
            const text = await kRes.text()
            return { ok: false, error: `Failed to fetch API keys: ${kRes.status} ${text}` }
          }
          const ks = (await kRes.json()) as Array<{ name: string; api_key: string }>
          const srk = ks.find((k) => k.name === 'service_role')?.api_key
          const ak = ks.find((k) => k.name === 'anon')?.api_key

          if (!srk) return { ok: false, error: 'Could not find service_role key' }

          return { ok: true, projectRef: pRef, serviceRoleKey: srk, anonKey: ak }
        } catch (e: unknown) {
          return {
            ok: false,
            error: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
          }
        }
      },
    )

    // --- Step 1: Setup database ---
    await page.exposeFunction('__deploySetupDatabase', async () => {
      // Run main schema SQL
      const schemaRes = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sources.setupSql }),
        },
      )
      if (!schemaRes.ok) {
        const text = await schemaRes.text()
        throw new Error(`Database setup failed: ${schemaRes.status} ${text}`)
      }

      // Run RPC function creation
      const rpcRes = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sources.rpcSql }),
        },
      )
      if (!rpcRes.ok) {
        const text = await rpcRes.text()
        throw new Error(`RPC function setup failed: ${rpcRes.status} ${text}`)
      }

      return true
    })

    // --- Step 2: Setup storage ---
    await page.exposeFunction('__deploySetupStorage', async () => {
      const baseUrl = projectUrl.replace(/\/+$/, '')

      // Create 'videos' bucket with public read
      const createRes = await fetch(`${baseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'videos', name: 'videos', public: true }),
      })

      if (!createRes.ok) {
        const text = await createRes.text()
        if (createRes.status !== 409 && !text.includes('already exists')) {
          throw new Error(`Storage bucket creation failed: ${createRes.status} ${text}`)
        }
        // Bucket already exists — fine
      }

      // Update bucket with public access
      const updateRes = await fetch(`${baseUrl}/storage/v1/bucket/videos`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public: true }),
      })
      if (!updateRes.ok) {
        const text = await updateRes.text()
        console.warn(`Warning: could not update bucket settings: ${updateRes.status} ${text}`)
      }

      return true
    })

    // --- Step 3: Deploy Edge Function ---
    await page.exposeFunction('__deployEdgeFunction', async () => {
      const metadata = JSON.stringify({
        entrypoint_path: 'index.ts',
        name: 'openloom',
        verify_jwt: false,
      })

      const boundary = `----OpenLoomBoundary${Date.now()}`
      const sourceBytes = new TextEncoder().encode(sources.edgeFunctionSource)
      const enc = (s: string) => new TextEncoder().encode(s)

      const parts: Uint8Array[] = []

      // metadata part
      parts.push(enc(`--${boundary}\r\n`))
      parts.push(enc('Content-Disposition: form-data; name="metadata"\r\n'))
      parts.push(enc('Content-Type: application/json\r\n\r\n'))
      parts.push(enc(metadata))
      parts.push(enc('\r\n'))

      // file part
      parts.push(enc(`--${boundary}\r\n`))
      parts.push(enc('Content-Disposition: form-data; name="file"; filename="index.ts"\r\n'))
      parts.push(enc('Content-Type: application/typescript\r\n\r\n'))
      parts.push(sourceBytes)
      parts.push(enc('\r\n'))

      // closing boundary
      parts.push(enc(`--${boundary}--\r\n`))

      // Concatenate
      const totalLength = parts.reduce((sum, p) => sum + p.byteLength, 0)
      const body = new Uint8Array(totalLength)
      let offset = 0
      for (const p of parts) {
        body.set(p, offset)
        offset += p.byteLength
      }

      const res = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=openloom`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: body.buffer,
        },
      )

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Edge Function deployment failed: ${res.status} ${text}`)
      }

      return true
    })
  }

  test('full live flow: select Supabase → enter creds → validate → deploy → done', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    // 1. Expose real Supabase API functions to the browser
    await exposeLiveDeployFunctions(page)

    // 2. Inject chrome mock
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
                id: 'setup-database',
                label: 'Creating tables & RLS policies...',
                status: 'pending',
              },
              {
                id: 'setup-storage',
                label: 'Creating storage bucket...',
                status: 'pending',
              },
              {
                id: 'deploy-function',
                label: 'Deploying Edge Function...',
                status: 'pending',
              },
            ]
            const fire = w.__chromeMock.fireMessage
            const snap = () => steps.map((s: any) => ({ ...s }))

            try {
              // Step 1: Setup database
              steps[0].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              await w.__deploySetupDatabase()
              steps[0].status = 'done'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })

              // Step 2: Setup storage
              steps[1].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              await w.__deploySetupStorage()
              steps[1].status = 'done'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })

              // Step 3: Deploy edge function
              steps[2].status = 'running'
              fire({ type: 'DEPLOY_PROGRESS', steps: snap() })
              await w.__deployEdgeFunction()
              steps[2].status = 'done'
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

    // Select Supabase provider
    await page.getByRole('button', { name: /Supabase/i }).click()
    await expect(page.getByText('Connect your Supabase project')).toBeVisible()

    // Enter project URL and access token
    await page.getByPlaceholder('https://abcdefgh.supabase.co').fill(PROJECT_URL!)
    await page.getByPlaceholder('sbp_...').fill(ACCESS_TOKEN!)
    await page.getByTestId('connect-button').click()

    // Provisioning screen appears
    await expect(page.getByTestId('provisioning-screen')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Setting up Supabase')).toBeVisible()

    // Wait for all 3 steps to complete (real deployment — may take 30-60s)
    await expect(page.getByTestId('provisioning-continue')).toBeVisible({ timeout: 90_000 })

    // Assert every step shows a green checkmark
    for (const stepId of ['setup-database', 'setup-storage', 'deploy-function']) {
      const step = page.getByTestId(`step-${stepId}`)
      await expect(step).toBeVisible()
      await expect(step.locator('text=✓')).toBeVisible()
    }

    // Click Continue → main app
    await page.getByTestId('provisioning-continue').click()
    await expect(page.getByTestId('provisioning-screen')).not.toBeVisible({ timeout: 5_000 })
  })
})
