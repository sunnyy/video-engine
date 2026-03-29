import blockRegistry from "./blockRegistry";
import { layoutRegistry } from "./layoutRegistry";

export async function reasonAboutScript(beats = []) {

  const blocks = Object.keys(blockRegistry);
  const layouts = Object.keys(layoutRegistry);

  const prompt = `
You are the VISUAL REASONING layer of a deterministic short-form video generation engine.

You DO NOT write scripts.
You ONLY decide how each beat should be visualized.

The engine already has layouts, blocks and assets.
Your job is to suggest visualization hints.

AVAILABLE BLOCKS
${blocks.join(", ")}

AVAILABLE LAYOUTS
${layouts.join(", ")}

You will receive a JSON object:

{
  "beats":[
    { "index":0, "spoken":"..." },
    { "index":1, "spoken":"..." }
  ]
}

Return a JSON array with ONE object per beat.

Each object MUST contain:

visual_type: statement | stat | list | comparison | quote | question  
block_candidate: block name OR null  
block_props: object OR null  
visual_weight: light | medium | heavy

CRITICAL RULES

1. Most beats should NOT use blocks.
2. Prefer block_candidate = null unless a block clearly improves visualization.
3. Long narrative sentences should NOT become blocks.

BLOCK RULES

Stat
Use only when a clear numeric statistic appears.
Example output:
{
  "value": "200%",
  "label": "ticket sales increase"
}

ListReveal
Use only if the sentence introduces multiple items.

Comparison
Use only if two entities are compared.

Quote
Use only if the sentence is clearly a quote.

Hook
Use ONLY if the sentence is very short and punchy (≤ 6 words).

If unsure → block_candidate = null.

VISUAL WEIGHT

heavy → major statistic, reveal, or strong hook  
medium → informative statement  
light → continuation or filler

VERY IMPORTANT

Do NOT force blocks.
Do NOT repeat the sentence as block content.
Extract meaningful props if using a block.

Return ONLY valid JSON.
`;

  const payload = {
    beats: beats.map((b, i) => ({
      index: i,
      spoken: b.spoken,
      intent: b.intent || null
    }))
  };

  const response = await fetch("http://localhost:5000/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: prompt + "\n\nINPUT:\n" + JSON.stringify(payload, null, 2)
    })
  });

  if (!response.ok) {
    throw new Error("AI visual reasoning failed");
  }

  let reasoning;

  try {
    reasoning = await response.json();
  } catch (e) {
    reasoning = [];
  }

  return beats.map((beat, i) => {

    const r = reasoning?.[i] || {};

    return {
      ...beat,
      visual_type: r.visual_type || "statement",
      block_candidate: blocks.includes(r.block_candidate) ? r.block_candidate : null,
      block_props: r.block_props || null,
      visual_weight: r.visual_weight || "light"
    };

  });

}