import { cn } from "@/lib/utils";
import type { MemeIdea } from "@/api/open-router-api";

export type MemeOverrides = {
  /** Override the default font family for the meme's text. */
  fontFamily?: string | null;
  /** Translate the text overlay, in container-width percent (-100…100). */
  offset?: { x: number; y: number };
};

type Props = MemeOverrides & {
  imageUrl: string;
  idea: MemeIdea;
  className?: string;
};

export function MemePreview({
  imageUrl,
  idea,
  className,
  fontFamily,
  offset,
}: Props) {
  return (
    <div
      className={cn(
        "@container relative aspect-square w-full overflow-hidden rounded-xl bg-black select-none",
        className,
      )}
    >
      {renderMeme(imageUrl, idea, { fontFamily, offset })}
    </div>
  );
}

const IMPACT_FONT =
  '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
const SANS_FONT = '"Helvetica", "Arial", sans-serif';

function font(override: string | null | undefined, fallback: string): string {
  return override && override.length > 0 ? override : fallback;
}

function translate(
  offset: MemeOverrides["offset"],
): React.CSSProperties | undefined {
  if (!offset) return undefined;
  return { transform: `translate(${offset.x}cqw, ${offset.y}cqw)` };
}

function renderMeme(
  imageUrl: string,
  idea: MemeIdea,
  overrides: MemeOverrides,
) {
  switch (idea.format) {
    case "lucky":
      return <Lucky imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "classic":
      return <Classic imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "deepfried":
      return <DeepFried imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "bgswap":
      return <BgSwap imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "stickers":
      return <Stickers imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "remix":
      return <Remix imageUrl={imageUrl} idea={idea} {...overrides} />;
  }
}

// --- Shared helpers ---

function ImpactText({
  children,
  family,
  style,
}: {
  children: React.ReactNode;
  family: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="absolute right-0 left-0 px-[3cqw] text-center leading-[1.05] tracking-wide text-white uppercase"
      style={{
        fontFamily: family,
        WebkitTextStroke: "0.5cqw black",
        textShadow: "0 0.3cqw 0 #000, 0 0 0.6cqw rgba(0,0,0,0.6)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- Variants ---

function Classic({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "classic" }>;
}) {
  const family = font(fontFamily, IMPACT_FONT);
  const shift = translate(offset);
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-contain"
      />
      <ImpactText
        family={family}
        style={{ top: "3cqw", fontSize: "10cqw", ...shift }}
      >
        {idea.topText}
      </ImpactText>
      <ImpactText
        family={family}
        style={{ bottom: "3cqw", fontSize: "10cqw", ...shift }}
      >
        {idea.bottomText}
      </ImpactText>
    </>
  );
}

function DeepFried({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "deepfried" }>;
}) {
  const family = font(fontFamily, IMPACT_FONT);
  const shift = translate(offset);
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-contain"
        style={{
          filter: "saturate(2.4) contrast(1.4) hue-rotate(-8deg) brightness(1.05)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255,80,0,0.45), transparent 55%), radial-gradient(circle at 75% 80%, rgba(255,255,0,0.35), transparent 55%)",
        }}
      />
      <ImpactText
        family={family}
        style={{
          top: "3cqw",
          fontSize: "11cqw",
          color: "#FFEA00",
          WebkitTextStroke: "0.6cqw #B30000",
          textShadow:
            "0 0.4cqw 0 #B30000, 0 0 1cqw rgba(255,0,0,0.8), 0 0 2cqw rgba(255,255,0,0.6)",
          ...shift,
        }}
      >
        {idea.topText}
      </ImpactText>
      <ImpactText
        family={family}
        style={{
          bottom: "3cqw",
          fontSize: "11cqw",
          color: "#FFEA00",
          WebkitTextStroke: "0.6cqw #B30000",
          textShadow:
            "0 0.4cqw 0 #B30000, 0 0 1cqw rgba(255,0,0,0.8), 0 0 2cqw rgba(255,255,0,0.6)",
          ...shift,
        }}
      >
        {idea.bottomText}
      </ImpactText>
    </>
  );
}

function Lucky({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "lucky" }>;
}) {
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-contain"
        style={{ filter: "saturate(1.3) contrast(1.1)" }}
      />
      <div
        className="absolute inset-x-[5cqw] bottom-[5cqw] rounded-[2.5cqw] px-[3.5cqw] py-[2.5cqw] text-center ring-2 ring-black/40"
        style={{
          background: "linear-gradient(135deg, #fef08a 0%, #fda4af 100%)",
          fontFamily: font(fontFamily, SANS_FONT),
          fontWeight: 800,
          fontSize: "5cqw",
          lineHeight: 1.15,
          color: "#1f2937",
          boxShadow: "0 1cqw 2cqw rgba(0,0,0,0.45)",
          ...translate(offset),
        }}
      >
        <span
          className="block uppercase tracking-[0.25em]"
          style={{ fontSize: "2.6cqw", opacity: 0.7 }}
        >
          ✨ I'm feeling lucky
        </span>
        <span className="mt-[0.6cqw] block">{idea.caption}</span>
      </div>
    </>
  );
}

function BgSwap({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "bgswap" }>;
}) {
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-contain"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.55) 0%, rgba(236,72,153,0.45) 50%, rgba(14,165,233,0.55) 100%)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="absolute inset-x-[6cqw] top-[8cqw] rounded-[1.5cqw] bg-black/65 px-[3cqw] py-[2cqw] text-center text-white ring-1 ring-white/25 backdrop-blur-sm"
        style={{
          fontFamily: font(fontFamily, SANS_FONT),
        }}
      >
        <div
          style={{
            fontSize: "2.6cqw",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.75,
          }}
        >
          Background → AI
        </div>
        <div
          style={{
            fontSize: "5cqw",
            fontWeight: 800,
            lineHeight: 1.15,
            marginTop: "0.6cqw",
          }}
        >
          {idea.scene}
        </div>
      </div>
      <div
        className="absolute inset-x-[4cqw] bottom-[4cqw] rounded-[1.5cqw] bg-white/95 px-[3cqw] py-[2cqw] text-center text-black ring-2 ring-black/30"
        style={{
          fontFamily: font(fontFamily, SANS_FONT),
          fontWeight: 700,
          fontSize: "4.5cqw",
          lineHeight: 1.2,
          boxShadow: "0 0.4cqw 0.8cqw rgba(0,0,0,0.3)",
          ...translate(offset),
        }}
      >
        {idea.caption}
      </div>
    </>
  );
}

// 3 border anchors that hug the edges and leave the center of the image
// (where the subject lives) free of sticker overlap. Order matters: TL → TR → BL.
const STICKER_ANCHORS: ReadonlyArray<{ x: number; y: number; rot: number }> = [
  { x: 14, y: 14, rot: -12 },
  { x: 86, y: 14, rot: 14 },
  { x: 14, y: 68, rot: 10 },
];

function Stickers({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "stickers" }>;
}) {
  const positions = idea.stickers
    .slice(0, 3)
    .map((sticker, i) => ({ sticker, ...STICKER_ANCHORS[i]! }));
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-contain"
      />
      {positions.map((p, i) => (
        <span
          key={i}
          className="absolute select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: "13cqw",
            transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
            filter:
              "drop-shadow(0 0.4cqw 0.6cqw rgba(0,0,0,0.55)) drop-shadow(0 0 0.3cqw rgba(255,255,255,0.5))",
          }}
        >
          {p.sticker}
        </span>
      ))}
      <div
        className="absolute inset-x-[4cqw] bottom-[3cqw] rounded-[1.2cqw] bg-white px-[3cqw] py-[1.8cqw] text-center text-black ring-1 ring-black/30"
        style={{
          fontFamily: font(fontFamily, SANS_FONT),
          fontWeight: 700,
          fontSize: "4.2cqw",
          lineHeight: 1.2,
          boxShadow: "0 0.4cqw 0.8cqw rgba(0,0,0,0.3)",
          ...translate(offset),
        }}
      >
        {idea.caption}
      </div>
    </>
  );
}

function Remix({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "remix" }>;
}) {
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-contain opacity-90"
      />
      <div
        className="pointer-events-none absolute inset-0 border-[0.6cqw] border-dashed border-cyan-300/80"
        style={{ borderRadius: "inherit" }}
      />
      <div
        className="absolute top-[3cqw] right-[3cqw] rounded-full bg-cyan-400 px-[2.5cqw] py-[1cqw] text-black ring-2 ring-cyan-900/40"
        style={{
          fontFamily: font(fontFamily, SANS_FONT),
          fontWeight: 800,
          fontSize: "3cqw",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        🔁 Remix
      </div>
      <div
        className="absolute inset-x-[4cqw] bottom-[4cqw] rounded-[1.5cqw] bg-black/90 px-[3cqw] py-[2cqw] text-center text-white ring-2 ring-white/30"
        style={{
          fontFamily: font(fontFamily, SANS_FONT),
          fontWeight: 700,
          fontSize: "4.5cqw",
          lineHeight: 1.2,
          boxShadow: "0 0.4cqw 0.8cqw rgba(0,0,0,0.4)",
          ...translate(offset),
        }}
      >
        {idea.suggestedCaption}
      </div>
    </>
  );
}
