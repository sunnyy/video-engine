import { openai } from "../../../server/middleware/shared.js";

/**
 * Shared input safety gate. Run the user's raw prompt/topic/script through
 * OpenAI moderation BEFORE any generation. Throws a typed error if the input
 * is disallowed so the caller can stop and return a clean message — never let a
 * prohibited prompt reach the generator (it would just sanitize it into output).
 *
 * Throws: Error with `.code = "CONTENT_BLOCKED"` and `.categories` (array).
 */

// Categories we always refuse outright, regardless of the overall `flagged` flag.
const HARD_BLOCK = [
  "sexual/minors",
  "sexual",
  "child",
  "hate/threatening",
  "harassment/threatening",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "violence/graphic",
  "illicit",
  "illicit/violent",
];

export async function moderateInput(text, { label = "input" } = {}) {
  const input = (text ?? "").trim();
  if (!input) return;

  let result;
  try {
    const resp = await openai.moderations.create({ model: "omni-moderation-latest", input });
    result = resp?.results?.[0];
  } catch (err) {
    // Moderation outage shouldn't take the whole service down — log and allow.
    console.warn(`[moderation] check failed for ${label}, allowing:`, err.message);
    return;
  }

  if (!result) return;

  const flaggedCats = Object.entries(result.categories ?? {})
    .filter(([, on]) => on)
    .map(([cat]) => cat);

  const hardHit = flaggedCats.some(cat => HARD_BLOCK.includes(cat));

  if (result.flagged || hardHit) {
    console.warn(`[moderation] BLOCKED ${label} — categories: ${flaggedCats.join(", ") || "(flagged)"}`);
    const err = new Error("This request can't be processed. Please try a different topic.");
    err.code = "CONTENT_BLOCKED";
    err.categories = flaggedCats;
    throw err;
  }
}
