export const REACTIONS = [
  { kind: "laugh", emoji: "😂", label: "Laugh" },
  { kind: "fire", emoji: "🔥", label: "Fire" },
  { kind: "mind", emoji: "🤯", label: "Mind blown" },
  { kind: "cry", emoji: "😭", label: "Cry" },
  { kind: "skull", emoji: "💀", label: "Dead" },
  { kind: "heart", emoji: "❤️", label: "Love" },
] as const;

export type ReactionKind = (typeof REACTIONS)[number]["kind"];

export type Meme = {
  id: string;
  imageUrl: string;
  counts: Record<string, number>;
};

export type ShareResult = {
  id: string;
  imageUrl: string;
  shareUrl: string;
};

export async function uploadMeme(dataUrl: string): Promise<ShareResult> {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

export async function fetchMeme(id: string): Promise<Meme> {
  const response = await fetch(`/api/meme?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Meme load failed (${response.status})`);
  }
  return response.json();
}

export type LeaderboardEntry = {
  id: string;
  imageUrl: string;
  counts: Record<string, number>;
  totalReactions: number;
  uploadedAt: number | null;
};

export async function fetchLeaderboard(
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const response = await fetch(`/api/memes?limit=${limit}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Leaderboard load failed (${response.status})`);
  }
  const data = (await response.json()) as { memes: LeaderboardEntry[] };
  return data.memes;
}

export async function sendReaction(
  id: string,
  kind: ReactionKind,
): Promise<Record<string, number>> {
  const response = await fetch("/api/react", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, kind }),
  });
  if (!response.ok) {
    throw new Error(`Reaction failed (${response.status})`);
  }
  const data = (await response.json()) as { counts: Record<string, number> };
  return data.counts;
}

// --- Per-viewer reaction dedupe (one reaction per meme per browser) ---

const REACTED_KEY_PREFIX = "magic-memes:reacted:";

export function getReactedKind(id: string): ReactionKind | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(`${REACTED_KEY_PREFIX}${id}`);
    if (!value) return null;
    return REACTIONS.some((r) => r.kind === value)
      ? (value as ReactionKind)
      : null;
  } catch {
    return null;
  }
}

export function markReacted(id: string, kind: ReactionKind): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${REACTED_KEY_PREFIX}${id}`, kind);
  } catch {
    // Storage full/disabled — fine, button stays clickable until reload.
  }
}
