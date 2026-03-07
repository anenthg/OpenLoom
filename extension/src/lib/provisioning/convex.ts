import type { AppSettings } from '../types'
import type { ProvisioningStep, StepUpdateCallback } from './types'

export const CONVEX_FUNCTIONS_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg: string, data?: unknown): void {
  const ts = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[deploy-convex ${ts}] ${msg}`, data)
  } else {
    console.log(`[deploy-convex ${ts}] ${msg}`)
  }
}

// ---------------------------------------------------------------------------
// Embedded Convex function sources (same as desktop)
// ---------------------------------------------------------------------------

const CONVEX_SCHEMA_TS = `
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  videos: defineTable({
    short_code: v.string(),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    storage_url: v.string(),
    storage_id: v.optional(v.id("_storage")),
    view_count: v.number(),
    duration_ms: v.optional(v.union(v.number(), v.null())),
    capture_mode: v.string(),
    created_at: v.string(),
    is_protected: v.optional(v.boolean()),
    password_salt: v.optional(v.string()),
  })
    .index("by_short_code", ["short_code"])
    .index("by_created_at", ["created_at"]),

  reactions: defineTable({
    video_short_code: v.string(),
    emoji: v.string(),
    timestamp: v.number(),
    created_at: v.string(),
  }).index("by_video_short_code", ["video_short_code"]),
});
`.trim()

const CONVEX_VIDEOS_TS = `
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_short_code", (q) => q.eq("short_code", args.shortCode))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

export const insert = mutation({
  args: {
    short_code: v.string(),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    storage_url: v.string(),
    storage_id: v.optional(v.id("_storage")),
    view_count: v.number(),
    duration_ms: v.optional(v.union(v.number(), v.null())),
    capture_mode: v.string(),
    created_at: v.string(),
    is_protected: v.optional(v.boolean()),
    password_salt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("videos", args);
  },
});

export const incrementViewCount = mutation({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_short_code", (q) => q.eq("short_code", args.shortCode))
      .first();
    if (!video) throw new Error("Video not found");
    await ctx.db.patch(video._id, { view_count: video.view_count + 1 });
  },
});

export const remove = mutation({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_short_code", (q) => q.eq("short_code", args.shortCode))
      .first();
    if (!video) return;

    // Delete from storage if storage_id exists
    if (video.storage_id) {
      await ctx.storage.delete(video.storage_id);
    }

    // Delete all reactions for this video
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_video_short_code", (q) =>
        q.eq("video_short_code", args.shortCode)
      )
      .collect();
    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id);
    }

    // Delete the video
    await ctx.db.delete(video._id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
`.trim()

const CONVEX_REACTIONS_TS = `
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByVideo = query({
  args: { videoShortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reactions")
      .withIndex("by_video_short_code", (q) =>
        q.eq("video_short_code", args.videoShortCode)
      )
      .collect();
  },
});

export const add = mutation({
  args: {
    video_short_code: v.string(),
    emoji: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reactions", {
      video_short_code: args.video_short_code,
      emoji: args.emoji,
      timestamp: args.timestamp,
      created_at: new Date().toISOString(),
    });
  },
});
`.trim()

const CONVEX_HTTP_TS = `
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// GET /v?code=xxx -- video metadata
http.route({
  path: "/v",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400,
        headers: corsHeaders(),
      });
    }
    const video = await ctx.runQuery("videos:getByShortCode" as any, { shortCode: code });
    if (!video) {
      return new Response(JSON.stringify({ error: "Video not found" }), {
        status: 404,
        headers: corsHeaders(),
      });
    }
    return new Response(JSON.stringify(video), { headers: corsHeaders() });
  }),
});

// POST /view -- increment view count
http.route({
  path: "/view",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const code = (body as any).code;
    if (!code) {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400,
        headers: corsHeaders(),
      });
    }
    await ctx.runMutation("videos:incrementViewCount" as any, { shortCode: code });
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders() });
  }),
});

// GET /reactions?code=xxx -- list reactions
http.route({
  path: "/reactions",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400,
        headers: corsHeaders(),
      });
    }
    const reactions = await ctx.runQuery("reactions:listByVideo" as any, {
      videoShortCode: code,
    });
    return new Response(JSON.stringify(reactions), { headers: corsHeaders() });
  }),
});

// POST /reactions/add -- add reaction
http.route({
  path: "/reactions/add",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { code, emoji, timestamp } = body as any;
    if (!code || !emoji || typeof timestamp !== "number") {
      return new Response(
        JSON.stringify({ error: "code, emoji, and timestamp are required" }),
        { status: 400, headers: corsHeaders() }
      );
    }
    await ctx.runMutation("reactions:add" as any, {
      video_short_code: code,
      emoji,
      timestamp,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: corsHeaders(),
    });
  }),
});

// GET /video -- 302 redirect to fresh signed storage URL
http.route({
  path: "/video",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response("code is required", { status: 400 });
    }
    const video = await ctx.runQuery("videos:getByShortCode" as any, { shortCode: code });
    if (!video || !video.storage_id) {
      return new Response("Video not found", { status: 404 });
    }
    const storageUrl = await ctx.storage.getUrl(video.storage_id);
    if (!storageUrl) {
      return new Response("Storage URL not available", { status: 404 });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: storageUrl, "Cache-Control": "no-cache" },
    });
  }),
});

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Handle CORS preflight for all routes
http.route({
  path: "/v",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});
http.route({
  path: "/view",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});
http.route({
  path: "/reactions",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});
http.route({
  path: "/reactions/add",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});
http.route({
  path: "/video",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

export default http;
`.trim()

// ---------------------------------------------------------------------------
// Convex deployment API helpers
// ---------------------------------------------------------------------------

/**
 * Parse the deploy key to extract deployment name and URL.
 * Deploy key format: "prod:<deployment-name>|<secret>"
 */
function parseDeployKey(deployKey: string): {
  deploymentName: string
  deploymentUrl: string
} {
  const parts = deployKey.split('|')
  if (parts.length < 2) {
    throw new Error('Invalid deploy key format')
  }
  const prefix = parts[0] // e.g., "prod:happy-animal-123"
  const colonIdx = prefix.indexOf(':')
  if (colonIdx < 0) {
    throw new Error('Invalid deploy key format -- expected "prod:<deployment>|<secret>"')
  }
  const deploymentName = prefix.slice(colonIdx + 1)
  return {
    deploymentName,
    deploymentUrl: `https://${deploymentName}.convex.cloud`,
  }
}

/**
 * Build the module definitions for the Convex push API.
 * Each module maps to a source file inside the convex/ directory.
 */
function buildModules(): { path: string; source: string; environment: string }[] {
  return [
    { path: 'schema.js', source: CONVEX_SCHEMA_TS, environment: 'isolate' },
    { path: 'videos.js', source: CONVEX_VIDEOS_TS, environment: 'isolate' },
    { path: 'reactions.js', source: CONVEX_REACTIONS_TS, environment: 'isolate' },
    { path: 'http.js', source: CONVEX_HTTP_TS, environment: 'node' },
  ]
}

/**
 * Common headers for Convex deployment API calls.
 */
function convexHeaders(adminKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Convex ${adminKey}`,
    'Convex-Client': 'npm-cli-1.32.0',
  }
}

/**
 * Start a push: sends module sources to the Convex deployment.
 * Returns schema change info if a schema migration is needed.
 *
 * Uses the deploy2 API which expects:
 * - functions: string (directory name, e.g. "convex")
 * - appDefinition: { schema, changedModules, unchangedModuleHashes, udfServerVersion }
 * - componentDefinitions: []
 * - nodeDependencies: []
 */
async function startPush(
  deploymentUrl: string,
  adminKey: string,
  modules: { path: string; source: string; environment: string }[],
): Promise<{ schemaChange?: { schemaId: string } }> {
  const url = `${deploymentUrl}/api/deploy2/start_push`
  log(`Starting push to ${url}`)

  // Separate schema from function modules
  const schemaModule = modules.find((m) => m.path === 'schema.js')
  const functionModules = modules.filter((m) => m.path !== 'schema.js')

  const res = await fetch(url, {
    method: 'POST',
    headers: convexHeaders(adminKey),
    body: JSON.stringify({
      adminKey,
      dryRun: false,
      functions: 'convex',
      appDefinition: {
        schema: schemaModule
          ? { path: schemaModule.path, source: schemaModule.source, sourceMap: null, environment: schemaModule.environment }
          : null,
        changedModules: functionModules.map((m) => ({
          path: m.path,
          source: m.source,
          sourceMap: null,
          environment: m.environment,
        })),
        unchangedModuleHashes: [],
        udfServerVersion: '1.32.0',
        dependencies: [],
      },
      componentDefinitions: [],
      nodeDependencies: [],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`start_push failed: ${res.status} ${text}`)
  }

  const body = await res.json()
  log('start_push response:', body)
  return body as { schemaChange?: { schemaId: string } }
}

/**
 * Wait for schema validation to complete after a push that includes
 * schema changes. Polls until the schema is validated or times out.
 */
async function waitForSchema(
  deploymentUrl: string,
  adminKey: string,
  schemaId: string,
  timeoutMs = 60_000,
): Promise<void> {
  const url = `${deploymentUrl}/api/deploy2/wait_for_schema`
  log(`Waiting for schema validation: schemaId=${schemaId}`)

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(url, {
      method: 'POST',
      headers: convexHeaders(adminKey),
      body: JSON.stringify({
        adminKey,
        schemaId,
      }),
    })

    if (res.ok) {
      const body = await res.json()
      log('wait_for_schema response:', body)
      return
    }

    const text = await res.text()
    // Schema may still be validating -- retry
    if (res.status === 400 || res.status === 409) {
      log(`Schema still validating (${res.status}), retrying in 2s...`)
      await new Promise((r) => setTimeout(r, 2_000))
      continue
    }

    throw new Error(`wait_for_schema failed: ${res.status} ${text}`)
  }

  throw new Error('Timed out waiting for Convex schema validation')
}

/**
 * Finish the push to finalize the deployment and make functions live.
 */
async function finishPush(
  deploymentUrl: string,
  adminKey: string,
): Promise<void> {
  const url = `${deploymentUrl}/api/deploy2/finish_push`
  log(`Finishing push to ${url}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: convexHeaders(adminKey),
    body: JSON.stringify({
      adminKey,
      dryRun: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`finish_push failed: ${res.status} ${text}`)
  }

  const body = await res.json()
  log('finish_push response:', body)
}

// ---------------------------------------------------------------------------
// Main deployment function
// ---------------------------------------------------------------------------

export async function deployConvex(
  settings: AppSettings,
  onProgress: StepUpdateCallback,
): Promise<boolean> {
  const deployKey = settings.convexDeployKey

  if (!deployKey) {
    const steps: ProvisioningStep[] = [
      {
        id: 'validate',
        label: 'Validating settings...',
        status: 'error',
        error: 'Missing Convex deploy key.',
      },
    ]
    onProgress(steps)
    return false
  }

  const steps: ProvisioningStep[] = [
    { id: 'verify-access', label: 'Verifying Convex deployment access...', status: 'pending' },
    { id: 'push-functions', label: 'Pushing schema & functions...', status: 'pending' },
    { id: 'wait-schema', label: 'Validating schema...', status: 'pending' },
    { id: 'finalize', label: 'Finalizing deployment...', status: 'pending' },
  ]

  function updateStep(id: string, update: Partial<ProvisioningStep>) {
    const step = steps.find((s) => s.id === id)
    if (step) Object.assign(step, update)
    onProgress([...steps])
  }

  log('=== Starting Convex deployment ===')

  try {
    // Parse deploy key to extract deployment URL
    const { deploymentName, deploymentUrl: parsedUrl } = parseDeployKey(deployKey)
    const deploymentUrl = settings.convexDeploymentUrl || parsedUrl

    log(`Deployment: ${deploymentName}, URL: ${deploymentUrl}`)

    // Step 1: Verify access by testing the deployment endpoint
    updateStep('verify-access', { status: 'running' })
    log('Step 1/4: Verifying Convex access...')

    const testRes = await fetch(`${deploymentUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Convex ${deployKey}`,
      },
      body: JSON.stringify({ path: 'videos:list', args: {} }),
    })

    // 400 "function not found" is expected before first deployment -- means auth works
    if (!testRes.ok && testRes.status !== 400) {
      if (testRes.status === 401 || testRes.status === 403) {
        throw new Error('Invalid deploy key -- authentication failed')
      }
      const text = await testRes.text()
      throw new Error(`Convex connection failed: ${testRes.status} ${text}`)
    }

    updateStep('verify-access', { status: 'done' })
    log('Step 1/4: Convex access verified')

    // Step 2: Start push with schema and function definitions
    updateStep('push-functions', { status: 'running' })
    log('Step 2/4: Pushing schema & function definitions...')

    const modules = buildModules()
    const pushResult = await startPush(deploymentUrl, deployKey, modules)
    updateStep('push-functions', { status: 'done' })
    log('Step 2/4: Push started successfully')

    // Step 3: Wait for schema validation if there is a schema change
    updateStep('wait-schema', { status: 'running' })
    if (pushResult.schemaChange?.schemaId) {
      log('Step 3/4: Schema change detected, waiting for validation...')
      await waitForSchema(deploymentUrl, deployKey, pushResult.schemaChange.schemaId)
    } else {
      log('Step 3/4: No schema change, skipping validation wait')
    }
    updateStep('wait-schema', { status: 'done' })
    log('Step 3/4: Schema validation complete')

    // Step 4: Finalize the push
    updateStep('finalize', { status: 'running' })
    log('Step 4/4: Finalizing deployment...')
    await finishPush(deploymentUrl, deployKey)
    updateStep('finalize', { status: 'done' })
    log('Step 4/4: Deployment finalized')

    log('=== Convex deployment finished ===')
    return true
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    log(`=== Convex deployment FAILED: ${errMsg} ===`)
    const activeStep = steps.find((s) => s.status === 'running' || s.status === 'waiting')
    if (activeStep) {
      updateStep(activeStep.id, { status: 'error', error: errMsg })
    }
    return false
  }
}
