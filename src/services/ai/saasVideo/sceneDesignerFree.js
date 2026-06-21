/**
 * sceneDesignerFree.js
 * src/services/ai/saasVideo/sceneDesignerFree.js
 *
 * Designer call for the headless-measure path. Mirrors sceneDesigner.js but uses
 * the free (nested CSS allowed) prompt. Kept separate so the current path is
 * untouched.
 */

import { openai } from "../../../server/middleware/shared.js";
import { buildFreeSceneDesignerPrompt } from "./freeDesignPrompt.js";

const MODEL = "gpt-5.4";

export async function designFreeScene(scene, projectContext, attempt = 1) {
  const { system, user } = buildFreeSceneDesignerPrompt(scene.script_segment, {
    ...projectContext,
    sceneIntent:   scene.intent,
    creativeBrief: scene.creative_brief ?? projectContext.visualConcept ?? null,
  });

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user   },
    ],
  });

  const choice = response.choices[0];
  const raw    = (choice.message.content ?? "").trim();

  if (!raw || (!raw.includes("<html") && !raw.includes("<!DOCTYPE"))) {
    if (attempt < 2) {
      console.warn(`[sceneDesignerFree] scene ${scene.scene_index} empty/invalid, retrying. finish_reason=${choice.finish_reason}`);
      await new Promise(r => setTimeout(r, 1500));
      return designFreeScene(scene, projectContext, attempt + 1);
    }
    console.error(`[sceneDesignerFree] scene ${scene.scene_index} failed after ${attempt} attempts`);
    return "";
  }

  return raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/,       "")
    .replace(/\s*```$/,       "")
    .trim();
}
