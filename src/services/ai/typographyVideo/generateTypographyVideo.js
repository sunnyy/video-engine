import { serverFetch } from "../../serverApi";
import { convertTypographyToTimeline } from "./typographyConverter";

export async function generateTypographyVideo({ input, inputType = "topic", style = "Bold & Minimal", projectId = null }) {
  const res = await serverFetch("/api/typography-video/generate", {
    method: "POST",
    body: JSON.stringify({ input, inputType, style, projectId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error || "Generation failed");
  }

  const result = await res.json();
  const layers = convertTypographyToTimeline(result);
  const duration = layers
    .filter((l) => l.type !== "audio")
    .reduce((max, l) => Math.max(max, l.end ?? 0), 0);

  return {
    layers,
    projectName: result.projectName || "Typography Video",
    duration,
    fps: 30,
  };
}
