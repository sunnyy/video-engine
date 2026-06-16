/**
 * beatDesigner.js
 * src/services/ai/aiVideo/beatDesigner.js
 *
 * Stage 4 — designs all beats fully in parallel (variety was planned by the
 * beat director; there is no sequential dependency).
 */

import { openai } from "../../../server/middleware/shared.js";
import { buildBeatPrompt } from "./designPrompts.js";

const DESIGNER_MODEL = "gpt-5.4";
const MAX_TOKENS     = 12000; // beats are small frames — smaller budget than scene design

function stripFences(raw) {
  return raw.replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
}

function isValidHTML(raw, finishReason) {
  if (!raw || finishReason === "length") return false;
  const lower = raw.toLowerCase();
  return (lower.includes("<html") || lower.includes("<!doctype")) && lower.includes("</html>");
}

export async function designBeat(beat, ctx, attempt = 1) {
  const prompt = buildBeatPrompt(beat, ctx);

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

  if (!isValidHTML(raw, choice.finish_reason)) {
    if (attempt < 2) {
      console.warn(`[ai-video/design] beat ${beat.beat_index} invalid/truncated (finish=${choice.finish_reason}), retrying`);
      await new Promise(r => setTimeout(r, 1200));
      return designBeat(beat, ctx, attempt + 1);
    }
    console.error(`[ai-video/design] beat ${beat.beat_index} failed after ${attempt} attempts`);
    return "";
  }
  return raw;
}

export async function designAllBeats(beats, ctx) {
  return Promise.all(
    beats.map(async (beat) => {
      try {
        const html = await designBeat(beat, ctx);
        console.log(`[ai-video/design] beat ${beat.beat_index} (${beat.asset_type ?? "none"}) — ${html.length} chars`);
        return { beatIndex: beat.beat_index, html, error: html ? null : "empty design" };
      } catch (err) {
        console.error(`[ai-video/design] beat ${beat.beat_index} failed:`, err.message);
        return { beatIndex: beat.beat_index, html: "", error: err.message };
      }
    })
  );
}
