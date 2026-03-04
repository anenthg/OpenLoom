import type { AppSettings } from '../lib/types'

interface Props {
  settings: AppSettings
  onDisconnect: () => void
  onReprovision: () => void
}

export default function Settings({ settings, onDisconnect, onReprovision }: Props) {
  const provider = settings.provider || 'firebase'

  return (
    <div data-testid="settings-view" className="p-8 max-w-lg">
      <h2 className="text-xl font-bold mb-6">Settings</h2>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Backend Provider
          </label>
          <p className="text-white capitalize">{provider}</p>
        </div>

        {provider === 'convex' ? (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Convex Deployment
            </label>
            <p data-testid="settings-project-id" className="text-white font-mono text-sm">
              {settings.convexDeploymentName}
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Firebase Project ID
            </label>
            <p data-testid="settings-project-id" className="text-white">
              {settings.firebaseProjectId}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Provisioned
          </label>
          <p className="text-white">
            {settings.isProvisioned ? '✓ Yes' : '✗ Not yet'}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          data-testid="reprovision-button"
          onClick={onReprovision}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-all duration-200"
        >
          Re-provision
        </button>

        <button
          data-testid="disconnect-button"
          onClick={onDisconnect}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.2)] rounded-lg text-sm font-medium transition-all duration-200"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}
