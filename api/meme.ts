import { head, list } from "@vercel/blob";
import type { IncomingMessage, ServerResponse } from "node:http";

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif"] as const;

const VALID_KINDS = [
  "laugh",
  "fire",
  "mind",
  "cry",
  "skull",
  "heart",
] as const;
const VALID_KIND_SET = new Set<string>(VALID_KINDS);

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const id = sanitizeId(url.searchParams.get("id"));
    if (!id) return send(res, 400, { error: "`id` is required" });

    let imageUrl: string | null = null;
    for (const ext of IMAGE_EXTS) {
      try {
        const meta = await head(`memes/${id}/image.${ext}`);
        imageUrl = meta.url;
        break;
      } catch {
        // Try the next extension.
      }
    }
    if (!imageUrl) return send(res, 404, { error: "Meme not found" });

    const counts = await tally(id);
    send(res, 200, { id, imageUrl, counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send(res, 500, { error: message });
  }
}

async function tally(id: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  let cursor: string | undefined;
  do {
    const result = await list({
      prefix: `memes/${id}/events/`,
      cursor,
      limit: 1000,
    });
    for (const blob of result.blobs) {
      const kind = parseKind(blob.pathname);
      if (kind) counts[kind] = (counts[kind] ?? 0) + 1;
    }
    cursor = result.cursor;
  } while (cursor);
  return counts;
}

function parseKind(pathname: string): string | null {
  const fn = pathname.split("/").pop() ?? "";
  const base = fn.replace(/\.json$/, "");
  const parts = base.split("-");
  const last = parts[parts.length - 1];
  if (!last) return null;
  return VALID_KIND_SET.has(last) ? last : null;
}

function sanitizeId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return clean || null;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}
