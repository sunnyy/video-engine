/**
 * sceneDesigner.js
 * src/services/ai/productVideo/v2/sceneDesigner.js
 *
 * Calls GPT-5.4 to design a single HTML frame for a product video scene.
 */

import { openai } from "../../../server/middleware/shared.js";
import { buildProductScenePrompt } from "./intentPrompts.js";

const SCENE_DESIGNER_MODEL = "gpt-5.4";

export async function designProductScene(scene, projectContext) {
  const prompt = buildProductScenePrompt(scene.script_segment, {
    ...projectContext,
    sceneIntent:   scene.intent,
    archetype:     scene.archetype     ?? null,
    visualConcept: scene.visual_concept ?? null,
  });

  const response = await openai.chat.completions.create({
    model:                 SCENE_DESIGNER_MODEL,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user",   content: prompt.user   },
    ],
  });

  const choice = response.choices[0];
  const raw    = (choice.message.content ?? "").trim();

  if (!raw) {
    console.error(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}): EMPTY response. finish_reason=${choice.finish_reason}`);
    return "";
  }

  const html = raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/,       "")
    .replace(/\s*```$/,       "")
    .trim();

  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    console.warn(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}): response may not be valid HTML. first 200 chars: ${raw.slice(0, 200)}`);
  }

  console.log(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}) — ${html.length} chars`);
  return html;
}
