import { openai } from "../../../server/middleware/shared.js";
import { buildTypographyScenePrompt } from "./intentPrompts.js";

export async function designTypographyScene(sentenceText, projectContext) {
  const { system, user } = buildTypographyScenePrompt(sentenceText, projectContext);

  const completion = await openai.chat.completions.create({
    model:                 "gpt-5.4",
    max_completion_tokens: 4000,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user },
    ],
  });

  let html = completion.choices[0].message.content ?? "";
  // Strip markdown code fences if model wraps output
  html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return html;
}
