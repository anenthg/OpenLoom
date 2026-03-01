import { getClient } from './supabase'
import type { AppSettings } from './types'

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

export interface ProvisioningStep {
  id: string
  label: string
  status: StepStatus
  error?: string
}

interface StepResult {
  ok: boolean
  error?: string
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS videos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code   TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    storage_url  TEXT NOT NULL,
    view_count   INT NOT NULL DEFAULT 0,
    duration_ms  INT,
    capture_mode TEXT NOT NULL DEFAULT 'screen',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read' AND tablename = 'videos') THEN
    CREATE POLICY "public_read" ON videos FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_insert' AND tablename = 'videos') THEN
    CREATE POLICY "public_insert" ON videos FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS reactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    emoji      TEXT NOT NULL,
    timestamp  REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reactions_video_id ON reactions(video_id);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reactions_read' AND tablename = 'reactions') THEN
    CREATE POLICY "reactions_read" ON reactions FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reactions_insert' AND tablename = 'reactions') THEN
    CREATE POLICY "reactions_insert" ON reactions FOR INSERT WITH CHECK (true);
  END IF;
END $$;
`

async function createTables(settings: AppSettings): Promise<StepResult> {
  try {
    return await window.api.executeDDL(
      settings.supabaseRef!,
      settings.databasePassword!,
      CREATE_TABLES_SQL,
    )
  } catch (e) {
    return { ok: false, error: `Database setup failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

async function createStorageBucket(): Promise<StepResult> {
  try {
    const { error } = await getClient().storage.createBucket('videos', { public: true })

    if (error) {
      // Bucket already exists — not an error
      if (error.message?.includes('already exists')) {
        return { ok: true }
      }
      return { ok: false, error: `Storage bucket creation failed: ${error.message}` }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Storage bucket creation failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export type StepUpdateCallback = (steps: ProvisioningStep[]) => void

export async function runProvisioning(
  settings: AppSettings,
  onUpdate: StepUpdateCallback,
): Promise<boolean> {
  const steps: ProvisioningStep[] = [
    { id: 'tables', label: 'Creating database tables...', status: 'pending' },
    { id: 'storage', label: 'Setting up storage bucket...', status: 'pending' },
  ]

  function updateStep(id: string, update: Partial<ProvisioningStep>) {
    const step = steps.find((s) => s.id === id)
    if (step) Object.assign(step, update)
    onUpdate([...steps])
  }

  // Step 1: Tables
  updateStep('tables', { status: 'running' })
  const tablesResult = await createTables(settings)
  if (!tablesResult.ok) {
    updateStep('tables', { status: 'error', error: tablesResult.error })
    return false
  }
  updateStep('tables', { status: 'done' })

  // Step 2: Storage bucket
  updateStep('storage', { status: 'running' })
  const storageResult = await createStorageBucket()
  if (!storageResult.ok) {
    updateStep('storage', { status: 'error', error: storageResult.error })
    return false
  }
  updateStep('storage', { status: 'done' })

  return true
}
