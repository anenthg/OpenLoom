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

function apiBaseUrl(provider: string, projectId: string): string {
  if (provider === "c") {
    return `https://${projectId}.convex.site`;
  }
  // Firebase (provider === "f")
  return `https://us-central1-${projectId}.cloudfunctions.net/openloom`;
}

export async function fetchVideoMeta(
  projectId: string,
  code: string,
  provider = "f",
): Promise<VideoMeta> {
  let url: string;
  if (provider === "c") {
    url = `${apiBaseUrl(provider, projectId)}/v?code=${encodeURIComponent(code)}`;
  } else {
    url = `${apiBaseUrl(provider, projectId)}/v/${code}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.status === 404 ? "not_found" : "fetch_failed");
  }
  return res.json();
}

export async function incrementView(
  projectId: string,
  code: string,
  provider = "f",
): Promise<void> {
  if (provider === "c") {
    fetch(`${apiBaseUrl(provider, projectId)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  } else {
    fetch(`${apiBaseUrl(provider, projectId)}/v/${code}/view`, {
      method: "POST",
    }).catch(() => {});
  }
}

export async function fetchReactions(
  projectId: string,
  code: string,
  provider = "f",
): Promise<Reaction[]> {
  let url: string;
  if (provider === "c") {
    url = `${apiBaseUrl(provider, projectId)}/reactions?code=${encodeURIComponent(code)}`;
  } else {
    url = `${apiBaseUrl(provider, projectId)}/v/${code}/reactions`;
  }

  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function addReaction(
  projectId: string,
  code: string,
  emoji: string,
  timestamp: number,
  provider = "f",
): Promise<void> {
  if (provider === "c") {
    fetch(`${apiBaseUrl(provider, projectId)}/reactions/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, emoji, timestamp }),
    }).catch(() => {});
  } else {
    fetch(`${apiBaseUrl(provider, projectId)}/v/${code}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, timestamp }),
    }).catch(() => {});
  }
}
