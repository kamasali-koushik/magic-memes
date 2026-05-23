import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Download04Icon,
  Image01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

type Props = {
  id: string;
  imageUrl: string;
  label?: string;
  helper?: string;
  className?: string;
};

async function fetchAsPng(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: "cors", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status})`);
  }
  const blob = await response.blob();
  if (blob.type === "image/png") return blob;

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
      "image/png",
    );
  });
}

export function MemeImageActions({
  id,
  imageUrl,
  label = "Image",
  helper = "Save as PNG or paste straight into chats and docs.",
  className,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSavePng = async () => {
    setError(null);
    try {
      const blob = await fetchAsPng(imageUrl);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `magic-meme-${id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  };

  const handleCopyImage = async () => {
    setError(null);
    if (typeof ClipboardItem === "undefined") {
      setError("This browser can't copy images to the clipboard");
      return;
    }
    try {
      // Safari requires ClipboardItem built synchronously inside the gesture,
      // so we pass the Promise<Blob> directly.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": fetchAsPng(imageUrl) }),
      ]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        const blob = await fetchAsPng(imageUrl);
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Copy failed");
      }
    }
  };

  return (
    <div className={className}>
      {label ? (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap items-stretch gap-1.5">
        <button
          type="button"
          onClick={handleSavePng}
          aria-label="Download meme as PNG"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-2 text-xs font-medium transition-colors hover:bg-accent",
            saved && "border-primary/50 bg-primary/10",
          )}
        >
          <HugeiconsIcon
            icon={saved ? CheckmarkCircle02Icon : Download04Icon}
            className="size-3.5"
          />
          {saved ? "Saved" : "Save PNG"}
        </button>
        <button
          type="button"
          onClick={handleCopyImage}
          aria-label="Copy meme image to clipboard"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-2 text-xs font-medium transition-colors hover:bg-accent",
            copied && "border-primary/50 bg-primary/10",
          )}
        >
          <HugeiconsIcon
            icon={copied ? CheckmarkCircle02Icon : Image01Icon}
            className="size-3.5"
          />
          {copied ? "Copied" : "Copy image"}
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px] text-destructive">{error}</p>
      ) : helper ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
