import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, Loading03Icon } from "@hugeicons/core-free-icons";

import {
  fetchLeaderboard,
  REACTIONS,
  type LeaderboardEntry,
} from "@/api/share-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardRoute,
});

function LeaderboardRoute() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchLeaderboard(50)
        .then((data) => {
          if (cancelled) return;
          setEntries(data);
          setError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : String(e));
        });
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-rose-100 via-amber-50 to-violet-200" />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <HugeiconsIcon icon={ArrowLeft02Icon} />
              Home
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/upload">Make a meme</Link>
          </Button>
        </div>

        <header className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="magic-text">Leaderboard</span>
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            The memes pulling the most reactions, ranked.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : entries === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-4 animate-spin"
            />
            Counting reactions…
          </div>
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="flex flex-col gap-3">
            {entries.map((entry, idx) => (
              <LeaderboardRow
                key={entry.id}
                rank={idx + 1}
                entry={entry}
                onPreview={() => setPreview(entry)}
              />
            ))}
          </ol>
        )}
      </div>

      <PreviewDialog
        entry={preview}
        onClose={() => setPreview(null)}
      />
    </main>
  );
}

function PreviewDialog({
  entry,
  onClose,
}: {
  entry: LeaderboardEntry | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Meme preview</DialogTitle>
          <DialogDescription>
            Preview of the selected meme image.
          </DialogDescription>
        </DialogHeader>
        {entry && (
          <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border">
            <img
              src={entry.imageUrl}
              alt="Meme preview"
              className="block w-full"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LeaderboardRow({
  rank,
  entry,
  onPreview,
}: {
  rank: number;
  entry: LeaderboardEntry;
  onPreview: () => void;
}) {
  const topMedal = rank <= 3;

  return (
    <li>
      <button
        type="button"
        onClick={onPreview}
        className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-white/70 p-3 text-left ring-1 ring-white/40 backdrop-blur-sm transition-all hover:bg-white hover:ring-violet-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold tabular-nums",
            rank === 1 && "bg-amber-400/90 text-white shadow-md shadow-amber-400/30",
            rank === 2 && "bg-slate-300 text-white shadow-md shadow-slate-300/30",
            rank === 3 && "bg-orange-400/90 text-white shadow-md shadow-orange-400/30",
            !topMedal && "bg-muted text-muted-foreground",
          )}
        >
          {rank}
        </div>

        <div className="aspect-square size-16 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border">
          <img
            src={entry.imageUrl}
            alt=""
            className="size-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tabular-nums">
            {entry.totalReactions}{" "}
            <span className="font-normal text-muted-foreground">
              {entry.totalReactions === 1 ? "reaction" : "reactions"}
            </span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {REACTIONS.map((r) => {
              const count = entry.counts[r.kind] ?? 0;
              if (count === 0) return null;
              return (
                <span
                  key={r.kind}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums"
                >
                  <span>{r.emoji}</span>
                  <span className="text-muted-foreground">{count}</span>
                </span>
              );
            })}
            {entry.totalReactions === 0 && (
              <span className="text-xs text-muted-foreground">
                no reactions yet
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-white/50 p-12 text-center">
      <p className="text-base font-medium text-foreground">
        Nothing's caught fire yet
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Memes show up here once they pick up reactions.
      </p>
      <div className="mt-4">
        <Button asChild>
          <Link to="/upload">Make a meme</Link>
        </Button>
      </div>
    </div>
  );
}
