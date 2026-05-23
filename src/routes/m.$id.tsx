import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { fetchMeme, type Meme } from "@/api/share-api";
import { MemeImageActions } from "@/components/meme-image-actions";
import { ReactionBar } from "@/components/reaction-bar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/m/$id")({
  component: MemeViewerRoute,
});

function MemeViewerRoute() {
  const { id } = Route.useParams();
  const [meme, setMeme] = useState<Meme | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMeme(id)
      .then((data) => {
        if (!cancelled) setMeme(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 py-10">
      {error && !meme ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : !meme ? (
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" />
      ) : (
        <>
          <img
            src={meme.imageUrl}
            alt="Shared meme"
            className="w-full rounded-2xl ring-1 ring-border shadow-sm"
          />
          <MemeImageActions
            id={meme.id}
            imageUrl={meme.imageUrl}
            label=""
            helper=""
            className="w-full"
          />
          <ReactionBar id={meme.id} />
        </>
      )}

      <div className="mt-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/upload">Make your own</Link>
        </Button>
      </div>
    </main>
  );
}
