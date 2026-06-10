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

import { openai } from "../../../server/middleware/shared.js";
import { buildSceneDesignerPrompt } from "./intentPrompts.js";

const SCENE_DESIGNER_MODEL = "gpt-5.4";

/**
 * designScene(scene, projectContext)
 *
 * @param {object} scene          — scene object from scriptGenerator (has intent, spoken, headline, etc.)
 * @param {object} projectContext — { productName, niche, accentColor, logoUrl, fps }
 * @returns {string}              — raw HTML string for this scene
 */
export async function designScene(scene, projectContext, attempt = 1) {
  const prompt = buildSceneDesignerPrompt(scene.script_segment, { ...projectContext, sceneIntent: scene.intent });

  const thGuidance = projectContext.videoType === 'talking_head' ? `
THIS IS A TALKING HEAD VIDEO. The speaker's video plays continuously as a base layer beneath your design.
Your design must work AROUND the TH video area defined in the layout directive below.
NEVER place text or elements in the reserved TH video area.
Design overlays, text, and visuals only in the non-reserved areas of the canvas.
` : '';

  const response = await openai.chat.completions.create({
    model:       SCENE_DESIGNER_MODEL,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: prompt.system + thGuidance },
      { role: "user",   content: prompt.user   },
    ],
  });

  const choice = response.choices[0];
  const raw    = (choice.message.content ?? "").trim();

  if (!raw || (!raw.includes("<html") && !raw.includes("<!DOCTYPE"))) {
    if (attempt < 2) {
      console.warn(`[sceneDesigner] scene ${scene.scene_index} (${scene.intent}) empty/invalid response, retrying (attempt ${attempt + 1}). finish_reason=${choice.finish_reason}`);
      await new Promise(r => setTimeout(r, 1500));
      return designScene(scene, projectContext, attempt + 1);
    }
    console.error(`[sceneDesigner] scene ${scene.scene_index} (${scene.intent}) failed after ${attempt} attempts. finish_reason=${choice.finish_reason}`);
    return "";
  }

  const html = raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/,       "")
    .replace(/\s*```$/,       "")
    .trim();

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
