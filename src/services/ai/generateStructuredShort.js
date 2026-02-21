export async function generateStructuredShort({
  topic,
  mode,
}) {
  const prompt = `
You are a structured short-form video writer.

Return ONLY valid JSON.

Format:
{
  "beats": [
    {
      "beat_type": "hook | problem | solution | payoff | cta",
      "spoken": "short spoken line",
      "visual_mode": "full | split | floating | dual",
      "asset_tags": ["tag1", "tag2"]
    }
  ]
}

Rules:
- 5 to 7 beats
- Spoken must be short
- No explanations
- No markdown
- JSON only
- Mode: ${mode}
- Topic: ${topic}
`;

  const response = await fetch("http://localhost:5000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error("AI generation failed");
  }

  const data = await response.json();

  return data;
}