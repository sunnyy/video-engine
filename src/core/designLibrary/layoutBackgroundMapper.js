/**
 * layoutBackgroundMapper.js
 * src/core/designLibrary/layoutBackgroundMapper.js
 *
 * Maps each layout to appropriate background types from backgroundPatternRegistry.
 * Returns a resolved background entry for a given beat + layout + videoDNA.
 */

import {
  backgroundPatternRegistry,
  backgroundCategories,
  getBackgroundForIntent,
} from "../backgroundPatternRegistry";

/* ── Layout type classification ─────────────────────────────── */

/**
 * Classify a layout by how many asset zones it has and their coverage.
 * Returns: "text_only" | "asset_dominant" | "split" | "collage"
 */
function classifyLayout(layoutDef) {
  if (!layoutDef) return "text_only";

  const zones = layoutDef.zones || [];
  const assetZones = zones.filter(z => z.type === "asset");
  const assetCount = assetZones.length;

  if (assetCount === 0) return "text_only";

  // Check if any asset zone is full-bleed (>= 70% width and height)
  const isFullBleed = assetZones.some(z =>
    (z.width  >= 70 && z.height >= 70) ||
    (z.width  >= 85) ||
    (z.height >= 85)
  );
  if (isFullBleed) return "asset_dominant";

  if (assetCount >= 3) return "collage";

  return "split";
}

/* ── Background rules per layout type ──────────────────────── */
const LAYOUT_BACKGROUND_RULES = {
  text_only: {
    allowed_categories: ["bright", "gradient", "neon", "pattern", "light"],
    preferred_energy_match: true,
    brightness_prefer: null,
  },
  asset_dominant: {
    // Dark bg so asset pops; gradient preferred for visual richness
    allowed_categories: ["gradient", "bright", "neon"],
    preferred_energy_match: false,
    brightness_prefer: "dark",
  },
  split: {
    allowed_categories: ["bright", "gradient", "pattern", "light"],
    preferred_energy_match: true,
    brightness_prefer: null,
  },
  collage: {
    allowed_categories: ["bright", "gradient"],
    preferred_energy_match: false,
    brightness_prefer: "dark",
  },
};

/* ── Intent → background intent alias ──────────────────────── */
const INTENT_BG_MAP = {
  hook:        "shock",
  cta:         "urgency",
  proof:       "proof",
  reveal:      "reveal",
  stat:        "proof",
  explanation: "explanation",
  empathy:     "empathy",
  curiosity:   "curiosity",
  contrast:    "contrast",
  urgency:     "urgency",
  shock:       "shock",
  punchline:   "punchline",
  irony:       "irony",
  visual_rest: "explanation",
  list:        "proof",
  testimonial: "empathy",
  escalate:    "urgency",
};

/* ── Energy bucket ──────────────────────────────────────────── */
function energyBucket(energy) {
  if (energy >= 0.75) return "high";
  if (energy >= 0.4)  return "medium";
  return "low";
}

/* ── Brand color proximity ──────────────────────────────────── */
// Simple heuristic: if brand color is dark, prefer dark bgs, and vice versa
function hexLuminance(hex) {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const toL = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
  } catch {
    return 0.2;
  }
}

/**
 * Pick an appropriate background for a layout + beat + videoDNA.
 * Returns { key, ...backgroundEntry }
 */
export function pickLayoutBackground(layoutDef, beat, videoDNA) {
  const layoutType = classifyLayout(layoutDef);
  const rules      = LAYOUT_BACKGROUND_RULES[layoutType] || LAYOUT_BACKGROUND_RULES.text_only;
  const intent     = beat?.intent || "explanation";
  const energy     = beat?.energy ?? 0.5;
  const bucket     = energyBucket(energy);
  const bgIntent   = INTENT_BG_MAP[intent] || "explanation";

  // Determine preferred brightness
  let preferBrightness = rules.brightness_prefer;
  if (!preferBrightness && rules.preferred_energy_match) {
    // High energy → dark or mid backgrounds for contrast
    preferBrightness = bucket === "high" ? null : (bucket === "low" ? "light" : null);
  }

  // Brand color: if dark bg is better for brand, enforce dark
  if (videoDNA?.colorStory?.bg) {
    const bgLum = hexLuminance(videoDNA.colorStory.bg);
    if (bgLum < 0.08) preferBrightness = "dark"; // brand is very dark
  }

  // Build candidate pool from allowed categories
  let candidates = [];
  for (const cat of rules.allowed_categories) {
    const keys = backgroundCategories[cat] || [];
    for (const key of keys) {
      const entry = backgroundPatternRegistry[key];
      if (!entry) continue;

      // Energy match: high energy → high energy backgrounds
      if (bucket === "high" && entry.energy === "low") continue;
      if (bucket === "low"  && entry.energy === "high") continue;

      // Intent match (loose — just filter out badly mismatched)
      // Accept if intent is listed OR if the entry has no specific intent filter
      const intentMatch = !entry.intent || entry.intent.includes(bgIntent) || entry.intent.length === 0;

      // Brightness match
      const brightnessMatch = !preferBrightness || entry.brightness === preferBrightness;

      if (brightnessMatch) candidates.push(key);
    }
  }

  // Fallback: just use intent-based picker
  if (!candidates.length) {
    return getBackgroundForIntent(bgIntent, preferBrightness);
  }

  // Deterministic pick: use beat id as seed
  let seed = 0;
  const seedStr = beat?.id || `${intent}_${energy}`;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const chosen = candidates[seed % candidates.length];

  return { key: chosen, ...backgroundPatternRegistry[chosen] };
}

/**
 * Resolves a full layoutBackground object for a beat.
 * Returns in the format beat.layoutBackground already understands.
 */
export function resolveLayoutBackground(layoutDef, beat, videoDNA) {
  const bg = pickLayoutBackground(layoutDef, beat, videoDNA);
  return {
    type:  "pattern",
    value: bg.key,
    style: bg.style,
  };
}
