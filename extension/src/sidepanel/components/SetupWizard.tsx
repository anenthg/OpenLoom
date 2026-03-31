import { useState, useRef } from 'react'
import type { AppSettings, BackendProvider } from '../../lib/types'
import { requestProviderPermissions } from '../../lib/hostPermissions'

interface Props {
  onConnect: (settings: AppSettings) => void
}

export default function SetupWizard({ onConnect }: Props) {
  const [provider, setProvider] = useState<BackendProvider | null>(null)

  // Firebase state
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'prerequisites'>('upload')
  const [showHelp, setShowHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convex state
  const [convexDeployKey, setConvexDeployKey] = useState('')

  // Supabase state
  const [supabaseProjectUrl, setSupabaseProjectUrl] = useState('')
  const [supabaseAccessToken, setSupabaseAccessToken] = useState('')

  // Shared state
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  // --- Firebase handlers ---

  function handleFile(file: File) {
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setServiceAccountJson(text)
      setFileName(file.name)
      try {
        const parsed = JSON.parse(text)
        if (parsed.project_id) {
          setProjectId(parsed.project_id)
          setStep('prerequisites')
        } else {
          setProjectId(null)
          setError('Invalid Service Account JSON. Missing project_id field.')
        }
      } catch {
        setProjectId(null)
        setError('Invalid JSON format.')
      }
    }
    reader.readAsText(file)
  }

  function handleFirebaseBack() {
    setStep('upload')
    setServiceAccountJson('')
    setFileName(null)
    setProjectId(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFirebaseConnect() {
    setError(null)
    setConnecting(true)

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

    // Request host permissions for Firebase APIs
    const granted = await requestProviderPermissions('firebase')
    if (!granted) {
      setError('Host permissions are required to connect to Firebase. Please allow when prompted.')
      setConnecting(false)
      return
    }

    try {
      const result = await Promise.race([
        chrome.runtime.sendMessage({ type: 'VALIDATE_CONNECTION', provider: 'firebase', credential: serviceAccountJson }) as Promise<{ ok: boolean; projectId?: string; error?: string }>,
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
        provider: 'firebase',
        firebaseProjectId: result.projectId,
        serviceAccountJson,
        isProvisioned: false,
      }

      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings })
      setConnecting(false)
      onConnect(settings)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed. Please try again.')
      setConnecting(false)
    }
  }

  // --- Convex handlers ---

  async function handleConvexConnect() {
    setError(null)
    setConnecting(true)

    const key = convexDeployKey.trim()
    if (!key) {
      setError('Please paste your Convex deploy key.')
      setConnecting(false)
      return
    }

    // Request host permissions for Convex APIs
    const granted = await requestProviderPermissions('convex')
    if (!granted) {
      setError('Host permissions are required to connect to Convex. Please allow when prompted.')
      setConnecting(false)
      return
    }

    try {
      // Save provider first so SW routes correctly, then validate
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { provider: 'convex' } })

      const result = await Promise.race([
        chrome.runtime.sendMessage({ type: 'VALIDATE_CONNECTION', provider: 'convex', credential: key }) as Promise<{ ok: boolean; deploymentUrl?: string; deploymentName?: string; httpActionsUrl?: string; error?: string }>,
        new Promise<{ ok: false; error: string }>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Check your deploy key and try again.')), 15000),
        ),
      ])

      if (!result.ok) {
        // Revert provider on failure
        await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { provider: undefined } })
        setError(result.error ?? 'Connection failed')
        setConnecting(false)
        return
      }

      const settings: AppSettings = {
        provider: 'convex',
        convexDeployKey: key,
        convexDeploymentUrl: result.deploymentUrl,
        convexDeploymentName: result.deploymentName,
        convexHttpActionsUrl: result.httpActionsUrl,
        isProvisioned: false,
      }

      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings })
      setConnecting(false)
      onConnect(settings)
    } catch (e) {
      // Revert provider on failure
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { provider: undefined } }).catch(() => {})
      setError(e instanceof Error ? e.message : 'Connection failed. Please try again.')
      setConnecting(false)
    }
  }

  // --- Supabase handlers ---

  async function handleSupabaseConnect() {
    setError(null)
    setConnecting(true)

    const url = supabaseProjectUrl.trim()
    const token = supabaseAccessToken.trim()
    if (!url || !token) {
      setError('Please fill in both fields.')
      setConnecting(false)
      return
    }

    if (!/^https?:\/\/[^.]+\.supabase\.co\/?$/.test(url)) {
      setError('Invalid Project URL. Expected format: https://<project-ref>.supabase.co')
      setConnecting(false)
      return
    }

    // Request host permissions for Supabase APIs
    const granted = await requestProviderPermissions('supabase')
    if (!granted) {
      setError('Host permissions are required to connect to Supabase. Please allow when prompted.')
      setConnecting(false)
      return
    }

    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { provider: 'supabase' } })

      const result = await Promise.race([
        chrome.runtime.sendMessage({ type: 'VALIDATE_CONNECTION', provider: 'supabase', credential: JSON.stringify({ projectUrl: url, accessToken: token }) }) as Promise<{ ok: boolean; projectRef?: string; serviceRoleKey?: string; anonKey?: string; error?: string }>,
        new Promise<{ ok: false; error: string }>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Check your credentials and try again.')), 15000),
        ),
      ])

      if (!result.ok) {
        await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { provider: undefined } })
        setError(result.error ?? 'Connection failed')
        setConnecting(false)
        return
      }

      const settings: AppSettings = {
        provider: 'supabase',
        supabaseProjectUrl: url.replace(/\/+$/, ''),
        supabaseProjectRef: result.projectRef,
        supabaseAccessToken: token,
        supabaseServiceRoleKey: result.serviceRoleKey,
        supabaseAnonKey: result.anonKey,
        isProvisioned: false,
      }

      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings })
      setConnecting(false)
      onConnect(settings)
    } catch (e) {
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { provider: undefined } }).catch(() => {})
      setError(e instanceof Error ? e.message : 'Connection failed. Please try again.')
      setConnecting(false)
    }
  }

  function handleBackToProviderSelect() {
    setProvider(null)
    setError(null)
    setConnecting(false)
    setConvexDeployKey('')
    setSupabaseProjectUrl('')
    setSupabaseAccessToken('')
    setServiceAccountJson('')
    setFileName(null)
    setProjectId(null)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="relative flex flex-col h-screen bg-[var(--warp-indigo)]">
      {/* Jamakkalam stripe band */}
      <div className="relative shrink-0 h-[20vh] flex items-center justify-center">
        <div className="jamakkalam-stripes jamakkalam-stripes-animated absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--warp-indigo)]" />
        <div className="relative font-mono text-3xl font-bold tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.7),0_0_40px_rgba(26,26,46,0.9)]">
          <span className="text-[var(--cotton)]">Open</span>
          <span className="text-[var(--cotton)]/40">Loom</span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center px-10 pt-8 overflow-y-auto">
        {/* Step 0: Provider selection */}
        {!provider && (
          <>
            <p className="text-zinc-400 text-sm mb-8">Choose your backend provider</p>
            <div className="w-full max-w-md space-y-3">
              <button
                onClick={() => setProvider('supabase')}
                className="w-full p-4 rounded-lg border border-zinc-700 hover:border-[var(--emerald)]/50 bg-zinc-800/50 hover:bg-zinc-800 transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--cotton)]">Supabase</p>
                    <p className="text-xs text-zinc-400 mt-0.5">1 GB storage, 2 GB egress free</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono leading-tight px-2 py-1 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)]">
                    Developer friendly
                  </span>
                </div>
              </button>

              <button
                onClick={() => setProvider('convex')}
                className="w-full p-4 rounded-lg border border-zinc-700 hover:border-[var(--emerald)]/50 bg-zinc-800/50 hover:bg-zinc-800 transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--cotton)]">Convex</p>
                    <p className="text-xs text-zinc-400 mt-0.5">1 GB storage, 1 GB egress free</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono leading-tight px-2 py-1 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)]">
                    Real-time backend
                  </span>
                </div>
              </button>

              <div
                className="w-full p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 text-left opacity-50 cursor-not-allowed"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-500">Firebase</p>
                    <p className="text-xs text-zinc-600 mt-0.5">5 GB storage, 100 GB egress free</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono leading-tight px-2 py-1 rounded-full bg-zinc-700/50 text-zinc-500">
                    Coming soon
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Firebase flow */}
        {provider === 'firebase' && (
          <>
            <p className="text-zinc-400 text-sm mb-8">Connect your Firebase project</p>

            {step === 'upload' && (
              <div className="w-full max-w-md space-y-6">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--crimson)]/15 text-[var(--crimson)] text-xs font-bold flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--cotton)]">Create a Firebase project</p>
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-zinc-300">Firestore Database</p>
                        <div className="mt-1 space-y-0.5 text-xs text-zinc-400">
                          <p>→ Standard → Location (closer to your users)</p>
                          <p>→ Start in production mode</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-300">Storage</p>
                        <div className="mt-1 space-y-0.5 text-xs text-zinc-400">
                          <p>→ Upgrade Project → Existing / New Billing Account</p>
                          <p>→ Link Cloud Billing Account → Blaze Plan</p>
                          <p>→ Pick a US region (<span className="text-zinc-300">us-central1</span>, <span className="text-zinc-300">us-east1</span>, or <span className="text-zinc-300">us-west1</span>) for 5 GB free storage</p>
                          <p>→ Start in production mode</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => chrome.tabs.create({ url: 'https://console.firebase.google.com/' })}
                      className="text-xs text-[var(--mustard)] hover:text-[var(--mustard)]/80 transition-colors mt-2"
                    >
                      Open Firebase Console →
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--crimson)]/15 text-[var(--crimson)] text-xs font-bold flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--cotton)]">Download the Service Account JSON</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Project Overview → Service Accounts → Generate New Private Key</p>
                  </div>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    data-testid="service-account-json"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFile(file)
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleFile(file)
                    }}
                    className={`w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center ${
                      dragOver
                        ? 'border-[var(--crimson)] bg-[var(--crimson)]/5'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-sm text-zinc-400">
                      Drop your Service Account JSON here, or <span className="text-[var(--crimson)]">click to browse</span>
                    </p>
                  </div>
                </div>

                {error && (
                  <p data-testid="error-message" className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  onClick={handleBackToProviderSelect}
                  className="w-full py-2 px-4 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors"
                >
                  ← Change provider
                </button>
              </div>
            )}

            {step === 'prerequisites' && projectId && (
              <div className="w-full max-w-md space-y-4">
                <p className="text-zinc-400 text-sm mb-2">
                  Project: <span className="font-mono text-zinc-300">{projectId}</span>
                </p>
                <p className="text-zinc-500 text-xs mb-4">
                  Ensure these are configured before continuing.
                </p>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-zinc-400">IAM roles on the service account:</p>
                      <button
                        onClick={() => setShowHelp(true)}
                        className="text-xs text-zinc-400 border-b border-dotted border-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        Help
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">
                      In the IAM page, find the <span className="text-zinc-300">firebase-adminsdk</span> service account and add these roles:
                    </p>
                    <div className="space-y-1 mb-2">
                      {['Cloud Functions Developer', 'Service Account User', 'Cloud Run Admin'].map((role) => (
                        <div key={role} className="flex items-center gap-2 text-xs text-zinc-300">
                          <span className="text-zinc-500">○</span>
                          {role}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => chrome.tabs.create({ url: `https://console.cloud.google.com/iam-admin/iam?project=${projectId}` })}
                      className="text-xs text-[var(--mustard)] hover:text-[var(--mustard)]/80 transition-colors"
                    >
                      Go to IAM page →
                    </button>
                  </div>

                  <div className="border-t border-zinc-700 pt-3">
                    <p className="text-xs text-zinc-400 mb-1.5">APIs that must be enabled:</p>
                    <div className="space-y-1">
                      {[
                        { name: 'Cloud Functions API', slug: 'cloudfunctions.googleapis.com' },
                        { name: 'Cloud Build API', slug: 'cloudbuild.googleapis.com' },
                        { name: 'Cloud Run Admin API', slug: 'run.googleapis.com' },
                      ].map((api) => (
                        <div key={api.slug} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-zinc-300">
                            <span className="text-zinc-500">○</span>
                            {api.name}
                          </div>
                          <button
                            onClick={() => chrome.tabs.create({ url: `https://console.cloud.google.com/apis/library/${api.slug}?project=${projectId}` })}
                            className="text-xs text-[var(--mustard)] hover:text-[var(--mustard)]/80 transition-colors"
                          >
                            Enable →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <p data-testid="error-message" className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  data-testid="connect-button"
                  onClick={handleFirebaseConnect}
                  disabled={connecting}
                  className="w-full py-2 px-4 bg-[var(--crimson)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.25)] active:scale-[0.97] disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-all"
                >
                  {connecting ? 'Connecting...' : 'Continue'}
                </button>

                <button
                  onClick={handleFirebaseBack}
                  disabled={connecting}
                  className="w-full py-2 px-4 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  ← Change service account
                </button>
              </div>
            )}
          </>
        )}

        {/* Convex flow */}
        {provider === 'convex' && (
          <>
            <p className="text-zinc-400 text-sm mb-8">Connect your Convex project</p>
            <div className="w-full max-w-md space-y-6">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--crimson)]/15 text-[var(--crimson)] text-xs font-bold flex items-center justify-center mt-0.5">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--cotton)]">Create a Convex project</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Sign up and create a new project at convex.dev</p>
                  <button
                    onClick={() => chrome.tabs.create({ url: 'https://dashboard.convex.dev/' })}
                    className="text-xs text-[var(--mustard)] hover:text-[var(--mustard)]/80 transition-colors mt-2"
                  >
                    Open Convex Dashboard →
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--crimson)]/15 text-[var(--crimson)] text-xs font-bold flex items-center justify-center mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--cotton)]">Generate a deploy keys</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Production (header) → Settings (Sidebar) → General → Deploy Keys → Generate</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Deploy Key</label>
                <input
                  type="password"
                  value={convexDeployKey}
                  onChange={(e) => { setConvexDeployKey(e.target.value); setError(null) }}
                  placeholder="prod:happy-animal-123|..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-[var(--cotton)] placeholder-zinc-600 focus:outline-none focus:border-[var(--crimson)]/50"
                />
              </div>

              {error && (
                <p data-testid="error-message" className="text-red-400 text-sm">{error}</p>
              )}

              <button
                data-testid="connect-button"
                onClick={handleConvexConnect}
                disabled={connecting || !convexDeployKey.trim()}
                className="w-full py-2 px-4 bg-[var(--crimson)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.25)] active:scale-[0.97] disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-all"
              >
                {connecting ? 'Connecting...' : 'Continue'}
              </button>

              <button
                onClick={handleBackToProviderSelect}
                disabled={connecting}
                className="w-full py-2 px-4 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                ← Change provider
              </button>
            </div>
          </>
        )}

        {/* Supabase flow */}
        {provider === 'supabase' && (
          <>
            <p className="text-zinc-400 text-sm mb-8">Connect your Supabase project</p>
            <div className="w-full max-w-md space-y-6">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--emerald)]/15 text-[var(--emerald)] text-xs font-bold flex items-center justify-center mt-0.5">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--cotton)]">Create a Supabase project</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Sign up and create a new project at supabase.com</p>
                  <button
                    onClick={() => chrome.tabs.create({ url: 'https://supabase.com/dashboard' })}
                    className="text-xs text-[var(--mustard)] hover:text-[var(--mustard)]/80 transition-colors mt-2"
                  >
                    Open Supabase Dashboard →
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--emerald)]/15 text-[var(--emerald)] text-xs font-bold flex items-center justify-center mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--cotton)]">Generate an Access Token</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Account → Access Tokens → Generate New Token</p>
                  <button
                    onClick={() => chrome.tabs.create({ url: 'https://supabase.com/dashboard/account/tokens' })}
                    className="text-xs text-[var(--mustard)] hover:text-[var(--mustard)]/80 transition-colors mt-2"
                  >
                    Go to Access Tokens →
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Project URL</label>
                <input
                  type="text"
                  value={supabaseProjectUrl}
                  onChange={(e) => { setSupabaseProjectUrl(e.target.value); setError(null) }}
                  placeholder="https://abcdefgh.supabase.co"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-[var(--cotton)] placeholder-zinc-600 focus:outline-none focus:border-[var(--emerald)]/50"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Access Token</label>
                <input
                  type="password"
                  value={supabaseAccessToken}
                  onChange={(e) => { setSupabaseAccessToken(e.target.value); setError(null) }}
                  placeholder="sbp_..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-[var(--cotton)] placeholder-zinc-600 focus:outline-none focus:border-[var(--emerald)]/50"
                />
              </div>

              {error && (
                <p data-testid="error-message" className="text-red-400 text-sm">{error}</p>
              )}

              <button
                data-testid="connect-button"
                onClick={handleSupabaseConnect}
                disabled={connecting || !supabaseProjectUrl.trim() || !supabaseAccessToken.trim()}
                className="w-full py-2 px-4 bg-[var(--crimson)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.25)] active:scale-[0.97] disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-all"
              >
                {connecting ? 'Connecting...' : 'Continue'}
              </button>

              <button
                onClick={handleBackToProviderSelect}
                disabled={connecting}
                className="w-full py-2 px-4 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                ← Change provider
              </button>
            </div>
          </>
        )}
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="relative mx-6 max-w-2xl rounded-xl border border-zinc-700 bg-[var(--warp-indigo)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--cotton)]">How to assign IAM roles</p>
              <button
                onClick={() => setShowHelp(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-zinc-400 space-y-2 p-3 bg-zinc-800/50 rounded-lg">
              <p>1. Go to the IAM page in Google Cloud Console</p>
              <p>2. Find the <span className="text-zinc-300">firebase-adminsdk</span> service account</p>
              <p>3. Click the pencil icon to edit</p>
              <p>4. Click "Add Another Role" and add each required role</p>
              <p>5. Click "Save"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
