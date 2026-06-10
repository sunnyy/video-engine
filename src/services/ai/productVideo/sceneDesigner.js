/**
 * sceneDesigner.js
 * src/services/ai/productVideo/v2/sceneDesigner.js
 *
 * Calls GPT-5.4 to design a single HTML frame for a product video scene.
 */

import { openai } from "../../../server/middleware/shared.js";
import { buildProductScenePrompt } from "./intentPrompts.js";

const SCENE_DESIGNER_MODEL = "gpt-5.4";

export async function designProductScene(scene, projectContext, attempt = 1) {
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

  if (!raw || (!raw.includes("<html") && !raw.includes("<!DOCTYPE"))) {
    if (attempt < 2) {
      console.warn(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}) empty/invalid response, retrying (attempt ${attempt + 1}). finish_reason=${choice.finish_reason}`);
      await new Promise(r => setTimeout(r, 1500));
      return designProductScene(scene, projectContext, attempt + 1);
    }
    console.error(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}) failed after ${attempt} attempts`);
    return "";
  }

  const html = raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/,       "")
    .replace(/\s*```$/,       "")
    .trim();

  console.log(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}) — ${html.length} chars`);
  return html;
}
