/**
 * src/core/layouts/index.js
 * Master layout registry — combines all intent-based layout pools.
 *
 * Usage:
 *   import { getLayoutsByIntent, getLayoutById, ALL_LAYOUTS } from "./layouts";
 */

import hookLayouts         from "./hook/index.js";
import escalateLayouts     from "./escalate/index.js";
import ctaLayouts          from "./cta/index.js";
import proofLayouts        from "./proof/index.js";
import revealLayouts       from "./reveal/index.js";
import visualRestLayouts   from "./visual_rest/index.js";
import statLayouts         from "./stat/index.js";
import explanationLayouts  from "./explanation/index.js";
import testimonialLayouts  from "./testimonial/index.js";
import contrastLayouts     from "./contrast/index.js";

export const LAYOUT_POOLS = {
  hook:         hookLayouts,
  escalate:     escalateLayouts,
  cta:          ctaLayouts,
  proof:        proofLayouts,
  reveal:       revealLayouts,
  visual_rest:  visualRestLayouts,
  stat:         statLayouts,
  explanation:  explanationLayouts,
  testimonial:  testimonialLayouts,
  contrast:     contrastLayouts,
};

// Flat list of all layouts across all intents
export const ALL_LAYOUTS = Object.values(LAYOUT_POOLS).flat();

// Intent aliases — map AI-generated intents to pool keys
const INTENT_ALIASES = {
  hook:        "hook",
  curiosity:   "hook",
  shock:       "hook",
  scene:       "visual_rest",
  ambient:     "visual_rest",
  rest:        "visual_rest",
  proof:       "proof",
  list:        "proof",
  evidence:    "proof",
  reveal:      "reveal",
  punchline:   "reveal",
  payoff:      "reveal",
  cta:         "cta",
  urgency:     "cta",
  action:      "cta",
  escalate:    "escalate",
  comparison:  "contrast",
  contrast:    "contrast",
  irony:       "contrast",
  stat:        "stat",
  data:        "stat",
  metric:      "stat",
  explanation: "explanation",
  empathy:     "explanation",
  how:         "explanation",
  testimonial: "testimonial",
  quote:       "testimonial",
  social_proof:"testimonial",
};

/**
 * Get layouts by intent string.
 * Falls back to hook if intent not recognized.
 */
export function getLayoutsByIntent(intent) {
  const poolKey = INTENT_ALIASES[intent] || "hook";
  return LAYOUT_POOLS[poolKey] || hookLayouts;
}

/**
 * Get a specific layout by ID across all pools.
 */
export function getLayoutById(id) {
  return ALL_LAYOUTS.find(l => l.id === id) || null;
}

/**
 * Get a random layout for a given intent and energy level.
 * energy: "low" | "medium" | "high"
 * previousIds: array of recently used layout IDs to avoid repetition
 */
export function pickLayout(intent, energy = "medium", previousIds = []) {
  const pool = getLayoutsByIntent(intent);

  // Filter by energy compatibility
  const energyFiltered = pool.filter(l =>
    !l.energy || l.energy.includes(energy)
  );

  // Prefer layouts not recently used
  const fresh = energyFiltered.filter(l => !previousIds.includes(l.id));
  const candidates = fresh.length > 0 ? fresh : energyFiltered;

  if (!candidates.length) return pool[0];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Classify energy level from numeric energy score.
 */
export function energyBucket(score) {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export default LAYOUT_POOLS;