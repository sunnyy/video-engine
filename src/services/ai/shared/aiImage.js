/**
 * shared/aiImage.js — FAL (FLUX schnell) image generation + a vision text-gate +
 * background removal (birefnet). The last-resort tier; everything else is cheaper.
 */
import { supabaseAdmin } from "../../../server/middleware/shared.js";
import { persistRemote } from "./persist.js";
import { reportOk, reportFail } from "../../../server/services/apiHealth.js";

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
    if (!res.ok) { reportFail("ai_image", { message: `HTTP ${res.status}` }).catch(() => {}); return null; }
    reportOk("ai_image").catch(() => {});            // provider responded — healthy
    const data   = await res.json();
    const falUrl = data?.images?.[0]?.url ?? null;
    if (!falUrl) return null;
    return (await persistRemote(falUrl, { runId, label, contentType: "image/jpeg" })) ?? falUrl;
  } catch (e) {
    reportFail("ai_image", { message: e.message }).catch(() => {});   // network/timeout → provider unreachable
    console.warn(`[assets/aiImage] fal error (${label}):`, e.message);
    return null;
  }
}

// Hard no-text rule baked into every AI image prompt — diffusion models can't render real
// text (it comes out as gibberish), and all real text is drawn by our typography layer on
// top. One generation, no vision check, no retries.
const NO_TEXT_RULE = ", plain surfaces only — absolutely NO text, letters, numbers, words, logos, watermarks, captions, signs, labels, or UI anywhere in the image";

/** Single AI image generation with a baked-in no-text rule (no vision gate, no retries). */
export async function generateAiImage(prompt, { runId, label, orientation = "9:16", noTextGate = true } = {}) {
  return falImage(prompt + (noTextGate ? NO_TEXT_RULE : ""), { runId, label, orientation });
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
