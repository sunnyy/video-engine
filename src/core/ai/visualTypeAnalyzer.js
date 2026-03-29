import blockRegistry from "../blockRegistry";
import { layoutRegistry } from "../layoutRegistry";

export async function analyzeVisualTypes(beats = []) {

  const blocks = Object.keys(blockRegistry);
  const layouts = Object.keys(layoutRegistry);

  const prompt = `
You decide how beats should be visualized in a short-form video.

Available Blocks:
${blocks.join(", ")}

Available Layouts:
${layouts.join(", ")}

Return JSON array with:

visual_type: statement | stat | list | comparison | quote | question
block_candidate: block name OR null
visual_weight: light | medium | heavy

Rules:

Most beats should NOT use blocks.

Stat → if numeric claim  
List → if list_intro or list_item  
Comparison → if two entities compared  
Quote → if direct quote  

Hook blocks allowed ONLY for very short hooks.

Return JSON only.
`;

  const payload = {
    beats: beats.map((b, i) => ({
      index: i,
      spoken: b.spoken,
      role: b.role
    }))
  };

  const response = await fetch("http://localhost:5000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt + "\n\nINPUT:\n" + JSON.stringify(payload, null, 2)
    })
  });

  const visuals = await response.json();

  return beats.map((beat, i) => {

    const r = visuals?.[i] || {};

    return {
      ...beat,
      visual_type: r.visual_type || "statement",
      block_candidate: blocks.includes(r.block_candidate)
        ? r.block_candidate
        : null,
      visual_weight: r.visual_weight || "light"
    };

  });

}