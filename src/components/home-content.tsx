import { Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChampionIcon, SparklesIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { FallingMemes } from "@/components/falling-memes";

export function HomeContent() {
  return (
    <>
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-rose-100 via-amber-50 to-violet-200" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="magic-blob absolute -left-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-rose-300/50 blur-3xl" />
        <div
          className="magic-blob absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-300/45 blur-3xl"
          style={{ animationDelay: "-4s", animationDirection: "reverse" }}
        />
        <div
          className="magic-blob absolute -bottom-32 left-1/3 h-[22rem] w-[22rem] rounded-full bg-amber-300/50 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />
        <div
          className="magic-blob absolute top-10 right-1/4 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl"
          style={{ animationDelay: "-12s" }}
        />
      </div>

      <FallingMemes />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center gap-7 px-6 text-center">
        <div className="flex flex-col items-center gap-5">
          <h1 className="font-heading text-6xl font-extrabold tracking-tight sm:text-7xl">
            <span className="relative inline-block">
              <span className="magic-text">Magic Memes</span>
              <span
                className="magic-sparkle pointer-events-none absolute -right-6 -top-3 text-3xl"
                aria-hidden
              >
                ✨
              </span>
              <span
                className="magic-sparkle pointer-events-none absolute -bottom-2 -left-5 text-2xl"
                style={{ animationDelay: "0.7s" }}
                aria-hidden
              >
                ✨
              </span>
              <span
                className="magic-sparkle pointer-events-none absolute right-2 -top-7 text-xl"
                style={{ animationDelay: "1.4s" }}
                aria-hidden
              >
                ⭐
              </span>
              <span
                className="magic-sparkle pointer-events-none absolute -bottom-4 right-8 text-xl"
                style={{ animationDelay: "1.9s" }}
                aria-hidden
              >
                💫
              </span>
            </span>
          </h1>

          <p className="text-lg text-slate-700">
            Upload your photos. We'll turn them into shareable memes —{" "}
            <span className="font-semibold text-violet-700">instantly</span>.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="pointer-events-auto h-14 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 px-8 text-base font-semibold shadow-lg shadow-rose-500/30 ring-1 ring-white/20 transition-transform hover:scale-105 hover:shadow-xl hover:shadow-fuchsia-500/40"
          >
            <Link to="/upload">
              <HugeiconsIcon icon={SparklesIcon} />
              Make a meme
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="pointer-events-auto h-14 border-violet-300/60 bg-white/70 px-6 text-base font-semibold text-slate-800 backdrop-blur-sm transition-transform hover:scale-105 hover:bg-white"
          >
            <Link to="/leaderboard">
              <HugeiconsIcon icon={ChampionIcon} />
              Leaderboard
            </Link>
          </Button>
        </div>

        <p className="text-xs text-slate-500/80">
          Tip: grab a falling meme and toss it around ✨
        </p>
      </div>
    </>
  );
}
