import { list } from "@vercel/blob";
import type { IncomingMessage, ServerResponse } from "node:http";

const VALID_KINDS = [
  "laugh",
  "fire",
  "mind",
  "cry",
  "skull",
  "heart",
] as const;
const VALID_KIND_SET = new Set<string>(VALID_KINDS);

const IMAGE_EXT_RE = /^image\.(png|jpg|jpeg|webp|gif)$/i;

type MemeRow = {
  id: string;
  imageUrl: string | null;
  counts: Record<string, number>;
  totalReactions: number;
  uploadedAt: number | null;
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);
    const memes = await collectMemes();

    const ranked = memes
      .filter((m) => m.imageUrl !== null && m.totalReactions > 0)
      .sort((a, b) => {
        if (b.totalReactions !== a.totalReactions) {
          return b.totalReactions - a.totalReactions;
        }
        // Tie-break: newer memes come first.
        return (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0);
      })
      .slice(0, limit);

    send(res, 200, { memes: ranked });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send(res, 500, { error: message });
  }
}

async function collectMemes(): Promise<MemeRow[]> {
  const byId = new Map<string, MemeRow>();

  let cursor: string | undefined;
  do {
    const result = await list({
      prefix: "memes/",
      cursor,
      limit: 1000,
    });
    for (const blob of result.blobs) {
      // Pathname shape:
      //   memes/<id>/image.<ext>
      //   memes/<id>/events/<ts>-<rnd>-<kind>.json
      const parts = blob.pathname.split("/");
      if (parts.length < 3) continue;
      const id = parts[1];
      if (!id) continue;

      let row = byId.get(id);
      if (!row) {
        row = {
          id,
          imageUrl: null,
          counts: {},
          totalReactions: 0,
          uploadedAt: null,
        };
        byId.set(id, row);
      }

      const what = parts[2]!;
      if (IMAGE_EXT_RE.test(what)) {
        row.imageUrl = blob.url;
        const uploaded = new Date(blob.uploadedAt).getTime();
        if (!Number.isNaN(uploaded)) row.uploadedAt = uploaded;
      } else if (what === "events" && parts.length === 4) {
        const filename = parts[3]!;
        const kind = parseKind(filename);
        if (kind) {
          row.counts[kind] = (row.counts[kind] ?? 0) + 1;
          row.totalReactions += 1;
        }
      }
    }
    cursor = result.cursor;
  } while (cursor);

  return Array.from(byId.values());
}

function parseKind(filename: string): string | null {
  const base = filename.replace(/\.json$/, "");
  const parts = base.split("-");
  const last = parts[parts.length - 1];
  if (!last) return null;
  return VALID_KIND_SET.has(last) ? last : null;
}

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}
