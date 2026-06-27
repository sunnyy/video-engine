/**
 * mediaResolver.js
 * src/services/ai/socialVideo/mediaResolver.js
 *
 * Cost-aware media waterfall for Social Video (same approach as AI Video). For
 * each scene that wants an image, resolve cheap-first:
 *   1. the POST's own image (use_fetched_image)         — free, most relevant
 *   2. a REAL entity photo (Wikipedia, subject_entity)  — free, strong
 *   3. STOCK photo (Pixabay, stock_query)               — cheap
 *   4. AI generation (FAL)                              — capped last resort
 * Sets scene.resolvedImage; the designer is told hasImage, and the orchestrator
 * injects the URL into the scene's social-image placeholder.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";
import { searchStockImage, searchStockVideo, probeImageDims, treatmentFor } from "../shared/stock.js";
import { styleImagePrompt } from "../shared/visualStyles.js";
import { generateAiImage } from "../shared/aiImage.js";
import { resolveEntityImage } from "../shared/entityImage.js";
import { safeFetch } from "../shared/safeFetch.js"; // SSRF-safe (a client plan can inject content.imageUrl)

// AI generations allowed per video — social posts usually carry their own image,
// so AI is a rare fallback. ~1 per 22s, capped at 2.
function aiBudgetFor(totalDuration) {
  return Math.max(1, Math.min(2, Math.round((totalDuration || 25) / 22)));
}

async function persistRemote(url, runId, label, contentType = "image/jpeg", referer = null) {
  try {
    const res = await safeFetch(url, { headers: referer ? { Referer: referer } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 25 * 1024 * 1024) throw new Error(`too large (${Math.round(buffer.length / 1e6)}MB)`);
    const ext  = contentType.includes("png") ? "png" : "jpg";
    const path = `social-video/${runId}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[social/media] persist failed (${label}):`, e.message);
    return null;
  }
}

// Real entity photo (person/org/place/product) → shared/entityImage.js: a free,
// licensed waterfall (Wikipedia → Wikidata P18 → Wikimedia Commons), universal
// across all services. It persists internally and returns a permanent URL.

// ── Stock (Pexels→Pixabay, orientation-aware, randomized) — shared/stock.js ───
async function stockImage(query, runId, label, orientation) {
  if (!query) return null;
  const hit = await searchStockImage(query, { orientation });
  if (!hit) return null;
  const p = await persistRemote(hit.url, runId, label, "image/jpeg", "https://pixabay.com/");
  return p ?? hit.url;
}

async function stockVideo(query, runId, label, orientation, minDuration) {
  if (!query) return null;
  const hit = await searchStockVideo(query, { orientation, minDuration });
  if (!hit) return null;
  const p = await persistRemote(hit.url, runId, label, "video/mp4", "https://pixabay.com/");
  return p ?? hit.url;
}

// AI image generation + vision text-gate is the shared, orientation-aware utility
// (../shared/aiImage.js → generateAiImage). No local FLUX copy — orientation is
// honored universally there.

/**
 * resolveSocialMedia(scenes, content, runId) — sets scene.resolvedImage for every
 * scene that wants one, cheapest source first, with a small AI budget.
 */
export async function resolveSocialMedia(scenes, content, runId, orientation = "9:16", styleId = "auto") {
  const postImages = content.imageUrls?.length ? content.imageUrls : (content.imageUrl ? [content.imageUrl] : []);
  const totalDur   = scenes.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  const AI_BUDGET  = aiBudgetFor(totalDur);

  // Phase 1 — cheap sources, in parallel
  await Promise.all(scenes.map(async (scene) => {
    scene.resolvedImage = null; scene.resolvedKind = "image"; scene._needsAI = false;
    try {
      if (scene.use_fetched_image && postImages.length) {
        scene.resolvedImage = postImages[Math.min(scene.image_index ?? 0, postImages.length - 1)];
        return;
      }
      if (scene.subject_entity) {
        const real = await resolveEntityImage(scene.subject_entity, { runId, label: `s${scene.scene_index}-real` });
        if (real) { scene.resolvedImage = real; return; }
      }
      if (scene.stock_query) {
        // GPT marked this beat as motion → try a stock VIDEO first, fall back to a still.
        if (scene.stock_motion) {
          const minDur = Math.max(2, Math.ceil(scene.duration_seconds ?? 3));
          const vid = await stockVideo(scene.stock_query, runId, `s${scene.scene_index}-stock`, orientation, minDur);
          if (vid) { scene.resolvedImage = vid; scene.resolvedKind = "video"; return; }
        }
        const stock = await stockImage(scene.stock_query, runId, `s${scene.scene_index}-stock`, orientation);
        if (stock) { scene.resolvedImage = stock; return; }
      }
      // wanted an image but cheap sources missed → AI candidate
      if (scene.subject_entity || scene.stock_query) scene._needsAI = true;
    } catch (e) {
      console.warn(`[social/media] scene ${scene.scene_index} resolve failed: ${e.message}`);
    }
  }));

  // Phase 2 — capped AI for the scenes still missing an image
  const needAI = scenes.filter(s => s._needsAI && !s.resolvedImage);
  await Promise.all(needAI.slice(0, AI_BUDGET).map(async (scene) => {
    const subject = scene.stock_query || scene.subject_entity || scene.visual_text || scene.creative_brief || "";
    const src = await generateAiImage(`${subject}, ${styleImagePrompt(styleId, "photo")}`, { runId, label: `s${scene.scene_index}-ai`, orientation });
    if (src) scene.resolvedImage = src;
  }));
  for (const s of scenes) delete s._needsAI;

  // Phase 3 — analyze each resolved asset's shape → treatment (full-bleed vs framed).
  // Stock videos are requested in the project orientation, so they're full-bleed.
  await Promise.all(scenes.filter(s => s.resolvedImage).map(async (s) => {
    if (s.resolvedKind === "video") {
      s.assetMeta = { treatment: "full_bleed", orientation: orientation === "16:9" ? "landscape" : "portrait", aspect: null };
      return;
    }
    s.assetMeta = treatmentFor(await probeImageDims(s.resolvedImage), orientation);
  }));

  console.log(`[social/media] AI budget ${AI_BUDGET} for ${totalDur.toFixed(0)}s — ${scenes.map(s => `s${s.scene_index}:${s.resolvedImage ? `${s.use_fetched_image ? "post" : s.subject_entity ? "real" : "img"}/${s.assetMeta?.treatment ?? "?"}` : "none"}`).join(" ")}`);
  return scenes;
}
