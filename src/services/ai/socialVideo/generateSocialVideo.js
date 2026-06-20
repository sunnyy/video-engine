import { serverFetch } from "../../serverApi";

/** Phase 1 (free): fetch + script → returns the plan for the user to confirm/edit. */
export async function planSocialVideo({ url, targetDuration = 25, language = "en" }) {
  const res  = await serverFetch("/api/social-video/plan", {
    method: "POST", body: JSON.stringify({ url, targetDuration, language }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "Could not read that post"); if (data.code) e.code = data.code; throw e; }
  return data.plan;
}

/** Phase 2 (charges): build the video from the confirmed/edited plan (SSE). */
export async function produceSocialVideo(plan, { voiceId = null, language = "en", includeAuthor = false, styleId = "auto" } = {}, onProgress) {
  const res = await serverFetch("/api/social-video/produce", {
    method: "POST", body: JSON.stringify({ plan, voiceId, language, includeAuthor, styleId }),
  });
  return readSseResult(res, onProgress);
}

/** Combined (no confirmation) — used by the legacy Social page. */
export async function generateSocialVideo({ url, targetDuration = 25, includeAuthor = false, voiceId = null, language = "en" }, onProgress) {
  const res = await serverFetch("/api/social-video/generate", {
    method: "POST",
    body: JSON.stringify({ url, targetDuration, includeAuthor, voiceId, language }),
  });
  return readSseResult(res, onProgress);
}

async function readSseResult(res, onProgress) {
  if (!res.ok && res.status !== 200) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    const e = new Error(err.error || "Generation failed"); if (err.code) e.code = err.code; throw e;
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
        const err  = new Error(event.error);
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
