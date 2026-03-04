import { useState, useEffect } from 'react'
import type { AppSettings } from './lib/types'
import SetupWizard from './components/SetupWizard'
import Provisioning from './components/Provisioning'
import Layout from './components/Layout'

function isConfigured(s: AppSettings): boolean {
  const provider = s.provider || 'firebase'
  if (provider === 'convex') {
    return !!(s.convexDeployKey && s.convexDeploymentUrl)
  }
  // Firebase (default for backwards compat)
  return !!(s.firebaseProjectId && s.serviceAccountJson)
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      // Default provider to 'firebase' when undefined (backwards compat)
      if (!s.provider && s.firebaseProjectId) {
        s.provider = 'firebase'
      }
      if (isConfigured(s)) {
        setSettings(s)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-500">Loading...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <SetupWizard
        onConnect={(s) => {
          setSettings(s)
        }}
      />
    )
  }

  if (isConfigured(settings) && !settings.isProvisioned) {
    return (
      <Provisioning
        settings={settings}
        onComplete={async () => {
          const updated = { ...settings, isProvisioned: true }
          await window.api.saveSettings(updated)
          setSettings(updated)
        }}
        onDisconnect={() => {
          window.api.clearSettings()
          setSettings(null)
        }}
      />
    )
  }

  return (
    <Layout
      settings={settings}
      onDisconnect={() => {
        window.api.clearSettings()
        setSettings(null)
      }}
      onReprovision={() => {
        const updated = { ...settings, isProvisioned: false }
        setSettings(updated)
        window.api.saveSettings(updated)
      }}
    />
  )
}
