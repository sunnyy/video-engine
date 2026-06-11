import { serverFetch } from "../../serverApi";

export async function generateSocialVideo({ url, targetDuration = 25, includeAuthor = false, voiceId = null, language = "en" }, onProgress) {
  const res = await serverFetch("/api/social-video/generate", {
    method: "POST",
    body: JSON.stringify({ url, targetDuration, includeAuthor, voiceId, language }),
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
