import { serverFetch } from "../../serverApi";

/** Phase 1: free plan — research + script + shot list for user review. */
export async function planPromptVideo({ prompt, styleId = "auto", targetDuration = 45, language = "en", revision = "", theme = "auto", accentColor = null, accentColor2 = null }) {
  const res = await serverFetch("/api/ai-video/plan", {
    method: "POST",
    body: JSON.stringify({ prompt, styleId, targetDuration, language, revision, theme, accentColor, accentColor2 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Planning failed" }));
    throw new Error(err.error || "Planning failed");
  }
  return res.json(); // { plan, summary }
}

// Consume the generate/finish SSE stream. Resolves with a normal result {projectId,...}, or an
// {incomplete:true, projectId, message} result when the voiceover stage failed but the work was saved.
async function readGenerationStream(res, onProgress) {
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
      if (event.incomplete) {
        return { incomplete: true, projectId: event.projectId, message: event.message };
      }
      if (event.done) {
        return { projectId: event.projectId, projectName: event.projectName, beatCount: event.beatCount };
      }
    }
  }

  throw new Error("Stream ended without a result");
}

export async function generatePromptVideo(
  { prompt, styleId = "auto", targetDuration = 45, language = "en", voiceId = null, orientation = "9:16", plan = null, theme = "auto", accentColor = null, accentColor2 = null },
  onProgress,
) {
  const res = await serverFetch("/api/ai-video/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, styleId, targetDuration, language, voiceId, orientation, plan, theme, accentColor, accentColor2 }),
  });
  return readGenerationStream(res, onProgress);
}

/** Finish a saved INCOMPLETE generation (voiceover stage had failed). Re-runs from the saved plan. */
export async function finishPromptVideo(projectId, onProgress) {
  const res = await serverFetch(`/api/ai-video/${projectId}/finish`, { method: "POST" });
  return readGenerationStream(res, onProgress);
}
