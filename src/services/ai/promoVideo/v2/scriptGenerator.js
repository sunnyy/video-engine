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

Valid intents: hook, list, process, statistic, feature, benefit, comparison, proof, cta
Valid section_roles: hook, body, proof, cta
Narrative flow: hook → benefit or comparison → feature or process → proof or statistic → cta
5-7 scenes. Every scene must have a distinct intent. No two consecutive scenes with the same intent.

Rules:
- Output 5–8 scenes for a 30–60 second video
- Each scene has a single clear intent
- Headline is the on-screen text — shorter and more visual than spoken
- Only populate fields relevant to the intent (e.g. stat+label for statistic, items for list, steps for process)
- The last scene MUST be intent: "cta"
- Output JSON array only — no markdown, no explanation, no code blocks

ASSET REQUIREMENTS:
- feature scenes: always set asset_requirement to "screenshot" and write a specific asset_hint describing exactly what UI screen or feature to show (e.g. "Screenshot of the Vidquence dashboard showing the video timeline editor")
- comparison scenes: set asset_requirement to "screenshot" with asset_hint describing the before/after context (e.g. "Screenshot of a cluttered manual video editing timeline vs Vidquence's clean one-click interface")
- hook scenes: set asset_requirement to "image" with asset_hint describing a relevant atmospheric background image (e.g. "content creator at desk looking frustrated at laptop")
- benefit, process, statistic, proof, list, cta scenes: set asset_requirement to "none"

VOICEOVER RULES — CRITICAL:
The spoken text must sound like a real human talking, not an AI announcement.

DO:
- Write conversational, direct, slightly informal
- Use contractions: "you're", "it's", "we've", "don't"
- Start hook with a problem or question the viewer feels: "Still editing videos by hand?", "What if your next video was ready in 60 seconds?"
- Reference the viewer directly: "you", "your business", "your content"
- Make benefits specific and tangible: "cuts your editing time from 3 hours to 3 minutes" not "saves time"
- Flow naturally between scenes — each scene's spoken text should feel connected to the previous one
- End CTA with a direct, energetic call: "Try Vidquence free today." not "Consider trying our platform."
- HARD LIMIT: Maximum 8 words per scene spoken field. Count the words. If over 8, cut it.
- Each spoken line is ONE short phrase. Never a full sentence with a comma or "and".
- Good examples: "Still editing by hand?", "Your video. Done in seconds.", "No skills needed.", "Try it free today."
- Bad examples: anything over 8 words, anything with two clauses, anything that sounds like an ad copy paragraph

DON'T:
- Start with the product name: never "Vidquence is a platform that..."
- Use corporate speak: "leverage", "utilize", "cutting-edge", "revolutionary", "game-changing"
- Make vague claims: "saves time", "easy to use", "powerful features"
- Sound like a press release or feature list
- Repeat the same sentence structure scene after scene

TONE: Confident, direct, slightly energetic. Like a founder talking to a friend about something they genuinely believe in.

EXAMPLE — BAD spoken text:
"Vidquence is a revolutionary AI-powered video creation platform that leverages cutting-edge technology to streamline your content creation workflow."

EXAMPLE — GOOD spoken text:
"Still spending hours editing videos? There's a faster way. Vidquence turns your idea into a ready-to-post short video — in under 60 seconds."

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
  const userPrompt = `Generate a promo video script for this product:

Product: ${project.product_name ?? "Unknown"}
Description: ${project.product_description ?? "Not provided"}
Goal: ${project.video_goal ?? "Not specified"}
Target Audience: ${project.target_audience ?? "General"}
Niche: ${project.style?.niche ?? "saas"}
Tone: ${project.tone ?? "professional"}`;

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
    scene_id:         i + 1,   // 1-based, matches assetRequirements / upload-asset convention
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
