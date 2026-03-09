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
