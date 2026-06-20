import { serverFetch } from "../../serverApi";

/** Phase 1: free plan — research + script + shot list for user review. */
export async function planAiVideo({ prompt, styleId = "auto", targetDuration = 45, language = "en", revision = "" }) {
  const res = await serverFetch("/api/ai-video/plan", {
    method: "POST",
    body: JSON.stringify({ prompt, styleId, targetDuration, language, revision }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Planning failed" }));
    throw new Error(err.error || "Planning failed");
  }
  return res.json(); // { plan, summary }
}

export async function generateAiVideo(
  { prompt, styleId = "auto", targetDuration = 45, language = "en", voiceId = null, orientation = "9:16", plan = null },
  onProgress,
) {
  const res = await serverFetch("/api/ai-video/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, styleId, targetDuration, language, voiceId, orientation, plan }),
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
    buffer      = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event;
      try { event = JSON.parse(line.slice(6)); } catch { continue; }

      if (event.error) {
        const err = new Error(event.error);
        if (event.code) err.code = event.code;
        throw err;
      }
      if (event.step != null && onProgress) onProgress({ step: event.step });
      if (event.done) {
        return { projectId: event.projectId, projectName: event.projectName, beatCount: event.beatCount };
      }
    }
  }

  throw new Error("Stream ended without a result");
}
