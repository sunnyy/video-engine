import { serverFetch } from "../../serverApi";

export async function generateTypographyVideo({ input, inputType = "topic", targetDuration = 40, projectId = null }, onProgress) {
  const res = await serverFetch("/api/typography-video/generate", {
    method: "POST",
    body: JSON.stringify({ input, inputType, targetDuration, projectId }),
  });

  if (!res.ok && res.status !== 200) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error || "Generation failed");
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
        const code = event.code;
        const err = new Error(event.error);
        if (code) err.code = code;
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
