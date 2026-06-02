/**
 * scriptGenerator.js
 * src/services/ai/promoVideo/v2/scriptGenerator.js
 *
 * Generates the structured scene array for a v2 promo video.
 * Each scene has spoken voiceover text, intent, section role,
 * and semantic content fields (headline, stat, items, steps, etc.).
 */

import { openai } from "../../../../server/middleware/shared.js";

const SYSTEM_PROMPT = `You are a video script generator for premium SaaS promo videos.

Generate a promo video script as a structured JSON array. Each element is a scene with spoken voiceover text and semantic content fields.

Valid intents: hook, list, process, statistic, feature, statement, cta
Valid section_roles: hook, body, proof, cta
Narrative flow: hook → problem or benefit → features or process → proof (statistic) → cta

Rules:
- Output 5–8 scenes for a 30–60 second video
- Each scene has a single clear intent
- Spoken text is the voiceover — natural, concise, punchy (max 20 words per scene)
- Headline is the on-screen text — shorter and more visual than spoken
- Only populate fields relevant to the intent (e.g. stat+label for statistic, items for list, steps for process)
- The last scene MUST be intent: "cta"
- Output JSON array only — no markdown, no explanation, no code blocks

Scene object shape:
{
  "scene_index": 0,
  "spoken": "...",
  "intent": "hook",
  "section_role": "hook",
  "mood": null,
  "headline": "...",
  "subhead": "...",
  "body": null,
  "stat": null,
  "label": null,
  "emphasis": null,
  "steps": [],
  "items": [],
  "icon": null,
  "asset_requirement": "none",
  "asset_hint": null
}`;

/**
 * generateScriptV2(project)
 * Returns { ...project, scenes: parsedScenes, scene_format: 'v2' }
 */
export async function generateScriptV2(project) {
  // TEMP: hardcoded hook scene for isolated testing
  const testScenes = [{
    scene_index:      0,
    spoken:           "Create viral short videos in seconds. No editing skills needed.",
    intent:           "hook",
    section_role:     "hook",
    mood:             null,
    headline:         "Your next viral video, automated",
    subhead:          "No editing skills needed",
    body:             null,
    stat:             null,
    label:            null,
    emphasis:         null,
    steps:            [],
    items:            [],
    icon:             null,
    asset_requirement: "none",
    asset_hint:       null,
    duration_seconds: null,
  }];
  console.log(`[scriptGenerator] TEMP: returning hardcoded hook scene for ${project.id}`);
  return { ...project, scenes: testScenes, scene_format: "v2", status: "script_generated", updated_at: new Date().toISOString() };

  // eslint-disable-next-line no-unreachable
  const userPrompt = `Generate a promo video script for this product:

Product: ${project.product_name ?? "Unknown"}
Description: ${project.product_description ?? "Not provided"}
Goal: ${project.video_goal ?? "Not specified"}
Target Audience: ${project.target_audience ?? "General"}
Niche: ${project.style?.niche ?? "saas"}
Tone: ${project.tone ?? "professional"}

IMPORTANT: Output exactly 3 scenes in this exact order:
1. scene_index 0 — intent: "hook" — stop-scroll opening, emotional impact
2. scene_index 1 — intent: "process" — explain how it works, 2-3 steps
3. scene_index 2 — intent: "statistic" — one powerful number that proves the value

No other intents. No other scenes. Exactly 3.`;

  const response = await openai.chat.completions.create({
    model:      "gpt-4.1",
    temperature: 0.7,
    max_tokens:  4000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userPrompt    },
    ],
  });

  const raw = (response.choices[0].message.content ?? "").trim();

  let parsedScenes;
  try {
    parsedScenes = JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      parsedScenes = JSON.parse(match[0]);
    } else {
      throw new Error(`scriptGenerator: JSON parse failed. GPT returned:\n${raw.slice(0, 500)}`);
    }
  }

  if (!Array.isArray(parsedScenes)) {
    throw new Error(`scriptGenerator: expected JSON array, got ${typeof parsedScenes}`);
  }

  // Normalise — ensure required fields exist on every scene
  const scenes = parsedScenes.map((s, i) => ({
    scene_index:      i,
    spoken:           s.spoken           ?? "",
    intent:           s.intent           ?? "statement",
    section_role:     s.section_role     ?? "body",
    mood:             s.mood             ?? null,
    headline:         s.headline         ?? null,
    subhead:          s.subhead          ?? null,
    body:             s.body             ?? null,
    stat:             s.stat             ?? null,
    label:            s.label            ?? null,
    emphasis:         s.emphasis         ?? null,
    steps:            Array.isArray(s.steps) ? s.steps : [],
    items:            Array.isArray(s.items) ? s.items : [],
    icon:             s.icon             ?? null,
    asset_requirement: s.asset_requirement ?? "none",
    asset_hint:       s.asset_hint       ?? null,
    duration_seconds: null, // filled after TTS
  }));

  console.log(`[scriptGenerator] ${scenes.length} scenes for ${project.id}`);

  return {
    ...project,
    scenes,
    scene_format: "v2",
    status: "script_generated",
    updated_at: new Date().toISOString(),
  };
}
