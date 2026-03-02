import { useState } from 'react'
import type { AppSettings } from '../lib/types'

interface Props {
  onConnect: (settings: AppSettings) => void
}

export default function SetupWizard({ onConnect }: Props) {
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const isFormValid = serviceAccountJson.trim() !== ''

  async function handleConnect() {
    setError(null)
    setConnecting(true)

    // Validate JSON format
    try {
      const parsed = JSON.parse(serviceAccountJson)
      if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
        setError('Invalid Service Account JSON. Missing required fields (project_id, private_key, client_email).')
        setConnecting(false)
        return
      }
    } catch {
      setError('Invalid JSON format. Please paste a valid Service Account JSON.')
      setConnecting(false)
      return
    }

    try {
      const result = await Promise.race([
        window.api.validateFirebaseConnection(serviceAccountJson),
        new Promise<{ ok: false; error: string }>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Check your Service Account and try again.')), 15000),
        ),
      ])

      if (!result.ok) {
        setError(result.error ?? 'Connection failed')
        setConnecting(false)
        return
      }

      const settings: AppSettings = {
        firebaseProjectId: result.projectId,
        serviceAccountJson,
        isProvisioned: false,
      }

      await window.api.saveSettings(settings)
      setConnecting(false)
      onConnect(settings)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed. Please try again.')
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-10">
      <div className="font-mono text-3xl font-bold tracking-tight mb-2">
        <span className="text-[var(--cotton)]">thari</span>
        <span className="text-[var(--cotton)]/40">.video</span>
      </div>
      <p className="text-zinc-400 mb-2">Connect your Firebase project to get started.</p>
      <div className="stripe-divider-slow h-[3px] w-32 mb-8 rounded-full" />

      <div className="w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Service Account JSON
          </label>
          <textarea
            data-testid="service-account-json"
            placeholder='Paste your Firebase Service Account JSON here...'
            value={serviceAccountJson}
            onChange={(e) => setServiceAccountJson(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--crimson)] font-mono text-xs resize-none"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Firebase Console → Project Settings → Service Accounts → Generate New Private Key
          </p>
        </div>

        {error && (
          <p data-testid="error-message" className="text-red-400 text-sm">
            {error}
          </p>
        )}

        <button
          data-testid="connect-button"
          onClick={handleConnect}
          disabled={!isFormValid || connecting}
          className="w-full py-2 px-4 bg-[var(--crimson)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.25)] active:scale-[0.97] disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-all"
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>

        {/* TODO: Remove this — temp skip for dev */}
        <button
          onClick={() => {
            const settings: AppSettings = {
              firebaseProjectId: '',
              serviceAccountJson: '',
              isProvisioned: true,
            }
            window.api.saveSettings(settings)
            onConnect(settings)
          }}
          className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          Skip setup (dev mode)
        </button>
      </div>
    </div>
  )
}
