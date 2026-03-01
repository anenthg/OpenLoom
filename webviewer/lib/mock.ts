/**
 * Mock API layer for development.
 *
 * When USE_MOCK is true, all edge function calls are intercepted and return
 * fake data so the viewer can be developed without deployed edge functions.
 *
 * Toggle by setting NEXT_PUBLIC_USE_MOCK=true in .env.local
 */

import type { Reaction } from "./reactions";
import type { VideoMeta } from "./api";

export const USE_MOCK =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_MOCK === "true";

const MOCK_VIDEO_META: VideoMeta = {
  short_code: "abc123",
  title: "Getting Started with Thari",
  description:
    "A quick walkthrough of how to record and share your screen with Thari.",
  storage_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  view_count: 42,
  duration_ms: 30000,
  capture_mode: "screen",
  created_at: new Date().toISOString(),
};

const MOCK_REACTIONS: Reaction[] = [
  {
    id: "mock-1",
    emoji: "\uD83D\uDD25",
    timestamp: 5.2,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-2",
    emoji: "\uD83D\uDC4D",
    timestamp: 12.8,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-3",
    emoji: "\u2764\uFE0F",
    timestamp: 12.9,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-4",
    emoji: "\uD83C\uDF89",
    timestamp: 25.0,
    created_at: new Date().toISOString(),
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mock = {
  async fetchVideoMeta(
    _projectId: string,
    code: string,
  ): Promise<VideoMeta> {
    await delay(300);
    if (code === "00000") {
      throw new Error("not_found");
    }
    return MOCK_VIDEO_META;
  },

  async incrementView(): Promise<void> {
    // no-op
  },

  async fetchReactions(): Promise<Reaction[]> {
    await delay(200);
    return MOCK_REACTIONS;
  },

  async addReaction(): Promise<void> {
    // no-op
  },

  async assembleVideoBlob(): Promise<string> {
    await delay(200);
    return MOCK_VIDEO_META.storage_url;
  },
};
