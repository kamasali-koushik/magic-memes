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
const SERIF_FONT = '"Times New Roman", Times, serif';
const TABLOID_FONT = '"Arial Black", "Helvetica", sans-serif';

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
    case "classic":
      return <Classic imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "caption":
      return <Caption imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "speech":
      return <Speech imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "motivational":
      return <Motivational imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "movie":
      return <Movie imageUrl={imageUrl} idea={idea} {...overrides} />;
    case "tabloid":
      return <Tabloid imageUrl={imageUrl} idea={idea} {...overrides} />;
  }
}

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
        className="absolute inset-0 size-full object-cover"
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

function Caption({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "caption" }>;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div
        className="flex items-center justify-center px-[4cqw] py-[3cqw] text-center font-semibold text-black"
        style={{
          fontFamily: font(fontFamily, "inherit"),
          fontSize: "5.5cqw",
          lineHeight: 1.2,
          minHeight: "18%",
          ...translate(offset),
        }}
      >
        {idea.caption}
      </div>
      <div className="relative flex-1">
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    </div>
  );
}

function Speech({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "speech" }>;
}) {
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div
        className="absolute top-[4cqw] left-[4cqw] max-w-[55%] rounded-[3cqw] bg-white px-[3cqw] py-[2cqw] text-black shadow-[0_1cqw_2cqw_rgba(0,0,0,0.25)]"
        style={{
          fontFamily: font(fontFamily, "inherit"),
          fontSize: "4.5cqw",
          lineHeight: 1.2,
          fontWeight: 600,
          ...translate(offset),
        }}
      >
        {idea.text}
        <span
          className="absolute bg-white"
          style={{
            bottom: "-1.8cqw",
            left: "8cqw",
            width: "4cqw",
            height: "4cqw",
            transform: "rotate(45deg)",
            borderBottomRightRadius: "1cqw",
          }}
        />
      </div>
    </>
  );
}

function Motivational({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "motivational" }>;
}) {
  const family = font(fontFamily, SERIF_FONT);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black p-[3cqw]">
      <div
        className="w-full border-white"
        style={{ borderWidth: "0.3cqw", padding: "0.4cqw" }}
      >
        <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </div>
      <div
        className="mt-[2.5cqw] text-center text-white"
        style={{
          fontFamily: family,
          fontSize: "9cqw",
          lineHeight: 1,
          letterSpacing: "0.05em",
          ...translate(offset),
        }}
      >
        {idea.title.toUpperCase()}
      </div>
      <div
        className="mt-[1cqw] px-[3cqw] text-center text-white/90 italic"
        style={{
          fontFamily: family,
          fontSize: "3.5cqw",
          lineHeight: 1.2,
          ...translate(offset),
        }}
      >
        {idea.subtitle}
      </div>
    </div>
  );
}

function Movie({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "movie" }>;
}) {
  const family = font(fontFamily, SERIF_FONT);
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div
        className="absolute inset-x-0 bottom-0 pt-[15cqw] pb-[4cqw]"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0) 100%)",
          ...translate(offset),
        }}
      >
        <div
          className="px-[4cqw] text-center text-white"
          style={{
            fontFamily: family,
            fontSize: "3cqw",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          {idea.tagline}
        </div>
        <div
          className="mt-[1.5cqw] px-[3cqw] text-center text-white"
          style={{
            fontFamily: family,
            fontWeight: 700,
            fontSize: "12cqw",
            lineHeight: 1,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {idea.title}
        </div>
      </div>
    </>
  );
}

function Tabloid({
  imageUrl,
  idea,
  fontFamily,
  offset,
}: MemeOverrides & {
  imageUrl: string;
  idea: Extract<MemeIdea, { format: "tabloid" }>;
}) {
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div
        className="absolute inset-x-0 top-0"
        style={{ background: "#FFE600", ...translate(offset) }}
      >
        <div
          className="px-[3cqw] py-[2.5cqw] text-center"
          style={{
            color: "#E10600",
            fontFamily: font(fontFamily, TABLOID_FONT),
            fontWeight: 900,
            fontSize: "6cqw",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            WebkitTextStroke: "0.15cqw black",
          }}
        >
          {idea.headline}
        </div>
      </div>
    </>
  );
}
