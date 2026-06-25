/**
 * shotGenerator.js
 * src/services/ai/productVideo/shotGenerator.js
 *
 * Nano Banana (edit) image generation for Product Video — the identity-preserving
 * path proven in Product Ad Studio (routes/productAd.js). Two stages:
 *   1. generateBaseImage  — clean the upload into a studio packshot (the canonical
 *      reference). Optional watermark-removal pass. Light-touch friendly.
 *   2. generateSceneShot  — for each scene, edit the BASE reference into the scene's
 *      composition (scene/lighting only; product identity preserved by the anchor
 *      instruction). Sequential with 429 back-off.
 *
 * No text is ever generated into the image — the timeline renders all typography.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";
import { blankRefUrl } from "../shared/aiImage.js";

const FAL_KEY    = () => process.env.FAL_API_KEY || process.env.FAL_KEY;
const NANO_EDIT  = "https://fal.run/fal-ai/nano-banana/edit";
const PIXVERSE_I2V = "https://fal.run/fal-ai/pixverse/v4/image-to-video";
const NO_TEXT    = " Absolutely no text, letters, numbers, logos, watermarks, captions, or UI anywhere in the image.";

// Nano Banana takes its output size from the LAST attached image. Append the blank
// canvas for the chosen orientation so shots match the VIDEO aspect, not the upload's.
function withBlank(imageUrls, orientation) {
  const blank = blankRefUrl(orientation);
  return blank ? [...imageUrls, blank] : imageUrls;
}

async function nanoEdit(imageUrls, prompt) {
  const res = await fetch(NANO_EDIT, {
    method:  "POST",
    headers: { Authorization: `Key ${FAL_KEY()}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ image_urls: imageUrls, prompt }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`nano-banana ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const url  = data.images?.[0]?.url ?? null;
  if (!url) throw new Error("nano-banana: no image URL in response");
  return url;
}

async function persist(falUrl, userId, runId, label) {
  try {
    const res = await fetch(falUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const ct  = res.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : "jpg";
    const key = `product-videos/${userId}/${runId}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (error) return falUrl;
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    return pub?.publicUrl ?? falUrl;
  } catch {
    return falUrl;
  }
}

const DEFAULT_BASE_PROMPT =
  "Use the FIRST uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, branding, labels, and shape — completely unchanged. Replace the background with a clean seamless studio backdrop, improve to soft directional studio lighting with gentle shadows, and remove any props, clutter, or distractions. No people. Hyper-realistic, photorealistic. Match the aspect ratio and framing of the blank canvas image provided.";

/**
 * generateBaseImage(productImageUrl, opts)
 * Clean studio packshot — the canonical reference every scene conditions on.
 * @param {object} opts { userId, runId, prompt, hasWatermark }
 */
export async function generateBaseImage(productImageUrl, { userId, runId, prompt, hasWatermark, orientation = "9:16" } = {}) {
  try {
    let url = await nanoEdit(withBlank([productImageUrl], orientation), (prompt || DEFAULT_BASE_PROMPT) + NO_TEXT);

    if (hasWatermark) {
      try {
        url = await nanoEdit(withBlank([url], orientation),
          "Use the FIRST uploaded photo as the product reference. Remove any watermarks, stock-photo text overlays, copyright notices, or semi-transparent text. Keep the product itself — branding, labels, colors, shape, design — completely unchanged. Match the aspect ratio of the blank canvas image provided.");
      } catch (e) {
        console.warn("[productShots] watermark pass skipped:", e.message);
      }
    }

    const persisted = await persist(url, userId, runId, "base");
    console.log("[productShots] base image ready");
    return persisted;
  } catch (e) {
    console.error("[productShots] base image failed, using original upload:", e.message);
    return productImageUrl;
  }
}

/**
 * generateSceneShot(referenceUrl, scene, opts)
 * Edit the base reference into this scene's composition (scene/lighting only).
 * @param {object} opts { userId, runId }
 */
export async function generateSceneShot(referenceUrl, scene, { userId, runId, orientation = "9:16" } = {}) {
  const sceneDesc = (scene.image_generation_prompt || scene.shot_type || "premium editorial product photograph, dramatic lighting").trim();
  const anchored =
    `Use the FIRST uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, branding, and shape — completely unchanged. Change the scene, environment, surface, lighting, camera angle and composition as described: ${sceneDesc}. When the description calls for a lifestyle / in-use / worn shot, naturally introduce a realistic person wearing, holding or using the product (and the setting around them) — but the product itself must stay identical to the reference. Match the aspect ratio and framing of the blank canvas image provided.` + NO_TEXT;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1500 * attempt));
    try {
      const url = await nanoEdit(withBlank([referenceUrl], orientation), anchored);
      return await persist(url, userId, runId, `s${scene.scene_index}-${scene.intent}`);
    } catch (e) {
      console.warn(`[productShots] scene ${scene.scene_index} attempt ${attempt + 1} failed: ${e.message}`);
      if (attempt === 2) {
        console.error(`[productShots] scene ${scene.scene_index} all attempts failed`);
        return null;
      }
    }
  }
  return null;
}

/**
 * generateAllSceneShots(referenceUrl, scenes, opts)
 * Sequential (Nano Banana rate-limits under concurrency). Returns url|null per scene.
 */
export async function generateAllSceneShots(referenceUrl, scenes, opts) {
  const out = [];
  for (const scene of scenes) {
    out.push(await generateSceneShot(referenceUrl, scene, opts));
  }
  return out;
}

// ── Image-to-video: animate a scene's still shot into a short clip (Pixverse i2v) ──
async function persistVideo(falUrl, userId, runId, label) {
  try {
    const res = await fetch(falUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const key = `product-videos/${userId}/${runId}/${label}-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: "video/mp4", upsert: false });
    if (error) return falUrl;
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    return pub?.publicUrl ?? falUrl;
  } catch {
    return falUrl;
  }
}

/**
 * generateSceneClip(imageUrl, motionPrompt, opts)
 * Turn a scene's still shot into a short motion clip. Returns a persisted mp4 URL, or
 * null on failure (caller falls back to the still + Ken Burns).
 * @param {object} opts { userId, runId, label, durationSeconds }
 */
export async function generateSceneClip(imageUrl, motionPrompt, { userId, runId, label = "clip", durationSeconds = 5 } = {}) {
  if (!imageUrl) return null;
  const base = (motionPrompt || "gentle, premium camera move with subtle realistic motion").trim();
  // Front-load the motion: i2v models tend to hold a static frame for the first ~2s,
  // which is invisible in a short scene window. Tell it to move from frame one.
  const prompt = `${base}. Begin the motion immediately from the very first frame and keep it continuous throughout — NO static or frozen hold at the start. Keep the product identical to the reference.`;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(PIXVERSE_I2V, {
        method:  "POST",
        headers: { Authorization: `Key ${FAL_KEY()}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ image_url: imageUrl, prompt, duration: durationSeconds <= 5 ? 5 : 8 }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`pixverse ${res.status}: ${text.slice(0, 160)}`);
      const data = JSON.parse(text);
      const vurl = data.video?.url || data.url;
      if (!vurl) throw new Error("pixverse: no video url");
      return await persistVideo(vurl, userId, runId, label);
    } catch (e) {
      console.warn(`[productClips] ${label} attempt ${attempt + 1} failed: ${e.message}`);
    }
  }
  console.error(`[productClips] ${label} — all attempts failed; falling back to still`);
  return null;
}
