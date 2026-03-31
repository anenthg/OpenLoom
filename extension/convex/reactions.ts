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
