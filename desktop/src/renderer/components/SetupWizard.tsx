import { useState } from 'react'
import type { AppSettings } from '../lib/types'
import { initClient, validateConnection, resetClient } from '../lib/supabase'

interface Props {
  onConnect: (settings: AppSettings) => void
}

export default function SetupWizard({ onConnect }: Props) {
  const [supabaseURL, setSupabaseURL] = useState('')
  const [serviceRoleKey, setServiceRoleKey] = useState('')
  const [databasePassword, setDatabasePassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const isFormValid =
    supabaseURL.trim() !== '' &&
    serviceRoleKey.trim() !== '' &&
    databasePassword.trim() !== ''

  function extractRef(url: string): string {
    try {
      const host = new URL(url).hostname
      return host.split('.')[0]
    } catch {
      return ''
    }
  }

  async function handleConnect() {
    setError(null)
    setConnecting(true)

    if (!supabaseURL.includes('.supabase.co')) {
      setError('Invalid Supabase URL. Expected format: https://abcdef.supabase.co')
      setConnecting(false)
      return
    }

    try {
      // Validate connection by initializing client and pinging the project
      initClient(supabaseURL, serviceRoleKey)

      const result = await Promise.race([
        validateConnection(),
        new Promise<{ ok: false; error: string }>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Check your Supabase URL and try again.')), 15000),
        ),
      ])

      if (!result.ok) {
        resetClient()
        setError(result.error ?? 'Connection failed')
        setConnecting(false)
        return
      }

      // Validate DB connection
      const ref = extractRef(supabaseURL)
      const dbResult = await window.api.executeDDL(ref, databasePassword, 'SELECT 1')
      if (!dbResult.ok) {
        resetClient()
        setError(dbResult.error ?? 'Database connection failed')
        setConnecting(false)
        return
      }

      const settings: AppSettings = {
        supabaseURL,
        supabaseRef: ref,
        serviceRoleKey,
        databasePassword,
        isProvisioned: false,
      }

      await window.api.saveSettings(settings)
      setConnecting(false)
      onConnect(settings)
    } catch (e) {
      resetClient()
      setError(e instanceof Error ? e.message : 'Connection failed. Please try again.')
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-10">
      <div className="text-5xl mb-4">🎥</div>

      <h1 className="text-3xl font-bold mb-2">Welcome to Thari.video</h1>

      <p className="text-zinc-400 mb-8">
        Connect your Supabase project to get started.
      </p>

      <div className="w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Supabase Project URL
          </label>
          <input
            data-testid="supabase-url"
            type="text"
            placeholder="https://abcdef.supabase.co"
            value={supabaseURL}
            onChange={(e) => setSupabaseURL(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Service Role Key
          </label>
          <input
            data-testid="service-role-key"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            value={serviceRoleKey}
            onChange={(e) => setServiceRoleKey(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Database Password
          </label>
          <input
            data-testid="database-password"
            type="password"
            placeholder="Your database password"
            value={databasePassword}
            onChange={(e) => setDatabasePassword(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
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
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-colors"
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>

        {/* TODO: Remove this — temp skip for Supabase outage */}
        <button
          onClick={() => {
            const settings: AppSettings = {
              supabaseURL: '',
              supabaseRef: '',
              serviceRoleKey: '',
              databasePassword: '',
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
