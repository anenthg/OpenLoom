// OpenLoom Edge Function — deployed to user's Supabase project
// Function name: "openloom", deployed with --no-verify-jwt
//
// Routes:
//   GET  /openloom/v/{code}            → video metadata
//   POST /openloom/v/{code}/view       → increment view_count
//   GET  /openloom/v/{code}/reactions   → list reactions for video
//   POST /openloom/v/{code}/reactions   → add reaction (validate emoji + timestamp)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/openloom/, "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // GET /v/:code — video metadata
  const videoMatch = path.match(/^\/v\/([\w-]+)$/);
  if (videoMatch && req.method === "GET") {
    const code = videoMatch[1];
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("short_code", code)
      .single();
    if (error || !data) return json({ error: "Video not found" }, 404);
    return json(data);
  }

  // POST /v/:code/view — increment view count
  const viewMatch = path.match(/^\/v\/([\w-]+)\/view$/);
  if (viewMatch && req.method === "POST") {
    const code = viewMatch[1];
    const { data: video } = await supabase
      .from("videos")
      .select("id, view_count")
      .eq("short_code", code)
      .single();
    if (!video) return json({ error: "Video not found" }, 404);
    const { error } = await supabase
      .from("videos")
      .update({ view_count: video.view_count + 1 })
      .eq("id", video.id);
    if (error) return json({ error: "Failed to increment view" }, 500);
    return json({ ok: true });
  }

  // GET /v/:code/reactions — list reactions
  const reactionsGetMatch = path.match(/^\/v\/([\w-]+)\/reactions$/);
  if (reactionsGetMatch && req.method === "GET") {
    const code = reactionsGetMatch[1];
    const { data: video } = await supabase
      .from("videos")
      .select("id")
      .eq("short_code", code)
      .single();
    if (!video) return json({ error: "Video not found" }, 404);
    const { data, error } = await supabase
      .from("reactions")
      .select("*")
      .eq("video_id", video.id)
      .order("created_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json(data);
  }

  // POST /v/:code/reactions — add reaction
  const reactionsPostMatch = path.match(/^\/v\/([\w-]+)\/reactions$/);
  if (reactionsPostMatch && req.method === "POST") {
    const code = reactionsPostMatch[1];
    const body = await req.json();
    const { emoji, timestamp } = body;
    if (!emoji || typeof timestamp !== "number") {
      return json({ error: "emoji and timestamp are required" }, 400);
    }
    const { data: video } = await supabase
      .from("videos")
      .select("id")
      .eq("short_code", code)
      .single();
    if (!video) return json({ error: "Video not found" }, 404);
    const { data, error } = await supabase
      .from("reactions")
      .insert({ video_id: video.id, emoji, timestamp })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json(data, 201);
  }

  return json({ error: "Not found" }, 404);
});
