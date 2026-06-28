/**
 * visualResolver.js
 * src/services/ai/promptVideo/visualResolver.js
 *
 * Stage 3 — THE EXECUTOR. It decides nothing: it faithfully fetches EVERY asset the art-director
 * listed for each beat (`beat.assets[]`), via the shared waterfall (entity → stock → library →
 * generate). A beat can have ONE asset (normal scene) or SEVERAL (a list/comparison → multiple real
 * images the designer composes). Free sources are unlimited; only ai_image is bounded by the
 * director's allocation. When a beat resolves to NO assets it becomes a deliberate typographic
 * frame — never a silent empty block.
 *
 * Writes per beat: `resolvedAssets` = [{ kind, src, real?, label }] and `asset` = resolvedAssets[0]
 * (legacy primary). Duplicate images across beats are re-picked so scenes stay distinct.
 */
import { resolveAssets, resolveAsset } from "../shared/assetResolver.js";
import { generateAiImage } from "../shared/aiImage.js";
import { aiImageBudgetFor } from "./artDirector.js";

function libMeta(beat, asset) {
  return {
    niche:        beat.niche,
    visual_type:  beat.visual_type,
    keywords:     beat.keywords,
    intent:       beat.content?.kind ?? null,
    search_query: asset.query || asset.entity || null,
    context:      asset.prompt || beat.visual_concept || null,
  };
}

// One art-director asset → one shared AssetRequest. Only ai_image spends the paid budget.
function toRequest(asset, beat, minDur) {
  const q = (asset.query || asset.entity || (asset.prompt ? asset.prompt.split(/[,.]/)[0] : "") || beat.content?.headline || beat.visual_concept || "").trim();
  const lib = libMeta(beat, asset);
  if (asset.source === "entity" && asset.entity)
    return { asset_type: "entity", entity: asset.entity, stock_query: q, motion: false, minDuration: minDur, gen_prompt: asset.prompt || q, library: lib, priority: 1 };
  if (asset.source === "stock_video")
    return { asset_type: "stock", stock_query: asset.query || q, motion: true, minDuration: minDur, gen_prompt: asset.prompt || asset.query || q, library: lib, priority: 1 };
  if (asset.source === "stock_image")
    return { asset_type: "stock", stock_query: asset.query || q, motion: false, gen_prompt: asset.prompt || q, library: lib, priority: 1 };
  return { asset_type: "ai_image", gen_prompt: asset.prompt || q, library: lib, priority: 0 }; // ai_image
}

/**
 * resolveVisuals(beats, style, runId, orientation) — resolves every asset of every beat, writes
 * resolvedAssets/asset, degrades a no-asset beat to a typographic frame, dedupes repeats, and lets
 * continuation beats inherit. Same signature as before (drop-in for the orchestrator).
 */
export async function resolveVisuals(beats, style, runId, orientation = "9:16") {
  const totalDur = beats.reduce((a, b) => a + (b.duration_seconds ?? 0), 0);
  const aiBudget = aiImageBudgetFor(totalDur);

  // Flatten every (beat, asset) into one request list so the shared waterfall can budget across all.
  const flat = []; // { beatIdx, assetIdx, req, asset }
  beats.forEach((b, beatIdx) => {
    b.resolvedAssets = [];
    b.asset = null;
    if (b.continues_previous) return;
    const minDur = Math.max(2, Math.ceil(b.duration_seconds ?? 3));
    // Multi-image scenes fetch LANDSCAPE tiles so they stack as bands/rows in a vertical video
    // instead of tall slices; a single image fills the frame, so it uses the video orientation.
    const assetOrientation = (b.assets || []).length > 1 ? "16:9" : orientation;
    (b.assets || []).forEach((asset, assetIdx) => {
      flat.push({ beatIdx, assetIdx, asset, req: { ...toRequest(asset, b, minDur), orientation: assetOrientation, _ref: { beat: b, asset }, _label: `b${b.beat_index}a${assetIdx}` } });
    });
  });

  // Service-specific generation (styled illustration / photo) for the ai_image / generate tier.
  const generate = async (req) => {
    const { beat, asset } = req._ref;
    const styleStr  = asset.source === "ai_image" ? style.illustrationStyle : style.photoStyle;
    const promptSrc = asset.prompt || asset.query || beat.content?.headline || beat.visual_concept || "";
    const src = await generateAiImage(`${promptSrc}, ${styleStr}`, { runId, label: `${req._label}-ai`, orientation: req.orientation ?? orientation, noTextGate: true });
    return src ? { src, kind: "image", libraryEligible: true } : null;
  };
  const onEntity = async (src) => ({ src, kind: "image" });

  const results = await resolveAssets(flat.map(f => f.req), {
    runId, orientation, aiBudget, generate, onEntity,
    label: (req) => req._label,
  });

  // Distribute results back to beats, in asset order; drop misses.
  flat.forEach((f, i) => {
    const r = results[i];
    if (!r) return;
    const a = { kind: r.kind, src: r.src, label: f.asset.label || null };
    if (r.real) a.real = true;
    if (r.assetMeta) a.assetMeta = r.assetMeta;
    beats[f.beatIdx].resolvedAssets.push(a);
  });

  // Dedupe images across beats (stock picks randomly → two queries can fetch the same photo).
  const usedSrc = new Set();
  for (let i = 0; i < flat.length; i++) {
    const f = flat[i];
    const beat = beats[f.beatIdx];
    const entry = beat.resolvedAssets.find(a => a.src === results[i]?.src);
    if (!entry) continue;
    if (!usedSrc.has(entry.src)) { usedSrc.add(entry.src); continue; }
    try {
      const alt = await resolveAsset({ ...f.req, _label: `${f.req._label}-dedup` }, { runId, orientation, aiAllowed: false, onEntity });
      if (alt?.src && !usedSrc.has(alt.src)) {
        entry.kind = alt.kind; entry.src = alt.src;
        if (alt.real) entry.real = true; if (alt.assetMeta) entry.assetMeta = alt.assetMeta;
        console.log(`[ai-video/executor] beat ${beat.beat_index} duplicate image → re-picked a distinct one`);
      }
    } catch { /* keep */ }
    usedSrc.add(entry.src);
  }

  // Finalize per beat: primary asset + typographic degrade for a true miss.
  for (const b of beats) {
    if (b.continues_previous) continue;
    if (b.resolvedAssets.length) {
      b.asset = b.resolvedAssets[0];
    } else if ((b.assets || []).length) {
      console.warn(`[ai-video/executor] beat ${b.beat_index} resolved no assets → typographic frame`);
      b.asset = null; b.source = "typographic"; b.asset_type = "none"; b.assets = [];
    }
  }

  // Continuation beats inherit the visual of the beat they extend.
  for (let i = 1; i < beats.length; i++) {
    if (!beats[i].continues_previous) continue;
    beats[i].resolvedAssets = beats[i - 1].resolvedAssets;
    beats[i].asset      = beats[i - 1].asset;
    beats[i].source     = beats[i - 1].source;
    beats[i].asset_type = beats[i - 1].asset_type;
  }

  console.log(`[ai-video/executor] ai≤${aiBudget} for ${totalDur.toFixed(0)}s — ${beats.map(b => `b${b.beat_index}:${b.continues_previous ? "+" : ""}${b.resolvedAssets.length ? b.resolvedAssets.map(a => a.kind).join("+") : "typographic"}`).join(" ")}`);
  return beats;
}
