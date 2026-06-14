import { openai } from "../../../server/middleware/shared.js";
import { buildSocialScenePrompt } from "./intentPrompts.js";

const MODEL = "gpt-5.4";

export async function designSocialScene(scene, projectContext, attempt = 1) {
  const isCta          = scene.intent === "cta";
  const showAttribution = isCta && projectContext.includeAuthor === true;

  const { system, user } = buildSocialScenePrompt(scene.visual_text || scene.script_segment, {
    sceneIntent:     scene.intent,
    creativeBrief:   scene.creative_brief  ?? scene.visual_concept ?? "",
    visualConcept:   scene.visual_concept  ?? "",
    hasFetchedImage: scene.use_fetched_image === true,
    palette:         projectContext.palette      ?? {},
    fontPair:        projectContext.fontPair     ?? {},
    showAttribution,
    author:          showAttribution ? (projectContext.author       ?? "") : "",
    authorHandle:    showAttribution ? (projectContext.authorHandle ?? "") : "",
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
      console.warn(`[socialSceneDesigner] scene ${scene.scene_index} (${scene.intent}) empty/invalid, retrying (attempt ${attempt + 1}). finish_reason=${choice.finish_reason}`);
      await new Promise(r => setTimeout(r, 1500));
      return designSocialScene(scene, projectContext, attempt + 1);
    }
    console.error(`[socialSceneDesigner] scene ${scene.scene_index} (${scene.intent}) failed after ${attempt} attempts`);
    return "";
  }

  const html = raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/,       "")
    .replace(/\s*```$/,       "")
    .trim();

  console.log(`[socialSceneDesigner] scene ${scene.scene_index} (${scene.intent}) — ${html.length} chars`);
  return html;
}
