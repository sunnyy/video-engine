import { buildBeatsFromScript } from "../../core/buildBeatsFromScript";
import { VISUAL_GRAMMAR } from "../../core/visualGrammar";

export async function generateStructuredShort({
  topic,
  mode,
  orientation,
  durationCategory = "short",
}) {

  const grammar = JSON.stringify(VISUAL_GRAMMAR, null, 2);

  const prompt = `
You are writing scripts for a structured short-form video engine.

The engine has specific visual tools.

Visual Grammar:
${grammar}

Return ONLY valid JSON.

Format:
{
  "beats":[
    {
      "spoken":"sentence",
      "intent":"hook | stat | list | quote | question | reveal | explanation | comparison"
    }
  ]
}

Rules:

- First beat must be a HOOK.
- Each beat must be ONE sentence.
- Use strong storytelling.
- Prefer stats, comparisons, or lists.
- Sentences must be visually descriptive.
- No markdown.
- JSON only.

Topic: ${topic}
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

  const structuredBeats = data.beats || [];

  const script = structuredBeats
    .map((b) => b.spoken)
    .join(" ");

  const beats = await buildBeatsFromScript({
    script,
    structuredBeats,
    videoType: mode,
    orientation,
    durationCategory,
  });

  return {
    script,
    beats,
  };

}