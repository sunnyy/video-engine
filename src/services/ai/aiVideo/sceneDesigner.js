/**
 * sceneDesigner.js
 * src/services/ai/aiVideo/sceneDesigner.js
 *
 * GPT-5.4 designs one beat's frame as motion-tagged HTML (see designPrompt.js).
 */

import { openai } from "../../../server/middleware/shared.js";
import { buildBeatDesignPrompt } from "./designPrompt.js";

const MODEL = "gpt-5.4";

export async function designBeat(beat, ctx, attempt = 1) {
  const { system, user } = buildBeatDesignPrompt(beat, ctx);

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 14000,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user   },
    ],
  });

  const choice = response.choices[0];
  const raw    = (choice.message.content ?? "").trim();

  if (!raw || (!raw.includes("<html") && !raw.includes("<!DOCTYPE"))) {
    if (attempt < 2) {
      console.warn(`[ai-video] beat design empty, retrying (finish_reason=${choice.finish_reason})`);
      await new Promise(r => setTimeout(r, 1200));
      return designBeat(beat, ctx, attempt + 1);
    }
    return "";
  }

  return raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}
