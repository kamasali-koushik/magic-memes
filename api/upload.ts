import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type Body = { dataUrl?: string };

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = (req.body ?? (await readJsonBody(req))) as Body;
    if (!body?.dataUrl) {
      return send(res, 400, { error: "`dataUrl` is required" });
    }

    const { mime, bytes } = decodeDataUrl(body.dataUrl);
    const ext = MIME_TO_EXT[mime] ?? "png";
    const id = randomUUID().replace(/-/g, "").slice(0, 10);

    const blob = await put(`memes/${id}/image.${ext}`, bytes, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });

    // Reactions are append-only event blobs under memes/<id>/events/ —
    // no init file needed. See api/react.ts and api/meme.ts.

    send(res, 200, {
      id,
      imageUrl: blob.url,
      shareUrl: `/m/${id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send(res, 500, { error: message });
  }
}

function decodeDataUrl(dataUrl: string): { mime: string; bytes: Buffer } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const [, mime = "application/octet-stream", base64Flag, payload] = match;
  const bytes = base64Flag
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  return { mime, bytes };
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
