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
export const DEFAULT_VISION_MODEL =
  "tngtech/deepseek-r1t-chimera-235b-instruct:free";

// Image-generation-capable vision model. Returns generated images in the
// assistant message's `images` array.
export const DEFAULT_IMAGE_GEN_MODEL = "x-ai/grok-imagine-image-quality";

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

// --- Meme ideas (vision LLM → six feature-specific outputs) ---

export type MemeIdea =
  | { format: "lucky"; caption: string; imageGenPrompt: string }
  | { format: "classic"; topText: string; bottomText: string }
  | { format: "deepfried"; topText: string; bottomText: string }
  | { format: "bgswap"; caption: string; scene: string }
  | { format: "stickers"; caption: string; stickers: string[] }
  | { format: "remix"; suggestedCaption: string };

export type MemeFormat = MemeIdea["format"];

export const MEME_FORMATS: readonly MemeFormat[] = [
  "lucky",
  "classic",
  "deepfried",
  "bgswap",
  "stickers",
  "remix",
] as const;

const MEME_IDEAS_PROMPT = `Look at this photo carefully. Write SIX meme ideas — one per format below — based on what's actually in the picture. Reference real details: expressions, poses, outfits, objects, setting, mood. Be funny, sarcastic, internet-native. Generic captions will be rejected — always anchor on something specific you can see.

Formats:
1. lucky — one chaotic re-imagined meme via image generation. "caption" (≤12 words, short funny line for the preview overlay) and "imageGenPrompt" (2–4 sentences describing how to remix the photo into a meme; pick a style at random — deep-fried, distracted-boyfriend labels, fake motivational poster, fake movie poster, sensational tabloid — reference SPECIFIC photo details; keep the people/scene recognizable but lean hard into the chosen aesthetic).
2. classic — Impact-style image macro. "topText" (≤6 words, ALL CAPS) and "bottomText" (≤8 words, ALL CAPS).
3. deepfried — over-saturated, unhinged chaotic energy. "topText" (≤6 words, ALL CAPS, slightly broken-brain) and "bottomText" (≤8 words, ALL CAPS, slightly broken-brain).
4. bgswap — subject teleported to an absurd new setting. "caption" (≤12 words, sarcastic line that pays off the scene swap) and "scene" (1–3 words for the backdrop, e.g., "mars surface", "1990s mall", "deep underwater").
5. stickers — meme decorated with emoji stickers tied to what's actually in the photo. "caption" (≤12 words, short funny line) and "stickers" (array of EXACTLY 3 emoji that LITERALLY match what's visible: chef → 🔥🔪🍳, crown/king pose → 👑✨💎, serious face → 💀💯🧠, dog → 🐶🦴🐾, food → 🍕🤤🔥, gym → 💪🥵💯, etc. Generic vibes-only emoji like ✨ or 💯 alone will be rejected — at least 2 of the 3 must reference concrete details from the photo).
6. remix — a punchy standalone caption to be slapped on a totally different meme template later. "suggestedCaption" (≤12 words, funny + sarcastic, must stand alone with no context).

Return ONLY valid minified JSON, no prose, no markdown fences:
{"ideas":[{"format":"lucky","caption":"...","imageGenPrompt":"..."},{"format":"classic","topText":"...","bottomText":"..."},{"format":"deepfried","topText":"...","bottomText":"..."},{"format":"bgswap","caption":"...","scene":"..."},{"format":"stickers","caption":"...","stickers":["...","...","..."]},{"format":"remix","suggestedCaption":"..."}]}`;

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
    case "lucky":
      return {
        format,
        caption: s(o.caption),
        imageGenPrompt: s(o.imageGenPrompt),
      };
    case "classic":
      return { format, topText: s(o.topText), bottomText: s(o.bottomText) };
    case "deepfried":
      return { format, topText: s(o.topText), bottomText: s(o.bottomText) };
    case "bgswap":
      return { format, caption: s(o.caption), scene: s(o.scene) };
    case "stickers":
      return {
        format,
        caption: s(o.caption),
        stickers: Array.isArray(o.stickers)
          ? o.stickers.map((x) => s(x)).filter((x) => x.length > 0)
          : [],
      };
    case "remix":
      return { format, suggestedCaption: s(o.suggestedCaption) };
    default:
      return null;
  }
}
