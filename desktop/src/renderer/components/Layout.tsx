import { type ReactNode, useState } from 'react'
import type { AppSettings } from '../lib/types'
import Library from './Library'
import Recording from './Recording'
import Settings from './Settings'
import { FolderIcon, RecordIcon, GearIcon } from './icons'

type Tab = 'library' | 'record' | 'settings'

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'library', label: 'Library', icon: <FolderIcon className="w-5 h-5" /> },
  { id: 'record', label: 'Record', icon: <RecordIcon className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <GearIcon className="w-5 h-5" /> },
]

interface Props {
  settings: AppSettings
  onDisconnect: () => void
  onReprovision: () => void
}

export default function Layout({ settings, onDisconnect, onReprovision }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('library')

  return (
    <div className="flex h-screen">
      <nav
        data-testid="sidebar"
        className="w-48 bg-zinc-900 border-r border-zinc-800 p-3 flex flex-col gap-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-800/80 text-[var(--crimson)] border-l-2 border-[var(--crimson)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-auto">
        <div className="stripe-divider-slow h-[3px]" />
        {activeTab === 'library' && <Library settings={settings} />}
        {activeTab === 'record' && <Recording />}
        {activeTab === 'settings' && (
          <Settings settings={settings} onDisconnect={onDisconnect} onReprovision={onReprovision} />
        )}
      </main>
    </div>
  )
}
