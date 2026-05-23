import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons";

import { fetchMeme, REACTIONS } from "@/api/share-api";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  imageUrl: string;
  shareUrl: string;
};

type Floater = {
  id: string;
  emoji: string;
  leftPct: number;
  delayMs: number;
};

const MAX_FLOATERS_PER_DELTA = 8;

export function SharedView({ id, imageUrl, shareUrl }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  const lastSeenRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);

  const absoluteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${shareUrl}`
      : shareUrl;

  useEffect(() => {
    let cancelled = false;

    const spawnDelta = (
      prev: Record<string, number>,
      next: Record<string, number>,
    ) => {
      const additions: Floater[] = [];
      for (const r of REACTIONS) {
        const before = prev[r.kind] ?? 0;
        const after = next[r.kind] ?? 0;
        const delta = after - before;
        if (delta <= 0) continue;
        const n = Math.min(delta, MAX_FLOATERS_PER_DELTA);
        for (let i = 0; i < n; i++) {
          additions.push({
            id: crypto.randomUUID(),
            emoji: r.emoji,
            leftPct: 10 + Math.random() * 80,
            delayMs: i * 140 + Math.random() * 120,
          });
        }
      }
      if (additions.length === 0) return;
      setFloaters((cur) => [...cur, ...additions]);
    };

    const poll = async () => {
      try {
        const meme = await fetchMeme(id);
        if (cancelled) return;
        setCounts(meme.counts);
        if (initializedRef.current) {
          spawnDelta(lastSeenRef.current, meme.counts);
        } else {
          initializedRef.current = true;
        }
        lastSeenRef.current = meme.counts;
      } catch {
        // Ignore — next tick will retry.
      }
    };

    poll();
    const interval = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Some browsers/contexts (non-https) block clipboard.
    }
  };

  const total = REACTIONS.reduce(
    (sum, r) => sum + (counts[r.kind] ?? 0),
    0,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-border">
        <img src={imageUrl} alt="Shared meme" className="block w-full" />

        {/* Floating reactions overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {floaters.map((f) => (
            <span
              key={f.id}
              className="reaction-float absolute bottom-2 text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              style={{
                left: `${f.leftPct}%`,
                animationDelay: `${f.delayMs}ms`,
              }}
              onAnimationEnd={() =>
                setFloaters((cur) => cur.filter((x) => x.id !== f.id))
              }
            >
              {f.emoji}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Share link
          </p>
          <div className="flex items-stretch gap-1.5">
            <input
              readOnly
              value={absoluteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-2 text-xs focus:border-ring focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy share link"
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-2 text-xs font-medium transition-colors hover:bg-accent",
                copied && "border-primary/50 bg-primary/10",
              )}
            >
              <HugeiconsIcon
                icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
                className="size-3.5"
              />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Anyone with this link can react. No signup needed.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Reactions (live)
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {total === 0
                ? "watching…"
                : `${total} ${total === 1 ? "reaction" : "reactions"}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REACTIONS.map((r) => {
              const count = counts[r.kind] ?? 0;
              return (
                <div
                  key={r.kind}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm",
                    count === 0 && "opacity-50",
                  )}
                >
                  <span className="text-base">{r.emoji}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
