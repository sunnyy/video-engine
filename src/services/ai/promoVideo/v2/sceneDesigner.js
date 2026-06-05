/**
 * sceneDesigner.js
 * src/services/ai/promoVideo/v2/sceneDesigner.js
 *
 * Calls the scene designer model to generate a single HTML frame
 * for a given scene + project context.
 *
 * NOTE: The model string is set to "gpt-4.1" until the correct "GPT-5.5"
 * model ID is confirmed. Swap SCENE_DESIGNER_MODEL when known.
 */

import { openai } from "../../../../server/middleware/shared.js";
import { buildSceneDesignerPrompt } from "./intentPrompts.js";

const SCENE_DESIGNER_MODEL = "gpt-5.4";

/**
 * designScene(scene, projectContext)
 *
 * @param {object} scene          — scene object from scriptGenerator (has intent, spoken, headline, etc.)
 * @param {object} projectContext — { productName, niche, accentColor, logoUrl, fps }
 * @returns {string}              — raw HTML string for this scene
 */
export async function designScene(scene, projectContext) {
  const prompt = buildSceneDesignerPrompt(scene.script_segment, { ...projectContext, sceneIntent: scene.intent });

  const response = await openai.chat.completions.create({
    model:       SCENE_DESIGNER_MODEL,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user",   content: prompt.user   },
    ],
  });

  const choice = response.choices[0];
  const raw    = (choice.message.content ?? "").trim();

  if (!raw) {
    console.error(`[sceneDesigner] scene ${scene.scene_index} (${scene.intent}): EMPTY response. model=${response.model} finish_reason=${choice.finish_reason} usage=${JSON.stringify(response.usage)}`);
    console.error(`[sceneDesigner] full response: ${JSON.stringify(response).slice(0, 1000)}`);
    return "";
  }

  // Strip markdown code fences if model wraps output despite instructions
  const html = raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/,       "")
    .replace(/\s*```$/,       "")
    .trim();

  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    console.warn(`[sceneDesigner] scene ${scene.scene_index} (${scene.intent}): response may not be valid HTML. finish_reason=${choice.finish_reason} first 300 chars: ${raw.slice(0, 300)}`);
  }

  return html;
}

/**
 * designAllScenes(scenes, projectContext)
 *
 * Runs designScene for every scene sequentially (not parallel — avoids
 * rate limits and keeps the model focused on one frame at a time).
 *
 * @returns {Array<{ sceneIndex: number, html: string, error: string|null }>}
 */
export async function designAllScenes(scenes, projectContext) {
  const results = [];

  for (const scene of scenes) {
    try {
      const html = await designScene(scene, projectContext);
      console.log(`[sceneDesigner] scene ${scene.scene_index} (${scene.intent}) — ${html.length} chars`);
      results.push({ sceneIndex: scene.scene_index, html, error: null });
    } catch (err) {
      console.error(`[sceneDesigner] scene ${scene.scene_index} failed:`, err.message);
      results.push({ sceneIndex: scene.scene_index, html: null, error: err.message });
    }
  }

  return results;
}
