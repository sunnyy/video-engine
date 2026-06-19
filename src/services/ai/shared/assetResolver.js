/**
 * shared/assetResolver.js — the universal asset waterfall for every video service.
 *
 * GPT picks a STARTING tier per beat/scene; lower tiers are automatic fallbacks:
 *   entity   → real photo (Wikipedia) → stock → library → generate
 *   stock    → stock VIDEO → stock IMAGE → library → generate
 *   ai_image → library → generate            (skips stock; GPT decided neither fits)
 * Generation is the only paid tier and is capped by an AI budget; new generations
 * are saved to ai_image_library for future reuse.
 *
 * Services supply a thin config (generate + optional onEntity) and map their own
 * beats/scenes to AssetRequests and the result back onto their layers.
 *
 * AssetRequest:
 *   asset_type: "entity" | "stock" | "ai_image"
 *   entity?, stock_query?, motion? (stock video-first; default true), minDuration?
 *   noStockFallback?  (entity-miss skips stock → straight to library/generate)
 *   gen_prompt?       (passed to ctx.generate)
 *   library?: { niche, visual_type, keywords[], intent, energy, mood, color_mood, search_query, context }
 *   priority?         (lower = first claim on the AI budget; default 1)
 *   _ref?             (caller's beat/scene; passed back to hooks)
 *
 * ctx:
 *   runId, orientation
 *   label?:    (req,i)=>string
 *   generate:  async (req, ctx) => { src, kind?, width?, height?, libraryEligible? } | null
 *   onEntity?: async (src, req, ctx) => { src, kind } | null   (e.g. cutout from a real photo)
 *   aiBudget?  (batch) / aiAllowed? (single)
 *
 * Result: { src, kind, source, real?, reused?, assetMeta } | null
 */
import { searchStockImage, searchStockVideo, probeImageDims, treatmentFor } from "./stock.js";
import { resolveEntityImage } from "./entityImage.js";
import { findLibraryImage, saveLibraryImage } from "./aiImageLibrary.js";
import { persistRemote } from "./persist.js";

const VIDEO_META = { treatment: "full_bleed", orientation: "portrait", aspect: null };

// Free tiers: entity → stock → library. No generation cost.
async function resolveFreeTiers(req, ctx) {
  const { runId, orientation } = ctx;
  const label = req._label ?? "a";

  // 1. Entity (real photo), optionally transformed (e.g. cutout)
  if (req.asset_type === "entity" && req.entity) {
    const src = await resolveEntityImage(req.entity, { runId, label: `${label}-entity` });
    if (src) {
      if (ctx.onEntity) {
        const t = await ctx.onEntity(src, req, ctx);
        if (t?.src) return { ...t, source: "entity", real: true };
      }
      return { src, kind: "image", source: "entity", real: true };
    }
  }

  // 2. Stock (chosen, or an entity that missed and allows stock fallback)
  if (req.asset_type === "stock" || (req.asset_type === "entity" && !req.noStockFallback)) {
    const query = req.stock_query || req.entity || "";
    if (query) {
      if (req.motion !== false) {
        const v = await searchStockVideo(query, { orientation, minDuration: req.minDuration ?? 2 });
        if (v) {
          const p = await persistRemote(v.url, { runId, label: `${label}-stockvid`, contentType: "video/mp4", referer: "https://pixabay.com/" });
          if (p) return { src: p, kind: "video", source: "stock_video", assetMeta: VIDEO_META };
        }
      }
      const img = await searchStockImage(query, { orientation });
      if (img) {
        const p = await persistRemote(img.url, { runId, label: `${label}-stockimg`, contentType: "image/jpeg", referer: "https://pixabay.com/" });
        return { src: p ?? img.url, kind: "image", source: "stock_image" };
      }
    }
  }

  // 3. Library reuse (free terminal — all tiers)
  if (req.library?.keywords?.length) {
    const hit = await findLibraryImage(req.library, orientation);
    if (hit) return { src: hit.src, kind: "image", source: "library", reused: true };
  }

  return null;
}

// Paid tier: service generate() → save to library if eligible.
async function resolveGenerate(req, ctx) {
  const gen = await ctx.generate?.(req, ctx);
  if (!gen?.src) return null;
  if (gen.libraryEligible && req.library?.keywords?.length) {
    saveLibraryImage({ src: gen.src, prompt: req.gen_prompt, library: req.library, orientation: ctx.orientation, width: gen.width, height: gen.height });
  }
  return { src: gen.src, kind: gen.kind ?? "image", source: "ai_image" };
}

async function withMeta(r) {
  if (r && r.kind === "image" && !r.assetMeta) r.assetMeta = treatmentFor(await probeImageDims(r.src));
  return r;
}

/** Resolve one asset (free tiers, then generate if allowed). */
export async function resolveAsset(req, ctx) {
  const free = await resolveFreeTiers(req, ctx);
  if (free) return withMeta(free);
  if (ctx.aiAllowed === false) return null;
  return withMeta(await resolveGenerate(req, ctx));
}

/**
 * Batch resolve with an AI budget: free tiers for all (parallel), then generate
 * the budget-limited misses (by req.priority, then order). Returns results aligned
 * to `requests`; null entries are over-budget/failed → caller downgrades.
 */
export async function resolveAssets(requests, ctx) {
  const { aiBudget = 0 } = ctx;
  const results = new Array(requests.length).fill(null);
  requests.forEach((r, i) => { r._label = r._label ?? (typeof ctx.label === "function" ? ctx.label(r, i) : `a${i}`); });

  // Phase 1 — free tiers, in parallel
  await Promise.all(requests.map(async (r, i) => {
    try { results[i] = await resolveFreeTiers(r, ctx); }
    catch (e) { console.warn(`[assets] free tier failed (${r._label}):`, e.message); }
  }));

  // Phase 2 — generate misses, budget-limited (priority first, then order)
  const misses = requests.map((r, i) => ({ r, i })).filter(x => !results[x.i]);
  misses.sort((a, b) => (a.r.priority ?? 1) - (b.r.priority ?? 1) || a.i - b.i);
  await Promise.all(misses.slice(0, aiBudget).map(async ({ r, i }) => {
    try { results[i] = await resolveGenerate(r, ctx); }
    catch (e) { console.warn(`[assets] generate failed (${r._label}):`, e.message); }
  }));

  // Phase 3 — shape analysis for image assets (videos already tagged)
  await Promise.all(results.map(withMeta));
  return results;
}
