import { list, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
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

type Body = { id?: string; kind?: string };

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = (req.body ?? (await readJsonBody(req))) as Body;
    const id = sanitizeId(body.id);
    const kind = body.kind;
    if (!id) return send(res, 400, { error: "`id` is required" });
    if (!kind || !VALID_KIND_SET.has(kind)) {
      return send(res, 400, { error: "invalid reaction kind" });
    }

    // Append-only event blob. Filename encodes timestamp, randomness, and kind
    // so tallying never needs to read content — just `list()` and parse.
    const ts = Date.now();
    const rnd = randomUUID().slice(0, 8);
    const path = `memes/${id}/events/${ts}-${rnd}-${kind}.json`;

    await put(path, "{}", {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    const counts = await tally(id);
    send(res, 200, { counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send(res, 500, { error: message });
  }
}

export async function tally(id: string): Promise<Record<string, number>> {
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

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}
