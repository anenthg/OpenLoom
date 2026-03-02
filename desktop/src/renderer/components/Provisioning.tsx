import { useState, useEffect } from 'react'
import type { AppSettings } from '../lib/types'
import { runProvisioning, type ProvisioningStep, type StepStatus } from '../lib/provisioning'
import appIcon from '../assets/icon-64.png'

interface Props {
  settings: AppSettings
  onComplete: () => void
  onDisconnect: () => void
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'pending':
      return <span className="text-zinc-500">○</span>
    case 'running':
      return (
        <span className="text-[var(--mustard)] inline-block animate-spin">⟳</span>
      )
    case 'done':
      return <span className="text-[var(--emerald)]">✓</span>
    case 'error':
      return <span className="text-[var(--crimson)]">✗</span>
  }
}

const INITIAL_STEPS: ProvisioningStep[] = [
  { id: 'firestore', label: 'Verifying Firestore access...', status: 'pending' },
  { id: 'storage', label: 'Verifying Storage bucket...', status: 'pending' },
  { id: 'deploy-enable-apis', label: 'Enabling required GCP APIs...', status: 'pending' },
  { id: 'deploy-check-access', label: 'Checking Cloud Functions access...', status: 'pending' },
  { id: 'deploy-upload', label: 'Uploading function source...', status: 'pending' },
  { id: 'deploy-create', label: 'Creating Cloud Function...', status: 'pending' },
  { id: 'deploy-public', label: 'Configuring public access...', status: 'pending' },
]

export default function Provisioning({ settings, onComplete, onDisconnect }: Props) {
  const [steps, setSteps] = useState<ProvisioningStep[]>(INITIAL_STEPS)
  const [finished, setFinished] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [expandedError, setExpandedError] = useState<string | null>(null)

  async function startProvisioning() {
    setFinished(false)
    setHasError(false)
    setExpandedError(null)
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })))

    const ok = await runProvisioning(settings, (updatedSteps) => {
      setSteps(updatedSteps)
    })

    if (ok) {
      setFinished(true)
    } else {
      setHasError(true)
    }
  }

  useEffect(() => {
    startProvisioning()
  }, [])

  const isInProgress = !finished && !hasError

  return (
    <div
      data-testid="provisioning-screen"
      className="flex flex-col h-screen"
    >
      <div className={`${isInProgress ? 'stripe-divider-slow' : 'stripe-divider'} h-[3px] shrink-0`} />
      <div className="flex-1 flex flex-col items-center justify-center px-10">
      <img src={appIcon} alt="" className="w-14 h-14 mb-4 rounded-xl" />
      <h1 className="text-2xl font-bold mb-2">Setting up your project</h1>
      <p className="text-zinc-400 mb-8">
        Verifying Firebase services...
      </p>

      <div className="w-full max-w-md space-y-3 mb-8">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col">
            <div
              data-testid={`step-${step.id}`}
              className="flex items-center gap-3 text-sm"
            >
              <StatusIcon status={step.status} />
              <span
                className={
                  step.status === 'done'
                    ? 'text-[var(--emerald)]'
                    : step.status === 'error'
                      ? 'text-[var(--crimson)]'
                      : step.status === 'running'
                        ? 'text-[var(--mustard)]'
                        : 'text-zinc-500'
                }
              >
                {step.label}
              </span>
            </div>

            {step.status === 'error' && step.actions && step.actions.length > 0 && (
              <div className="ml-7 mt-2 space-y-2">
                <p className="text-xs text-zinc-400">
                  Enable the required APIs in GCP Console, then click Retry:
                </p>
                <div className="flex flex-wrap gap-2">
                  {step.actions.map((action) => (
                    <button
                      key={action.url}
                      onClick={() => window.open(action.url)}
                      className="px-3 py-1.5 text-xs bg-[var(--crimson)] hover:brightness-110 text-white rounded font-medium transition-all"
                    >
                      {action.label} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step.status === 'error' && step.error && (
              <div className="ml-7 mt-1">
                <button
                  className="text-xs text-red-400 underline"
                  onClick={() =>
                    setExpandedError(expandedError === step.id ? null : step.id)
                  }
                >
                  {expandedError === step.id ? 'Hide details' : 'Show details'}
                </button>
                {expandedError === step.id && (
                  <p
                    data-testid={`error-${step.id}`}
                    className="text-xs text-red-300 mt-1 bg-red-950 p-2 rounded"
                  >
                    {step.error}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {finished && (
        <button
          data-testid="provisioning-continue"
          onClick={onComplete}
          className="px-6 py-2 bg-[var(--crimson)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.25)] active:scale-[0.97] rounded-lg font-medium transition-all"
        >
          Continue
        </button>
      )}

      {hasError && (
        <div className="flex gap-3">
          <button
            data-testid="provisioning-retry"
            onClick={startProvisioning}
            className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
          <button
            data-testid="provisioning-disconnect"
            onClick={onDisconnect}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
