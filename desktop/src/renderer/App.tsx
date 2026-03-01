import { useState, useEffect } from 'react'
import type { AppSettings } from './lib/types'
import { initClient, resetClient } from './lib/supabase'
import SetupWizard from './components/SetupWizard'
import Provisioning from './components/Provisioning'
import Layout from './components/Layout'

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s.supabaseURL && s.serviceRoleKey && s.databasePassword) {
        initClient(s.supabaseURL, s.serviceRoleKey)
        setSettings(s)
      } else if (s.isProvisioned) {
        // TODO: Remove — temp dev skip with no credentials
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

  const isConfigured = !!(settings.supabaseURL && settings.serviceRoleKey && settings.databasePassword)

  if (isConfigured && !settings.isProvisioned) {
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
          resetClient()
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
        resetClient()
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
