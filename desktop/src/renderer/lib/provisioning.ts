import type { AppSettings } from './types'

export type StepStatus = 'pending' | 'running' | 'waiting' | 'done' | 'error'

export interface StepAction {
  label: string
  url: string
}

export interface ProvisioningStep {
  id: string
  label: string
  status: StepStatus
  error?: string
  actions?: StepAction[]
}

interface StepResult {
  ok: boolean
  error?: string
  actions?: StepAction[]
}

async function verifyFirestore(): Promise<StepResult> {
  try {
    const result = await window.api.firestoreQuery('videos', 'created_at', 'desc')
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Firestore verification failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

async function verifyStorage(): Promise<StepResult> {
  try {
    const result = await window.api.storageGetPublicUrl('videos/__probe__')
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Storage verification failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// --- Convex verification ---

async function verifyConvexAccess(): Promise<StepResult> {
  try {
    // Try a query — "function not found" / "Could not find public function" is expected
    // before deployment. Authentication/connection errors are real failures.
    const result = await window.api.dbQuery('videos', 'created_at', 'desc')
    if (result.ok) return { ok: true }
    const err = result.error?.toLowerCase() || ''
    // These indicate the connection works but functions aren't deployed yet
    if (err.includes('could not find public function') || err.includes('did you forget to run')) {
      return { ok: true }
    }
    // Authentication failures are real errors
    if (err.includes('401') || err.includes('403') || err.includes('authentication')) {
      return { ok: false, error: 'Convex authentication failed. Check your deploy key.' }
    }
    return { ok: false, error: result.error }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Connection errors from initConvex not being called would show "not initialized"
    if (msg.includes('not initialized')) {
      return { ok: false, error: 'Convex client not initialized. Try disconnecting and reconnecting.' }
    }
    return { ok: false, error: `Convex verification failed: ${msg}` }
  }
}

async function verifyConvexStorage(): Promise<StepResult> {
  // Storage is always available in Convex projects, just verify the connection works
  return { ok: true }
}

const DEPLOY_STEP_IDS = [
  'deploy-enable-apis',
  'deploy-check-access',
  'deploy-upload',
  'deploy-create',
  'deploy-public',
] as const

const stageMap: Record<string, string> = {
  'enable-apis': 'deploy-enable-apis',
  'check-access': 'deploy-check-access',
  'upload-source': 'deploy-upload',
  'create-function': 'deploy-create',
  'create-function-waiting': 'deploy-create',
  'set-public-access': 'deploy-public',
}

export type StepUpdateCallback = (steps: ProvisioningStep[]) => void

export async function runProvisioning(
  _settings: AppSettings,
  onUpdate: StepUpdateCallback,
): Promise<boolean> {
  const steps: ProvisioningStep[] = [
    { id: 'firestore', label: 'Verifying Firestore access...', status: 'pending' },
    { id: 'storage', label: 'Verifying Storage bucket...', status: 'pending' },
    { id: 'deploy-enable-apis', label: 'Enabling required GCP APIs...', status: 'pending' },
    { id: 'deploy-check-access', label: 'Checking Cloud Functions access...', status: 'pending' },
    { id: 'deploy-upload', label: 'Uploading function source...', status: 'pending' },
    { id: 'deploy-create', label: 'Creating Cloud Function...', status: 'pending' },
    { id: 'deploy-public', label: 'Configuring public access...', status: 'pending' },
  ]

  function updateStep(id: string, update: Partial<ProvisioningStep>) {
    const step = steps.find((s) => s.id === id)
    if (step) Object.assign(step, update)
    onUpdate([...steps])
  }

  // Step 1: Verify Firestore
  updateStep('firestore', { status: 'running' })
  const firestoreResult = await verifyFirestore()
  if (!firestoreResult.ok) {
    updateStep('firestore', { status: 'error', error: firestoreResult.error })
    return false
  }
  updateStep('firestore', { status: 'done' })

  // Step 2: Verify Storage
  updateStep('storage', { status: 'running' })
  const storageResult = await verifyStorage()
  if (!storageResult.ok) {
    updateStep('storage', { status: 'error', error: storageResult.error })
    return false
  }
  updateStep('storage', { status: 'done' })

  // Step 3: Deploy API (5 sub-steps streamed via IPC progress events)
  let currentDeployStep: string | null = null

  window.api.onDeployProgress((stage: string) => {
    const stepId = stageMap[stage]
    if (!stepId) return

    // Mark previous deploy step as done
    if (currentDeployStep && currentDeployStep !== stepId) {
      updateStep(currentDeployStep, { status: 'done' })
    }

    currentDeployStep = stepId

    if (stage === 'create-function-waiting') {
      // Build started — now waiting for GCP to finish (can take a minute+)
      updateStep(stepId, { status: 'waiting' })
    } else {
      updateStep(stepId, { status: 'running' })
    }
  })

  try {
    const result = await window.api.deployCloudFunction()

    window.api.offDeployProgress()

    if (result.ok) {
      if (result.skipped) {
        // Version already matches — mark all deploy steps done immediately
        for (const id of DEPLOY_STEP_IDS) {
          updateStep(id, { status: 'done' })
        }
      } else {
        // Mark all deploy steps done (including any that didn't get a progress event)
        for (const id of DEPLOY_STEP_IDS) {
          updateStep(id, { status: 'done' })
        }
      }
      return true
    } else {
      // Mark the currently-running deploy step as error
      if (currentDeployStep) {
        updateStep(currentDeployStep, {
          status: 'error',
          error: result.error,
          actions: result.enableUrls,
        })
      } else {
        // No progress was received — mark the first deploy step as error
        updateStep('deploy-enable-apis', {
          status: 'error',
          error: result.error,
          actions: result.enableUrls,
        })
      }
      return false
    }
  } catch (e) {
    window.api.offDeployProgress()

    const errorMsg = `API deployment failed: ${e instanceof Error ? e.message : String(e)}`
    if (currentDeployStep) {
      updateStep(currentDeployStep, { status: 'error', error: errorMsg })
    } else {
      updateStep('deploy-enable-apis', { status: 'error', error: errorMsg })
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Convex provisioning
// ---------------------------------------------------------------------------

export async function runConvexProvisioning(
  _settings: AppSettings,
  onUpdate: StepUpdateCallback,
): Promise<boolean> {
  const steps: ProvisioningStep[] = [
    { id: 'verify-access', label: 'Verifying database access...', status: 'pending' },
    { id: 'verify-storage', label: 'Verifying file storage...', status: 'pending' },
    { id: 'deploy-functions', label: 'Deploying backend functions...', status: 'pending' },
  ]

  function updateStep(id: string, update: Partial<ProvisioningStep>) {
    const step = steps.find((s) => s.id === id)
    if (step) Object.assign(step, update)
    onUpdate([...steps])
  }

  // Step 1: Verify database access
  updateStep('verify-access', { status: 'running' })
  const accessResult = await verifyConvexAccess()
  if (!accessResult.ok) {
    updateStep('verify-access', { status: 'error', error: accessResult.error })
    return false
  }
  updateStep('verify-access', { status: 'done' })

  // Step 2: Verify storage
  updateStep('verify-storage', { status: 'running' })
  const storageResult = await verifyConvexStorage()
  if (!storageResult.ok) {
    updateStep('verify-storage', { status: 'error', error: storageResult.error })
    return false
  }
  updateStep('verify-storage', { status: 'done' })

  // Step 3: Deploy backend functions
  updateStep('deploy-functions', { status: 'running' })

  window.api.onDeployProgress((stage: string) => {
    if (stage === 'deploy-functions') {
      updateStep('deploy-functions', { status: 'waiting' })
    }
  })

  try {
    const result = await window.api.deployBackendFunctions()
    window.api.offDeployProgress()

    if (result.ok) {
      updateStep('deploy-functions', { status: 'done' })
      return true
    } else {
      updateStep('deploy-functions', {
        status: 'error',
        error: result.error,
      })
      return false
    }
  } catch (e) {
    window.api.offDeployProgress()
    updateStep('deploy-functions', {
      status: 'error',
      error: `Deployment failed: ${e instanceof Error ? e.message : String(e)}`,
    })
    return false
  }
}
