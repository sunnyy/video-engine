/**
 * visualResolver.js
 * src/services/ai/promptVideo/visualResolver.js
 *
 * Stage 3 — resolves every beat's visual via the shared asset waterfall
 * (entity → stock → ai_image_library → generate), capped by an AI budget.
 * This file only maps AI Video's beat taxonomy to AssetRequests and supplies the
 * service-specific generation (cutout / styled illustration / photo). All the
 * sourcing, reuse, persistence and shape analysis live in shared/.
 *
 *   ai_image  → styled illustration (locked style string)
 *   photo     → real photo (entity) → stock → generated photo
 *   cutout    → real/generated portrait → birefnet bg-removal → transparent PNG
 *   stock_video → stock clip → stock image → generated photo
 *
 * Over-budget or failed beats downgrade to "none" → GPT-5.4 HTML frame.
 */
import { resolveAssets } from "../shared/assetResolver.js";
import { generateAiImage, removeBackground } from "../shared/aiImage.js";

const NEEDS_ASSET = new Set(["ai_image", "photo", "cutout", "stock_video"]);

// AI generations allowed per video — ~1 per 12s, clamped to 2–4.
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

function libMeta(beat) {
  return {
    niche:        beat.niche,
    visual_type:  beat.visual_type,
    keywords:     beat.keywords,
    intent:       beat.content?.kind ?? null,
    search_query: beat.shot_query ?? null,
    context:      beat.image_prompt ?? beat.visual_concept ?? null,
  };
}

// AI Video beat → shared AssetRequest.
function toRequest(beat) {
  const lib    = libMeta(beat);
  const minDur = Math.max(2, Math.ceil(beat.duration_seconds ?? 3));

  if (beat.subject_entity) {
    return {
      asset_type: "entity", entity: beat.subject_entity, stock_query: stockQuery(beat),
      motion: beat.asset_type === "stock_video", minDuration: minDur,
      noStockFallback: beat.asset_type === "cutout",       // cutouts can't use a flat stock photo
      gen_prompt: beat.image_prompt,
      library: beat.asset_type === "cutout" ? null : lib,  // cutouts aren't reusable
      priority: 1, _ref: beat,
    };
  }
  if (beat.asset_type === "stock_video")
    return { asset_type: "stock", stock_query: beat.shot_query, motion: true, minDuration: minDur, gen_prompt: beat.image_prompt, library: lib, priority: 1, _ref: beat };
  if (beat.asset_type === "photo")
    return { asset_type: "stock", stock_query: stockQuery(beat), motion: false, gen_prompt: beat.image_prompt, library: lib, priority: 1, _ref: beat };

  // ai_image (conceptual) or cutout without an entity — skip stock, go library→generate.
  return {
    asset_type: "ai_image",
    gen_prompt: beat.image_prompt || beat.shot_query || beat.content?.headline || beat.visual_concept || "",
    library: beat.asset_type === "cutout" ? null : lib,
    priority: beat.asset_type === "ai_image" ? 0 : 1,     // ai_image beats get first claim on the budget
    _ref: beat,
  };
}

/**
 * resolveVisuals(beats, style, runId, orientation) — maps beats → requests, runs
 * the shared waterfall (budgeted), writes beat.asset, and lets continuation beats
 * inherit the asset they extend.
 */
export async function resolveVisuals(beats, style, runId, orientation = "9:16") {
  const totalDur = beats.reduce((a, b) => a + (b.duration_seconds ?? 0), 0);
  const aiBudget = aiBudgetFor(totalDur);
  beats.forEach(b => { b.asset = null; });

  const assetBeats = beats.filter(b => !b.continues_previous && NEEDS_ASSET.has(b.asset_type));
  const requests   = assetBeats.map(toRequest);

  // Service-specific generation (cutout / styled illustration / photo).
  const generate = async (req) => {
    const beat = req._ref, label = req._label;
    if (beat.asset_type === "cutout") {
      const portrait = await generateAiImage(
        `${beat.image_prompt}, studio portrait, full subject visible, plain solid light grey background, ${style.photoStyle}`,
        { runId, label: `${label}-portrait`, orientation, noTextGate: true });
      if (!portrait) return null;
      const cut = await removeBackground(portrait, { runId, label: `${label}-cutout` });
      return { src: cut ?? portrait, kind: cut ? "cutout" : "image", libraryEligible: false };
    }
    const styleStr  = beat.asset_type === "ai_image" ? style.illustrationStyle : style.photoStyle;
    const promptSrc = beat.image_prompt || beat.shot_query || beat.content?.headline || beat.visual_concept || "";
    const src = await generateAiImage(`${promptSrc}, ${styleStr}`, { runId, label: `${label}-ai`, orientation, noTextGate: true });
    return src ? { src, kind: "image", libraryEligible: true } : null;
  };

  // Transform a resolved real-entity photo (cutout beats → transparent PNG).
  const onEntity = async (src, req) => {
    const beat = req._ref;
    if (beat.asset_type === "cutout") {
      const cut = await removeBackground(src, { runId, label: `${req._label}-cutout` });
      return { src: cut ?? src, kind: cut ? "cutout" : "image" };
    }
    return { src, kind: "image" };
  };

  const results = await resolveAssets(requests, {
    runId, orientation, aiBudget, generate, onEntity,
    label: (req) => `b${req._ref.beat_index}`,
  });

  assetBeats.forEach((b, i) => {
    const r = results[i];
    if (r) {
      b.asset = { kind: r.kind, src: r.src };
      if (r.real) b.asset.real = true;
      if (r.assetMeta) b.asset.assetMeta = r.assetMeta;
    } else {
      b.asset = null; b.asset_type = "none"; // cheapest downgrade: GPT-5.4 HTML frame
    }
  });

  // Continuation beats inherit the asset from the beat they extend.
  for (let i = 1; i < beats.length; i++) {
    if (!beats[i].continues_previous) continue;
    beats[i].asset      = beats[i - 1].asset;
    beats[i].asset_type = beats[i - 1].asset_type;
  }

  console.log(`[ai-video/resolve] budget ${aiBudget} for ${totalDur.toFixed(0)}s — ${beats.map(b => `b${b.beat_index}:${b.continues_previous ? "+" : ""}${b.asset_type}${b.asset ? `(${b.asset.kind}${b.asset.real ? "/real" : ""})` : ""}`).join(" ")}`);
  return beats;
}
