import { useEffect, useRef, useState } from "react";
import { Image, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
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
};

type DecRect = {
  kind: "rect";
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  fill: string;
  cornerRadiusFrac?: number;
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
  classic: "Classic",
  caption: "Caption",
  speech: "Speech",
  motivational: "Motivational",
  movie: "Movie",
  tabloid: "Tabloid",
};

const FORMAT_ORDER: MemeFormat[] = [
  "classic",
  "caption",
  "speech",
  "motivational",
  "movie",
  "tabloid",
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
    case "caption":
      return {
        decorations: [
          { kind: "rect", nx: 0, ny: 0, nw: 1, nh: 0.18, fill: "#FFFFFF" },
        ],
        texts: [
          {
            id: "caption",
            label: "Caption",
            value: idea.caption,
            nx: 0.04,
            ny: 0.045,
            nw: 0.92,
            fontSizeFrac: 0.055,
            fontFamily: FONT_SANS,
            fill: "#000000",
            align: "center",
            fontStyle: "bold",
          },
        ],
      };
    case "speech":
      return {
        decorations: [
          {
            kind: "rect",
            nx: 0.04,
            ny: 0.04,
            nw: 0.55,
            nh: 0.18,
            fill: "#FFFFFF",
            cornerRadiusFrac: 0.03,
          },
        ],
        texts: [
          {
            id: "text",
            label: "Speech",
            value: idea.text,
            nx: 0.07,
            ny: 0.075,
            nw: 0.49,
            fontSizeFrac: 0.045,
            fontFamily: FONT_SANS,
            fill: "#000000",
            fontStyle: "bold",
          },
        ],
      };
    case "motivational":
      return {
        decorations: [
          {
            kind: "gradient",
            nx: 0,
            ny: 0.62,
            nw: 1,
            nh: 0.38,
            stops: [
              [0, "rgba(0,0,0,0)"],
              [0.45, "rgba(0,0,0,0.85)"],
              [1, "rgba(0,0,0,0.98)"],
            ],
          },
        ],
        texts: [
          {
            id: "title",
            label: "Title",
            value: idea.title,
            nx: 0,
            ny: 0.78,
            nw: 1,
            fontSizeFrac: 0.085,
            fontFamily: FONT_SERIF,
            fill: "#FFFFFF",
            align: "center",
            letterSpacing: 2,
            uppercase: true,
          },
          {
            id: "subtitle",
            label: "Subtitle",
            value: idea.subtitle,
            nx: 0.1,
            ny: 0.9,
            nw: 0.8,
            fontSizeFrac: 0.034,
            fontFamily: FONT_SERIF,
            fill: "#FFFFFFE6",
            align: "center",
            fontStyle: "italic",
          },
        ],
      };
    case "movie":
      return {
        decorations: [
          {
            kind: "gradient",
            nx: 0,
            ny: 0.55,
            nw: 1,
            nh: 0.45,
            stops: [
              [0, "rgba(0,0,0,0)"],
              [0.6, "rgba(0,0,0,0.7)"],
              [1, "rgba(0,0,0,0.95)"],
            ],
          },
        ],
        texts: [
          {
            id: "tagline",
            label: "Tagline",
            value: idea.tagline,
            nx: 0.04,
            ny: 0.78,
            nw: 0.92,
            fontSizeFrac: 0.03,
            fontFamily: FONT_SERIF,
            fill: "#FFFFFFD9",
            align: "center",
            letterSpacing: 6,
            uppercase: true,
          },
          {
            id: "title",
            label: "Title",
            value: idea.title,
            nx: 0.03,
            ny: 0.84,
            nw: 0.94,
            fontSizeFrac: 0.115,
            fontFamily: FONT_SERIF,
            fill: "#FFFFFF",
            align: "center",
            fontStyle: "bold",
            uppercase: true,
          },
        ],
      };
    case "tabloid":
      return {
        decorations: [
          { kind: "rect", nx: 0, ny: 0, nw: 1, nh: 0.15, fill: "#FFE600" },
        ],
        texts: [
          {
            id: "headline",
            label: "Headline",
            value: idea.headline,
            nx: 0.03,
            ny: 0.025,
            nw: 0.94,
            fontSizeFrac: 0.06,
            fontFamily: FONT_BLACK,
            fill: "#E10600",
            stroke: "#000000",
            strokeWidthFrac: 0.0015,
            align: "center",
            fontStyle: "bold",
            uppercase: true,
          },
        ],
      };
  }
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

type Props = {
  imageUrl: string;
  initialIdea: MemeIdea;
  ideas: MemeIdea[];
  onShare: (dataUrl: string) => void;
  isSharing?: boolean;
};

export function MemeCanvasEditor({
  imageUrl,
  initialIdea,
  ideas,
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

  const img = useImage(imageUrl);

  const [formatStates, setFormatStates] = useState<
    Partial<Record<MemeFormat, FormatState>>
  >(() => ({ [initialIdea.format]: buildState(initialIdea) }));
  const [format, setFormat] = useState<MemeFormat>(initialIdea.format);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fontOverride, setFontOverride] = useState<string | null>(null);

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
    setSelectedId(null);
    // Defer to next frame so the transformer un-renders before snapshot.
    requestAnimationFrame(() => {
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      onShare(dataUrl);
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
      <div className="flex flex-col gap-3">
        <div
          ref={containerRef}
          className="relative aspect-square w-full overflow-hidden rounded-xl bg-black ring-1 ring-border"
        >
          {img && size > 0 && state && (
            <Stage
              ref={stageRef}
              width={size}
              height={size}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
              onTouchStart={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                <CoverImage img={img} size={size} />
                {state.decorations.map((d, i) => (
                  <DecorationNode key={i} dec={d} size={size} />
                ))}
                {state.texts.map((t) => (
                  <EditableTextNode
                    key={t.id}
                    node={t}
                    size={size}
                    fontFamily={fontOverride ?? t.fontFamily}
                    selected={selectedId === t.id}
                    onSelect={() => setSelectedId(t.id)}
                    onChange={(patch) => patchText(t.id, patch)}
                  />
                ))}
              </Layer>
            </Stage>
          )}
        </div>

        {/* Format chips */}
        <div className="flex flex-wrap gap-1.5">
          {FORMAT_ORDER.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setSelectedId(null);
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
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          {state?.texts.map((t) => (
            <label key={t.id} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.label}
              </span>
              <textarea
                rows={2}
                value={t.value}
                onChange={(e) => patchText(t.id, { value: e.target.value })}
                className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>
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

        {selectedId && (
          <NudgeControls
            onNudge={(dx, dy) => {
              const t = state?.texts.find((x) => x.id === selectedId);
              if (!t) return;
              patchText(selectedId, { nx: t.nx + dx, ny: t.ny + dy });
            }}
          />
        )}

        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
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

function CoverImage({
  img,
  size,
}: {
  img: HTMLImageElement;
  size: number;
}) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.max(size / iw, size / ih);
  const w = iw * scale;
  const h = ih * scale;
  return (
    <Image
      image={img}
      x={(size - w) / 2}
      y={(size - h) / 2}
      width={w}
      height={h}
      listening={false}
    />
  );
}

function DecorationNode({
  dec,
  size,
}: {
  dec: Decoration;
  size: number;
}) {
  if (dec.kind === "rect") {
    return (
      <Rect
        x={dec.nx * size}
        y={dec.ny * size}
        width={dec.nw * size}
        height={dec.nh * size}
        fill={dec.fill}
        cornerRadius={(dec.cornerRadiusFrac ?? 0) * size}
        listening={false}
      />
    );
  }
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
}: {
  node: TextNode;
  size: number;
  fontFamily: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<TextNode>) => void;
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
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            nx: e.target.x() / size,
            ny: e.target.y() / size,
          });
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
