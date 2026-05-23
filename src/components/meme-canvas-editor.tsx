import { useEffect, useRef, useState } from "react";
import { Image, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import Konva from "konva";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Loading03Icon,
  Share05Icon,
  TextFontIcon,
} from "@hugeicons/core-free-icons";

import type { MemeFormat, MemeIdea } from "@/api/open-router-api";
import { cn } from "@/lib/utils";

// --- Types ---

type TextNode = {
  id: string;
  label: string;
  value: string;
  // Normalized coords (0..1 of stage size). Position is the text box's top-left.
  nx: number;
  ny: number;
  nw: number;
  fontSizeFrac: number;
  fontFamily: string;
  fill: string;
  stroke?: string;
  strokeWidthFrac?: number;
  align?: "left" | "center" | "right";
  fontStyle?: "normal" | "italic" | "bold" | "italic bold";
  letterSpacing?: number;
  uppercase?: boolean;
  shadowColor?: string;
  shadowBlurFrac?: number;
};

type DecRect = {
  kind: "rect";
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  fill: string;
  cornerRadiusFrac?: number;
  stroke?: string;
  strokeWidthFrac?: number;
};

type DecGradient = {
  kind: "gradient";
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  // Color stops as [offset, color], e.g. [[0, "rgba(0,0,0,0)"], [1, "#000"]].
  stops: Array<[number, string]>;
};

type Decoration = DecRect | DecGradient;

type FormatState = {
  decorations: Decoration[];
  texts: TextNode[];
};

// --- Fonts ---

const FONT_IMPACT =
  '"Impact","Haettenschweiler","Arial Narrow Bold",sans-serif';
const FONT_SERIF = '"Times New Roman",Times,serif';
const FONT_BLACK = '"Arial Black","Helvetica",sans-serif';
const FONT_SANS = '"Helvetica","Arial",sans-serif';

const FONT_OPTIONS = [
  { label: "Impact", family: FONT_IMPACT },
  { label: "Arial Black", family: FONT_BLACK },
  { label: "Sans", family: FONT_SANS },
  { label: "Serif", family: FONT_SERIF },
  { label: "Comic", family: '"Comic Sans MS","Chalkboard SE",cursive' },
] as const;

const FORMAT_LABELS: Record<MemeFormat, string> = {
  lucky: "Lucky",
  classic: "Classic",
  deepfried: "Deep-fried",
  bgswap: "Scene swap",
  stickers: "Stickered",
  remix: "Remix",
};

const FORMAT_ORDER: MemeFormat[] = [
  "lucky",
  "classic",
  "deepfried",
  "bgswap",
  "stickers",
  "remix",
];

// --- Initial state per format ---

function buildState(idea: MemeIdea): FormatState {
  switch (idea.format) {
    case "classic":
      return {
        decorations: [],
        texts: [
          impactText("top", "Top", idea.topText, 0.04),
          impactText("bottom", "Bottom", idea.bottomText, 0.84),
        ],
      };
    case "deepfried":
      return {
        decorations: [],
        texts: [
          deepFriedText("top", "Top", idea.topText, 0.03),
          deepFriedText("bottom", "Bottom", idea.bottomText, 0.83),
        ],
      };
    case "lucky":
      return {
        decorations: [
          {
            kind: "rect",
            nx: 0.06,
            ny: 0.7,
            nw: 0.88,
            nh: 0.22,
            fill: "#FCE7A3",
            cornerRadiusFrac: 0.025,
            stroke: "rgba(0,0,0,0.45)",
            strokeWidthFrac: 0.004,
          },
        ],
        texts: [
          {
            id: "luckyTag",
            label: "Tag",
            value: "I'M FEELING LUCKY ✨",
            nx: 0.08,
            ny: 0.73,
            nw: 0.84,
            fontSizeFrac: 0.028,
            fontFamily: FONT_SANS,
            fill: "#7C2D12",
            align: "center",
            fontStyle: "bold",
            letterSpacing: 4,
          },
          {
            id: "caption",
            label: "Caption",
            value: idea.caption,
            nx: 0.08,
            ny: 0.78,
            nw: 0.84,
            fontSizeFrac: 0.052,
            fontFamily: FONT_SANS,
            fill: "#1F2937",
            align: "center",
            fontStyle: "bold",
          },
        ],
      };
    case "bgswap":
      return {
        decorations: [
          {
            kind: "rect",
            nx: 0.04,
            ny: 0.82,
            nw: 0.92,
            nh: 0.13,
            fill: "rgba(255,255,255,0.95)",
            cornerRadiusFrac: 0.018,
            stroke: "rgba(0,0,0,0.45)",
            strokeWidthFrac: 0.004,
          },
        ],
        texts: [
          {
            id: "caption",
            label: "Caption",
            value: idea.caption,
            nx: 0.06,
            ny: 0.845,
            nw: 0.88,
            fontSizeFrac: 0.045,
            fontFamily: FONT_SANS,
            fill: "#0F172A",
            align: "center",
            fontStyle: "bold",
          },
        ],
      };
    case "stickers":
      return {
        decorations: [
          {
            kind: "rect",
            nx: 0.04,
            ny: 0.85,
            nw: 0.92,
            nh: 0.11,
            fill: "#FFFFFF",
            cornerRadiusFrac: 0.014,
            stroke: "rgba(0,0,0,0.45)",
            strokeWidthFrac: 0.004,
          },
        ],
        texts: [
          ...placeStickers(idea.stickers),
          {
            id: "caption",
            label: "Caption",
            value: idea.caption,
            nx: 0.06,
            ny: 0.87,
            nw: 0.88,
            fontSizeFrac: 0.042,
            fontFamily: FONT_SANS,
            fill: "#0F172A",
            align: "center",
            fontStyle: "bold",
          },
        ],
      };
    case "remix":
      return {
        decorations: [
          {
            kind: "rect",
            nx: 0.04,
            ny: 0.82,
            nw: 0.92,
            nh: 0.13,
            fill: "rgba(0,0,0,0.9)",
            cornerRadiusFrac: 0.018,
            stroke: "rgba(255,255,255,0.4)",
            strokeWidthFrac: 0.004,
          },
          {
            kind: "rect",
            nx: 0.7,
            ny: 0.04,
            nw: 0.26,
            nh: 0.07,
            fill: "#22D3EE",
            cornerRadiusFrac: 0.035,
            stroke: "rgba(0,32,40,0.55)",
            strokeWidthFrac: 0.004,
          },
        ],
        texts: [
          {
            id: "remixTag",
            label: "Tag",
            value: "🔁 REMIX",
            nx: 0.7,
            ny: 0.055,
            nw: 0.26,
            fontSizeFrac: 0.028,
            fontFamily: FONT_SANS,
            fill: "#0F172A",
            align: "center",
            fontStyle: "bold",
            letterSpacing: 2,
          },
          {
            id: "caption",
            label: "Caption",
            value: idea.suggestedCaption,
            nx: 0.06,
            ny: 0.845,
            nw: 0.88,
            fontSizeFrac: 0.045,
            fontFamily: FONT_SANS,
            fill: "#FFFFFF",
            align: "center",
            fontStyle: "bold",
          },
        ],
      };
  }
}

// Three border anchors that keep stickers off the photo's center subject.
// Order: top-left, top-right, lower-left. Mirrors STICKER_ANCHORS in meme-preview.tsx.
const STICKER_ANCHORS_NORM: ReadonlyArray<{ nx: number; ny: number }> = [
  { nx: 0.05, ny: 0.05 },
  { nx: 0.77, ny: 0.05 },
  { nx: 0.05, ny: 0.6 },
];

function placeStickers(stickers: string[]): TextNode[] {
  return stickers.slice(0, 3).map((sticker, i) => {
    const anchor = STICKER_ANCHORS_NORM[i]!;
    return {
      id: `sticker-${i}`,
      label: `Sticker ${i + 1}`,
      value: sticker,
      nx: anchor.nx,
      ny: anchor.ny,
      nw: 0.18,
      fontSizeFrac: 0.13,
      fontFamily: FONT_SANS,
      fill: "#000000",
      align: "center",
    };
  });
}

function deepFriedText(
  id: string,
  label: string,
  value: string,
  ny: number,
): TextNode {
  return {
    id,
    label,
    value,
    nx: 0.03,
    ny,
    nw: 0.94,
    fontSizeFrac: 0.11,
    fontFamily: FONT_IMPACT,
    fill: "#FFEA00",
    stroke: "#B30000",
    strokeWidthFrac: 0.006,
    align: "center",
    uppercase: true,
    shadowColor: "#B30000",
    shadowBlurFrac: 0.015,
  };
}

function impactText(
  id: string,
  label: string,
  value: string,
  ny: number,
): TextNode {
  return {
    id,
    label,
    value,
    nx: 0.03,
    ny,
    nw: 0.94,
    fontSizeFrac: 0.1,
    fontFamily: FONT_IMPACT,
    fill: "#FFFFFF",
    stroke: "#000000",
    strokeWidthFrac: 0.005,
    align: "center",
    uppercase: true,
  };
}

// --- Image loader ---

function useImage(url: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    let cancelled = false;
    i.onload = () => {
      if (!cancelled) setImg(i);
    };
    i.src = url;
    return () => {
      cancelled = true;
      i.onload = null;
      setImg(null);
    };
  }, [url]);
  return img;
}

// --- Main editor ---

export type BgSwapState =
  | { status: "idle" }
  | { status: "loading"; scene: string }
  | { status: "ready"; scene: string; dataUrl: string }
  | { status: "error"; scene: string; message: string };

type Props = {
  imageUrl: string;
  initialIdea: MemeIdea;
  ideas: MemeIdea[];
  bgSwap: BgSwapState;
  onShare: (dataUrl: string) => void;
  isSharing?: boolean;
};

export function MemeCanvasEditor({
  imageUrl,
  initialIdea,
  ideas,
  bgSwap,
  onShare,
  isSharing,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize(el.clientWidth);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [format, setFormat] = useState<MemeFormat>(initialIdea.format);

  // While we retry until success, surface "loading" for any non-ready state.
  const bgSwapping = format === "bgswap" && bgSwap.status !== "ready";
  const swappedUrl =
    format === "bgswap" && bgSwap.status === "ready" ? bgSwap.dataUrl : null;
  const sceneKey = bgSwap.status === "idle" ? "" : bgSwap.scene;

  const effectiveImageUrl = swappedUrl ?? imageUrl;
  const img = useImage(effectiveImageUrl);

  const [formatStates, setFormatStates] = useState<
    Partial<Record<MemeFormat, FormatState>>
  >(() => ({ [initialIdea.format]: buildState(initialIdea) }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDeco, setSelectedDeco] = useState<number | null>(null);
  const [fontOverride, setFontOverride] = useState<string | null>(null);

  const selectText = (id: string) => {
    setSelectedDeco(null);
    setSelectedId(id);
  };
  const selectDeco = (i: number) => {
    setSelectedId(null);
    setSelectedDeco(i);
  };
  const clearSelection = () => {
    setSelectedId(null);
    setSelectedDeco(null);
  };

  const stateFor = (f: MemeFormat): FormatState => {
    const stored = formatStates[f];
    if (stored) return stored;
    const idea = ideas.find((i) => i.format === f) ?? initialIdea;
    return buildState(idea);
  };

  const state = stateFor(format);

  const patchText = (id: string, patch: Partial<TextNode>) => {
    setFormatStates((prev) => {
      const base = prev[format] ?? stateFor(format);
      return {
        ...prev,
        [format]: {
          ...base,
          texts: base.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        },
      };
    });
  };

  const translateText = (id: string, dnx: number, dny: number) => {
    setFormatStates((prev) => {
      const base = prev[format] ?? stateFor(format);
      return {
        ...prev,
        [format]: {
          ...base,
          texts: base.texts.map((t) =>
            t.id === id ? { ...t, nx: t.nx + dnx, ny: t.ny + dny } : t,
          ),
        },
      };
    });
  };

  const translateDecoration = (index: number, dnx: number, dny: number) => {
    setFormatStates((prev) => {
      const base = prev[format] ?? stateFor(format);
      return {
        ...prev,
        [format]: {
          ...base,
          decorations: base.decorations.map((d, i) =>
            i === index ? { ...d, nx: d.nx + dnx, ny: d.ny + dny } : d,
          ),
        },
      };
    });
  };

  const resizeDecoration = (
    index: number,
    box: { nx: number; ny: number; nw: number; nh: number },
  ) => {
    setFormatStates((prev) => {
      const base = prev[format] ?? stateFor(format);
      return {
        ...prev,
        [format]: {
          ...base,
          decorations: base.decorations.map((d, i) =>
            i === index ? { ...d, ...box } : d,
          ),
        },
      };
    });
  };

  const cycleFont = () => {
    const idx = FONT_OPTIONS.findIndex((o) => o.family === fontOverride);
    const next =
      idx >= FONT_OPTIONS.length - 1 ? null : FONT_OPTIONS[idx + 1]!.family;
    setFontOverride(next);
  };

  const fontLabel = fontOverride
    ? (FONT_OPTIONS.find((o) => o.family === fontOverride)?.label ?? "Custom")
    : "Default";

  const handleShare = () => {
    const stage = stageRef.current;
    if (!stage) return;
    clearSelection();
    // Defer to next frame so the transformer un-renders before snapshot.
    requestAnimationFrame(() => {
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      onShare(dataUrl);
    });
  };

  return (
    <div className="grid gap-4 sm:h-full sm:min-h-0 sm:grid-cols-[minmax(0,1fr)_220px] sm:grid-rows-[minmax(0,1fr)]">
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-popover pt-1 pb-2 sm:static sm:min-h-0 sm:overflow-hidden sm:bg-transparent sm:pt-0 sm:pb-0">
        <div
          ref={containerRef}
          className="relative mx-auto aspect-square w-full max-w-[75vw] overflow-hidden rounded-xl bg-black ring-1 ring-border sm:max-w-[calc(90vh-220px)]"
        >
          {img && size > 0 && state && (
            <Stage
              ref={stageRef}
              width={size}
              height={size}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) clearSelection();
              }}
              onTouchStart={(e) => {
                if (e.target === e.target.getStage()) clearSelection();
              }}
            >
              <Layer>
                <CoverImage
                  img={img}
                  size={size}
                  filter={format === "deepfried" ? "deepfried" : undefined}
                />
                {format === "deepfried" && <DeepFriedBlobs size={size} />}
                {state.decorations.map((d, i) => (
                  <DecorationNode
                    key={i}
                    dec={d}
                    size={size}
                    selected={selectedDeco === i}
                    onSelect={() => selectDeco(i)}
                    onTranslate={(dnx, dny) => translateDecoration(i, dnx, dny)}
                    onResize={(box) => resizeDecoration(i, box)}
                  />
                ))}
                {state.texts.map((t) => (
                  <EditableTextNode
                    key={t.id}
                    node={t}
                    size={size}
                    fontFamily={fontOverride ?? t.fontFamily}
                    selected={selectedId === t.id}
                    onSelect={() => selectText(t.id)}
                    onChange={(patch) => patchText(t.id, patch)}
                    onTranslate={(dnx, dny) => translateText(t.id, dnx, dny)}
                  />
                ))}
              </Layer>
            </Stage>
          )}
          {format === "bgswap" && bgSwapping && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-7 animate-spin"
              />
              <p className="px-4 text-center text-xs font-medium">
                Building your new background…
                {sceneKey ? (
                  <>
                    <br />
                    <span className="text-white/70">{sceneKey}</span>
                  </>
                ) : null}
              </p>
            </div>
          )}
        </div>

        {/* Format chips */}
        <div className="flex flex-wrap gap-1.5">
          {FORMAT_ORDER.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                clearSelection();
                setFormat(f);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                format === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent",
              )}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Mobile-only Share — lives inside the sticky region so it's
            visible without scrolling. Desktop has its own copy in the side panel. */}
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 sm:hidden"
        >
          <HugeiconsIcon
            icon={isSharing ? Loading03Icon : Share05Icon}
            className={isSharing ? "size-4 animate-spin" : "size-4"}
          />
          {isSharing ? "Sharing…" : "Share"}
        </button>
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-3 sm:min-h-0">
        <div className="flex flex-col gap-3 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:pr-1">
          <div className="flex flex-col gap-2.5">
            {state?.texts.map((t) => (
              <div key={t.id} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.label}
                </span>
                <textarea
                  rows={2}
                  value={t.value}
                  onChange={(e) => patchText(t.id, { value: e.target.value })}
                  className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <div className="flex items-center gap-2">
                  <label
                    className="relative inline-flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-input"
                    title="Text color"
                  >
                    <span
                      className="size-full"
                      style={{ backgroundColor: t.fill.slice(0, 7) }}
                    />
                    <input
                      type="color"
                      value={t.fill.slice(0, 7)}
                      onChange={(e) =>
                        patchText(t.id, { fill: e.target.value })
                      }
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                  </label>
                  <input
                    type="range"
                    min={0.02}
                    max={0.2}
                    step={0.005}
                    value={t.fontSizeFrac}
                    onChange={(e) =>
                      patchText(t.id, {
                        fontSizeFrac: Number(e.target.value),
                      })
                    }
                    className="h-1.5 flex-1 cursor-pointer accent-primary"
                    title="Font size"
                  />
                  <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(t.fontSizeFrac * 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={cycleFont}
            className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              <HugeiconsIcon icon={TextFontIcon} className="size-4" />
              Font
            </span>
            <span className="text-xs text-muted-foreground">{fontLabel}</span>
          </button>

          {(selectedId || selectedDeco !== null) && (
            <NudgeControls
              onNudge={(dx, dy) => {
                if (selectedId) translateText(selectedId, dx, dy);
                else if (selectedDeco !== null)
                  translateDecoration(selectedDeco, dx, dy);
              }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="hidden items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 sm:inline-flex"
        >
          <HugeiconsIcon
            icon={isSharing ? Loading03Icon : Share05Icon}
            className={isSharing ? "size-4 animate-spin" : "size-4"}
          />
          {isSharing ? "Sharing…" : "Share"}
        </button>
      </div>
    </div>
  );
}

function NudgeControls({
  onNudge,
}: {
  onNudge: (dx: number, dy: number) => void;
}) {
  const step = 0.02;
  const btn =
    "inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">Nudge selection</span>
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <span />
        <button type="button" className={btn} onClick={() => onNudge(0, -step)}>
          ↑
        </button>
        <span />
        <button type="button" className={btn} onClick={() => onNudge(-step, 0)}>
          ←
        </button>
        <span />
        <button type="button" className={btn} onClick={() => onNudge(step, 0)}>
          →
        </button>
        <span />
        <button type="button" className={btn} onClick={() => onNudge(0, step)}>
          ↓
        </button>
        <span />
      </div>
    </div>
  );
}

// --- Konva nodes ---

// Fits the full image inside the square stage with letterbox bars (the stage's
// black background shows through). Switched from cover→contain so the user's
// image is never cropped. The optional filter mode applies Konva HSL+Contrast
// filters for the deep-fried look so the shared PNG matches the grid preview.
function CoverImage({
  img,
  size,
  filter,
}: {
  img: HTMLImageElement;
  size: number;
  filter?: "deepfried";
}) {
  const ref = useRef<Konva.Image>(null);
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.min(size / iw, size / ih);
  const w = iw * scale;
  const h = ih * scale;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (filter === "deepfried") {
      node.cache();
    } else {
      node.clearCache();
    }
    node.getLayer()?.batchDraw();
  }, [filter, img, w, h]);

  const filters =
    filter === "deepfried" ? [Konva.Filters.HSL, Konva.Filters.Contrast] : undefined;

  return (
    <Image
      ref={ref}
      image={img}
      x={(size - w) / 2}
      y={(size - h) / 2}
      width={w}
      height={h}
      listening={false}
      filters={filters}
      hue={filter === "deepfried" ? -8 : 0}
      saturation={filter === "deepfried" ? 1.4 : 0}
      luminance={filter === "deepfried" ? 0.05 : 0}
      contrast={filter === "deepfried" ? 40 : 0}
    />
  );
}

// Two radial "deep-fried" color blobs blended overlay-style, matching the CSS
// preview gradients in meme-preview.tsx. Rendered above the image but below
// any decoration banners and text.
function DeepFriedBlobs({ size }: { size: number }) {
  return (
    <>
      <Rect
        x={0}
        y={0}
        width={size}
        height={size}
        fillRadialGradientStartPoint={{ x: 0.3 * size, y: 0.25 * size }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0.3 * size, y: 0.25 * size }}
        fillRadialGradientEndRadius={0.55 * size}
        fillRadialGradientColorStops={[
          0,
          "rgba(255,80,0,0.45)",
          1,
          "rgba(255,80,0,0)",
        ]}
        globalCompositeOperation="overlay"
        listening={false}
      />
      <Rect
        x={0}
        y={0}
        width={size}
        height={size}
        fillRadialGradientStartPoint={{ x: 0.75 * size, y: 0.8 * size }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0.75 * size, y: 0.8 * size }}
        fillRadialGradientEndRadius={0.55 * size}
        fillRadialGradientColorStops={[
          0,
          "rgba(255,255,0,0.35)",
          1,
          "rgba(255,255,0,0)",
        ]}
        globalCompositeOperation="overlay"
        listening={false}
      />
    </>
  );
}

function DecorationNode({
  dec,
  size,
  selected,
  onSelect,
  onTranslate,
  onResize,
}: {
  dec: Decoration;
  size: number;
  selected: boolean;
  onSelect: () => void;
  onTranslate: (dnx: number, dny: number) => void;
  onResize: (box: { nx: number; ny: number; nw: number; nh: number }) => void;
}) {
  const rectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selected && rectRef.current && transformerRef.current) {
      transformerRef.current.nodes([rectRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  if (dec.kind === "rect") {
    return (
      <>
        <Rect
          ref={rectRef}
          x={dec.nx * size}
          y={dec.ny * size}
          width={dec.nw * size}
          height={dec.nh * size}
          fill={dec.fill}
          cornerRadius={(dec.cornerRadiusFrac ?? 0) * size}
          stroke={dec.stroke}
          strokeWidth={(dec.strokeWidthFrac ?? 0) * size}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            const newNx = e.target.x() / size;
            const newNy = e.target.y() / size;
            onTranslate(newNx - dec.nx, newNy - dec.ny);
          }}
          onTransformEnd={() => {
            const r = rectRef.current;
            if (!r) return;
            const sx = r.scaleX();
            const sy = r.scaleY();
            const newW = Math.max(20, r.width() * sx);
            const newH = Math.max(20, r.height() * sy);
            r.scaleX(1);
            r.scaleY(1);
            r.width(newW);
            r.height(newH);
            onResize({
              nx: r.x() / size,
              ny: r.y() / size,
              nw: newW / size,
              nh: newH / size,
            });
          }}
        />
        {selected && (
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "top-center",
              "bottom-center",
              "middle-left",
              "middle-right",
            ]}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width > 20 && newBox.height > 20 ? newBox : oldBox
            }
          />
        )}
      </>
    );
  }
  // Gradient overlays (unused by current formats) stay non-interactive — they're
  // mood washes, not interactive elements.
  const colorStops: (number | string)[] = [];
  for (const [offset, color] of dec.stops) colorStops.push(offset, color);
  return (
    <Rect
      x={dec.nx * size}
      y={dec.ny * size}
      width={dec.nw * size}
      height={dec.nh * size}
      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
      fillLinearGradientEndPoint={{ x: 0, y: dec.nh * size }}
      fillLinearGradientColorStops={colorStops}
      listening={false}
    />
  );
}

function EditableTextNode({
  node,
  size,
  fontFamily,
  selected,
  onSelect,
  onChange,
  onTranslate,
}: {
  node: TextNode;
  size: number;
  fontFamily: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<TextNode>) => void;
  onTranslate: (dnx: number, dny: number) => void;
}) {
  const textRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selected && textRef.current && transformerRef.current) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  const display = node.uppercase ? node.value.toUpperCase() : node.value;

  return (
    <>
      <Text
        ref={textRef}
        text={display}
        x={node.nx * size}
        y={node.ny * size}
        width={node.nw * size}
        fontSize={node.fontSizeFrac * size}
        fontFamily={fontFamily}
        fontStyle={node.fontStyle ?? "normal"}
        fill={node.fill}
        stroke={node.stroke}
        strokeWidth={(node.strokeWidthFrac ?? 0) * size}
        fillAfterStrokeEnabled
        align={node.align ?? "left"}
        letterSpacing={node.letterSpacing}
        shadowColor={node.shadowColor}
        shadowBlur={(node.shadowBlurFrac ?? 0) * size}
        shadowOpacity={node.shadowColor ? 1 : 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          const newNx = e.target.x() / size;
          const newNy = e.target.y() / size;
          onTranslate(newNx - node.nx, newNy - node.ny);
        }}
      />
      {selected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          enabledAnchors={["middle-left", "middle-right"]}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width > 30 ? newBox : oldBox
          }
          onTransformEnd={() => {
            const text = textRef.current;
            if (!text) return;
            const newWidth = text.width() * text.scaleX();
            text.scaleX(1);
            text.width(newWidth);
            onChange({
              nx: text.x() / size,
              nw: newWidth / size,
            });
          }}
        />
      )}
    </>
  );
}
