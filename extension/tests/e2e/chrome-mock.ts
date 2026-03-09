/**
 * Chrome Extension API mock for Playwright tests.
 *
 * Injected via page.addInitScript() before the React app loads.
 * Simulates the service worker's message handling so the sidepanel
 * UI can be tested in isolation.
 */

export interface MockConfig {
  /** Response returned by VALIDATE_CONNECTION. Defaults to Convex success. */
  validateResult?: Record<string, unknown>
  /** 'success' completes all 4 steps; 'failure' fails at push-functions. */
  deployBehavior?: 'success' | 'failure'
  /** Pre-seeded settings returned by GET_SETTINGS. Defaults to {}. */
  initialSettings?: Record<string, unknown>
  /** Error message when deployBehavior is 'failure'. */
  deployErrorMessage?: string
}

/**
 * Returns a serialisable function string that sets up window.chrome mocks.
 * Must be called as `page.addInitScript(chromeMockScript, config)`.
 */
export function chromeMockScript(config: MockConfig): void {
  const cfg = config || {}

  // ---- internal state ----
  type Listener = (message: Record<string, unknown>) => void
  const listeners: Listener[] = []
  let settings: Record<string, unknown> = cfg.initialSettings || {}
  let validateResult: Record<string, unknown> = cfg.validateResult || {
    ok: true,
    deploymentUrl: 'https://test-deployment.convex.cloud',
    deploymentName: 'test-deployment',
    httpActionsUrl: 'https://test-deployment.convex.site',
  }
  let deployBehavior: string = cfg.deployBehavior || 'success'
  let deployErrorMessage: string = cfg.deployErrorMessage || 'start_push failed: 500 {"code":"InternalServerError"}'

  function fireMessage(msg: Record<string, unknown>) {
    for (const fn of listeners) {
      try { fn(msg) } catch { /* ignore */ }
    }
  }

  function deepCloneSteps(steps: Record<string, unknown>[]) {
    return steps.map((s) => ({ ...s }))
  }

  function simulateDeploySuccess() {
    const steps = [
      { id: 'verify-access', label: 'Verifying Convex deployment access...', status: 'pending' },
      { id: 'push-functions', label: 'Pushing schema & functions...', status: 'pending' },
      { id: 'wait-schema', label: 'Validating schema...', status: 'pending' },
      { id: 'finalize', label: 'Finalizing deployment...', status: 'pending' },
    ]

    const advance = (index: number, delay: number) => {
      setTimeout(() => {
        if (index > 0) steps[index - 1].status = 'done'
        steps[index].status = 'running'
        fireMessage({ type: 'DEPLOY_PROGRESS', steps: deepCloneSteps(steps) })

        if (index < steps.length - 1) {
          advance(index + 1, 80)
        } else {
          // Final step done
          setTimeout(() => {
            steps[index].status = 'done'
            fireMessage({ type: 'DEPLOY_PROGRESS', steps: deepCloneSteps(steps) })
          }, 80)
        }
      }, delay)
    }
    advance(0, 50)
  }

  function simulateDeployFailure() {
    const steps = [
      { id: 'verify-access', label: 'Verifying Convex deployment access...', status: 'pending' },
      { id: 'push-functions', label: 'Pushing schema & functions...', status: 'pending' },
      { id: 'wait-schema', label: 'Validating schema...', status: 'pending' },
      { id: 'finalize', label: 'Finalizing deployment...', status: 'pending' },
    ]

    setTimeout(() => {
      steps[0].status = 'running'
      fireMessage({ type: 'DEPLOY_PROGRESS', steps: deepCloneSteps(steps) })

      setTimeout(() => {
        steps[0].status = 'done'
        steps[1].status = 'running'
        fireMessage({ type: 'DEPLOY_PROGRESS', steps: deepCloneSteps(steps) })

        setTimeout(() => {
          steps[1].status = 'error'
          steps[1].error = deployErrorMessage
          fireMessage({ type: 'DEPLOY_PROGRESS', steps: deepCloneSteps(steps) })
        }, 80)
      }, 80)
    }, 50)
  }

  // ---- chrome API mock ----
  const chromeMock = {
    runtime: {
      sendMessage: async (msg: Record<string, unknown>) => {
        const type = msg.type as string
        switch (type) {
          case 'GET_SETTINGS':
            return { ...settings }
          case 'SAVE_SETTINGS':
            settings = { ...settings, ...(msg.settings as Record<string, unknown>) }
            return { ok: true }
          case 'VALIDATE_CONNECTION':
            // Small delay to simulate network
            await new Promise((r) => setTimeout(r, 50))
            return { ...validateResult }
          case 'DEPLOY_BACKEND':
            if (deployBehavior === 'success') {
              simulateDeploySuccess()
            } else {
              simulateDeployFailure()
            }
            return { ok: true }
          case 'DISCONNECT':
            settings = {}
            return { ok: true }
          default:
            return {}
        }
      },
      onMessage: {
        addListener: (fn: Listener) => { listeners.push(fn) },
        removeListener: (fn: Listener) => {
          const idx = listeners.indexOf(fn)
          if (idx >= 0) listeners.splice(idx, 1)
        },
      },
      // Needed by some Chrome API calls
      lastError: null,
    },
    permissions: {
      request: async () => true,
    },
    tabs: {
      create: async () => ({}),
    },
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
      },
    },
  }

  // Expose to window
  ;(window as unknown as Record<string, unknown>).chrome = chromeMock

  // Expose mock controls so tests can reconfigure mid-test
  ;(window as unknown as Record<string, unknown>).__chromeMock = {
    get settings() { return settings },
    set settings(s: Record<string, unknown>) { settings = s },
    set validateResult(r: Record<string, unknown>) { validateResult = r },
    set deployBehavior(b: string) { deployBehavior = b },
    set deployErrorMessage(m: string) { deployErrorMessage = m },
    fireMessage,
  }
}
