import { OpenRouter } from "@openrouter/sdk";
import type { ChatContentItems } from "@openrouter/sdk/models";

const apiKey = import.meta.env.VITE_OPEN_ROUTER_API_KEY as string | undefined;

if (!apiKey) {
  console.warn(
    "VITE_OPEN_ROUTER_API_KEY is not set — OpenRouter requests will fail.",
  );
}

export const openRouter = new OpenRouter({
  apiKey: apiKey ?? "",
  appTitle: "Magic Memes",
  httpReferer:
    typeof window !== "undefined" ? window.location.origin : undefined,
});

// A vision-capable default. Override per-call if you want something cheaper/smarter.
export const DEFAULT_VISION_MODEL = "openai/gpt-4o-mini";

// Image-generation-capable vision model. Returns generated images in the
// assistant message's `images` array.
export const DEFAULT_IMAGE_GEN_MODEL = "google/gemini-2.5-flash-image";

export const RANDOM_MEME_PROMPTS = [
  "Mash these photos into a single absurd meme image. Pick a punchy caption and overlay it on the image.",
  "Combine the people/objects in these photos into one chaotic crossover meme with a bold top-and-bottom caption.",
  "Turn these photos into a meme in the style of a classic image macro — exaggerated expressions, dramatic caption, internet-y energy.",
  "Make a wholesome meme out of these photos with a friendly caption.",
  "Make a deep-fried, low-quality, over-saturated meme out of these photos with chaotic energy and a meme caption.",
  "Render these photos as a 'distracted boyfriend'-style meme template with playful labels.",
  "Produce a single meme image inspired by these photos — make it weird, make it funny, include a caption.",
];

export type ImageInput = File | Blob | string;

export type GenerateFromImagesParams = {
  prompt: string;
  images: ImageInput[];
  model?: string;
  systemPrompt?: string;
};

export type GenerateFromImagesResult = {
  text: string;
  raw: Awaited<ReturnType<typeof openRouter.chat.send>>;
};

/**
 * Sends a multi-image + prompt request to a vision model and returns the text response.
 * Accepts `File`/`Blob` (encoded as data URLs) or already-hosted image URLs.
 */
export async function generateFromImages({
  prompt,
  images,
  model = DEFAULT_VISION_MODEL,
  systemPrompt,
}: GenerateFromImagesParams): Promise<GenerateFromImagesResult> {
  if (images.length === 0) {
    throw new Error("generateFromImages requires at least one image.");
  }

  const imageUrls = await Promise.all(images.map(toImageUrl));

  const userContent: ChatContentItems[] = [
    { type: "text", text: prompt },
    ...imageUrls.map<ChatContentItems>((url) => ({
      type: "image_url",
      imageUrl: { url },
    })),
  ];

  const result = await openRouter.chat.send({
    chatRequest: {
      model,
      stream: false,
      messages: [
        ...(systemPrompt
          ? ([{ role: "system", content: systemPrompt }] as const)
          : []),
        { role: "user", content: userContent },
      ],
    },
  });

  const text = result.choices?.[0]?.message?.content ?? "";
  return { text: typeof text === "string" ? text : "", raw: result };
}

async function toImageUrl(input: ImageInput): Promise<string> {
  if (typeof input === "string") return input;
  return fileToDataUrl(input);
}

export type GenerateMemeImageParams = {
  images: ImageInput[];
  /** Optional caption/instruction. If omitted, a random prompt is chosen. */
  prompt?: string;
  model?: string;
};

export type GenerateMemeImageResult = {
  /** Data URL of the generated meme image. */
  dataUrl: string;
  /** The prompt that was actually sent to the model. */
  prompt: string;
  raw: Awaited<ReturnType<typeof openRouter.chat.send>>;
};

/**
 * Sends the user's images + a meme prompt to an image-generation-capable model
 * and returns the generated meme image as a data URL.
 */
export async function generateMemeImage({
  images,
  prompt,
  model = DEFAULT_IMAGE_GEN_MODEL,
}: GenerateMemeImageParams): Promise<GenerateMemeImageResult> {
  if (images.length === 0) {
    throw new Error("generateMemeImage requires at least one source image.");
  }

  const chosenPrompt = prompt ?? pickRandom(RANDOM_MEME_PROMPTS);
  const imageUrls = await Promise.all(images.map(toImageUrl));

  const userContent: ChatContentItems[] = [
    { type: "text", text: chosenPrompt },
    ...imageUrls.map<ChatContentItems>((url) => ({
      type: "image_url",
      imageUrl: { url },
    })),
  ];

  const result = await openRouter.chat.send({
    chatRequest: {
      model,
      stream: false,
      modalities: ["image", "text"],
      messages: [{ role: "user", content: userContent }],
    },
  });

  const dataUrl = result.choices?.[0]?.message?.images?.[0]?.imageUrl?.url;
  if (!dataUrl) {
    throw new Error(
      "Model did not return an image. Try again or pick a different model.",
    );
  }

  return { dataUrl, prompt: chosenPrompt, raw: result };
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// --- Meme ideas (vision LLM → six format-specific captions) ---

export type MemeIdea =
  | { format: "classic"; topText: string; bottomText: string }
  | { format: "caption"; caption: string }
  | { format: "speech"; text: string }
  | { format: "motivational"; title: string; subtitle: string }
  | { format: "movie"; title: string; tagline: string }
  | { format: "tabloid"; headline: string };

export type MemeFormat = MemeIdea["format"];

export const MEME_FORMATS: readonly MemeFormat[] = [
  "classic",
  "caption",
  "speech",
  "motivational",
  "movie",
  "tabloid",
] as const;

const MEME_IDEAS_PROMPT = `Look at this photo carefully. Write SIX meme ideas — one for each format below — based on what's actually in the picture. Reference real details: expressions, poses, objects, setting, vibe. Be specific, funny, internet-native. Avoid generic captions that could apply to any photo.

Formats:
1. classic — Impact-style image macro. "topText" (≤6 words, ALL CAPS) and "bottomText" (≤8 words, ALL CAPS).
2. caption — modern single caption above the photo. "caption" (1 short line, lowercase ok, can be a POV/me/when setup).
3. speech — short line as if a subject in the photo is speaking/thinking. "text" (≤10 words).
4. motivational — fake inspirational poster. "title" (one or two words, ALL CAPS) and "subtitle" (one biting sentence, sentence case).
5. movie — fake blockbuster. "title" (≤5 words, dramatic) and "tagline" (≤12 words).
6. tabloid — sensational tabloid headline. "headline" (≤12 words, can mix ALL CAPS).

Return ONLY valid minified JSON, no prose, no markdown fences, matching exactly:
{"ideas":[{"format":"classic","topText":"...","bottomText":"..."},{"format":"caption","caption":"..."},{"format":"speech","text":"..."},{"format":"motivational","title":"...","subtitle":"..."},{"format":"movie","title":"...","tagline":"..."},{"format":"tabloid","headline":"..."}]}`;

export type GenerateMemeIdeasParams = {
  image: ImageInput;
  model?: string;
};

export type GenerateMemeIdeasResult = {
  ideas: MemeIdea[];
  raw: Awaited<ReturnType<typeof openRouter.chat.send>>;
};

export async function generateMemeIdeas({
  image,
  model = DEFAULT_VISION_MODEL,
}: GenerateMemeIdeasParams): Promise<GenerateMemeIdeasResult> {
  const { text, raw } = await generateFromImages({
    prompt: MEME_IDEAS_PROMPT,
    images: [image],
    model,
  });

  const ideas = parseMemeIdeas(text);
  if (ideas.length !== 6) {
    throw new Error(
      `Expected 6 meme ideas, got ${ideas.length}. Model said: ${text.slice(0, 200)}`,
    );
  }
  return { ideas, raw };
}

function parseMemeIdeas(text: string): MemeIdea[] {
  const cleaned = stripJsonFence(text).trim();
  // Find the first { and last } — models sometimes wrap with extra prose.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return JSON.");
  }
  const json = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(json) as { ideas?: unknown };
  if (!Array.isArray(parsed.ideas)) {
    throw new Error("Model JSON is missing an `ideas` array.");
  }

  const byFormat = new Map<MemeFormat, MemeIdea>();
  for (const raw of parsed.ideas) {
    const idea = coerceIdea(raw);
    if (idea) byFormat.set(idea.format, idea);
  }
  // Return in canonical order regardless of how the model ordered them.
  return MEME_FORMATS.map((f) => byFormat.get(f)).filter(
    (i): i is MemeIdea => i !== undefined,
  );
}

function stripJsonFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  return fenced ? fenced[1]! : text;
}

function coerceIdea(raw: unknown): MemeIdea | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const format = o.format;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  switch (format) {
    case "classic":
      return { format, topText: s(o.topText), bottomText: s(o.bottomText) };
    case "caption":
      return { format, caption: s(o.caption) };
    case "speech":
      return { format, text: s(o.text) };
    case "motivational":
      return { format, title: s(o.title), subtitle: s(o.subtitle) };
    case "movie":
      return { format, title: s(o.title), tagline: s(o.tagline) };
    case "tabloid":
      return { format, headline: s(o.headline) };
    default:
      return null;
  }
}
