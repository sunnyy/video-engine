import { openai } from "../../../server/middleware/shared.js";
import { buildTypographyScenePrompt } from "./intentPrompts.js";

export async function designTypographyScene(sentenceText, projectContext, attempt = 1) {
  const { system, user } = buildTypographyScenePrompt(sentenceText, projectContext);

  const completion = await openai.chat.completions.create({
    model:                 "gpt-5.4",
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user },
    ],
  });

  let html = completion.choices[0].message.content ?? "";
  html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  if (!html || (!html.includes("<html") && !html.includes("<!DOCTYPE"))) {
    if (attempt < 2) {
      console.warn(`[typo/sceneDesigner] scene ${projectContext.sceneIndex} empty/invalid response, retrying (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, 1500));
      return designTypographyScene(sentenceText, projectContext, attempt + 1);
    }
    console.error(`[typo/sceneDesigner] scene ${projectContext.sceneIndex} failed after ${attempt} attempts`);
  }

  return html;
}
