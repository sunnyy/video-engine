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

import { supabaseAdmin, openai } from "../../../server/middleware/shared.js";
import sharp from "sharp";

const PHOTO_STYLE = "cinematic editorial photograph, dramatic lighting, premium, slight film grain";
const NO_TEXT_SUFFIX = ", absolutely no text, no letters, no words, no numbers, no captions, no signage, no watermarks, clean surfaces";

// AI generations allowed per video — social posts usually carry their own image,
// so AI is a rare fallback. ~1 per 22s, capped at 2.
function aiBudgetFor(totalDuration) {
  return Math.max(1, Math.min(2, Math.round((totalDuration || 25) / 22)));
}

async function persistRemote(url, runId, label, contentType = "image/jpeg", referer = null) {
  try {
    const res = await fetch(url, { headers: referer ? { Referer: referer } : {} });
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

// ── Real entity photo (Wikipedia) ──────────────────────────────────────────────
async function wikiSummaryImage(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
    { headers: { Accept: "application/json", "User-Agent": "Vidquence/1.0" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
}

async function wikipediaImage(entityName, runId, label) {
  if (!entityName) return null;
  try {
    let imgUrl = await wikiSummaryImage(entityName);
    if (!imgUrl) {
      const sRes = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(entityName)}&limit=1`,
        { headers: { Accept: "application/json", "User-Agent": "Vidquence/1.0" } },
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const found = sData?.pages?.[0]?.title;
        if (found) imgUrl = await wikiSummaryImage(found);
      }
    }
    if (!imgUrl) return null;
    const persisted = await persistRemote(imgUrl, runId, label);
    if (persisted) console.log(`[social/media] real photo for "${entityName}" via Wikipedia`);
    return persisted;
  } catch (e) {
    console.warn(`[social/media] wikipedia lookup failed (${entityName}):`, e.message);
    return null;
  }
}

// ── Stock photo (Pixabay) ───────────────────────────────────────────────────
async function searchPixabayImage(query) {
  const key = process.env.VITE_PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=vertical&per_page=5&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.hits?.[0]?.largeImageURL ?? null;
  } catch { return null; }
}

async function stockImage(query, runId, label) {
  if (!query) return null;
  const hit = await searchPixabayImage(query);
  if (!hit) return null;
  const p = await persistRemote(hit, runId, label, "image/jpeg", "https://pixabay.com/");
  return p ?? hit;
}

// ── AI image (FAL) + vision text-gate ─────────────────────────────────────────
async function falImage(prompt, runId, label) {
  const key = process.env.FAL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt + NO_TEXT_SUFFIX, image_size: "portrait_16_9", num_images: 1, num_inference_steps: 4, enable_safety_checker: false }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const falUrl = data?.images?.[0]?.url ?? null;
    if (!falUrl) return null;
    return (await persistRemote(falUrl, runId, label)) ?? falUrl;
  } catch (e) {
    console.warn(`[social/media] fal image error (${label}):`, e.message);
    return null;
  }
}

async function imageHasText(imageUrl) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 5,
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        { type: "text", text: "Does this image contain any visible text, letters, numbers, or writing-like glyphs? Answer only YES or NO." },
      ] }],
    });
    return /yes/i.test(res.choices[0]?.message?.content ?? "");
  } catch { return false; }
}

// ── Asset shape analyzer ──────────────────────────────────────────────────────
// Measure the resolved asset so the designer + pipeline compose AROUND its real
// shape instead of blindly full-bleed-cropping it (which wrecks landscape photos
// and screenshots). Portrait/square → full-bleed cover; landscape/wide → framed
// (contained over a blurred backdrop) with text in the free space.
async function probeImageDims(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const m = await sharp(buf).metadata();
    if (!m.width || !m.height) return null;
    return { width: m.width, height: m.height };
  } catch { return null; }
}

function treatmentFor(dims) {
  if (!dims) return { treatment: "full_bleed", orientation: "portrait", aspect: null };
  const aspect = dims.width / dims.height;
  if (aspect <= 1.15) {
    return { treatment: "full_bleed", orientation: aspect < 0.85 ? "portrait" : "square", aspect: +aspect.toFixed(2), width: dims.width, height: dims.height };
  }
  return { treatment: "framed", orientation: "landscape", aspect: +aspect.toFixed(2), width: dims.width, height: dims.height };
}

async function falImageClean(prompt, runId, label) {
  let best = null;
  for (let i = 1; i <= 2; i++) {
    const extra = i === 2 ? ", plain surfaces only, absolutely zero writing anywhere" : "";
    const url = await falImage(prompt + extra, runId, `${label}-v${i}`);
    if (!url) return best;
    best = url;
    if (!(await imageHasText(url))) return url;
  }
  return best;
}

/**
 * resolveSocialMedia(scenes, content, runId) — sets scene.resolvedImage for every
 * scene that wants one, cheapest source first, with a small AI budget.
 */
export async function resolveSocialMedia(scenes, content, runId) {
  const postImages = content.imageUrls?.length ? content.imageUrls : (content.imageUrl ? [content.imageUrl] : []);
  const totalDur   = scenes.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  const AI_BUDGET  = aiBudgetFor(totalDur);

  // Phase 1 — cheap sources, in parallel
  await Promise.all(scenes.map(async (scene) => {
    scene.resolvedImage = null; scene._needsAI = false;
    try {
      if (scene.use_fetched_image && postImages.length) {
        scene.resolvedImage = postImages[Math.min(scene.image_index ?? 0, postImages.length - 1)];
        return;
      }
      if (scene.subject_entity) {
        const real = await wikipediaImage(scene.subject_entity, runId, `s${scene.scene_index}-real`);
        if (real) { scene.resolvedImage = real; return; }
      }
      if (scene.stock_query) {
        const stock = await stockImage(scene.stock_query, runId, `s${scene.scene_index}-stock`);
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
    const src = await falImageClean(`${subject}, ${PHOTO_STYLE}, vertical 9:16 composition`, runId, `s${scene.scene_index}-ai`);
    if (src) scene.resolvedImage = src;
  }));
  for (const s of scenes) delete s._needsAI;

  // Phase 3 — analyze each resolved asset's shape → treatment (full-bleed vs framed)
  await Promise.all(scenes.filter(s => s.resolvedImage).map(async (s) => {
    s.assetMeta = treatmentFor(await probeImageDims(s.resolvedImage));
  }));

  console.log(`[social/media] AI budget ${AI_BUDGET} for ${totalDur.toFixed(0)}s — ${scenes.map(s => `s${s.scene_index}:${s.resolvedImage ? `${s.use_fetched_image ? "post" : s.subject_entity ? "real" : "img"}/${s.assetMeta?.treatment ?? "?"}` : "none"}`).join(" ")}`);
  return scenes;
}
