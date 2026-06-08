/**
 * scriptGenerator.js
 * src/services/ai/productVideo/v2/scriptGenerator.js
 *
 * Generates a product video script by analyzing the product image (GPT-4.1 vision)
 * and writing intent-tagged scenes for the HTML/CSS pipeline.
 */

import { openai } from "../../../server/middleware/shared.js";

export const PRODUCT_INTENT_PATTERNS = {
  1: [
    { intents: ["standalone"], tone: "One powerful scene — product, desire, and CTA all in one." },
  ],
  3: [
    { intents: ["hook", "hero", "cta"],    tone: "Bold opener → product showcase → buy now" },
    { intents: ["hook", "features", "cta"], tone: "Desire hook → what you get → action" },
  ],
  5: [
    { intents: ["hook", "hero", "features", "offer", "cta"], tone: "Full funnel — grab attention, showcase product, highlight benefits, present deal, drive action" },
    { intents: ["hook", "features", "hero", "offer", "cta"], tone: "Benefits-first — lead with outcomes, then reveal the product, close with offer and CTA" },
  ],
};

export const SCENE_BUDGETS = {
  standalone: { duration: 8.0, words: 32 },
  hook:       { duration: 3.5, words: 12 },
  hero:       { duration: 4.0, words: 16 },
  features:   { duration: 4.5, words: 18 },
  offer:      { duration: 3.0, words: 10 },
  cta:        { duration: 3.5, words: 12 },
};

const ARCHETYPES = [
  "typography_hero", "full_bleed_image", "split_composition",
  "feature_grid", "single_stat", "minimal_cta", "numbered_list", "quote_statement",
];

export async function generateProductScript(project) {
  const sceneCount = [1, 3, 5].includes(parseInt(project.sceneCount)) ? parseInt(project.sceneCount) : 3;
  const patterns   = PRODUCT_INTENT_PATTERNS[sceneCount] ?? PRODUCT_INTENT_PATTERNS[3];
  const selected   = patterns[Math.floor(Math.random() * patterns.length)];
  const intents    = selected.intents;

  const structureLines = intents.map((intent, i) => {
    const b = SCENE_BUDGETS[intent];
    return `  Scene ${i + 1} (${intent}): max ${b.words} words, ~${b.duration}s`;
  }).join("\n");

  const systemPrompt = `You are a world-class product advertising copywriter for premium ecommerce brands.
Your job: analyze the product image and write a punchy short-form video ad script.

BEFORE WRITING:
1. Study the product — what is it? What problem does it solve? Who buys it?
2. Identify its standout visual quality — material, finish, form factor
3. What emotion does owning it create?

SCRIPT RULES:
- Sound like a confident brand speaking directly to the customer
- Short punchy fragments, not full sentences
- Brand name must appear in the hero scene and in the CTA — nowhere else
- Never say: revolutionary, game-changing, next-gen, cutting-edge, unlock, leverage
- Focus on what the customer feels or gets — not features for their own sake
- No generic copy — write specifically for what you see in the image

SCENE STRUCTURE (follow exactly):
${structureLines}

Pattern tone: ${selected.tone}

SCENE INTENT DESCRIPTIONS:
- hook:     Scroll-stopping opener. No brand name. Create desire, ask a question, or state a bold truth about the lifestyle.
- hero:     Introduce the brand/product. One clear value statement. What it is + why it's different.
- features: 2-3 specific benefits the customer will feel. Short fragments. Each on its own mental line.
- offer:    State the deal clearly. Price, discount, bundle, or urgency. Short and bold.
- cta:      Brand name + call to action as one energetic flowing line. Comma not em-dash.

ARCHETYPES — assign one per scene, NO REPEATS:
${ARCHETYPES.join(" | ")}

OUTPUT — return only valid JSON:
{
  "full_script": "complete voiceover from start to finish",
  "accent_color": "#hex — dominant brand or product color from the image",
  "product_mood": "one word — premium | playful | minimalist | bold | elegant | organic",
  "product_theme": "dark OR light OR medium — dark ONLY for products with black/charcoal/dark packaging; light for white or near-white packaged products (white cream jar, transparent bottle, ivory packaging); medium for ALL colorful products — pink, red, green, blue, yellow, pastel, vibrant, warm-toned products must use medium so the background is derived from their color",
  "product_category": "one phrase — e.g. skincare | sneakers | tech accessory | home decor",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook",
      "archetype": "typography_hero",
      "script_segment": "exact words from full_script for this scene",
      "visual_concept": "one phrase — what to show visually in the scene",
      "duration_seconds": 3.5
    }
  ]
}

RULES:
- script_segment values must be consecutive substrings of full_script
- full_script = all script_segments joined naturally
- Count words before submitting — don't exceed budget per scene
- No two scenes may share the same archetype`;

  const userPrompt = `Brand: ${project.brandName || "Unknown Brand"}
${project.productDescription ? `Product description: ${project.productDescription}` : ""}
CTA text: ${project.ctaText || "Shop Now"}
${project.offerText  ? `Offer/deal: ${project.offerText}`   : ""}
${project.website    ? `Website: ${project.website}`        : ""}
Scene count: ${sceneCount}

Analyze the product image and write the script.`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text",      text: userPrompt },
        { type: "image_url", image_url: { url: project.productImageUrl } },
      ],
    },
  ];

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.7,
    max_tokens:  2500,
    messages,
  });

  const raw = (response.choices[0].message.content ?? "").trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`productScriptGenerator: JSON parse failed. Raw:\n${raw.slice(0, 400)}`);
  }

  const rawScenes   = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  const full_script = typeof parsed.full_script === "string"
    ? parsed.full_script
    : rawScenes.map(s => s.script_segment).join(" ");

  if (!rawScenes.length) throw new Error("productScriptGenerator: no scenes returned");

  const scenes = rawScenes.map((s, i) => ({
    scene_index:      i,
    intent:           s.intent          ?? intents[i] ?? "hero",
    archetype:        s.archetype       ?? null,
    script_segment:   s.script_segment  ?? "",
    spoken:           s.script_segment  ?? "",
    visual_concept:   s.visual_concept  ?? null,
    duration_seconds: SCENE_BUDGETS[s.intent ?? "hero"]?.duration ?? 4.0,
    duration:         SCENE_BUDGETS[s.intent ?? "hero"]?.duration ?? 4.0,
  }));

  const product_theme = ["dark", "light", "medium"].includes(parsed.product_theme)
    ? parsed.product_theme
    : "dark";

  console.log(`[productScriptGen] ${scenes.length} scenes, mood=${parsed.product_mood}, theme=${product_theme}, accent=${parsed.accent_color}`);

  return {
    full_script,
    scenes,
    accent_color:     parsed.accent_color     ?? null,
    product_mood:     parsed.product_mood      ?? "premium",
    product_theme,
    product_category: parsed.product_category  ?? "product",
    pattern_name:     selected.tone,
  };
}
