import { net } from 'electron'

export const SUPABASE_FUNCTIONS_VERSION = '1.0.0'

export type SupabaseDeployStage =
  | 'verify-access'
  | 'verify-storage'
  | 'deploy-functions'

// ---------------------------------------------------------------------------
// SQL for table setup
// ---------------------------------------------------------------------------

const SETUP_SQL = `
-- Create tables if they don't exist yet
CREATE TABLE IF NOT EXISTS videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  storage_url text NOT NULL,
  view_count integer DEFAULT 0,
  duration_ms integer,
  capture_mode text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_protected boolean DEFAULT false,
  password_salt text
);

CREATE TABLE IF NOT EXISTS reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_short_code text NOT NULL,
  emoji text NOT NULL,
  timestamp real NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Migrate videos table from older schemas
DO $$ BEGIN
  -- short_code (was missing in early schemas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='short_code') THEN
    ALTER TABLE videos ADD COLUMN short_code text UNIQUE;
    UPDATE videos SET short_code = substr(gen_random_uuid()::text, 1, 8) WHERE short_code IS NULL;
    ALTER TABLE videos ALTER COLUMN short_code SET NOT NULL;
  END IF;
  -- storage_url (older schema used storage_path)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='storage_url') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='storage_path') THEN
      ALTER TABLE videos RENAME COLUMN storage_path TO storage_url;
    ELSE
      ALTER TABLE videos ADD COLUMN storage_url text NOT NULL DEFAULT '';
    END IF;
  END IF;
  -- duration_ms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='duration_ms') THEN
    ALTER TABLE videos ADD COLUMN duration_ms integer;
  END IF;
  -- view_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='view_count') THEN
    ALTER TABLE videos ADD COLUMN view_count integer DEFAULT 0;
  END IF;
  -- capture_mode
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='capture_mode') THEN
    ALTER TABLE videos ADD COLUMN capture_mode text NOT NULL DEFAULT 'screen';
  END IF;
  -- is_protected
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='is_protected') THEN
    ALTER TABLE videos ADD COLUMN is_protected boolean DEFAULT false;
  END IF;
  -- password_salt
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='password_salt') THEN
    ALTER TABLE videos ADD COLUMN password_salt text;
  END IF;
END $$;

-- Migrate reactions table from older schemas
DO $$ BEGIN
  -- video_short_code (older schema used video_id uuid)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reactions' AND column_name='video_short_code') THEN
    ALTER TABLE reactions ADD COLUMN video_short_code text NOT NULL DEFAULT '';
    -- Backfill from video_id if the old column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reactions' AND column_name='video_id') THEN
      UPDATE reactions r SET video_short_code = v.short_code
        FROM videos v WHERE v.id = r.video_id;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_videos_short_code ON videos(short_code);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_video ON reactions(video_short_code);

-- RLS policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'videos' AND policyname = 'Allow service role full access on videos') THEN
    CREATE POLICY "Allow service role full access on videos" ON videos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reactions' AND policyname = 'Allow service role full access on reactions') THEN
    CREATE POLICY "Allow service role full access on reactions" ON reactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`.trim()

// ---------------------------------------------------------------------------
// Edge Function source
// ---------------------------------------------------------------------------

const EDGE_FUNCTION_SOURCE = `
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const fnIdx = segments.indexOf("openloom");
  const subPath = "/" + segments.slice(fnIdx + 1).join("/");

  try {
    // GET /v?code=xxx — video metadata
    if (subPath === "/v" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response(JSON.stringify({ error: "code is required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("short_code", code)
        .single();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Video not found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // POST /view — increment view count
    if (subPath === "/view" && req.method === "POST") {
      const body = await req.json();
      const code = body.code;
      if (!code) {
        return new Response(JSON.stringify({ error: "code is required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      await supabase.rpc("increment_view_count", { p_short_code: code });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // GET /reactions?code=xxx — list reactions
    if (subPath === "/reactions" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response(JSON.stringify({ error: "code is required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      const { data } = await supabase
        .from("reactions")
        .select("*")
        .eq("video_short_code", code);
      return new Response(JSON.stringify(data || []), { headers: corsHeaders });
    }

    // POST /reactions/add — add reaction
    if (subPath === "/reactions/add" && req.method === "POST") {
      const body = await req.json();
      const { code, emoji, timestamp } = body;
      if (!code || !emoji || typeof timestamp !== "number") {
        return new Response(
          JSON.stringify({ error: "code, emoji, and timestamp are required" }),
          { status: 400, headers: corsHeaders }
        );
      }
      await supabase.from("reactions").insert({
        video_short_code: code,
        emoji,
        timestamp,
        created_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
`.trim()

// Also need an RPC for incrementing view count
const INCREMENT_VIEW_COUNT_SQL = `
CREATE OR REPLACE FUNCTION increment_view_count(p_short_code text)
RETURNS void AS $$
BEGIN
  UPDATE videos SET view_count = view_count + 1 WHERE short_code = p_short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`.trim()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string, data?: unknown): void {
  const ts = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[deploy-supabase ${ts}] ${msg}`, data)
  } else {
    console.log(`[deploy-supabase ${ts}] ${msg}`)
  }
}

// ---------------------------------------------------------------------------
// Database setup via Management API
// ---------------------------------------------------------------------------

export async function setupSupabaseDatabase(
  projectRef: string,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    log('Setting up database tables...')

    // Run main schema SQL
    const schemaRes = await net.fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: SETUP_SQL }),
      },
    )

    if (!schemaRes.ok) {
      const text = await schemaRes.text()
      throw new Error(`Database setup failed: ${schemaRes.status} ${text}`)
    }

    // Run RPC function creation
    const rpcRes = await net.fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: INCREMENT_VIEW_COUNT_SQL }),
      },
    )

    if (!rpcRes.ok) {
      const text = await rpcRes.text()
      throw new Error(`RPC function setup failed: ${rpcRes.status} ${text}`)
    }

    log('Database tables created successfully')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Database setup failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ---------------------------------------------------------------------------
// Storage setup
// ---------------------------------------------------------------------------

export async function setupSupabaseStorage(
  projectUrl: string,
  serviceRoleKey: string,
  projectRef: string,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    log('Setting up storage bucket...')
    const url = projectUrl.replace(/\/+$/, '')
    const FILE_SIZE_LIMIT = 524288000 // 500 MB

    // Raise the project-level upload size limit (default 50 MB) via Management API.
    // Without this, TUS CREATE rejects large files with 413 before the bucket limit
    // is even checked.
    try {
      const configRes = await net.fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/config/storage`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileSizeLimit: FILE_SIZE_LIMIT }),
        },
      )
      if (!configRes.ok) {
        const text = await configRes.text()
        log(`Warning: could not update project storage config: ${configRes.status} ${text}`)
      } else {
        log('Project-level storage file size limit set to 500 MB')
      }
    } catch (e) {
      log(`Warning: failed to update project storage config: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Create 'videos' bucket with public read
    const res = await net.fetch(`${url}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'videos',
        name: 'videos',
        public: true,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      // 409 = bucket already exists — that's fine, we'll update below
      if (res.status !== 409 && !text.includes('already exists')) {
        throw new Error(`Storage bucket creation failed: ${res.status} ${text}`)
      }
      log('Storage bucket already exists, will update settings...')
    } else {
      log('Storage bucket created successfully')
    }

    // Always update bucket to ensure public access + file size limit
    const updateRes = await net.fetch(`${url}/storage/v1/bucket/videos`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public: true, file_size_limit: FILE_SIZE_LIMIT }),
    })
    if (!updateRes.ok) {
      const updateText = await updateRes.text()
      log(`Warning: could not update bucket settings: ${updateRes.status} ${updateText}`)
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Storage setup failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ---------------------------------------------------------------------------
// Edge Function deployment
// ---------------------------------------------------------------------------

export async function deploySupabaseEdgeFunction(
  projectRef: string,
  accessToken: string,
  onProgress?: (stage: SupabaseDeployStage) => void,
): Promise<{ ok: boolean; error?: string }> {
  try {
    log('=== Starting Supabase Edge Function deployment ===')
    onProgress?.('deploy-functions')

    // Deploy via Supabase Management API (no CLI / Node.js required)
    log('Deploying edge function via Management API...')

    const metadata = JSON.stringify({
      entrypoint_path: 'index.ts',
      name: 'openloom',
      verify_jwt: false,
    })

    // Build multipart/form-data manually since Electron's net.fetch
    // doesn't support the FormData API
    const boundary = `----OpenLoomBoundary${Date.now()}`
    const sourceBytes = new TextEncoder().encode(EDGE_FUNCTION_SOURCE)

    const parts: Uint8Array[] = []
    const enc = (s: string) => new TextEncoder().encode(s)

    // metadata part
    parts.push(enc(`--${boundary}\r\n`))
    parts.push(enc('Content-Disposition: form-data; name="metadata"\r\n'))
    parts.push(enc('Content-Type: application/json\r\n\r\n'))
    parts.push(enc(metadata))
    parts.push(enc('\r\n'))

    // file part
    parts.push(enc(`--${boundary}\r\n`))
    parts.push(enc('Content-Disposition: form-data; name="file"; filename="index.ts"\r\n'))
    parts.push(enc('Content-Type: application/typescript\r\n\r\n'))
    parts.push(sourceBytes)
    parts.push(enc('\r\n'))

    // closing boundary
    parts.push(enc(`--${boundary}--\r\n`))

    // Concatenate all parts into a single Uint8Array
    const totalLength = parts.reduce((sum, p) => sum + p.byteLength, 0)
    const body = new Uint8Array(totalLength)
    let offset = 0
    for (const p of parts) {
      body.set(p, offset)
      offset += p.byteLength
    }

    const res = await net.fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=openloom`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: body.buffer,
      },
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Management API returned ${res.status}: ${text}`)
    }

    log('Edge function deployed successfully via Management API')
    log('=== Supabase Edge Function deployment finished ===')
    return { ok: true }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    log(`=== Supabase Edge Function deployment FAILED: ${errMsg} ===`)
    return { ok: false, error: `Supabase deployment failed: ${errMsg}` }
  }
}

// ---------------------------------------------------------------------------
// Combined deployment
// ---------------------------------------------------------------------------

export async function deploySupabaseFunctions(
  projectRef: string,
  accessToken: string,
  projectUrl: string,
  serviceRoleKey: string,
  onProgress?: (stage: SupabaseDeployStage) => void,
): Promise<{ ok: boolean; error?: string }> {
  // Step 1: Setup database
  const dbResult = await setupSupabaseDatabase(projectRef, accessToken)
  if (!dbResult.ok) return dbResult

  // Step 2: Setup storage
  const storageResult = await setupSupabaseStorage(projectUrl, serviceRoleKey, projectRef, accessToken)
  if (!storageResult.ok) return storageResult

  // Step 3: Deploy edge function
  return deploySupabaseEdgeFunction(projectRef, accessToken, onProgress)
}
