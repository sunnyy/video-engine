import { serverFetch } from "../../serverApi";

/**
 * generateAiVideo — kick off the AI Video (transformation engine) build.
 * Slice 1 produces the hand-authored demo; returns { projectId, projectName }.
 */
export async function generateAiVideo({ topic = "", productName = "AI Video" } = {}) {
  const res = await serverFetch("/api/ai-video/generate", {
    method: "POST",
    body: JSON.stringify({ topic, productName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error || "Generation failed");
  }
  return res.json();
}
