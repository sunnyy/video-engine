/**
 * shared/aiImage.js — FAL (FLUX schnell) image generation + a vision text-gate +
 * background removal (birefnet). The last-resort tier; everything else is cheaper.
 */
import { openai, supabaseAdmin } from "../../../server/middleware/shared.js";
import { persistRemote } from "./persist.js";

// ── Blank canvas references for Nano Banana ─────────────────────────────────
// Nano Banana (fal nano-banana/edit) takes its OUTPUT size from the LAST attached
// image — it ignores any size/aspect parameter. So to force an output aspect we
// append a blank canvas of that aspect as the final image_url. (FLUX paths do NOT
// need this — they honor image_size directly.) These are the system blank assets.
const blankPub = (file) =>
  supabaseAdmin.storage.from("system-assets").getPublicUrl(`blank-images/${file}`).data?.publicUrl ?? null;

export const BLANK_IMAGE = {
  "1:1":  blankPub("1024x1024.png"),
  "4:5":  blankPub("864x1080.png"),
  "9:16": blankPub("680x1080.png"),
  "16:9": blankPub("1920x1080.png"),
};

/** The blank canvas URL to append as the LAST image_url for a Nano Banana edit,
 *  forcing the output orientation. Returns null when no blank exists. */
export function blankRefUrl(orientation = "9:16") {
  return BLANK_IMAGE[orientation] ?? null;
}

// Platform/aspect aliases used across the image studios → canonical aspect key.
const BLANK_ALIASES = {
  "1:1": "1:1", "4:5": "4:5", "9:16": "9:16", "16:9": "16:9",
  square: "1:1", square_11: "1:1",
  portrait_45: "4:5",
  portrait_916: "9:16", story_916: "9:16",
  landscape: "16:9",
};

/** Resolve any studio platform/aspect key (square, portrait_916, story_916,
 *  landscape, "9:16", …) to its blank canvas URL. Falls back to 1:1. */
export function blankForKey(key) {
  return BLANK_IMAGE[BLANK_ALIASES[key] ?? key] ?? BLANK_IMAGE["1:1"];
}

// Diffusion models render garbled text the moment a prompt hints at one — hammer it.
export const NO_TEXT_SUFFIX = ", absolutely no text, no letters, no words, no numbers, no characters, no typography, no captions, no labels, no signage, no stamps, no logos, no watermarks, clean surfaces";

function falImageSize(orientation = "9:16") {
  switch (orientation) {
    case "16:9": return "landscape_16_9";
    case "1:1":  return "square_hd";
    case "9:16":
    default:     return "portrait_16_9";
  }
}

/** One raw FAL generation → persisted URL (or null). */
export async function falImage(prompt, { runId, label, orientation = "9:16" } = {}) {
  const key = process.env.FAL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method:  "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt: prompt + NO_TEXT_SUFFIX, image_size: falImageSize(orientation), num_images: 1, num_inference_steps: 4, enable_safety_checker: false }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data   = await res.json();
    const falUrl = data?.images?.[0]?.url ?? null;
    if (!falUrl) return null;
    return (await persistRemote(falUrl, { runId, label, contentType: "image/jpeg" })) ?? falUrl;
  } catch (e) {
    console.warn(`[assets/aiImage] fal error (${label}):`, e.message);
    return null;
  }
}

/** Vision gate — true if the image contains any visible text/glyphs. */
export async function imageHasText(imageUrl) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 5,
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        { type: "text", text: "Does this image contain any visible text, letters, numbers, or writing-like glyphs anywhere (including on screens, signs, labels, or clothing)? Answer only YES or NO." },
      ] }],
    });
    return /yes/i.test(res.choices[0]?.message?.content ?? "");
  } catch (e) {
    console.warn("[assets/aiImage] vision text-check failed (accepting):", e.message);
    return false;
  }
}

/** falImage + vision gate: regenerate once if text is detected, then best effort. */
export async function generateAiImage(prompt, { runId, label, orientation = "9:16", noTextGate = true } = {}) {
  if (!noTextGate) return falImage(prompt, { runId, label, orientation });
  let best = null;
  for (let i = 1; i <= 2; i++) {
    const extra = i === 2 ? ", plain surfaces only, absolutely zero writing anywhere, no screens, no signs" : "";
    const url = await falImage(prompt + extra, { runId, label: `${label}-v${i}`, orientation });
    if (!url) return best;
    best = url;
    if (!(await imageHasText(url))) return url;
    console.warn(`[assets/aiImage] ${label}: text detected (attempt ${i}${i < 2 ? " — regenerating" : " — accepting"})`);
  }
  return best;
}

/** Background removal via FAL birefnet → transparent PNG URL (or null). */
export async function removeBackground(imageUrl, { runId, label } = {}) {
  const key = process.env.FAL_API_KEY;
  if (!key || !imageUrl) return null;
  try {
    const res = await fetch("https://fal.run/fal-ai/birefnet", {
      method:  "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ image_url: imageUrl }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data   = await res.json();
    const outUrl = data?.image?.url ?? null;
    if (!outUrl) return null;
    return (await persistRemote(outUrl, { runId, label, contentType: "image/png" })) ?? outUrl;
  } catch (e) {
    console.warn(`[assets/aiImage] birefnet error (${label}):`, e.message);
    return null;
  }
}
