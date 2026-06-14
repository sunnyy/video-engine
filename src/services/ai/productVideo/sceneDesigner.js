/**
 * sceneDesigner.js
 * GPT-5.4 designs the full HTML/CSS visual for each product video scene.
 * Output is parsed by htmlParser → buildTimeline, exactly like Social Video.
 *
 * The product photo background arrives as data-asset-type="product-shot" placeholder.
 * The orchestrator injects the actual FAL-generated shot URL after parsing.
 */

import { openai }                    from "../../../server/middleware/shared.js";
import { buildProductScenePrompt }   from "./intentPrompts.js";

const MODEL = "gpt-5.4";

export async function designProductScene(scene, productBrief, projectContext, attempt = 1) {
  const { system, user } = buildProductScenePrompt(scene.script_segment, {
    ...projectContext,
    sceneIntent:   scene.intent,
    archetype:     scene.archetype      ?? null,
    visualConcept: scene.visual_concept ?? "",
    displayText:   scene.display_text   ?? "",
  });

  let response;
  for (let att = attempt; att <= 2; att++) {
    try {
      response = await openai.chat.completions.create({
        model:                 MODEL,
        max_completion_tokens: 14000,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user   },
        ],
      });
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
