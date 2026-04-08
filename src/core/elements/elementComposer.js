/**
 * elementComposer.js
 * src/core/elements/elementComposer.js
 *
 * Composes a beat's visual element stack from archetype, energy, content context,
 * and VideoDNA. Returns a flat array of resolved element objects ready for rendering.
 *
 * Each returned element:
 * {
 *   type: string,       // element type key from ELEMENT_TYPES
 *   layer: number,      // 0=bg 1=overlay 2=frame 3=typography 4=decorative
 *   variantId: string,  // selected variant id
 *   ...resolvedProps,   // all variant props with "videoDNA.*" references replaced
 *   x, y, width, height // canvas-percentage position
 * }
 */

import { ELEMENT_TYPES } from "./elementSchema.js";

/* ── Helpers ─────────────────────────────────────────────────── */

function seededRand(seed) {
  // Simple deterministic pseudo-random using seed
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pickVariant(variants, seed) {
  return variants[Math.floor(seededRand(seed) * variants.length)];
}

function chance(probability, seed) {
  return seededRand(seed) < probability;
}

/* ── Context builder ─────────────────────────────────────────── */

function buildContext(beat, beatIndex) {
  const spoken = beat.spoken || "";
  return {
    archetype:      beat.role     || "escalate",
    intent:         beat.intent   || "explanation",
    role:           beat.role     || "escalate",
    energy:         beat.energy   ?? 0.5,
    has_asset:      !!(beat.zones && Object.values(beat.zones).some(
                      z => z.content?.asset?.src
                    )),
    has_stat:       /\d+%|\d+x|\$\d+|\d+k|\d{2,}/i.test(spoken),
    has_single_word: spoken.trim().split(/\s+/).length === 1,
    beat_index:     beatIndex,
    is_last:        !!(beat.isLast || (beat.role === "cta")),
    is_first:       beatIndex === 0,
  };
}

/* ── Trigger / exclude matching ──────────────────────────────── */

const ENERGY_TRIGGERS = {
  high_energy: (ctx) => ctx.energy >= 0.65,
  low_energy:  (ctx) => ctx.energy <= 0.60,
};

// All strings that can appear in triggers/excludes arrays
function matchesTrigger(trigger, ctx) {
  if (trigger === "always")              return true;
  if (trigger === "has_asset")           return ctx.has_asset;
  if (trigger === "has_text_over_asset") return ctx.has_asset;
  if (trigger === "has_single_word")     return ctx.has_single_word;
  if (trigger === "high_energy")         return ctx.energy >= 0.65;
  if (trigger === "low_energy")          return ctx.energy <= 0.60;
  if (trigger === "news")                return ctx.intent === "shock" || ctx.role === "proof";
  if (trigger === "stat")                return ctx.has_stat;
  if (trigger === "brand")               return ctx.role === "cta" || ctx.is_last;
  // Archetype/role matches
  if (trigger === ctx.role)              return true;
  // Intent matches
  if (trigger === ctx.intent)            return true;
  // lifestyle/entertainment/story are intent-adjacent — match via intent
  const intentMap = {
    lifestyle:     ["empathy", "revelation", "curiosity"],
    entertainment: ["punchline", "irony", "shock"],
    story:         ["empathy", "reveal", "contrast"],
    contrast:      ["contrast", "irony"],
    curiosity:     ["curiosity"],
    empathy:       ["empathy"],
    revelation:    ["reveal"],
    explanation:   ["explanation"],
    urgency:       ["urgency"],
  };
  return !!(intentMap[trigger]?.includes(ctx.intent));
}

function isEligible(elementDef, ctx) {
  const { triggers, excludes } = elementDef;
  const hasTrigger = triggers.some(t => matchesTrigger(t, ctx));
  if (!hasTrigger) return false;
  const hasExclude = excludes.some(t => matchesTrigger(t, ctx));
  return !hasExclude;
}

/* ── Hard rules that prune the eligible set ──────────────────── */

function applyHardRules(eligible, ctx) {
  let result = { ...eligible };

  // Energy rules
  if (ctx.energy < 0.75) delete result.checker_pattern;
  if (ctx.energy < 0.60) delete result.star_burst;
  if (ctx.energy > 0.60) delete result.blob_shape;
  if (ctx.energy > 0.50) delete result.wave_shape;
  if (ctx.energy > 0.55) delete result.script_accent;

  // Combination rules
  const hasBlobAndChecker = result.blob_shape && result.checker_pattern;
  if (hasBlobAndChecker) delete result.checker_pattern;

  const hasTornAndChecker = result.torn_edge && result.checker_pattern;
  if (hasTornAndChecker) delete result.checker_pattern;

  const hasWaveAndDiagonal = result.wave_shape && result.diagonal_cut;
  if (hasWaveAndDiagonal) delete result.wave_shape;

  // Polaroid needs asset
  if (!ctx.has_asset && result.polaroid_card) delete result.polaroid_card;

  // arrow_swoosh only on last 2 beats or proof
  if (!ctx.is_last && ctx.role !== "proof" && result.arrow_swoosh) delete result.arrow_swoosh;

  return result;
}

/* ── Pick elements by category ───────────────────────────────── */

function pickBackground(eligible, ctx, prevComps, seed) {
  // Priority: asset_fill (if has_asset) > archetype-specific > noise_gradient fallback
  const candidates = [];

  if (eligible.asset_fill && ctx.has_asset) candidates.push("asset_fill");
  if (eligible.checker_pattern) candidates.push("checker_pattern");
  if (eligible.diagonal_cut)   candidates.push("diagonal_cut");
  if (eligible.blob_shape)      candidates.push("blob_shape");
  if (eligible.solid_color)     candidates.push("solid_color");
  if (eligible.noise_gradient)  candidates.push("noise_gradient");

  if (!candidates.length) return null;

  // Avoid repeating same bg type as previous beat
  const prevBgType = prevComps[prevComps.length - 1]?.find(e => e.layer === 0)?.type;
  const filtered   = candidates.filter(t => t !== prevBgType);
  const pool       = filtered.length ? filtered : candidates;

  const chosen = pool[Math.floor(seededRand(seed) * pool.length)];
  const def    = ELEMENT_TYPES[chosen];

  // Avoid repeating same variant as 2 beats ago
  const prevVariant = prevComps[prevComps.length - 2]?.find(e => e.type === chosen)?.variantId;

  let varPool;
  if (chosen === "noise_gradient") {
    // For text-only beats: never use ng_dark/ng_neutral (both near-black on dark canvas).
    // Always prefer accent-color variants so the background is actually visible.
    if (!ctx.has_asset) {
      const accentVariants = def.variants.filter(v => v.id === "ng_accent" || v.id === "ng_warm");
      varPool = accentVariants.length ? accentVariants : def.variants;
    } else {
      varPool = def.variants.filter(v => v.id !== prevVariant);
      if (!varPool.length) varPool = def.variants;
    }
  } else {
    const noRepeat = def.variants.filter(v => v.id !== prevVariant);
    varPool = noRepeat.length ? noRepeat : def.variants;
  }

  const variant = varPool[Math.floor(seededRand(seed + 1) * varPool.length)];
  return { type: chosen, def, variant };
}

function pickOverlays(eligible, ctx, seed) {
  const overlays = [];

  // noise_texture only
  if (eligible.noise_texture) {
    const def     = ELEMENT_TYPES.noise_texture;
    const variant = ctx.energy >= 0.7 ? def.variants[1] : def.variants[0];
    overlays.push({ type: "noise_texture", def, variant });
  }

  return overlays;
}

function pickFrame(eligible, ctx, prevComps, seed) {
  // Max 1 frame (rule: no_double_frame)
  const candidates = [];
  if (eligible.inset_frame)   candidates.push("inset_frame");
  if (eligible.ticker_bar)    candidates.push("ticker_bar");
  if (eligible.torn_edge)     candidates.push("torn_edge");
  if (eligible.polaroid_card) candidates.push("polaroid_card");

  if (!candidates.length) return null;

  // Avoid repeating frame within 3 beats
  const recentFrameTypes = prevComps.slice(-3)
    .flatMap(comp => comp || [])
    .filter(e => e.layer === 2)
    .map(e => e.type);

  const pool = candidates.filter(t => !recentFrameTypes.includes(t));
  if (!pool.length) return null; // skip if all recently used

  // Only pick frame with 45% probability (not every beat)
  if (!chance(0.45, seed + 20)) return null;

  const chosen  = pool[Math.floor(seededRand(seed + 21) * pool.length)];
  const def     = ELEMENT_TYPES[chosen];
  const variant = pickVariant(def.variants, seed + 22);
  return { type: chosen, def, variant };
}

function pickTypography(eligible, ctx, prevComps, seed) {
  const elements = [];

  // hero_word: only for high-impact beats, max 1
  if (eligible.hero_word && chance(0.55, seed + 30)) {
    const def     = ELEMENT_TYPES.hero_word;
    const prevVar = prevComps[prevComps.length - 1]?.find(e => e.type === "hero_word")?.variantId;
    const variants = def.variants.filter(v => v.id !== prevVar);
    const variant  = pickVariant(variants.length ? variants : def.variants, seed + 31);
    elements.push({ type: "hero_word", def, variant });
  }

  // label_badge: always present — core brand element every beat
  if (eligible.label_badge && chance(0.92, seed + 32)) {
    const def     = ELEMENT_TYPES.label_badge;
    const prevVar = prevComps[prevComps.length - 1]?.find(e => e.type === "label_badge")?.variantId;
    const variants = def.variants.filter(v => v.id !== prevVar);
    const variant  = pickVariant(variants.length ? variants : def.variants, seed + 33);
    elements.push({ type: "label_badge", def, variant });
  }

  // circle_badge: hook/cta only
  if (eligible.circle_badge && chance(0.30, seed + 34) && elements.length < 3) {
    const def = ELEMENT_TYPES.circle_badge;
    // Avoid corner collision with label_badge
    const badgePos = elements.find(e => e.type === "label_badge")?.variant?.position;
    const variants = def.variants.filter(v => v.position !== badgePos);
    if (variants.length) {
      elements.push({ type: "circle_badge", def, variant: pickVariant(variants, seed + 35) });
    }
  }

  return elements.slice(0, 3); // max 3 typography (rule: max_typography)
}

function pickDecoratives(eligible, ctx, prevComps, seed) {
  const elements = [];
  const usedCorners = new Set();

  // star_burst: high energy — increase probability so it actually shows
  if (eligible.star_burst && chance(0.80, seed + 40)) {
    const def      = ELEMENT_TYPES.star_burst;
    const prevVar  = prevComps[prevComps.length - 1]?.find(e => e.type === "star_burst")?.variantId;
    const variants = def.variants.filter(v => v.id !== prevVar && !usedCorners.has(v.position));
    const pool     = variants.length ? variants : def.variants.filter(v => !usedCorners.has(v.position));
    if (pool.length) {
      const variant = pickVariant(pool, seed + 41);
      elements.push({ type: "star_burst", def, variant });
      usedCorners.add(variant.position);
    }
  }

  // dot_grid: proof/explanation/visual_rest — always try to add
  if (eligible.dot_grid && elements.length < 2 && chance(0.70, seed + 42)) {
    const def     = ELEMENT_TYPES.dot_grid;
    const variants = def.variants.filter(v => !usedCorners.has(v.position));
    if (variants.length) {
      const variant = pickVariant(variants, seed + 43);
      elements.push({ type: "dot_grid", def, variant });
      usedCorners.add(variant.position);
    }
  }

  // corner_accent: almost always on all beats — provides visual framing
  if (eligible.corner_accent && elements.length < 2 && chance(0.75, seed + 46)) {
    const def     = ELEMENT_TYPES.corner_accent;
    const variants = def.variants.filter(v => !usedCorners.has(v.corner));
    if (variants.length) {
      const variant = pickVariant(variants, seed + 47);
      elements.push({ type: "corner_accent", def, variant });
      usedCorners.add(variant.corner);
    }
  }

  // line_accent: wide variety of beats — always try if room
  if (eligible.line_accent && elements.length < 2 && chance(0.65, seed + 44)) {
    const def      = ELEMENT_TYPES.line_accent;
    const prevVar  = prevComps[prevComps.length - 1]?.find(e => e.type === "line_accent")?.variantId;
    const variants = def.variants.filter(v => v.id !== prevVar);
    elements.push({ type: "line_accent", def, variant: pickVariant(variants.length ? variants : def.variants, seed + 45) });
  }

  // sparkle: lifestyle/entertainment/cta
  const hasAnimated = elements.some(e => e.type === "sparkle" || e.type === "circle_badge");
  if (eligible.sparkle && !hasAnimated && elements.length < 2 && chance(0.55, seed + 48)) {
    const def = ELEMENT_TYPES.sparkle;
    elements.push({ type: "sparkle", def, variant: pickVariant(def.variants, seed + 49) });
  }

  // wave_shape: lifestyle/empathy
  if (eligible.wave_shape && elements.length < 2 && chance(0.55, seed + 50)) {
    const def = ELEMENT_TYPES.wave_shape;
    elements.push({ type: "wave_shape", def, variant: pickVariant(def.variants, seed + 51) });
  }

  // arrow_swoosh: cta/last beats
  if (eligible.arrow_swoosh && elements.length < 2 && chance(0.65, seed + 52)) {
    const def = ELEMENT_TYPES.arrow_swoosh;
    elements.push({ type: "arrow_swoosh", def, variant: pickVariant(def.variants, seed + 53) });
  }

  return elements.slice(0, 2); // max 2 decoratives (rule: max_decoratives)
}

/* ── Color resolver ──────────────────────────────────────────── */

function resolveColorRef(val, videoDNA) {
  if (typeof val !== "string") return val;
  if (!val.startsWith("videoDNA.")) return val;
  const key = val.replace("videoDNA.", "");
  return videoDNA[key] || videoDNA.primary || "#7c5cfc";
}

function resolveVariantColors(variant, videoDNA) {
  const resolved = {};
  for (const [k, v] of Object.entries(variant)) {
    if (Array.isArray(v)) {
      resolved[k] = v.map(item => resolveColorRef(item, videoDNA));
    } else {
      resolved[k] = resolveColorRef(v, videoDNA);
    }
  }
  return resolved;
}

/* ── Position resolver ───────────────────────────────────────── */

const CORNER_POSITIONS = {
  "top-right":    { x: 78, y: 3,  width: 20, height: 28 },
  "top-left":     { x: 2,  y: 3,  width: 20, height: 28 },
  "bottom-right": { x: 78, y: 70, width: 20, height: 27 },
  "bottom-left":  { x: 2,  y: 70, width: 20, height: 27 },
  "top":          { x: 0,  y: 0,  width: 100, height: 14 },
  "bottom":       { x: 0,  y: 86, width: 100, height: 14 },
  "left":         { x: 0,  y: 10, width: 14,  height: 80 },
  "right":        { x: 86, y: 10, width: 14,  height: 80 },
  "center":       { x: 0,  y: 0,  width: 100, height: 100 },
  "full":         { x: 0,  y: 0,  width: 100, height: 100 },
};

const FULL_CANVAS = { x: 0, y: 0, width: 100, height: 100 };

function getPosition(type, variant) {
  // Full-canvas elements
  const FULL_CANVAS_TYPES = ["background", "overlay"];
  const def = ELEMENT_TYPES[type];
  if (def && (def.category === "background" || def.category === "overlay")) {
    return FULL_CANVAS;
  }

  // Position from variant
  const pos = variant.position || variant.corner;
  if (pos && CORNER_POSITIONS[pos]) return CORNER_POSITIONS[pos];

  // frame-specific positions
  if (type === "inset_frame")  return FULL_CANVAS;
  if (type === "polaroid_card") return { x: 10, y: 15, width: 80, height: 70 };
  if (type === "torn_edge") {
    if (variant.position === "bottom") return { x: 0, y: 82, width: 100, height: 18 };
    return { x: 0, y: 0, width: 100, height: 18 };
  }
  if (type === "ticker_bar") {
    if (variant.position === "top") return { x: 0, y: 0, width: 100, height: 8 };
    return { x: 0, y: 92, width: 100, height: 8 };
  }

  // Typography
  if (type === "hero_word")    return { x: 0, y: 25, width: 100, height: 50 };
  if (type === "label_badge") {
    const pMap = {
      "top-left":    { x: 3, y: 5,  width: 40, height: 8  },
      "top-right":   { x: 57, y: 5, width: 40, height: 8  },
      "bottom-left": { x: 3, y: 87, width: 40, height: 8  },
    };
    return pMap[variant.position] || { x: 3, y: 5, width: 40, height: 8 };
  }
  if (type === "script_accent") return { x: 5, y: 55, width: 90, height: 15 };
  if (type === "circle_badge") {
    return CORNER_POSITIONS[variant.position] || { x: 78, y: 3, width: 18, height: 28 };
  }
  if (type === "outline_text") return { x: 0, y: 20, width: 100, height: 60 };

  // Decoratives
  if (type === "line_accent") {
    const lMap = {
      "top":    { x: 0,  y: 0,  width: 100, height: 2 },
      "bottom": { x: 0,  y: 98, width: 100, height: 2 },
      "left":   { x: 0,  y: 0,  width: 2,   height: 100 },
      "center": { x: 15, y: 48, width: 70,  height: 2 },
    };
    return lMap[variant.position] || { x: 0, y: 0, width: 100, height: 2 };
  }
  if (type === "wave_shape") {
    if (variant.position === "bottom") return { x: 0, y: 80, width: 100, height: 20 };
    return { x: 0, y: 0, width: 100, height: 20 };
  }
  if (type === "dot_grid") {
    if (variant.position === "full") return FULL_CANVAS;
    return CORNER_POSITIONS[variant.position] || { x: 75, y: 3, width: 23, height: 35 };
  }
  if (type === "sparkle")      return FULL_CANVAS;
  if (type === "arrow_swoosh") return { x: 40, y: 72, width: 20, height: 20 };
  if (type === "corner_accent") {
    const caMap = {
      "top-left":     { x: 2,  y: 2,  width: 8, height: 12 },
      "top-right":    { x: 90, y: 2,  width: 8, height: 12 },
      "bottom-left":  { x: 2,  y: 88, width: 8, height: 10 },
      "bottom-right": { x: 90, y: 88, width: 8, height: 10 },
    };
    return caMap[variant.corner] || { x: 2, y: 2, width: 8, height: 12 };
  }

  return FULL_CANVAS;
}

/* ── Derive videoDNA surface + secondary from base colorStory ── */

function hexToRgb(hex) {
  const h = (hex || "#000").replace("#", "");
  if (h.length === 3) {
    return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
  }
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function lighten(hex, amount = 30) {
  const [r,g,b] = hexToRgb(hex);
  const clamp = v => Math.min(255, Math.max(0, v));
  return `#${[clamp(r+amount),clamp(g+amount),clamp(b+amount)].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
}

function buildVideoDNA(dna, brandColor) {
  const cs = dna?.colorStory || {};
  const bg      = cs.bg      || "#0a0a0a";
  const primary = brandColor || cs.primary || "#7c5cfc";
  const surface = lighten(bg, 20);
  // Derive secondary as a shifted version of primary (just lighten for now)
  const secondary = lighten(primary, 40);
  return {
    bg,
    surface,
    primary,
    secondary,
    text:      cs.text || "#ffffff",
    accent:    primary,
    textMuted: "#9494a8",
  };
}

/* ── Visual rest: enforce minimal rule ──────────────────────── */

function applyVisualRestRule(elements, ctx) {
  if (ctx.role !== "visual_rest") return elements;
  // max 3 total elements
  return elements.slice(0, 3);
}

/* ── Main export ─────────────────────────────────────────────── */

/**
 * Compose a beat's visual element stack.
 *
 * @param {object} params
 * @param {object} params.beat                   - Beat data
 * @param {object} params.dna                    - DNA from generateVideoDNA()
 * @param {string} [params.brandColor]           - Optional brand color override
 * @param {number} params.beatIndex              - Beat position index
 * @param {Array}  [params.previousCompositions] - Compositions of previous beats
 * @returns {Array} Resolved element objects sorted by layer
 */
export function composeBeat({ beat, dna, brandColor = null, beatIndex, previousCompositions = [] }) {
  const ctx      = buildContext(beat, beatIndex);
  const videoDNA = buildVideoDNA(dna, brandColor);
  const seed     = beatIndex * 137 + (ctx.energy * 100);

  // 1. Get eligible elements (passes trigger/exclude checks)
  const eligible = {};
  for (const [type, def] of Object.entries(ELEMENT_TYPES)) {
    if (isEligible(def, ctx)) eligible[type] = def;
  }

  // 2. Apply hard rules (remove incompatible elements)
  const filtered = applyHardRules(eligible, ctx);

  // 3. Pick elements by category
  const bgPick   = pickBackground(filtered, ctx, previousCompositions, seed);
  const overlays = pickOverlays(filtered, ctx, seed);
  const framePick = pickFrame(filtered, ctx, previousCompositions, seed);
  const typoPicks = pickTypography(filtered, ctx, previousCompositions, seed);
  const decoPicks = pickDecoratives(filtered, ctx, previousCompositions, seed);

  // 4. Assemble raw list
  const rawList = [
    ...(bgPick    ? [bgPick]   : []),
    ...overlays,
    ...(framePick ? [framePick]: []),
    ...typoPicks,
    ...decoPicks,
  ];

  // 5. Resolve colors + positions
  const resolved = rawList.map(({ type, def, variant }) => {
    const resolvedVariant = resolveVariantColors(variant, videoDNA);
    const position        = getPosition(type, variant);
    return {
      type,
      layer:     def.layer,
      variantId: variant.id,
      ...resolvedVariant,
      ...position,
    };
  });

  // 6. Enforce visual_rest minimal rule
  const final = applyVisualRestRule(resolved, ctx);

  // Sort by layer so backgrounds render first
  return final.sort((a, b) => a.layer - b.layer);
}
