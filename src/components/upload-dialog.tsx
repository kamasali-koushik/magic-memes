import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  Cancel01Icon,
  Image01Icon,
  Loading03Icon,
  MagicWand01Icon,
} from "@hugeicons/core-free-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateMemeIdeas, type MemeIdea } from "@/api/open-router-api";
import { uploadMeme, type ShareResult } from "@/api/share-api";
import { MemePreview } from "@/components/meme-preview";
import { MemeCanvasEditor } from "@/components/meme-canvas-editor";
import { SharedView } from "@/components/shared-view";

const FORMAT_LABELS: Record<MemeIdea["format"], string> = {
  classic: "Classic",
  caption: "Caption",
  speech: "Speech bubble",
  motivational: "Motivational",
  movie: "Movie poster",
  tabloid: "Tabloid",
};

type Selected = { file: File; url: string };

type Phase =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ideas"; ideas: MemeIdea[] }
  | { status: "picked"; idea: MemeIdea; ideas: MemeIdea[] }
  | { status: "sharing"; idea: MemeIdea; ideas: MemeIdea[] }
  | { status: "shared"; share: ShareResult }
  | { status: "error"; message: string };

export function UploadDialog() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ status: "idle" });

  // Revoke object URL on unmount. (Swap/clear revoke eagerly during use.)
  const selectedRef = useRef<Selected | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(
    () => () => {
      if (selectedRef.current) URL.revokeObjectURL(selectedRef.current.url);
    },
    [],
  );

  const setFile = (file: File) => {
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    setPhase({ status: "idle" });
  };

  const acceptFiles = (files: FileList | File[]) => {
    const first = Array.from(files).find((f) => f.type.startsWith("image/"));
    if (first) setFile(first);
  };

  const clearSelected = () => {
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setPhase({ status: "idle" });
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (phase.status === "generating" || phase.status === "sharing") return;
    navigate({ to: "/" });
  };

  const handleShare = async (dataUrl: string) => {
    if (phase.status !== "picked") return;
    const { idea, ideas } = phase;
    setPhase({ status: "sharing", idea, ideas });
    try {
      const share = await uploadMeme(dataUrl);
      setPhase({ status: "shared", share });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Share failed", error);
      setPhase({ status: "error", message });
    }
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setPhase({ status: "generating" });
    try {
      const { ideas } = await generateMemeIdeas({ image: selected.file });
      setPhase({ status: "ideas", ideas });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Meme idea generation failed", error);
      setPhase({ status: "error", message });
    }
  };

  const isBusy = phase.status === "generating";
  const showsGrid = phase.status === "ideas";
  const showsPicked =
    phase.status === "picked" || phase.status === "sharing";
  const showsShared = phase.status === "shared";
  const wideClass =
    showsPicked || showsShared
      ? "sm:max-w-4xl"
      : showsGrid
        ? "sm:max-w-3xl"
        : "sm:max-w-lg";

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("transition-[max-width] duration-200", wideClass)}
      >
        <DialogHeader>
          <DialogTitle>
            {showsShared
              ? "Shared — send the link"
              : showsPicked
                ? "Edit your meme"
                : showsGrid
                  ? "Six fresh takes — pick one"
                  : isBusy
                    ? "Reading your photo…"
                    : "Drop a photo"}
          </DialogTitle>
          <DialogDescription>
            {showsShared
              ? "Anyone with the link can react. Watch the counts climb."
              : showsPicked
                ? "Drag to move, swap templates with the chips, hit Share when it's right."
                : showsGrid
                  ? "Each one's written for what's actually in your picture."
                  : isBusy
                    ? "Coming up with six meme ideas in different formats."
                    : "One photo. We'll write six meme captions tailored to it."}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) acceptFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {phase.status === "generating" ? (
          <BusyState />
        ) : phase.status === "ideas" && selected ? (
          <IdeasGrid
            imageUrl={selected.url}
            ideas={phase.ideas}
            onPick={(idea) =>
              setPhase({ status: "picked", idea, ideas: phase.ideas })
            }
          />
        ) : (phase.status === "picked" || phase.status === "sharing") &&
          selected ? (
          <MemeCanvasEditor
            imageUrl={selected.url}
            initialIdea={phase.idea}
            ideas={phase.ideas}
            onShare={handleShare}
            isSharing={phase.status === "sharing"}
          />
        ) : phase.status === "shared" ? (
          <SharedView
            id={phase.share.id}
            imageUrl={phase.share.imageUrl}
            shareUrl={phase.share.shareUrl}
          />
        ) : selected ? (
          <SelectedPreview
            url={selected.url}
            onSwap={() => inputRef.current?.click()}
            onClear={clearSelected}
          />
        ) : (
          <DropZone
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            onFiles={acceptFiles}
            onClick={() => inputRef.current?.click()}
          />
        )}

        {phase.status === "error" && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {phase.message}
          </p>
        )}

        <DialogFooter className="sm:items-center">
          {showsShared && phase.status === "shared" ? (
            <Button
              variant="outline"
              onClick={() => {
                clearSelected();
              }}
            >
              Make another
            </Button>
          ) : showsPicked &&
            (phase.status === "picked" || phase.status === "sharing") ? (
            <Button
              variant="outline"
              disabled={phase.status === "sharing"}
              onClick={() =>
                setPhase({ status: "ideas", ideas: phase.ideas })
              }
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} />
              Back to ideas
            </Button>
          ) : showsGrid ? (
            <Button variant="outline" onClick={clearSelected}>
              Use a different photo
            </Button>
          ) : (
            <>
              <p className="text-xs text-muted-foreground sm:mr-auto">
                {isBusy
                  ? "This usually takes a few seconds."
                  : selected
                    ? "Looks good — let's generate."
                    : "PNG, JPG, GIF · one image"}
              </p>
              <Button
                disabled={!selected || isBusy}
                onClick={handleGenerate}
              >
                <HugeiconsIcon
                  icon={isBusy ? Loading03Icon : MagicWand01Icon}
                  className={isBusy ? "animate-spin" : undefined}
                />
                {isBusy ? "Generating…" : "Generate 6 ideas"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BusyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-input/30 px-6 py-12 text-muted-foreground">
      <HugeiconsIcon
        icon={Loading03Icon}
        className="size-8 animate-spin text-primary"
      />
      <p className="text-sm font-medium text-foreground">
        Looking at your photo…
      </p>
    </div>
  );
}

function IdeasGrid({
  imageUrl,
  ideas,
  onPick,
}: {
  imageUrl: string;
  ideas: MemeIdea[];
  onPick: (idea: MemeIdea) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ideas.map((idea) => (
        <button
          key={idea.format}
          type="button"
          onClick={() => onPick(idea)}
          className="group flex flex-col gap-2 rounded-2xl p-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          <MemePreview
            imageUrl={imageUrl}
            idea={idea}
            className="ring-1 ring-border transition-transform group-hover:scale-[1.01]"
          />
          <span className="px-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
            {FORMAT_LABELS[idea.format]}
          </span>
        </button>
      ))}
    </div>
  );
}

function SelectedPreview({
  url,
  onSwap,
  onClear,
}: {
  url: string;
  onSwap: () => void;
  onClear: () => void;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
      <img src={url} alt="" className="size-full object-cover" />
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove photo"
        className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-background/85 text-foreground ring-1 ring-border backdrop-blur-sm hover:bg-background"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onSwap}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border backdrop-blur-sm hover:bg-background"
      >
        Swap photo
      </button>
    </div>
  );
}

function DropZone({
  isDragging,
  setIsDragging,
  onFiles,
  onClick,
}: {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onFiles: (files: FileList | File[]) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-input/30 px-6 py-12 text-muted-foreground transition-colors hover:bg-input/50 hover:text-foreground",
        isDragging && "border-primary/60 bg-primary/5 text-foreground",
      )}
    >
      <HugeiconsIcon icon={Image01Icon} className="size-8" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          Drop a photo here, or click to browse
        </p>
        <p className="text-xs">PNG, JPG, GIF · one image</p>
      </div>
    </button>
  );
}
