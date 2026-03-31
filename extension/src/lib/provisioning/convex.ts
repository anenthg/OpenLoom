import type { AppSettings } from '../types'
import type { ProvisioningStep, StepUpdateCallback } from './types'
import {
  SCHEMA_BUNDLE,
  VIDEOS_BUNDLE,
  REACTIONS_BUNDLE,
  HTTP_BUNDLE,
} from './convex-bundles.generated'

export const CONVEX_FUNCTIONS_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg: string, data?: unknown): void {
  const ts = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[deploy-convex ${ts}] ${msg}`, data)
  } else {
    console.log(`[deploy-convex ${ts}] ${msg}`)
  }
}

// ---------------------------------------------------------------------------
// Convex deployment API helpers
// ---------------------------------------------------------------------------

/**
 * Parse the deploy key to extract deployment name and URL.
 * Deploy key format: "prod:<deployment-name>|<secret>"
 */
function parseDeployKey(deployKey: string): {
  deploymentName: string
  deploymentUrl: string
} {
  const parts = deployKey.split('|')
  if (parts.length < 2) {
    throw new Error('Invalid deploy key format')
  }
  const prefix = parts[0] // e.g., "prod:happy-animal-123"
  const colonIdx = prefix.indexOf(':')
  if (colonIdx < 0) {
    throw new Error('Invalid deploy key format -- expected "prod:<deployment>|<secret>"')
  }
  const deploymentName = prefix.slice(colonIdx + 1)
  return {
    deploymentName,
    deploymentUrl: `https://${deploymentName}.convex.cloud`,
  }
}

/**
 * Build the module definitions for the Convex push API.
 * Each module maps to a source file inside the convex/ directory.
 */
function buildModules(): { path: string; source: string; environment: string }[] {
  return [
    { path: 'schema.js', source: SCHEMA_BUNDLE, environment: 'isolate' },
    { path: 'videos.js', source: VIDEOS_BUNDLE, environment: 'isolate' },
    { path: 'reactions.js', source: REACTIONS_BUNDLE, environment: 'isolate' },
    { path: 'http.js', source: HTTP_BUNDLE, environment: 'isolate' },
  ]
}

/**
 * Common headers for Convex deployment API calls.
 */
function convexHeaders(adminKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Convex ${adminKey}`,
    'Convex-Client': 'npm-cli-1.32.0',
  }
}

/**
 * Start a push: sends module sources to the Convex deployment.
 * Returns schema change info if a schema migration is needed.
 *
 * Uses the deploy2 API which expects:
 * - functions: string (directory name, e.g. "convex")
 * - appDefinition: { schema, changedModules, unchangedModuleHashes, udfServerVersion }
 * - componentDefinitions: []
 * - nodeDependencies: []
 */
async function startPush(
  deploymentUrl: string,
  adminKey: string,
  modules: { path: string; source: string; environment: string }[],
): Promise<Record<string, unknown>> {
  const url = `${deploymentUrl}/api/deploy2/start_push`
  log(`Starting push to ${url}`)

  // Separate schema from function modules
  const schemaModule = modules.find((m) => m.path === 'schema.js')
  const functionModules = modules.filter((m) => m.path !== 'schema.js')

  const res = await fetch(url, {
    method: 'POST',
    headers: convexHeaders(adminKey),
    body: JSON.stringify({
      adminKey,
      dryRun: false,
      functions: 'convex',
      appDefinition: {
        definition: null,
        dependencies: [],
        schema: schemaModule
          ? { path: schemaModule.path, source: schemaModule.source, environment: schemaModule.environment }
          : null,
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

  const body = await res.json()
  log('start_push response:', body)
  return body as Record<string, unknown>
}

/**
 * Wait for schema validation to complete after a push that includes
 * schema changes. Polls until the schema is validated or times out.
 */
async function waitForSchema(
  deploymentUrl: string,
  adminKey: string,
  schemaChange: Record<string, unknown>,
  timeoutMs = 60_000,
): Promise<void> {
  const url = `${deploymentUrl}/api/deploy2/wait_for_schema`
  log(`Waiting for schema validation...`)

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(url, {
      method: 'POST',
      headers: convexHeaders(adminKey),
      body: JSON.stringify({
        adminKey,
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
    log('wait_for_schema response:', body)

    if (body.type === 'complete') return
    if (body.type === 'failed') throw new Error('Schema validation failed')
    // type === 'inProgress' — keep polling
  }

  throw new Error('Timed out waiting for Convex schema validation')
}

/**
 * Finish the push to finalize the deployment and make functions live.
 */
async function finishPush(
  deploymentUrl: string,
  adminKey: string,
  startPushResponse: Record<string, unknown>,
): Promise<void> {
  const url = `${deploymentUrl}/api/deploy2/finish_push`
  log(`Finishing push to ${url}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: convexHeaders(adminKey),
    body: JSON.stringify({
      adminKey,
      startPush: startPushResponse,
      dryRun: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`finish_push failed: ${res.status} ${text}`)
  }

  const body = await res.json()
  log('finish_push response:', body)
}

// ---------------------------------------------------------------------------
// Main deployment function
// ---------------------------------------------------------------------------

export async function deployConvex(
  settings: AppSettings,
  onProgress: StepUpdateCallback,
): Promise<boolean> {
  const deployKey = settings.convexDeployKey

  if (!deployKey) {
    const steps: ProvisioningStep[] = [
      {
        id: 'validate',
        label: 'Validating settings...',
        status: 'error',
        error: 'Missing Convex deploy key.',
      },
    ]
    onProgress(steps)
    return false
  }

  const steps: ProvisioningStep[] = [
    { id: 'verify-access', label: 'Verifying Convex deployment access...', status: 'pending' },
    { id: 'push-functions', label: 'Pushing schema & functions...', status: 'pending' },
    { id: 'wait-schema', label: 'Validating schema...', status: 'pending' },
    { id: 'finalize', label: 'Finalizing deployment...', status: 'pending' },
    { id: 'validate', label: 'Validating deployed functions...', status: 'pending' },
  ]

  function updateStep(id: string, update: Partial<ProvisioningStep>) {
    const step = steps.find((s) => s.id === id)
    if (step) Object.assign(step, update)
    onProgress([...steps])
  }

  log('=== Starting Convex deployment ===')

  try {
    // Parse deploy key to extract deployment URL
    const { deploymentName, deploymentUrl: parsedUrl } = parseDeployKey(deployKey)
    const deploymentUrl = settings.convexDeploymentUrl || parsedUrl

    log(`Deployment: ${deploymentName}, URL: ${deploymentUrl}`)

    // Step 1: Verify access by testing the deployment endpoint
    updateStep('verify-access', { status: 'running' })
    log('Step 1/5: Verifying Convex access...')

    const testRes = await fetch(`${deploymentUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Convex ${deployKey}`,
      },
      body: JSON.stringify({ path: 'videos:list', args: {} }),
    })

    // 400 "function not found" is expected before first deployment -- means auth works
    if (!testRes.ok && testRes.status !== 400) {
      if (testRes.status === 401 || testRes.status === 403) {
        throw new Error('Invalid deploy key -- authentication failed')
      }
      const text = await testRes.text()
      throw new Error(`Convex connection failed: ${testRes.status} ${text}`)
    }

    updateStep('verify-access', { status: 'done' })
    log('Step 1/5: Convex access verified')

    // Step 2: Start push with schema and function definitions
    updateStep('push-functions', { status: 'running' })
    log('Step 2/5: Pushing schema & function definitions...')

    const modules = buildModules()
    const pushResult = await startPush(deploymentUrl, deployKey, modules)
    updateStep('push-functions', { status: 'done' })
    log('Step 2/5: Push started successfully')

    // Step 3: Wait for schema validation if there is a schema change
    updateStep('wait-schema', { status: 'running' })
    const schemaChange = pushResult.schemaChange as Record<string, unknown> | undefined
    if (schemaChange) {
      log('Step 3/5: Schema change detected, waiting for validation...')
      await waitForSchema(deploymentUrl, deployKey, schemaChange)
    } else {
      log('Step 3/5: No schema change, skipping validation wait')
    }
    updateStep('wait-schema', { status: 'done' })
    log('Step 3/5: Schema validation complete')

    // Step 4: Finalize the push
    updateStep('finalize', { status: 'running' })
    log('Step 4/5: Finalizing deployment...')
    await finishPush(deploymentUrl, deployKey, pushResult)
    updateStep('finalize', { status: 'done' })
    log('Step 4/5: Deployment finalized')

    // Step 5: Validate deployed functions by running a test query
    updateStep('validate', { status: 'running' })
    log('Step 5/5: Validating deployed functions...')
    const validateRes = await fetch(`${deploymentUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Convex ${deployKey}`,
      },
      body: JSON.stringify({ path: 'videos:list', args: {} }),
    })
    if (!validateRes.ok) {
      const text = await validateRes.text()
      throw new Error(`Post-deployment validation failed: videos:list returned ${validateRes.status} ${text}`)
    }
    updateStep('validate', { status: 'done' })
    log('Step 5/5: Deployed functions validated successfully')

    log('=== Convex deployment finished ===')
    return true
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    log(`=== Convex deployment FAILED: ${errMsg} ===`)
    const activeStep = steps.find((s) => s.status === 'running' || s.status === 'waiting')
    if (activeStep) {
      updateStep(activeStep.id, { status: 'error', error: errMsg })
    }
    return false
  }
}
