import { useState, useEffect } from 'react'
import type { AppSettings } from '../../lib/types'
import type { ProvisioningStep, StepStatus } from '../../lib/provisioning/types'
import type { DeployProgressMessage } from '../../lib/messages'

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
    case 'waiting':
      return (
        <svg className="w-4 h-4 animate-spin text-[var(--mustard)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
      )
    case 'done':
      return <span className="text-[var(--emerald)]">✓</span>
    case 'error':
      return <span className="text-[var(--crimson)]">✗</span>
  }
}

const FIREBASE_STEPS: ProvisioningStep[] = [
  { id: 'firestore', label: 'Verifying Firestore access...', status: 'pending' },
  { id: 'storage', label: 'Verifying Storage bucket...', status: 'pending' },
  { id: 'deploy-enable-apis', label: 'Enabling required GCP APIs...', status: 'pending' },
  { id: 'deploy-check-access', label: 'Checking Cloud Functions access...', status: 'pending' },
  { id: 'deploy-upload', label: 'Uploading function source...', status: 'pending' },
  { id: 'deploy-create', label: 'Creating Cloud Function...', status: 'pending' },
  { id: 'deploy-public', label: 'Configuring public access...', status: 'pending' },
]

const CONVEX_STEPS: ProvisioningStep[] = [
  { id: 'verify-access', label: 'Verifying Convex deployment access...', status: 'pending' },
  { id: 'push-functions', label: 'Pushing schema & functions...', status: 'pending' },
  { id: 'wait-schema', label: 'Validating schema...', status: 'pending' },
  { id: 'finalize', label: 'Finalizing deployment...', status: 'pending' },
]

const SUPABASE_STEPS: ProvisioningStep[] = [
  { id: 'verify-access', label: 'Verifying database access...', status: 'pending' },
  { id: 'verify-storage', label: 'Verifying file storage...', status: 'pending' },
  { id: 'deploy-functions', label: 'Deploying backend (DB + Storage + Edge Function)...', status: 'pending' },
]

export default function Provisioning({ settings, onComplete, onDisconnect }: Props) {
  const provider = settings.provider || 'firebase'
  const initialSteps = provider === 'supabase' ? SUPABASE_STEPS : provider === 'convex' ? CONVEX_STEPS : FIREBASE_STEPS
  const [steps, setSteps] = useState<ProvisioningStep[]>(initialSteps)
  const [finished, setFinished] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [expandedError, setExpandedError] = useState<string | null>(null)

  function startProvisioning() {
    setFinished(false)
    setHasError(false)
    setExpandedError(null)
    setSteps(initialSteps.map((s) => ({ ...s })))

    // Send message to service worker to start provisioning
    chrome.runtime.sendMessage({ type: 'DEPLOY_BACKEND', provider })
  }

  useEffect(() => {
    startProvisioning()

    // Listen for deploy progress messages from the service worker
    const listener = (message: DeployProgressMessage & { type: string; done?: boolean; error?: boolean }) => {
      if (message.type === 'DEPLOY_PROGRESS') {
        setSteps(message.steps)

        // Check if all steps are done
        const allDone = message.steps.every((s: ProvisioningStep) => s.status === 'done')
        const anyError = message.steps.some((s: ProvisioningStep) => s.status === 'error')

        if (allDone) {
          setFinished(true)
        } else if (anyError) {
          setHasError(true)
        }
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const isInProgress = !finished && !hasError
  const heading = provider === 'supabase' ? 'Setting up Supabase' : provider === 'convex' ? 'Setting up Convex' : 'Setting up your project'
  const subtitle = provider === 'supabase' ? 'Verifying Supabase services...' : provider === 'convex' ? 'Verifying Convex services...' : 'Verifying Firebase services...'

  return (
    <div
      data-testid="provisioning-screen"
      className="flex flex-col h-screen"
    >
      <div className={`${isInProgress ? 'stripe-divider-slow' : 'stripe-divider'} h-[3px] shrink-0`} />
      <div className="flex-1 flex flex-col items-center justify-center px-10">
      <div className="w-14 h-14 mb-4">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <pattern id="stripes-logo" x="0" y="0" width="18" height="48" patternUnits="userSpaceOnUse">
              <rect width="18" height="48" fill="#1A1A2E"/>
              <rect x="0" y="0" width="1" height="48" fill="#F5F5E8" opacity="0.7"/>
              <rect x="2" y="0" width="4" height="48" fill="#0E9A57"/>
              <rect x="6" y="0" width="2" height="48" fill="#F5C518"/>
              <rect x="8" y="0" width="4" height="48" fill="#D92B2B"/>
              <rect x="13" y="0" width="1" height="48" fill="#0A0A12"/>
              <rect x="15" y="0" width="2" height="48" fill="#F5C518"/>
            </pattern>
            <clipPath id="outer-clip-logo">
              <rect width="48" height="48" rx="9" ry="9"/>
            </clipPath>
          </defs>
          <g clipPath="url(#outer-clip-logo)">
            <rect width="48" height="48" fill="url(#stripes-logo)"/>
          </g>
          <rect x="6" y="6" width="36" height="36" rx="5" ry="5" fill="#1A1A2E" opacity="0.92"/>
          <rect x="6" y="6" width="36" height="36" rx="5" ry="5" fill="none" stroke="#F5F5E8" strokeOpacity="0.08" strokeWidth="1"/>
          <circle cx="11" cy="11" r="1" fill="#D92B2B"/>
          <circle cx="14" cy="11" r="1" fill="#F5C518"/>
          <circle cx="17" cy="11" r="1" fill="#0E9A57"/>
          <polygon points="21.8,22 21.8,30 29,26" fill="#F5F5E8" opacity="0.85"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">{heading}</h1>
      <p className="text-zinc-400 mb-8">{subtitle}</p>

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
                      : step.status === 'running' || step.status === 'waiting'
                        ? 'text-[var(--mustard)]'
                        : 'text-zinc-500'
                }
              >
                {step.label}
              </span>
            </div>

            {step.status === 'waiting' && (
              <p className="ml-7 mt-1 text-xs text-[var(--mustard)] opacity-70">
                This might take a minute...
              </p>
            )}

            {step.status === 'error' && step.actions && step.actions.length > 0 && (
              <div className="ml-7 mt-2 space-y-2">
                <p className="text-xs text-zinc-400">
                  Fix the issue below, then click Retry:
                </p>
                <div className="flex flex-wrap gap-2">
                  {step.actions.map((action) => (
                    <button
                      key={action.url}
                      onClick={() => chrome.tabs.create({ url: action.url })}
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

      {finished ? (
        <button
          data-testid="provisioning-continue"
          onClick={onComplete}
          className="px-6 py-2 bg-[var(--crimson)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.25)] active:scale-[0.97] rounded-lg font-medium transition-all"
        >
          Continue
        </button>
      ) : hasError ? (
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
      ) : null}
      </div>
    </div>
  )
}
