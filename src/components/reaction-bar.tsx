import { useState } from "react";

import {
  REACTIONS,
  getReactedKind,
  markReacted,
  sendReaction,
  type ReactionKind,
} from "@/api/share-api";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
};

export function ReactionBar({ id }: Props) {
  // One reaction per viewer per meme. Stored in localStorage so it persists across reloads.
  const [reacted, setReacted] = useState<ReactionKind | null>(() =>
    getReactedKind(id),
  );
  const [pending, setPending] = useState<ReactionKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = reacted !== null || pending !== null;

  const handleClick = async (kind: ReactionKind) => {
    if (locked) return;
    setPending(kind);
    setError(null);
    try {
      await sendReaction(id, kind);
      markReacted(id, kind);
      setReacted(kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {REACTIONS.map((r) => {
          const isPending = pending === r.kind;
          const isMine = reacted === r.kind;
          return (
            <button
              key={r.kind}
              type="button"
              disabled={locked}
              onClick={() => handleClick(r.kind)}
              aria-label={r.label}
              className={cn(
                "inline-flex items-center justify-center rounded-full border bg-background px-3.5 py-2 text-2xl transition-all",
                "hover:border-primary/40 hover:bg-accent",
                "active:scale-95",
                "disabled:cursor-not-allowed",
                isMine
                  ? "border-primary bg-primary/15 ring-2 ring-primary/30"
                  : "border-border",
                locked && !isMine && "opacity-40",
                isPending && "animate-pulse",
              )}
            >
              {r.emoji}
            </button>
          );
        })}
      </div>

      {reacted && (
        <p className="text-sm text-muted-foreground">
          Reacted with{" "}
          {REACTIONS.find((r) => r.kind === reacted)?.emoji} · thanks for piling on
        </p>
      )}
      {!reacted && !pending && (
        <p className="text-xs text-muted-foreground">
          Pick one — you get one shot.
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
