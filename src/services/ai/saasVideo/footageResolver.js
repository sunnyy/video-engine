/**
 * footageResolver.js
 * src/services/ai/saasVideo/footageResolver.js
 *
 * Stage 3.5 — turns the director's casting requests into real, persisted assets.
 * The director proposes; this module disposes. Deterministic fallback chain:
 *
 *   broll        → Pexels video (if key) → Pixabay video → stock_image chain
 *   stock_image  → Pixabay vertical photo → ai_image chain
 *   ai_image     → FAL flux/schnell portrait → null (scene falls back to designed bg)
 *   screenshot   → already resolved by the harvester
 *   mockup/typographic → no background asset (designer builds the visual)
 *
 * Videos are persisted to Supabase so renders never depend on stock CDNs
 * (Pixabay blocks hotlinking — the codebase already proxies for this reason).
 *
 * Every scene comes back with scene.background:
 *   { kind: "video" | "image" | null, src, srcWidth, srcHeight, provider }
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";

const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // refuse to persist clips bigger than this

// ── Persistence ──────────────────────────────────────────────────────────────

async function persistRemote(url, runId, label, contentType, referer = null) {
  try {
    const res = await fetch(url, { headers: referer ? { "Referer": referer } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_VIDEO_BYTES) throw new Error(`too large (${Math.round(buffer.length / 1e6)}MB)`);

    const ext  = contentType.includes("mp4") ? "mp4" : "jpg";
    const path = `saas-video/${runId}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("user-assets").upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[saas/footage] persist failed (${label}):`, e.message);
    return null;
  }
}

// ── Providers ────────────────────────────────────────────────────────────────

/** Pexels video search — used automatically when PEXELS_API_KEY is set. */
async function searchPexelsVideo(query, minDuration) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=6`;
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    for (const hit of data.videos ?? []) {
      if ((hit.duration ?? 0) < minDuration) continue;
      // Prefer portrait HD files, smallest adequate resolution to keep size down
      const files = (hit.video_files ?? [])
        .filter(f => f.file_type === "video/mp4" && f.height >= 1280 && f.height > f.width)
        .sort((a, b) => a.height - b.height);
      const file = files[0]
        ?? (hit.video_files ?? []).filter(f => f.file_type === "video/mp4" && f.width >= 1280).sort((a, b) => a.width - b.width)[0];
      if (file) return { url: file.link, width: file.width, height: file.height, provider: "pexels" };
    }
    return null;
  } catch (e) {
    console.warn("[saas/footage] pexels video error:", e.message);
    return null;
  }
}

/** Pixabay video search — primary provider with the existing key. */
async function searchPixabayVideo(query, minDuration) {
  const key = process.env.VITE_PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=8&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const candidates = (data.hits ?? []).filter(h => (h.duration ?? 0) >= minDuration);
    if (candidates.length === 0) return null;

    // Prefer portrait/square clips; fall back to landscape (cover-cropped at render)
    const score = (h) => {
      const v = h.videos?.medium ?? h.videos?.large ?? h.videos?.small;
      if (!v) return -1;
      const portrait = v.height >= v.width ? 2 : 0;
      return portrait + Math.min(1, (h.duration ?? 0) / 30);
    };
    candidates.sort((a, b) => score(b) - score(a));

    const hit = candidates[0];
    const v   = hit.videos?.medium ?? hit.videos?.large ?? hit.videos?.small;
    if (!v?.url) return null;
    return { url: v.url, width: v.width, height: v.height, provider: "pixabay" };
  } catch (e) {
    console.warn("[saas/footage] pixabay video error:", e.message);
    return null;
  }
}

/** Pixabay vertical photo. */
async function searchPixabayImage(query) {
  const key = process.env.VITE_PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=vertical&per_page=5&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hit = data.hits?.[0];
    return hit?.largeImageURL ? { url: hit.largeImageURL, width: hit.imageWidth, height: hit.imageHeight, provider: "pixabay" } : null;
  } catch (e) {
    console.warn("[saas/footage] pixabay image error:", e.message);
    return null;
  }
}

/** FAL flux/schnell portrait image — abstract/conceptual fallback. */
async function generateFalImage(query, runId) {
  const key = process.env.FAL_API_KEY;
  if (!key) return null;
  try {
    const prompt = `${query}, vertical 9:16 portrait composition, cinematic photography, moody lighting, sharp focus, no text, no watermark`;
    const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method:  "POST",
      headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt, image_size: "portrait_16_9", num_images: 1, num_inference_steps: 4, enable_safety_checker: false }),
    });
    if (!falRes.ok) throw new Error(`HTTP ${falRes.status}`);
    const data   = await falRes.json();
    const falUrl = data?.images?.[0]?.url ?? null;
    if (!falUrl) return null;

    const persisted = await persistRemote(falUrl, runId, "ai-bg", "image/jpeg");
    return { url: persisted ?? falUrl, width: 1080, height: 1920, provider: "fal" };
  } catch (e) {
    console.warn("[saas/footage] fal error:", e.message);
    return null;
  }
}

// ── Per-scene resolution ─────────────────────────────────────────────────────

async function resolveVideo(query, minDuration, runId, sceneIndex) {
  const found = (await searchPexelsVideo(query, minDuration)) ?? (await searchPixabayVideo(query, minDuration));
  if (!found) return null;

  const persisted = await persistRemote(found.url, runId, `broll-s${sceneIndex}`, "video/mp4", "https://pixabay.com/");
  if (!persisted) return null;
  return { kind: "video", src: persisted, srcWidth: found.width, srcHeight: found.height, provider: found.provider };
}

async function resolveImage(query, runId, sceneIndex) {
  const stock = await searchPixabayImage(query);
  if (stock) {
    // Images hotlink fine, but persist anyway for permanence
    const persisted = await persistRemote(stock.url, runId, `still-s${sceneIndex}`, "image/jpeg", "https://pixabay.com/");
    return { kind: "image", src: persisted ?? stock.url, srcWidth: stock.width, srcHeight: stock.height, provider: stock.provider };
  }
  const ai = await generateFalImage(query, runId);
  if (ai) return { kind: "image", src: ai.url, srcWidth: ai.width, srcHeight: ai.height, provider: "fal" };
  return null;
}

/**
 * resolveFootage(scenes, harvest, runId)
 * Mutates each scene: sets scene.background and (on downgrade) scene.visual_source.
 * Runs scenes in parallel — each scene's own chain is sequential.
 */
export async function resolveFootage(scenes, harvest, runId) {
  await Promise.all(scenes.map(async (scene) => {
    const minDur = Math.max(3, Math.ceil(scene.duration_seconds ?? 4));
    scene.background = null;

    try {
      if (scene.visual_source === "broll") {
        const video = await resolveVideo(scene.shot_query, minDur, runId, scene.scene_index);
        if (video) { scene.background = video; return; }
        console.log(`[saas/footage] scene ${scene.scene_index}: no b-roll for "${scene.shot_query}" — trying still`);
        const image = await resolveImage(scene.shot_query, runId, scene.scene_index);
        if (image) {
          scene.background    = image;
          scene.visual_source = "stock_image";
          scene.motion        = "ken_burns";
          return;
        }
        scene.visual_source = "typographic"; // last resort: designed scene
        scene.motion        = "none";
        return;
      }

      if (scene.visual_source === "stock_image" || scene.visual_source === "ai_image") {
        let image = null;
        if (scene.visual_source === "ai_image") {
          const ai = await generateFalImage(scene.shot_query, runId);
          if (ai) image = { kind: "image", src: ai.url, srcWidth: ai.width, srcHeight: ai.height, provider: "fal" };
          if (!image) image = await resolveImage(scene.shot_query, runId, scene.scene_index);
        } else {
          image = await resolveImage(scene.shot_query, runId, scene.scene_index);
        }
        if (image) { scene.background = image; return; }
        scene.visual_source = "typographic";
        scene.motion        = "none";
        return;
      }

      if (scene.visual_source === "screenshot") {
        const url = harvest.screenshotUrls?.[scene.screenshot_index ?? 0] ?? null;
        if (!url) { scene.visual_source = "mockup"; return; }
        // Screenshot scenes keep the framed-card treatment — the designer embeds
        // the URL itself; no full-canvas background asset.
        return;
      }

      // mockup / typographic — designer builds the visual, no asset needed
    } catch (e) {
      console.warn(`[saas/footage] scene ${scene.scene_index} resolution error:`, e.message);
      scene.background    = null;
      scene.visual_source = ["mockup", "screenshot"].includes(scene.visual_source) ? scene.visual_source : "typographic";
    }
  }));

  const summary = scenes.map(s => `s${s.scene_index}:${s.visual_source}${s.background ? `(${s.background.kind})` : ""}`).join(" ");
  console.log(`[saas/footage] resolved — ${summary}`);
  return scenes;
}
