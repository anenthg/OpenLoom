/**
 * Shared slug-parsing utilities for video routes.
 * Works both server-side (Buffer) and client-side (atob).
 */

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  return atob(padded);
}

export interface ParsedSlug {
  provider: string;
  projectId: string;
  code: string;
}

/**
 * Parse a Next.js catch-all slug array (`/v/[...slug]`) into provider,
 * projectId, and short code.
 *
 * @param segments  The `params.slug` string array from the route.
 * @returns parsed slug or `null` if malformed.
 */
export function parseSlug(segments: string[]): ParsedSlug | null {
  if (segments.length < 2) return null;
  try {
    const decoded = decodeBase64Url(segments[0]);
    const dashIdx = decoded.indexOf("-");
    if (dashIdx < 1) return null;
    const provider = decoded.slice(0, dashIdx);
    const projectId = decoded.slice(dashIdx + 1);
    if (!provider || !projectId) return null;
    return { provider, projectId, code: segments[1] };
  } catch {
    return null;
  }
}
