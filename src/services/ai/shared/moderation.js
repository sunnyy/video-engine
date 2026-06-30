import { openai } from "../../../server/middleware/shared.js";

/**
 * Shared input safety gate. Run the user's raw prompt/topic/script through
 * OpenAI moderation BEFORE any generation. Throws a typed error if the input
 * is disallowed so the caller can stop and return a clean message — never let a
 * prohibited prompt reach the generator (it would just sanitize it into output).
 *
 * Throws: Error with `.code = "CONTENT_BLOCKED"` and `.categories` (array).
 */

// The ONLY categories we refuse. We block on THESE, not on OpenAI's blanket `flagged` — the overall
// flag trips on generic "violence" (war, history, conflict, true-crime) and "harassment" (roasts,
// satire), which are legitimate short-form topics. We allow those and refuse only genuinely harmful
// content: sexual, minors, self-harm, threats/hate, graphic gore, and illicit/illegal instructions.
const HARD_BLOCK = [
  "sexual/minors",
  "sexual",
  "child",
  "hate",
  "hate/threatening",
  "harassment/threatening",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "violence/graphic",
  "illicit",
  "illicit/violent",
];

function evaluate(result, label, message) {
  if (!result) return;
  const flaggedCats = Object.entries(result.categories ?? {})
    .filter(([, on]) => on)
    .map(([cat]) => cat);
  const hardHit = flaggedCats.some(cat => HARD_BLOCK.includes(cat));
  if (hardHit) {
    console.warn(`[moderation] BLOCKED ${label} — categories: ${flaggedCats.join(", ") || "(flagged)"}`);
    const err = new Error(message);
    err.code = "CONTENT_BLOCKED";
    err.categories = flaggedCats;
    throw err;
  }
}

/** Text safety gate — run before any generation. Throws CONTENT_BLOCKED if disallowed. */
export async function moderateInput(text, { label = "input" } = {}) {
  const input = (text ?? "").trim();
  if (!input) return;
  let result;
  try {
    const resp = await openai.moderations.create({ model: "omni-moderation-latest", input });
    result = resp?.results?.[0];
  } catch (err) {
    console.warn(`[moderation] text check failed for ${label}, allowing:`, err.message);
    return;
  }
  evaluate(result, label, "This request can't be processed. Please try a different topic.");
}

/** Image safety gate — moderate a user-provided image URL (http(s) or data: URI). */
export async function moderateImage(imageUrl, { label = "image" } = {}) {
  if (!imageUrl) return;
  let result;
  try {
    const resp = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: imageUrl } }],
    });
    result = resp?.results?.[0];
  } catch (err) {
    console.warn(`[moderation] image check failed for ${label}, allowing:`, err.message);
    return;
  }
  evaluate(result, label, "This image can't be processed. Please use a different image.");
}

/**
 * Route convenience: moderate the given text + image inputs; on a block, send a
 * 422 and return false so the handler can `if (!(await guardContent(...))) return;`.
 * Runs before any credit deduction / streaming. Pass arrays (falsy entries skipped).
 */
export async function guardContent(res, { text = [], images = [], label = "input" } = {}) {
  try {
    for (const t of [].concat(text))   { if (t) await moderateInput(t, { label }); }
    for (const u of [].concat(images)) { if (u) await moderateImage(u, { label }); }
    return true;
  } catch (e) {
    if (e.code === "CONTENT_BLOCKED") { res.status(422).json({ error: e.message, code: e.code }); return false; }
    throw e;
  }
}
