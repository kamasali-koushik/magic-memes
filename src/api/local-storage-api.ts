export type UploadResult = {
  /** Path the file is served at (e.g. `/memes/123.png`). */
  url: string;
  filename: string;
};

/**
 * Sends a data URL to the local upload endpoint, which writes the bytes to
 * `public/memes/` and returns a URL the browser can load.
 */
export async function uploadDataUrl(
  dataUrl: string,
  options: { extension?: string } = {},
): Promise<UploadResult> {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl, extension: options.extension }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  return response.json();
}
