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
