/**
 * scriptGenerator.js
 * src/services/ai/promoVideo/v2/scriptGenerator.js
 *
 * Generates one continuous full_script + scene array for a v2 promo video.
 * Scene durations are intent-driven budgets; actual timing comes from Whisper
 * transcription of the single voiceover in pipelineOrchestrator.
 */

import { openai } from "../../../../server/middleware/shared.js";

const INTENT_DURATIONS = {
  hook:        2.5,
  frustration: 4.0,
  benefit:     3.5,
  feature:     5.0,
  process:     6.0,
  statistic:   3.5,
  proof:       3.5,
  comparison:  4.5,
  list:        4.0,
  statement:   3.0,
  cta:         2.5,
};

export const INTENT_SEQUENCES = {
  1:    ["hook"],
  3:    ["hook", "feature", "cta"],
  5:    ["hook", "frustration", "feature", "benefit", "cta"],
  7:    ["hook", "frustration", "benefit", "process", "feature", "proof", "cta"],
  auto: null, // GPT decides, 5-7 scenes
};

function buildSystemPrompt(sceneCountInstruction) {
  return `You are an elite SaaS promo video copywriter who writes scripts that make people stop scrolling.

Your job is to read a product description and write a short-form promo video script that feels human, specific, and emotionally persuasive.

Before writing anything, think through:
1. Who specifically uses this product? What does their day look like? What frustrates them?
2. What specific painful thing does this product eliminate or replace?
3. What does success feel like for this customer after using the product?

Then write the script from inside that frustration — not from a feature list.

SCRIPT RULES:
- Open with the customer's specific pain. Make them feel seen.
- Build frustration before introducing the product.
- Introduce the product as relief, not as a feature.
- Show the outcome — what their life looks like after.
- End with one direct, energetic CTA.
- Sound like a founder talking to a friend. Casual, direct, confident.
- Use short punchy sentences. One idea per line.
- Never list features. Never use buzzwords.
- Never say: revolutionize, unlock, game-changing, next-generation, cutting-edge, leverage, utilize.
- The product should feel like the solution, not the subject.

STRUCTURE — follow this arc:
1. Problem — the customer's specific daily pain
2. Frustration — what makes it worse, the attempted solutions that fail
3. Better way — hint that there's a different approach
4. Product — introduce naturally as the relief
5. Outcome — specific result the customer experiences
6. CTA — one direct action, energetic

OUTPUT FORMAT — return only valid JSON:
{
  "full_script": "complete voiceover from start to finish as natural flowing speech",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook",
      "duration": 3,
      "script_segment": "exact words from full_script for this scene",
      "layout_variant": "one of the layout variant descriptions for this scene's intent — pick whichever best fits the emotional content of this scene's script_segment. Pick a different variant for each scene."
    }
  ]
}

${sceneCountInstruction}

SCENE RULES:
- One beat per scene. Never combine two beats into one scene.
- script_segment values must be consecutive substrings of full_script with no gaps.
- scene intents: hook | frustration | benefit | process | feature | proof | cta

LAYOUT VARIETY RULE:
Each scene must use a different layout composition. Never use the same layout structure twice in one video.
When choosing layout_variant, consider what best serves the emotional content of that scene's script_segment.

DURATION RULES — strictly follow these. Shorter is always better:
- hook: 1.5-2.5 seconds — grab attention fast, no time to breathe
- frustration: 2.5-3.5 seconds — build the pain quickly
- benefit: 2-3 seconds — one outcome, stated clearly
- process: 3-4 seconds — show the flow, not every detail
- feature: 2.5-3.5 seconds — one feature, one proof
- proof: 2-3 seconds — one number, full impact
- comparison: 3-4 seconds — contrast must be instant
- cta: 1.5-2.5 seconds — one action, high energy

Total video target:
- 1 scene: 2-3 seconds
- 3 scenes: 8-15 seconds
- 5 scenes: 15-25 seconds
- 7 scenes: 25-40 seconds

Never exceed these. Short-form video moves fast. Dead air kills engagement.`;
}

/**
 * generateScriptV2(project)
 * Returns { ...project, scenes, full_script, scene_format: 'v2' }
 */
export async function generateScriptV2(project) {
  const sceneCount = project.scene_count ?? "auto";
  const sequence   = INTENT_SEQUENCES[sceneCount] ?? null;

  const sceneCountInstruction = sequence
    ? `SCENE COUNT — MANDATORY:
Generate EXACTLY ${sequence.length} scene${sequence.length === 1 ? "" : "s"} in this exact intent order: ${sequence.join(" → ")}.
Each scene covers exactly one intent. No more, no fewer.
The full_script voiceover must be written for exactly ${sequence.length} scene${sequence.length === 1 ? "" : "s"}.
Total video duration must be ${sequence.length <= 1 ? "3-8" : sequence.length <= 3 ? "10-20" : sequence.length <= 5 ? "20-35" : "35-50"} seconds.`
    : `SCENE COUNT:
Generate between 5 and 7 scenes. Choose the best intent sequence for this product.
Total video duration must be 35-50 seconds.`;

  const systemPrompt = buildSystemPrompt(sceneCountInstruction);

  const userPrompt = `Product Name: ${project.product_name ?? "Unknown"}
Product Description: ${project.product_description ?? "Not provided"}
Visual Style: ${project.visual_style ?? project.style?.visualStyle ?? "radiant"}
Accent Color: ${project.accent_color ?? project.style?.accentColor ?? "#6366f1"}
Scene Count: ${sceneCount === "auto" ? "Auto (5-7 scenes, you decide)" : sceneCount}
${sequence ? `Intent sequence to follow exactly: ${sequence.join(" → ")}` : ""}`;

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.7,
    max_tokens:  4000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
  });

  const raw = (response.choices[0].message.content ?? "").trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`scriptGenerator: JSON parse failed. GPT returned:\n${raw.slice(0, 500)}`);
  }

  // Support both new object format and legacy array format
  const full_script = typeof parsed.full_script === "string" ? parsed.full_script : null;
  const rawScenes   = Array.isArray(parsed) ? parsed
    : Array.isArray(parsed.scenes)          ? parsed.scenes
    : [];

  if (!rawScenes.length) {
    throw new Error(`scriptGenerator: no scenes found in response`);
  }

  const scenes = rawScenes.map((s, i) => ({
    scene_index:       i,
    scene_id:          i + 1,
    // spoken = script_segment so sceneDesigner still gets per-scene text for the HTML prompt
    spoken:            s.script_segment ?? s.spoken ?? "",
    script_segment:    s.script_segment ?? s.spoken ?? "",
    intent:            s.intent         ?? "statement",
    section_role:      s.section_role   ?? "body",
    mood:              s.mood           ?? null,
    headline:          s.headline       ?? null,
    subhead:           s.subhead        ?? null,
    body:              s.body           ?? null,
    stat:              s.stat           ?? null,
    label:             s.label          ?? null,
    emphasis:          s.emphasis       ?? null,
    steps:             Array.isArray(s.steps) ? s.steps : [],
    items:             Array.isArray(s.items) ? s.items : [],
    icon:              s.icon           ?? null,
    asset_requirement: s.asset_requirement ?? "none",
    asset_hint:        s.asset_hint     ?? null,
    layout_variant:    s.layout_variant  ?? null,
    // duration = intent budget; overwritten by Whisper timestamps in the orchestrator
    duration:          s.duration       ?? INTENT_DURATIONS[s.intent ?? "statement"] ?? 3.0,
    duration_seconds:  s.duration       ?? INTENT_DURATIONS[s.intent ?? "statement"] ?? 3.0,
  }));

  console.log(`[scriptGenerator] ${scenes.length} scenes for ${project.id}`);

  return {
    ...project,
    scenes,
    full_script: full_script ?? scenes.map(s => s.script_segment).join(" "),
    scene_format: "v2",
    status:       "script_generated",
    updated_at:   new Date().toISOString(),
  };
}
