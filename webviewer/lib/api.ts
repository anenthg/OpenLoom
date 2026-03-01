import type { Reaction } from "./reactions";

export interface VideoMeta {
  short_code: string;
  title: string;
  description: string | null;
  storage_url: string;
  view_count: number;
  duration_ms: number | null;
  capture_mode: string;
  created_at: string;
}

function apiBaseUrl(projectId: string): string {
  return `https://us-central1-${projectId}.cloudfunctions.net/thari`;
}

export async function fetchVideoMeta(
  projectId: string,
  code: string,
): Promise<VideoMeta> {
  const res = await fetch(`${apiBaseUrl(projectId)}/v/${code}`);
  if (!res.ok) {
    throw new Error(res.status === 404 ? "not_found" : "fetch_failed");
  }
  return res.json();
}

export async function incrementView(
  projectId: string,
  code: string,
): Promise<void> {
  fetch(`${apiBaseUrl(projectId)}/v/${code}/view`, { method: "POST" }).catch(
    () => {},
  );
}

export async function fetchReactions(
  projectId: string,
  code: string,
): Promise<Reaction[]> {
  const res = await fetch(`${apiBaseUrl(projectId)}/v/${code}/reactions`);
  if (!res.ok) return [];
  return res.json();
}

export async function addReaction(
  projectId: string,
  code: string,
  emoji: string,
  timestamp: number,
): Promise<void> {
  fetch(`${apiBaseUrl(projectId)}/v/${code}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji, timestamp }),
  }).catch(() => {});
}
