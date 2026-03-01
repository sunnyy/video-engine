import { buildBeatsFromScript } from "../../core/buildBeatsFromScript";

export async function generateStructuredShort({
  topic,
  mode,
  orientation,
  durationCategory = "short",
}) {
  const prompt = `
You are a short-form video script writer.

Return ONLY valid JSON.

Format:
{
  "script": "Full spoken script."
}

Rules:
- Clear hook
- Clear ending
- No markdown
- JSON only
- Topic: ${topic}
`;

  const response = await fetch("http://localhost:5000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error("AI generation failed");
  }

  const data = await response.json();
  const script = data.script || "";

  const beats = buildBeatsFromScript({
    script,
    videoType: mode,
    durationCategory,
  });

  return {
    script,
    beats,
  };
}