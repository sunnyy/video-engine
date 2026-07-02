import { serverFetch } from "../../serverApi";

/** Upload the long source video → { url, key }. Reuses the generic caption video uploader. */
export async function uploadClipSource(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await serverFetch("/api/caption/upload-video", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data; // { url, key }
}

/**
 * generateClips({ videoUrl, sourceKey, captionStyle, clipLenMin, clipLenMax, language }, onProgress)
 * Streams SSE progress; resolves { clips, clipCount, sourceDuration }.
 */
export async function generateClips(
  { videoUrl, sourceKey = null, captionStyle = "wordBlaze", clipLenMin = 20, clipLenMax = 60, autoLength = false, language = "en" },
  onProgress,
) {
  const res = await serverFetch("/api/video-clipping/generate", {
    method: "POST",
    body: JSON.stringify({ videoUrl, sourceKey, captionStyle, clipLenMin, clipLenMax, autoLength, language }),
  });

  if (!res.ok && res.status !== 200) {
    const err = await res.json().catch(() => ({ error: "Clipping failed" }));
    throw new Error(err.error || "Clipping failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event;
      try { event = JSON.parse(line.slice(6)); } catch { continue; }
      if (event.error) {
        const e = new Error(event.error);
        if (event.code) e.code = event.code;
        throw e;
      }
      if (event.step != null && onProgress) onProgress({ step: event.step });
      if (event.done) return { clips: event.clips || [], clipCount: event.clipCount || 0, sourceDuration: event.sourceDuration || 0 };
    }
  }
  throw new Error("Stream ended without a result");
}
