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
