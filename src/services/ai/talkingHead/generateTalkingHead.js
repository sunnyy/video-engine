import { serverFetch } from "../../serverApi";

/** Upload a talking-head video → { url }. Reuses the generic caption video uploader. */
export async function uploadTalkingHeadVideo(file) {
  const form = new FormData();
  form.append("file", file);
  const res  = await serverFetch("/api/caption/upload-video", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data; // { url }
}

/**
 * generateTalkingHead({ videoUrl, durationSeconds, captionStyle, captionPos, reframe }, onProgress)
 * Streams SSE progress; resolves { projectId, projectName }.
 */
export async function generateTalkingHead(
  { videoUrl, durationSeconds = 0, captionStyle = "wordBlaze", captionPos = 80, reframe = "source", music = true, styleId = "auto", theme = "auto", accentColor = null, accentColor2 = null },
  onProgress,
) {
  const res = await serverFetch("/api/talking-head/generate", {
    method: "POST",
    body: JSON.stringify({ videoUrl, durationSeconds, captionStyle, captionPos, reframe, music, styleId, theme, accentColor, accentColor2 }),
  });

  if (!res.ok && res.status !== 200) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error || "Generation failed");
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

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
      if (event.done) return { projectId: event.projectId, projectName: event.projectName };
    }
  }
  throw new Error("Stream ended without a result");
}
