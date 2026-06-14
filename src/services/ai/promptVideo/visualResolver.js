/**
 * visualResolver.js
 * src/services/ai/promptVideo/visualResolver.js
 *
 * Stage 3 — the director proposed, code disposes. Resolves every beat's
 * visual asset in parallel, with deterministic downgrades:
 *
 *   ai_illustration   → FAL flux with the LOCKED style string → persisted image
 *   annotated_photo   → FAL flux with the style's photo string → persisted image
 *   cutout_colorblock → FAL flux subject portrait → FAL birefnet bg-removal →
 *                       transparent PNG (falls back to the raw portrait)
 *   stock_moment      → Pexels/Pixabay video → Pixabay image → FAL image
 *   artifact / typography_punch / versus_split → no asset (built in HTML)
 *
 * Any total failure downgrades the beat to typography_punch — nothing ever
 * ships broken or pending.
 */

import { supabaseAdmin, openai } from "../../../server/middleware/shared.js";

const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

// ── Persistence ──────────────────────────────────────────────────────────────

async function persistRemote(url, runId, label, contentType, referer = null) {
  try {
    const res = await fetch(url, { headers: referer ? { "Referer": referer } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_VIDEO_BYTES) throw new Error(`too large (${Math.round(buffer.length / 1e6)}MB)`);
    const ext  = contentType.includes("mp4") ? "mp4" : contentType.includes("png") ? "png" : "jpg";
    const path = `prompt-video/${runId}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("user-assets").upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[prompt/resolve] persist failed (${label}):`, e.message);
    return null;
  }
}

// ── FAL ──────────────────────────────────────────────────────────────────────

// Diffusion models render garbled text the moment a prompt suggests any —
// stamps, documents, posters, signs. Hammer the negative hard and centrally.
const NO_TEXT_SUFFIX = ", absolutely no text, no letters, no words, no numbers, no characters, no typography, no captions, no labels, no signage, no stamps, no logos, no watermarks, clean surfaces";

async function falImage(prompt, runId, label) {
  const key = process.env.FAL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method:  "POST",
      headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt: prompt + NO_TEXT_SUFFIX, image_size: "portrait_16_9", num_images: 1, num_inference_steps: 4, enable_safety_checker: false }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data   = await res.json();
    const falUrl = data?.images?.[0]?.url ?? null;
    if (!falUrl) return null;
    const persisted = await persistRemote(falUrl, runId, label, "image/jpeg");
    return persisted ?? falUrl;
  } catch (e) {
    console.warn(`[prompt/resolve] fal image error (${label}):`, e.message);
    return null;
  }
}

/** Background removal via FAL birefnet — returns a transparent PNG URL or null. */
async function falRemoveBackground(imageUrl, runId, label) {
  const key = process.env.FAL_API_KEY;
  if (!key || !imageUrl) return null;
  try {
    const res = await fetch("https://fal.run/fal-ai/birefnet", {
      method:  "POST",
      headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ image_url: imageUrl }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const outUrl = data?.image?.url ?? null;
    if (!outUrl) return null;
    const persisted = await persistRemote(outUrl, runId, label, "image/png");
    return persisted ?? outUrl;
  } catch (e) {
    console.warn(`[prompt/resolve] birefnet error (${label}):`, e.message);
    return null;
  }
}

/**
 * Vision gate: diffusion models sneak garbled glyphs into images the moment a
 * scene contains a screen, sign, or stage — prompt-level negatives can't stop
 * it. One cheap vision call detects it; one regeneration usually clears it.
 */
async function imageHasText(imageUrl) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 5,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          { type: "text", text: "Does this image contain any visible text, letters, numbers, or writing-like glyphs anywhere (including on screens, signs, labels, or clothing)? Answer only YES or NO." },
        ],
      }],
    });
    return /yes/i.test(res.choices[0]?.message?.content ?? "");
  } catch (e) {
    console.warn("[prompt/resolve] vision text-check failed (accepting image):", e.message);
    return false;
  }
}

/** falImage + vision gate: regenerate once if text is detected, then accept best effort. */
async function falImageClean(prompt, runId, label) {
  let best = null;
  for (let i = 1; i <= 2; i++) {
    const extra = i === 2 ? ", plain surfaces only, absolutely zero writing anywhere, no screens, no signs" : "";
    const url = await falImage(prompt + extra, runId, `${label}-v${i}`);
    if (!url) return best;
    best = url;
    if (!(await imageHasText(url))) return url;
    console.warn(`[prompt/resolve] ${label}: text detected in generated image (attempt ${i}${i < 2 ? " — regenerating" : " — accepting best effort"})`);
  }
  return best;
}

// ── Real public-figure / landmark photos via Wikipedia ──────────────────────
// Generated likenesses of famous people are the weakest frames in AI video.
// Wikipedia's REST summary API serves a real, freely-usable lead image for
// virtually every notable person, company, and landmark.

async function wikiSummaryImage(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
    { headers: { "Accept": "application/json", "User-Agent": "Vidquence/1.0" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
}

async function wikipediaImage(entityName, runId, label) {
  if (!entityName) return null;
  try {
    // Direct title first; on miss, resolve via Wikipedia title search
    let imgUrl = await wikiSummaryImage(entityName);
    if (!imgUrl) {
      const sRes = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(entityName)}&limit=1`,
        { headers: { "Accept": "application/json", "User-Agent": "Vidquence/1.0" } },
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const found = sData?.pages?.[0]?.title;
        if (found) imgUrl = await wikiSummaryImage(found);
      }
    }
    if (!imgUrl) return null;
    const persisted = await persistRemote(imgUrl, runId, label, "image/jpeg");
    if (persisted) console.log(`[prompt/resolve] real photo for "${entityName}" via Wikipedia`);
    return persisted;
  } catch (e) {
    console.warn(`[prompt/resolve] wikipedia lookup failed (${entityName}):`, e.message);
    return null;
  }
}

// ── Stock ────────────────────────────────────────────────────────────────────

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
      const files = (hit.video_files ?? [])
        .filter(f => f.file_type === "video/mp4" && f.height >= 1280 && f.height > f.width)
        .sort((a, b) => a.height - b.height);
      const file = files[0];
      if (file) return { url: file.link, kind: "video" };
    }
    return null;
  } catch { return null; }
}

async function searchPixabayVideo(query, minDuration) {
  const key = process.env.VITE_PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=8&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const ok = (data.hits ?? []).filter(h => (h.duration ?? 0) >= minDuration);
    if (!ok.length) return null;
    ok.sort((a, b) => {
      const va = a.videos?.medium ?? a.videos?.large, vb = b.videos?.medium ?? b.videos?.large;
      return ((vb?.height >= vb?.width) ? 1 : 0) - ((va?.height >= va?.width) ? 1 : 0);
    });
    const v = ok[0].videos?.medium ?? ok[0].videos?.large ?? ok[0].videos?.small;
    return v?.url ? { url: v.url, kind: "video" } : null;
  } catch { return null; }
}

async function searchPixabayImage(query) {
  const key = process.env.VITE_PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=vertical&per_page=5&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.hits?.[0]?.largeImageURL ? { url: data.hits[0].largeImageURL, kind: "image" } : null;
  } catch { return null; }
}

// ── Per-beat resolution ──────────────────────────────────────────────────────

async function resolveBeat(beat, style, runId) {
  const label  = `b${beat.beat_index}`;
  const minDur = Math.max(2, Math.ceil(beat.duration_seconds ?? 3));

  if (beat.asset_type === "ai_image") {
    const src = await falImageClean(`${beat.image_prompt}, ${style.illustrationStyle}, vertical 9:16 composition`, runId, `${label}-illo`);
    if (src) { beat.asset = { kind: "image", src }; return; }
    beat.asset_type = "none";
    return;
  }

  if (beat.asset_type === "photo") {
    // Real photo of the named subject first — generated likenesses are the
    // weakest frames in AI video
    if (beat.subject_entity) {
      const real = await wikipediaImage(beat.subject_entity, runId, `${label}-real`);
      if (real) { beat.asset = { kind: "image", src: real, real: true }; return; }
    }
    const src = await falImageClean(`${beat.image_prompt}, ${style.photoStyle}, vertical 9:16 composition`, runId, `${label}-photo`);
    if (src) { beat.asset = { kind: "image", src }; return; }
    beat.asset_type = "none";
    return;
  }

  if (beat.asset_type === "cutout") {
    let portrait = null, isReal = false;
    if (beat.subject_entity) {
      portrait = await wikipediaImage(beat.subject_entity, runId, `${label}-real`);
      isReal = !!portrait;
    }
    if (!portrait) {
      portrait = await falImageClean(`${beat.image_prompt}, studio portrait, full subject visible, plain solid light grey background, ${style.photoStyle}`, runId, `${label}-portrait`);
    }
    if (!portrait) { beat.asset_type = "none"; return; }
    const cutout = await falRemoveBackground(portrait, runId, `${label}-cutout`);
    beat.asset = cutout
      ? { kind: "cutout", src: cutout, real: isReal }
      : { kind: "image", src: portrait, real: isReal }; // raw portrait still works framed in a card
    return;
  }

  if (beat.asset_type === "stock_video") {
    const video = (await searchPexelsVideo(beat.shot_query, minDur)) ?? (await searchPixabayVideo(beat.shot_query, minDur));
    if (video) {
      const persisted = await persistRemote(video.url, runId, `${label}-stock`, "video/mp4", "https://pixabay.com/");
      if (persisted) { beat.asset = { kind: "video", src: persisted }; return; }
    }
    const still = await searchPixabayImage(beat.shot_query);
    if (still) {
      const persisted = await persistRemote(still.url, runId, `${label}-still`, "image/jpeg", "https://pixabay.com/");
      beat.asset = { kind: "image", src: persisted ?? still.url };
      return;
    }
    const ai = await falImageClean(`${beat.shot_query}, ${style.photoStyle}, vertical 9:16`, runId, `${label}-aistill`);
    if (ai) { beat.asset = { kind: "image", src: ai }; return; }
    beat.asset_type = "none";
    return;
  }

  // asset_type "none" — the designer builds the entire frame in HTML/CSS
}

/**
 * resolveVisuals(beats, style, runId) — parallel across non-continuation
 * beats; continuation beats then inherit the previous beat's asset so a
 * visual moment can build across multiple cuts on the same backdrop.
 */
export async function resolveVisuals(beats, style, runId) {
  await Promise.all(beats.map(async (beat) => {
    beat.asset = null;
    if (beat.continues_previous) return; // inherits below
    try {
      await resolveBeat(beat, style, runId);
    } catch (e) {
      console.warn(`[prompt/resolve] beat ${beat.beat_index} failed (${e.message}) — HTML-only fallback`);
      beat.asset = null;
      beat.asset_type = "none";
    }
  }));

  // Continuation beats inherit the asset from the beat they extend
  for (let i = 1; i < beats.length; i++) {
    if (!beats[i].continues_previous) continue;
    beats[i].asset      = beats[i - 1].asset;
    beats[i].asset_type = beats[i - 1].asset_type;
  }

  console.log(`[prompt/resolve] ${beats.map(b => `b${b.beat_index}:${b.continues_previous ? "+" : ""}${b.asset_type}${b.asset ? `(${b.asset.kind}${b.asset.real ? "/real" : ""})` : ""}`).join(" ")}`);
  return beats;
}
