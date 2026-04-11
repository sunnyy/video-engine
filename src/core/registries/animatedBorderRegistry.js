/**
 * animatedBorderRegistry.js
 * src/core/registries/animatedBorderRegistry.js
 *
 * 10 animated border styles for asset zones.
 * Each entry drives the AnimatedBorderFrame component in LayoutRenderer.
 *
 * Fields:
 *   label       — display name
 *   swatchColor — single color for the editor swatch
 *   gradient    — conic-gradient string for the spinning layer
 *   glowColor   — color used for the blurred glow ring
 *   speed       — rotations per second
 *   borderWidth — px inset between outer container and inner content
 *   blurAmount  — px blur on the glow layer (0 = no glow)
 *   niche       — niches this border suits
 *   intent      — beat intents this border suits
 *   energy      — energy levels this border suits
 *   mood        — descriptive mood tag
 */

const animatedBorderRegistry = {

  electric: {
    label:       "Electric",
    swatchColor: "#00d4ff",
    gradient:    "conic-gradient(rgba(0,0,0,0), #00d4ff 8%, #7c5cfc 16%, rgba(0,0,0,0) 28%)",
    glowColor:   "#00d4ff",
    speed:       0.8,
    borderWidth: 12,
    blurAmount:  6,
    niche:       ["gaming", "tech", "entertainment"],
    intent:      ["hook", "shock", "escalate", "reveal"],
    energy:      ["high"],
    mood:        "futuristic",
  },

  fire: {
    label:       "Fire",
    swatchColor: "#ff6b00",
    gradient:    "conic-gradient(rgba(0,0,0,0), #ff2200 6%, #ff7700 14%, #ffcc00 20%, rgba(0,0,0,0) 30%)",
    glowColor:   "#ff5500",
    speed:       0.7,
    borderWidth: 14,
    blurAmount:  8,
    niche:       ["gaming", "sports", "entertainment", "food"],
    intent:      ["hook", "urgency", "escalate", "shock"],
    energy:      ["high"],
    mood:        "intense",
  },

  neon: {
    label:       "Neon",
    swatchColor: "#39ff14",
    gradient:    "conic-gradient(rgba(0,0,0,0), #39ff14 10%, #00ffcc 18%, rgba(0,0,0,0) 26%)",
    glowColor:   "#39ff14",
    speed:       1.0,
    borderWidth: 10,
    blurAmount:  7,
    niche:       ["gaming", "entertainment", "tech"],
    intent:      ["hook", "contrast", "reveal", "escalate"],
    energy:      ["high"],
    mood:        "electric",
  },

  gold: {
    label:       "Gold",
    swatchColor: "#f5c542",
    gradient:    "conic-gradient(rgba(0,0,0,0), #b8860b 5%, #f5c542 14%, #fffacd 18%, #f5c542 22%, rgba(0,0,0,0) 30%)",
    glowColor:   "#f5c542",
    speed:       0.5,
    borderWidth: 16,
    blurAmount:  5,
    niche:       ["finance", "lifestyle", "entertainment", "sports"],
    intent:      ["proof", "reveal", "stat", "testimonial"],
    energy:      ["medium", "high"],
    mood:        "premium",
  },

  plasma: {
    label:       "Plasma",
    swatchColor: "#c026d3",
    gradient:    "conic-gradient(rgba(0,0,0,0), #7c3aed 6%, #c026d3 14%, #ec4899 20%, rgba(0,0,0,0) 28%)",
    glowColor:   "#c026d3",
    speed:       0.9,
    borderWidth: 12,
    blurAmount:  8,
    niche:       ["gaming", "entertainment", "lifestyle"],
    intent:      ["hook", "shock", "curiosity", "reveal"],
    energy:      ["high"],
    mood:        "bold",
  },

  arctic: {
    label:       "Arctic",
    swatchColor: "#bfdbfe",
    gradient:    "conic-gradient(rgba(0,0,0,0), #bfdbfe 10%, #ffffff 16%, rgba(0,0,0,0) 24%)",
    glowColor:   "#93c5fd",
    speed:       0.6,
    borderWidth: 10,
    blurAmount:  5,
    niche:       ["lifestyle", "health", "education", "travel"],
    intent:      ["visual_rest", "proof", "explanation", "reveal"],
    energy:      ["low", "medium"],
    mood:        "calm",
  },

  rainbow: {
    label:       "Rainbow",
    swatchColor: "#ff0080",
    gradient:    "conic-gradient(#ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0088ff, #8800ff, #ff0080, #ff0000)",
    glowColor:   "#ffffff",
    speed:       0.5,
    borderWidth: 14,
    blurAmount:  4,
    niche:       ["entertainment", "lifestyle", "food"],
    intent:      ["hook", "punchline", "curiosity", "irony"],
    energy:      ["high", "medium"],
    mood:        "playful",
  },

  lava: {
    label:       "Lava",
    swatchColor: "#dc2626",
    gradient:    "conic-gradient(rgba(0,0,0,0), #1a0000 4%, #dc2626 10%, #ff6600 16%, #1a0000 20%, rgba(0,0,0,0) 30%)",
    glowColor:   "#dc2626",
    speed:       0.6,
    borderWidth: 16,
    blurAmount:  9,
    niche:       ["gaming", "sports", "entertainment"],
    intent:      ["shock", "urgency", "contrast", "escalate"],
    energy:      ["high"],
    mood:        "danger",
  },

  hologram: {
    label:       "Hologram",
    swatchColor: "#00fff0",
    gradient:    "conic-gradient(rgba(0,0,0,0), #00fff0 5%, #ffffff 10%, #00fff0 15%, rgba(0,0,0,0) 22%)",
    glowColor:   "#00fff0",
    speed:       1.0,
    borderWidth: 10,
    blurAmount:  4,
    niche:       ["tech", "gaming", "entertainment"],
    intent:      ["hook", "reveal", "curiosity"],
    energy:      ["high", "medium"],
    mood:        "futuristic",
  },

  sunset: {
    label:       "Sunset",
    swatchColor: "#f97316",
    gradient:    "conic-gradient(rgba(0,0,0,0), #ec4899 6%, #f97316 14%, #fbbf24 20%, rgba(0,0,0,0) 28%)",
    glowColor:   "#f97316",
    speed:       0.7,
    borderWidth: 12,
    blurAmount:  6,
    niche:       ["lifestyle", "travel", "food", "entertainment"],
    intent:      ["reveal", "visual_rest", "empathy", "testimonial"],
    energy:      ["medium"],
    mood:        "warm",
  },

  fireGlow: {
    label:        "Fire Glow",
    swatchColor:  "#dd8448",
    type:         "turbulence",
    turbColor:    "#dd8448",
    turbColor2:   "rgba(255,60,0,0.35)",
    turbScale:    5,
    glowColor:    "#dd8448",
    speed:        1.0,
    borderWidth:  10,
    blurAmount:   0,
    niche:        ["gaming", "sports", "entertainment"],
    intent:       ["hook", "urgency", "escalate", "shock"],
    energy:       ["high"],
    mood:         "intense",
  },

};

export default animatedBorderRegistry;

export const ANIMATED_BORDER_OPTIONS = Object.entries(animatedBorderRegistry).map(([id, entry]) => ({
  id,
  label:       entry.label,
  swatchColor: entry.swatchColor,
  niche:       entry.niche,
  intent:      entry.intent,
  energy:      entry.energy,
  mood:        entry.mood,
}));

/**
 * resolveAnimatedBorderForZone
 * Picks the best animated border for a given beat context.
 *
 * @param {object} beat  — { intent, energy }
 * @param {object} dna   — { niche, colorStory }
 * @returns {string} border key
 */
export function resolveAnimatedBorderForZone(beat, dna) {
  const intent = beat.intent ?? "hook";
  const niche  = dna?.niche  ?? "entertainment";
  const energy = beat.energy >= 0.7 ? "high" : beat.energy >= 0.4 ? "medium" : "low";

  let candidates = Object.entries(animatedBorderRegistry).filter(([, b]) =>
    b.intent.includes(intent) && b.niche.includes(niche) && b.energy.includes(energy)
  ).map(([id]) => id);

  if (candidates.length < 2) {
    candidates = Object.entries(animatedBorderRegistry).filter(([, b]) =>
      b.intent.includes(intent) && b.niche.includes(niche)
    ).map(([id]) => id);
  }

  if (candidates.length < 2) {
    candidates = Object.entries(animatedBorderRegistry).filter(([, b]) =>
      b.intent.includes(intent)
    ).map(([id]) => id);
  }

  if (!candidates.length) candidates = Object.keys(animatedBorderRegistry);

  return candidates[Math.floor(Math.random() * candidates.length)];
}