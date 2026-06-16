/**
 * sceneDesigner.js
 * GPT-5.4 designs a transparent text OVERLAY for each product video scene.
 * Output is headless-measured → buildTimeline, exactly like Social Video.
 *
 * The product photo + scrim are pipeline-owned (prepended beneath the overlay in
 * the orchestrator), so the designer builds only the typography — never the image.
 *
 * VISION: the designer is shown the actual generated scene shot, so it composes the
 * overlay into the image's real empty space (around the product) instead of guessing.
 */

import { openai }                    from "../../../server/middleware/shared.js";
import { buildProductScenePrompt }   from "./intentPrompts.js";

const MODEL = "gpt-5.4";

export async function designProductScene(scene, productBrief, projectContext, attempt = 1) {
  const { system, user } = buildProductScenePrompt(scene.script_segment, {
    ...projectContext,
    sceneIntent:       scene.intent,
    creativeDirection: scene.creative_direction ?? "",
    anchor:            scene.anchor   ?? "text-top",
    display:           scene.display  ?? {},
    hasVision:         !!projectContext.sceneImageUrl,
  });

  // Show GPT-5.4 the actual scene shot so it places the overlay in the image's real
  // empty space (never over the product) and matches the lighting/colors.
  const sceneImageUrl = projectContext.sceneImageUrl ?? null;
  const visionContent = sceneImageUrl
    ? [{ type: "text", text: user }, { type: "image_url", image_url: { url: sceneImageUrl, detail: "high" } }]
    : null;

  const complete = (content) => openai.chat.completions.create({
    model:                 MODEL,
    max_completion_tokens: 14000,
    messages: [
      { role: "system", content: system },
      { role: "user",   content },
    ],
  });

  let response;
  for (let att = attempt; att <= 2; att++) {
    try {
      if (visionContent) {
        try {
          response = await complete(visionContent);
        } catch (visErr) {
          const transient = visErr.status === 429 || visErr.status === 500 || visErr.status === 503;
          if (transient) throw visErr; // let the outer loop retry WITH vision
          // Permanent (e.g. model rejects image input) → degrade to text-only so the
          // run still completes. The other fixes (CTA/panel/scale) still apply.
          console.warn(`[productSceneDesigner] scene ${scene.scene_index} vision rejected (${visErr.status || ""} ${(visErr.message || "").slice(0, 80)}), falling back to text-only`);
          response = await complete(user);
        }
      } else {
        response = await complete(user);
      }
      break;
    } catch (err) {
      const retryable = err.status === 429 || err.status === 500 || err.status === 503;
      if (retryable && att < 2) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }

  const choice = response.choices[0];
  const raw    = (choice.message.content ?? "").trim();

  if (!raw || (!raw.includes("<html") && !raw.includes("<!DOCTYPE"))) {
    if (attempt < 2) {
      console.warn(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}) invalid HTML, retrying (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, 1500));
      return designProductScene(scene, productBrief, projectContext, 2);
    }
    console.error(`[productSceneDesigner] scene ${scene.scene_index} (${scene.intent}) failed after attempts`);
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
