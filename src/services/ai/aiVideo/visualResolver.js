/**
 * visualResolver.js
 * src/services/ai/aiVideo/visualResolver.js
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
    console.warn(`[ai-video/resolve] persist failed (${label}):`, e.message);
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
    console.warn(`[ai-video/resolve] fal image error (${label}):`, e.message);
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
    console.warn(`[ai-video/resolve] birefnet error (${label}):`, e.message);
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
    console.warn("[ai-video/resolve] vision text-check failed (accepting image):", e.message);
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
    console.warn(`[ai-video/resolve] ${label}: text detected in generated image (attempt ${i}${i < 2 ? " — regenerating" : " — accepting best effort"})`);
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
    if (persisted) console.log(`[ai-video/resolve] real photo for "${entityName}" via Wikipedia`);
    return persisted;
  } catch (e) {
    console.warn(`[ai-video/resolve] wikipedia lookup failed (${entityName}):`, e.message);
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

// ── Cost-aware sourcing waterfall ────────────────────────────────────────────
// AI image generation is the expensive step. So we resolve in cheap-first order:
//   1. REAL entity photo (Wikipedia) — free, and the strongest frame
//   2. STOCK (Pexels/Pixabay) — free/cheap, for real-world moments
//   3. AI generation — last resort, and CAPPED to a small budget per video
// Anything past the budget downgrades to an HTML/CSS frame (GPT-5.4, which we
// keep) rather than paying for another generation.

const NEEDS_ASSET = new Set(["ai_image", "photo", "cutout", "stock_video"]);

// AI generations allowed per video — ~1 per 12s, clamped to 2–4. (~3 for 30s.)
function aiBudgetFor(totalDuration) {
  return Math.max(2, Math.min(4, Math.round((totalDuration || 30) / 12)));
}

function stockQuery(beat) {
  return (beat.shot_query
    || beat.subject_entity
    || (beat.image_prompt ? beat.image_prompt.split(/[,.]/)[0].split(/\s+/).slice(0, 6).join(" ") : "")
    || beat.content?.headline
    || "").trim();
}

async function stockImage(query, runId, label) {
  if (!query) return null;
  const hit = await searchPixabayImage(query);
  if (!hit) return null;
  const persisted = await persistRemote(hit.url, runId, label, "image/jpeg", "https://pixabay.com/");
  return persisted ?? hit.url;
}

// PHASE 1 — cheap sources only (real entity, then stock). Sets beat.asset when
// satisfied; otherwise flags beat._needsAI so the budgeted phase 2 can decide.
async function resolveFreeSources(beat, style, runId) {
  const label  = `b${beat.beat_index}`;
  const minDur = Math.max(2, Math.ceil(beat.duration_seconds ?? 3));

  // 1) Real entity photo (people, orgs, places, landmarks) — best + free
  if (beat.subject_entity) {
    const real = await wikipediaImage(beat.subject_entity, runId, `${label}-real`);
    if (real) {
      if (beat.asset_type === "cutout") {
        const cut = await falRemoveBackground(real, runId, `${label}-cutout`);
        beat.asset = cut ? { kind: "cutout", src: cut, real: true } : { kind: "image", src: real, real: true };
      } else {
        beat.asset = { kind: "image", src: real, real: true };
      }
      return;
    }
  }

  // 2) Stock — real-world moments. Video for stock_video beats, image otherwise.
  //    ai_image beats are conceptual/stylized (the locked illustration look), so
  //    stock rarely satisfies them — they skip straight to the AI budget.
  if (beat.asset_type === "stock_video") {
    const video = (await searchPexelsVideo(beat.shot_query, minDur)) ?? (await searchPixabayVideo(beat.shot_query, minDur));
    if (video) {
      const p = await persistRemote(video.url, runId, `${label}-stock`, "video/mp4", "https://pixabay.com/");
      if (p) { beat.asset = { kind: "video", src: p }; return; }
    }
  }
  if (beat.asset_type === "photo" || beat.asset_type === "stock_video") {
    const stock = await stockImage(stockQuery(beat), runId, `${label}-stock`);
    if (stock) { beat.asset = { kind: "image", src: stock }; return; }
  }

  // 3) Nothing free satisfied it → candidate for the (capped) AI budget
  beat._needsAI = true;
}

// PHASE 2a — generate (only for budget-granted beats)
async function resolveWithAI(beat, style, runId) {
  const label = `b${beat.beat_index}`;
  if (beat.asset_type === "cutout") {
    const portrait = await falImageClean(`${beat.image_prompt}, studio portrait, full subject visible, plain solid light grey background, ${style.photoStyle}`, runId, `${label}-portrait`);
    if (portrait) {
      const cut = await falRemoveBackground(portrait, runId, `${label}-cutout`);
      beat.asset = cut ? { kind: "cutout", src: cut } : { kind: "image", src: portrait };
      return;
    }
  } else {
    const styleStr  = beat.asset_type === "ai_image" ? style.illustrationStyle : style.photoStyle;
    const promptSrc = beat.image_prompt || beat.shot_query || beat.content?.headline || beat.visual_concept || "";
    const src = await falImageClean(`${promptSrc}, ${styleStr}, vertical 9:16 composition`, runId, `${label}-ai`);
    if (src) { beat.asset = { kind: "image", src }; return; }
  }
  beat.asset = null; beat.asset_type = "none"; // generation failed → HTML frame
}

/**
 * resolveVisuals(beats, style, runId) — two-phase, cost-aware:
 *   PHASE 1 (parallel): real entity → stock for every asset beat.
 *   PHASE 2: the beats still needing an image share a small AI budget
 *            (ai_image beats get first claim); the rest downgrade to HTML.
 * Continuation beats then inherit the asset they extend.
 */
export async function resolveVisuals(beats, style, runId) {
  const totalDur = beats.reduce((a, b) => a + (b.duration_seconds ?? 0), 0);
  const AI_BUDGET = aiBudgetFor(totalDur);

  // PHASE 1 — cheap sources for every asset-bearing beat, in parallel
  await Promise.all(beats.map(async (beat) => {
    beat.asset = null; beat._needsAI = false;
    if (beat.continues_previous || !NEEDS_ASSET.has(beat.asset_type)) return;
    try {
      await resolveFreeSources(beat, style, runId);
    } catch (e) {
      console.warn(`[ai-video/resolve] beat ${beat.beat_index} free-source failed (${e.message})`);
      beat._needsAI = true;
    }
  }));

  // PHASE 2 — spend the AI budget. ai_image beats (a generated shot was the
  // intent) get first claim; everything else falls in beat order.
  const needAI = beats.filter(b => b._needsAI && !b.continues_previous)
    .sort((a, b) => (a.asset_type === "ai_image" ? 0 : 1) - (b.asset_type === "ai_image" ? 0 : 1) || a.beat_index - b.beat_index);
  const grant    = needAI.slice(0, AI_BUDGET);
  const overflow = needAI.slice(AI_BUDGET);
  console.log(`[ai-video/resolve] AI budget ${AI_BUDGET} for ${totalDur.toFixed(0)}s — generating ${grant.length}, ${overflow.length} over budget → HTML frame`);

  await Promise.all(grant.map(b =>
    resolveWithAI(b, style, runId).catch(() => { b.asset = null; b.asset_type = "none"; })));
  for (const b of overflow) { b.asset = null; b.asset_type = "none"; } // cheapest: GPT-5.4 HTML frame

  // Continuation beats inherit the asset from the beat they extend
  for (let i = 1; i < beats.length; i++) {
    if (!beats[i].continues_previous) continue;
    beats[i].asset      = beats[i - 1].asset;
    beats[i].asset_type = beats[i - 1].asset_type;
  }
  for (const b of beats) delete b._needsAI;

  console.log(`[ai-video/resolve] ${beats.map(b => `b${b.beat_index}:${b.continues_previous ? "+" : ""}${b.asset_type}${b.asset ? `(${b.asset.kind}${b.asset.real ? "/real" : ""})` : ""}`).join(" ")}`);
  return beats;
}
