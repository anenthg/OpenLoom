import { usePermissions } from '../../lib/recording/usePermissions'
import type { PermissionEntry } from '../../lib/recording/usePermissions'

interface PermissionGateProps {
  onContinue: () => void
}

function PermissionRow({
  entry,
  onRequest,
}: {
  entry: PermissionEntry
  onRequest: () => void
}) {
  const granted = entry.status === 'granted'

  return (
    <div className="flex items-start gap-3 py-3">
      <span className={`mt-0.5 text-lg ${granted ? 'text-green-400' : 'text-red-400'}`}>
        {granted ? '✓' : '✗'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{entry.label}</span>
          {!entry.mandatory && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
              optional
            </span>
          )}
        </div>
        {!granted && (
          <p className="text-xs text-zinc-500 mt-1">{entry.instruction}</p>
        )}
      </div>
      {!granted && (
        <button
          onClick={onRequest}
          className="px-3 py-1.5 text-xs rounded-lg transition-all duration-200 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 whitespace-nowrap"
        >
          {entry.requestable ? 'Grant Access' : 'Open Settings'}
        </button>
      )}
    </div>
  )
}

export default function PermissionGate({ onContinue }: PermissionGateProps) {
  const { permissions, allMandatoryGranted, loading, requestPermission } = usePermissions()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Checking permissions…
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold text-zinc-200 mb-1">Permissions Required</h2>
        <p className="text-sm text-zinc-500 mb-5">
          Thari.video needs access to your screen and microphone to record. Camera is optional
          for the webcam overlay.
        </p>

        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 divide-y divide-zinc-800">
          {permissions.map((entry) => (
            <PermissionRow
              key={entry.key}
              entry={entry}
              onRequest={() => requestPermission(entry.key)}
            />
          ))}
        </div>

        <button
          disabled={!allMandatoryGranted}
          onClick={onContinue}
          className="mt-5 w-full py-2.5 rounded-lg font-medium text-sm transition-all bg-[var(--crimson)] text-white hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,43,43,0.25)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
