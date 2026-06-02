/**
 * dslPaletteRegistry.js
 * src/core/registries/dslPaletteRegistry.js
 *
 * Global color palette system for the DSL layout engine.
 * All scenes in a video derive colors from one palette so every scene
 * looks like it was designed by the same person.
 */

const PALETTES = {
  dark_premium: {
    id: "dark_premium",
    background:      "linear-gradient(160deg,#0a0a14 0%,#141430 100%)",
    backgroundAlt:   "linear-gradient(135deg,#0d0d1a 0%,#1a1a3e 100%)",
    backgroundDeep:  "radial-gradient(ellipse at 50% 0%,#1a1040 0%,#0a0a14 70%)",
    accent:          "#f5c518",
    accentSecondary: "#f97316",
    text:            "#ffffff",
    textMuted:       "rgba(255,255,255,0.65)",
    divider:         "#f5c518",
    overlay:         "rgba(0,0,0,0.55)",
    overlayBottom:   "linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 45%)",
    glow:  (c) => `radial-gradient(ellipse 600px 400px at 50% 45%,${c}22 0%,transparent 70%)`,
    beam:  (c) => `radial-gradient(ellipse 60px 800px at 50% 50%,${c}44 0%,transparent 70%)`,
  },

  dark_energetic: {
    id: "dark_energetic",
    background:      "linear-gradient(160deg,#0f0500 0%,#1a0800 100%)",
    backgroundAlt:   "linear-gradient(135deg,#1a0800 0%,#3d1000 100%)",
    backgroundDeep:  "radial-gradient(ellipse at 50% 0%,#2a0a00 0%,#0f0500 70%)",
    accent:          "#f97316",
    accentSecondary: "#ef4444",
    text:            "#ffffff",
    textMuted:       "rgba(255,255,255,0.65)",
    divider:         "#f97316",
    overlay:         "rgba(0,0,0,0.55)",
    overlayBottom:   "linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 45%)",
    glow:  (c) => `radial-gradient(ellipse 600px 400px at 50% 45%,${c}22 0%,transparent 70%)`,
    beam:  (c) => `radial-gradient(ellipse 60px 800px at 50% 50%,${c}44 0%,transparent 70%)`,
  },

  dark_modern: {
    id: "dark_modern",
    background:      "linear-gradient(160deg,#060614 0%,#0d0d28 100%)",
    backgroundAlt:   "linear-gradient(135deg,#080820 0%,#141450 100%)",
    backgroundDeep:  "radial-gradient(ellipse at 50% 0%,#1a1050 0%,#060614 70%)",
    accent:          "#6366f1",
    accentSecondary: "#8b5cf6",
    text:            "#ffffff",
    textMuted:       "rgba(255,255,255,0.65)",
    divider:         "#6366f1",
    overlay:         "rgba(0,0,0,0.55)",
    overlayBottom:   "linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 45%)",
    glow:  (c) => `radial-gradient(ellipse 600px 400px at 50% 45%,${c}22 0%,transparent 70%)`,
    beam:  (c) => `radial-gradient(ellipse 60px 800px at 50% 50%,${c}44 0%,transparent 70%)`,
  },

  dark_corporate: {
    id: "dark_corporate",
    background:      "linear-gradient(160deg,#060e14 0%,#0d1f28 100%)",
    backgroundAlt:   "linear-gradient(135deg,#081420 0%,#0f2d3d 100%)",
    backgroundDeep:  "radial-gradient(ellipse at 50% 0%,#0a2030 0%,#060e14 70%)",
    accent:          "#0ea5e9",
    accentSecondary: "#10b981",
    text:            "#ffffff",
    textMuted:       "rgba(255,255,255,0.65)",
    divider:         "#0ea5e9",
    overlay:         "rgba(0,0,0,0.55)",
    overlayBottom:   "linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 45%)",
    glow:  (c) => `radial-gradient(ellipse 600px 400px at 50% 45%,${c}22 0%,transparent 70%)`,
    beam:  (c) => `radial-gradient(ellipse 60px 800px at 50% 50%,${c}44 0%,transparent 70%)`,
  },

  dark_vibrant: {
    id: "dark_vibrant",
    background:      "linear-gradient(160deg,#0f0514 0%,#1a0828 100%)",
    backgroundAlt:   "linear-gradient(135deg,#140520 0%,#2d0f45 100%)",
    backgroundDeep:  "radial-gradient(ellipse at 50% 0%,#200840 0%,#0f0514 70%)",
    accent:          "#e879f9",
    accentSecondary: "#a855f7",
    text:            "#ffffff",
    textMuted:       "rgba(255,255,255,0.65)",
    divider:         "#e879f9",
    overlay:         "rgba(0,0,0,0.55)",
    overlayBottom:   "linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 45%)",
    glow:  (c) => `radial-gradient(ellipse 600px 400px at 50% 45%,${c}22 0%,transparent 70%)`,
    beam:  (c) => `radial-gradient(ellipse 60px 800px at 50% 50%,${c}44 0%,transparent 70%)`,
  },

  dark_bold: {
    id: "dark_bold",
    background:      "linear-gradient(160deg,#0a0a0a 0%,#141414 100%)",
    backgroundAlt:   "linear-gradient(135deg,#111111 0%,#1f1f1f 100%)",
    backgroundDeep:  "radial-gradient(ellipse at 50% 0%,#1a2a1a 0%,#0a0a0a 70%)",
    accent:          "#22c55e",
    accentSecondary: "#16a34a",
    text:            "#ffffff",
    textMuted:       "rgba(255,255,255,0.65)",
    divider:         "#22c55e",
    overlay:         "rgba(0,0,0,0.55)",
    overlayBottom:   "linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 45%)",
    glow:  (c) => `radial-gradient(ellipse 600px 400px at 50% 45%,${c}22 0%,transparent 70%)`,
    beam:  (c) => `radial-gradient(ellipse 60px 800px at 50% 50%,${c}44 0%,transparent 70%)`,
  },
};

// mood string → palette id
const MOOD_MAP = {
  premium:     "dark_premium",
  energetic:   "dark_energetic",
  modern:      "dark_modern",
  corporate:   "dark_corporate",
  educational: "dark_corporate",
  playful:     "dark_vibrant",
};

// niche → palette id (overrides mood when present)
const NICHE_MAP = {
  tech:     "dark_modern",
  saas:     "dark_modern",
  finance:  "dark_corporate",
  fitness:  "dark_energetic",
  sports:   "dark_energetic",
  creative: "dark_vibrant",
  art:      "dark_vibrant",
};

/**
 * Get palette by mood string.
 */
export function getPaletteByMood(mood) {
  const id = MOOD_MAP[mood?.toLowerCase()] ?? "dark_premium";
  return PALETTES[id];
}

/**
 * Get palette by accent hex color — matches to nearest palette by hue.
 */
export function getPaletteByAccent(hexColor) {
  if (!hexColor || typeof hexColor !== "string") return PALETTES.dark_premium;
  const c = hexColor.replace("#", "");
  if (c.length < 6) return PALETTES.dark_premium;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d   = max - min;
  if (d < 20) return PALETTES.dark_premium; // near-neutral → gold
  let hue = 0;
  if (max === r)      hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else                hue = ((r - g) / d + 4) * 60;
  if (hue < 60 || hue >= 330) return PALETTES.dark_energetic;  // reds/oranges
  if (hue < 80)               return PALETTES.dark_premium;    // yellows/gold
  if (hue < 165)              return PALETTES.dark_bold;        // greens
  if (hue < 200)              return PALETTES.dark_corporate;   // teals
  if (hue < 260)              return PALETTES.dark_corporate;   // blues
  if (hue < 290)              return PALETTES.dark_modern;      // indigo
  return PALETTES.dark_vibrant;                                 // purples/pinks
}

/**
 * Get palette for a project. Niche takes highest priority, then mood, then accent color.
 */
export function getPaletteForProject(mood, accentColor, niche) {
  if (niche) {
    const nicheId = NICHE_MAP[niche?.toLowerCase()];
    if (nicheId) return PALETTES[nicheId];
  }
  if (mood) {
    const moodId = MOOD_MAP[mood?.toLowerCase()];
    if (moodId) return PALETTES[moodId];
  }
  if (accentColor) return getPaletteByAccent(accentColor);
  return PALETTES.dark_premium;
}
