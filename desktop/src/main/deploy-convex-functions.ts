import { execFile } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export const CONVEX_FUNCTIONS_VERSION = '1.0.0'

export type ConvexDeployStage =
  | 'verify-access'
  | 'verify-storage'
  | 'deploy-functions'

// ---------------------------------------------------------------------------
// Embedded Convex function sources
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

// GET /v/:code — video metadata
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

// POST /view — increment view count
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

// GET /reactions — list reactions
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

// POST /reactions — add reaction
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

// GET /video — 302 redirect to fresh signed storage URL
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

const CONVEX_PACKAGE_JSON = JSON.stringify(
  {
    name: 'openloom-convex',
    version: '1.0.0',
    private: true,
    dependencies: {
      convex: '^1.17.0',
    },
  },
  null,
  2,
)

const CONVEX_TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      skipLibCheck: true,
    },
    include: ['convex'],
  },
  null,
  2,
)

// ---------------------------------------------------------------------------
// Deployment
// ---------------------------------------------------------------------------

interface DeployConvexResult {
  ok: boolean
  error?: string
}

function log(msg: string, data?: unknown): void {
  const ts = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[deploy-convex ${ts}] ${msg}`, data)
  } else {
    console.log(`[deploy-convex ${ts}] ${msg}`)
  }
}

function findBin(name: string): string {
  // On macOS, Electron doesn't inherit PATH from shell — try common locations
  const candidates = [
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    `${process.env.HOME}/.nvm/current/bin/${name}`,
    name, // fallback to PATH
  ]
  for (const c of candidates) {
    try {
      if (c === name) return c
      if (existsSync(c)) return c
    } catch {
      // continue
    }
  }
  return name
}

export async function deployConvexFunctions(
  deployKey: string,
  onProgress?: (stage: ConvexDeployStage) => void,
): Promise<DeployConvexResult> {
  const tmpDir = join(tmpdir(), `openloom-convex-${Date.now()}`)

  try {
    log('=== Starting Convex deployment ===')

    // Create temp directory with convex/ subfolder
    onProgress?.('deploy-functions')
    const convexDir = join(tmpDir, 'convex')
    mkdirSync(convexDir, { recursive: true })

    // Write files
    writeFileSync(join(tmpDir, 'package.json'), CONVEX_PACKAGE_JSON)
    writeFileSync(join(tmpDir, 'tsconfig.json'), CONVEX_TSCONFIG)
    writeFileSync(join(convexDir, 'schema.ts'), CONVEX_SCHEMA_TS)
    writeFileSync(join(convexDir, 'videos.ts'), CONVEX_VIDEOS_TS)
    writeFileSync(join(convexDir, 'reactions.ts'), CONVEX_REACTIONS_TS)
    writeFileSync(join(convexDir, 'http.ts'), CONVEX_HTTP_TS)

    log(`Files written to ${tmpDir}`)

    // Install convex dependency
    log('Installing convex dependency...')
    await runCommand(findBin('npm'), ['install'], tmpDir)
    log('Dependencies installed')

    // Run convex deploy
    log('Running npx convex deploy...')
    const deployResult = await runCommand(
      findBin('npx'),
      ['--yes', 'convex', 'deploy'],
      tmpDir,
      { CONVEX_DEPLOY_KEY: deployKey },
    )
    log('Convex deploy output:', deployResult)

    log('=== Convex deployment finished ===')
    return { ok: true }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    log(`=== Convex deployment FAILED: ${errMsg} ===`)
    return { ok: false, error: `Convex deployment failed: ${errMsg}` }
  } finally {
    // Cleanup temp directory
    try {
      rmSync(tmpDir, { recursive: true, force: true })
      log(`Cleaned up ${tmpDir}`)
    } catch {
      // ignore cleanup errors
    }
  }
}

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      cmd,
      args,
      {
        cwd,
        env: { ...process.env, ...env },
        timeout: 300_000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr || error.message}`))
        } else {
          resolve(stdout)
        }
      },
    )
    // Log output in real time
    proc.stdout?.on('data', (data) => log(`[stdout] ${data}`))
    proc.stderr?.on('data', (data) => log(`[stderr] ${data}`))
  })
}
