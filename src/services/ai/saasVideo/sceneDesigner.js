/**
 * sceneDesigner.js
 * src/services/ai/saasVideo/sceneDesigner.js
 *
 * Stage 4 — designs all scenes IN PARALLEL (variety was planned by the
 * director, so there is no sequential dependency like the v2 promo pipeline).
 *
 * Output validation is stricter than v2: a response must contain a closing
 * </html> tag and must not have finish_reason "length" — truncated HTML
 * previously slipped through the "<html" substring check.
 */

import { openai } from "../../../server/middleware/shared.js";
import { buildSaasScenePrompt } from "./designPrompts.js";

const DESIGNER_MODEL = "gpt-5.4";
const MAX_TOKENS     = 16000;

function stripFences(raw) {
  return raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

function isValidSceneHTML(raw, finishReason) {
  if (!raw) return false;
  if (finishReason === "length") return false; // truncated
  const lower = raw.toLowerCase();
  return (lower.includes("<html") || lower.includes("<!doctype")) && lower.includes("</html>");
}

export async function designScene(scene, brief, ctx, attempt = 1) {
  const prompt = buildSaasScenePrompt(scene, brief, ctx);

  const response = await openai.chat.completions.create({
    model: DESIGNER_MODEL,
    max_completion_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user",   content: prompt.user },
    ],
  });

  const choice = response.choices[0];
  const raw    = stripFences((choice.message.content ?? "").trim());

  if (!isValidSceneHTML(raw, choice.finish_reason)) {
    if (attempt < 2) {
      console.warn(`[saas/designer] scene ${scene.scene_index} (${scene.intent}) invalid/truncated (finish=${choice.finish_reason}), retrying`);
      await new Promise(r => setTimeout(r, 1500));
      return designScene(scene, brief, ctx, attempt + 1);
    }
    console.error(`[saas/designer] scene ${scene.scene_index} (${scene.intent}) failed after ${attempt} attempts`);
    return "";
  }

  return raw;
}

/**
 * designAllScenes — fully parallel. Returns [{ sceneIndex, html, error }].
 */
export async function designAllScenes(scenes, brief, ctx) {
  return Promise.all(
    scenes.map(async (scene) => {
      try {
        const html = await designScene(scene, brief, ctx);
        console.log(`[saas/designer] scene ${scene.scene_index} (${scene.intent}/${scene.visual_source}) — ${html.length} chars`);
        return { sceneIndex: scene.scene_index, html, error: html ? null : "empty design" };
      } catch (err) {
        console.error(`[saas/designer] scene ${scene.scene_index} failed:`, err.message);
        return { sceneIndex: scene.scene_index, html: "", error: err.message };
      }
    })
  );
}
