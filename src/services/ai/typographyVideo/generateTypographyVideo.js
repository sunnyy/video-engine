import { serverFetch } from "../../serverApi";

/** Phase 1 (free): script → returns the plan for the user to confirm/edit. */
export async function planTypographyVideo({ input, inputType = "topic", targetDuration = 40, language = "en", styleId = "auto", theme = "auto", accentColor = null }) {
  const res  = await serverFetch("/api/typography-video/plan", {
    method: "POST", body: JSON.stringify({ input, inputType, targetDuration, language, styleId, theme, accentColor }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "Couldn't build that script"); if (data.code) e.code = data.code; throw e; }
  return data.plan;
}

/** Phase 2 (charges): build the video from the confirmed/edited plan (SSE). */
export async function produceTypographyVideo(plan, { voiceId = null, language = "en", orientation = "9:16" } = {}, onProgress) {
  const res = await serverFetch("/api/typography-video/produce", {
    method: "POST", body: JSON.stringify({ plan, voiceId, language, orientation }),
  });
  return readSseResult(res, onProgress);
}

/** Combined (no confirmation) — legacy. */
export async function generateTypographyVideo({ input, inputType = "topic", targetDuration = 40, projectId = null, voiceId = null, language = "en", theme = "auto", accentColor = null }, onProgress) {
  const res = await serverFetch("/api/typography-video/generate", {
    method: "POST",
    body: JSON.stringify({ input, inputType, targetDuration, projectId, voiceId, language, theme, accentColor }),
  });
  return readSseResult(res, onProgress);
}

async function readSseResult(res, onProgress) {
  if (!res.ok && res.status !== 200) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    const e = new Error(err.error || "Generation failed"); if (err.code) e.code = err.code; throw e;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event;
      try { event = JSON.parse(line.slice(6)); } catch { continue; }

      if (event.error) {
        const err = new Error(event.error);
        if (event.code) err.code = event.code;
        throw err;
      }
      if (event.step != null && onProgress) {
        onProgress({ step: event.step });
      }
      if (event.done) {
        return { projectId: event.projectId, projectName: event.projectName };
      }
    }
  }

  throw new Error("Stream ended without a result");
}
