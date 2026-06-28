/**
 * visualResolver.js
 * src/services/ai/promptVideo/visualResolver.js
 *
 * Stage 3 — THE EXECUTOR. It does NOT decide anything: it faithfully fetches the asset the
 * art-director specified per beat (`beat.source` + its query), via the shared waterfall
 * (entity → stock → library → generate). Free sources are UNLIMITED; only `ai_image` is bounded by
 * the director's allocation (a hard COGS ceiling). When a beat genuinely resolves to nothing, it
 * becomes a DELIBERATE full typographic frame (the designer fills it) — never a silent empty block.
 *
 *   entity       → real photo (Wikipedia) → stock → library → generate
 *   stock_image  → stock image → library → generate
 *   stock_video  → stock video → stock image → library → generate
 *   ai_image     → library → generate (paid; only where the director allocated it)
 *   typographic  → no asset; the designer composes a full frame
 */
import { resolveAssets, resolveAsset } from "../shared/assetResolver.js";
import { generateAiImage } from "../shared/aiImage.js";
import { aiImageBudgetFor } from "./artDirector.js";

// Sources that need a fetched asset (typographic needs none).
const NEEDS_ASSET = new Set(["entity", "stock_image", "stock_video", "ai_image"]);

function stockQuery(beat) {
  return (beat.shot_query
    || beat.subject_entity
    || (beat.image_prompt ? beat.image_prompt.split(/[,.]/)[0].split(/\s+/).slice(0, 6).join(" ") : "")
    || beat.content?.headline
    || beat.visual_concept
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

// Art-director directive (beat.source) → shared AssetRequest. The shared waterfall handles each
// source's internal free fallbacks; only ai_image is allowed to spend the paid budget.
function toRequest(beat) {
  const lib    = libMeta(beat);
  const minDur = Math.max(2, Math.ceil(beat.duration_seconds ?? 3));
  const q      = stockQuery(beat);

  if (beat.source === "entity" && beat.subject_entity)
    return { asset_type: "entity", entity: beat.subject_entity, stock_query: q, motion: false, minDuration: minDur, gen_prompt: beat.image_prompt || q, library: lib, priority: 1, _ref: beat };
  if (beat.source === "stock_video")
    return { asset_type: "stock", stock_query: beat.shot_query || q, motion: true, minDuration: minDur, gen_prompt: beat.image_prompt || beat.shot_query || q, library: lib, priority: 1, _ref: beat };
  if (beat.source === "stock_image")
    return { asset_type: "stock", stock_query: beat.shot_query || q, motion: false, gen_prompt: beat.image_prompt || q, library: lib, priority: 1, _ref: beat };
  // ai_image — the only paid-first source; gets first claim on the generation budget.
  return { asset_type: "ai_image", gen_prompt: beat.image_prompt || q, library: lib, priority: 0, _ref: beat };
}

/**
 * resolveVisuals(beats, style, runId, orientation) — executes each beat's directive, writes
 * beat.asset, degrades a true miss to a deliberate full typographic frame, and lets continuation
 * beats inherit the visual they extend. Same signature as before (drop-in for the orchestrator).
 */
export async function resolveVisuals(beats, style, runId, orientation = "9:16") {
  const totalDur = beats.reduce((a, b) => a + (b.duration_seconds ?? 0), 0);
  // The paid ceiling. The art-director already capped its ai_image picks to this; here it also lets
  // a rare free miss fall through to one generated image rather than an empty frame.
  const aiBudget = aiImageBudgetFor(totalDur);
  beats.forEach(b => { b.asset = null; });

  const assetBeats = beats.filter(b => !b.continues_previous && NEEDS_ASSET.has(b.source));
  const requests   = assetBeats.map(toRequest);

  const generate = async (req) => {
    const beat = req._ref, label = req._label;
    const styleStr  = beat.source === "ai_image" ? style.illustrationStyle : style.photoStyle;
    const promptSrc = beat.image_prompt || beat.shot_query || beat.content?.headline || beat.visual_concept || "";
    const src = await generateAiImage(`${promptSrc}, ${styleStr}`, { runId, label: `${label}-ai`, orientation, noTextGate: true });
    return src ? { src, kind: "image", libraryEligible: true } : null;
  };

  const onEntity = async (src) => ({ src, kind: "image" });

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
      // No asset resolved anywhere — this is the directive's graceful fallback: a DELIBERATE full
      // typographic frame the designer fills. Logged, never a silent empty color block.
      console.warn(`[ai-video/executor] beat ${b.beat_index} (${b.source}) resolved no asset → full typographic frame`);
      b.asset = null;
      b.source = "typographic";
      b.asset_type = "none";
      b.layout = "full";
    }
  });

  // Dedupe: stock picks RANDOMLY from a pool, so two similar queries can fetch the SAME photo
  // (e.g. two "roman statue" beats → identical image). For any beat whose image repeats an earlier
  // one, re-resolve once on the FREE tiers only (different random pick) to keep scenes distinct.
  const usedSrc = new Set();
  for (let i = 0; i < assetBeats.length; i++) {
    const b = assetBeats[i];
    if (!b.asset?.src) continue;
    if (!usedSrc.has(b.asset.src)) { usedSrc.add(b.asset.src); continue; }
    try {
      const alt = await resolveAsset({ ...requests[i], _label: `${requests[i]._label}-dedup` }, { runId, orientation, aiAllowed: false, onEntity });
      if (alt?.src && !usedSrc.has(alt.src)) {
        b.asset = { kind: alt.kind, src: alt.src, ...(alt.real ? { real: true } : {}), ...(alt.assetMeta ? { assetMeta: alt.assetMeta } : {}) };
        console.log(`[ai-video/executor] beat ${b.beat_index} duplicate image → re-picked a distinct one`);
      }
    } catch { /* keep original on failure */ }
    usedSrc.add(b.asset.src);
  }

  // Continuation beats inherit the visual (and its layout/source) of the beat they extend.
  for (let i = 1; i < beats.length; i++) {
    if (!beats[i].continues_previous) continue;
    beats[i].asset      = beats[i - 1].asset;
    beats[i].source     = beats[i - 1].source;
    beats[i].asset_type = beats[i - 1].asset_type;
    beats[i].layout     = beats[i - 1].layout;
  }

  console.log(`[ai-video/executor] ai≤${aiBudget} for ${totalDur.toFixed(0)}s — ${beats.map(b => `b${b.beat_index}:${b.continues_previous ? "+" : ""}${b.source}${b.asset ? `(${b.asset.kind}${b.asset.real ? "/real" : ""})` : ""}`).join(" ")}`);
  return beats;
}
