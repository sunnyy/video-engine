/**
 * backgroundPatternRegistry.js
 * src/core/backgroundPatternRegistry.js
 */

export const backgroundPatternRegistry = {

  /* ── BRIGHT SOLIDS ───────────────────────────────────────── */

  crimson: {
    style:      { background: "#dc2626" },
    brightness: "mid", mood: "intense", energy: "high",
    works_with: ["white", "black", "yellow"],
    intent:     ["shock", "urgency", "contrast", "irony"],
  },
  scarlet: {
    style:      { background: "#e11d48" },
    brightness: "mid", mood: "bold", energy: "high",
    works_with: ["white", "black", "yellow"],
    intent:     ["shock", "urgency", "punchline", "reveal", "irony"],
  },
  orange: {
    style:      { background: "#ea580c" },
    brightness: "mid", mood: "energetic", energy: "high",
    works_with: ["white", "black", "dark"],
    intent:     ["urgency", "punchline", "curiosity", "contrast"],
  },
  amber: {
    style:      { background: "#d97706" },
    brightness: "mid", mood: "warm", energy: "high",
    works_with: ["dark", "black", "white"],
    intent:     ["punchline", "proof", "urgency", "reveal", "contrast"],
  },
  sunYellow: {
    style:      { background: "#eab308" },
    brightness: "light", mood: "punchy", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["punchline", "shock", "curiosity"],
  },
  lime: {
    style:      { background: "#84cc16" },
    brightness: "light", mood: "fresh", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["punchline", "proof", "curiosity"],
  },
  emerald: {
    style:      { background: "#10b981" },
    brightness: "mid", mood: "growth", energy: "medium",
    works_with: ["white", "dark", "black"],
    intent:     ["proof", "empathy", "explanation"],
  },
  teal: {
    style:      { background: "#14b8a6" },
    brightness: "mid", mood: "calm", energy: "medium",
    works_with: ["white", "dark", "black"],
    intent:     ["explanation", "proof", "curiosity"],
  },
  sky: {
    style:      { background: "#0ea5e9" },
    brightness: "mid", mood: "open", energy: "medium",
    works_with: ["white", "dark", "black"],
    intent:     ["explanation", "curiosity", "empathy"],
  },
  cobalt: {
    style:      { background: "#2563eb" },
    brightness: "mid", mood: "serious", energy: "medium",
    works_with: ["white", "yellow", "light"],
    intent:     ["proof", "explanation", "curiosity"],
  },
  violet: {
    style:      { background: "#7c3aed" },
    brightness: "mid", mood: "creative", energy: "high",
    works_with: ["white", "yellow", "light"],
    intent:     ["curiosity", "reveal", "punchline"],
  },
  purple: {
    style:      { background: "#9333ea" },
    brightness: "mid", mood: "playful", energy: "high",
    works_with: ["white", "yellow", "light"],
    intent:     ["curiosity", "irony", "punchline"],
  },
  hotPink: {
    style:      { background: "#ec4899" },
    brightness: "mid", mood: "vibrant", energy: "high",
    works_with: ["white", "dark", "black"],
    intent:     ["punchline", "curiosity", "irony"],
  },
  coral: {
    style:      { background: "#f43f5e" },
    brightness: "mid", mood: "lively", energy: "high",
    works_with: ["white", "dark", "black"],
    intent:     ["urgency", "punchline", "shock", "irony", "contrast"],
  },

  /* ── LIGHT SOLIDS ────────────────────────────────────────── */

  warmCream: {
    style:      { background: "#fef3c7" },
    brightness: "light", mood: "warm", energy: "low",
    works_with: ["dark", "black", "brown", "navy"],
    intent:     ["empathy", "explanation", "story"],
  },
  softWhite: {
    style:      { background: "#f8fafc" },
    brightness: "light", mood: "clean", energy: "low",
    works_with: ["dark", "black", "purple", "navy"],
    intent:     ["explanation", "proof", "empathy"],
  },
  blushPink: {
    style:      { background: "#fce7f3" },
    brightness: "light", mood: "gentle", energy: "low",
    works_with: ["dark", "purple", "navy"],
    intent:     ["empathy", "story", "curiosity"],
  },
  mintLight: {
    style:      { background: "#d1fae5" },
    brightness: "light", mood: "fresh", energy: "low",
    works_with: ["dark", "green", "black"],
    intent:     ["proof", "punchline", "empathy"],
  },
  lavenderLight: {
    style:      { background: "#ede9fe" },
    brightness: "light", mood: "playful", energy: "medium",
    works_with: ["dark", "purple", "navy"],
    intent:     ["curiosity", "punchline", "empathy"],
  },
  skyLight: {
    style:      { background: "#e0f2fe" },
    brightness: "light", mood: "calm", energy: "low",
    works_with: ["dark", "navy", "black"],
    intent:     ["explanation", "empathy", "proof"],
  },

  /* ── GRADIENTS ───────────────────────────────────────────── */

  gradientSunset: {
    style:      { background: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)" },
    brightness: "mid", mood: "energetic", energy: "high",
    works_with: ["dark", "white", "navy"],
    intent:     ["punchline", "urgency", "shock", "reveal", "contrast"],
  },
  gradientNeonPink: {
    style:      { background: "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)" },
    brightness: "mid", mood: "electric", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["punchline", "curiosity", "irony"],
  },
  gradientPurpleFire: {
    style:      { background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)" },
    brightness: "mid", mood: "bold", energy: "high",
    works_with: ["white", "yellow", "light"],
    intent:     ["shock", "reveal", "curiosity"],
  },
  gradientOcean: {
    style:      { background: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)" },
    brightness: "mid", mood: "fresh", energy: "medium",
    works_with: ["dark", "white", "navy"],
    intent:     ["curiosity", "explanation", "proof"],
  },
  gradientGold: {
    style:      { background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" },
    brightness: "mid", mood: "premium", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["proof", "reveal", "punchline"],
  },
  gradientLime: {
    style:      { background: "linear-gradient(135deg, #84cc16 0%, #10b981 100%)" },
    brightness: "mid", mood: "fresh", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["proof", "punchline", "urgency"],
  },
  gradientCandyFloss: {
    style:      { background: "linear-gradient(135deg, #fde68a 0%, #fca5a5 50%, #c4b5fd 100%)" },
    brightness: "light", mood: "playful", energy: "medium",
    works_with: ["dark", "black", "navy"],
    intent:     ["curiosity", "punchline", "story"],
  },
  gradientDeepPurple: {
    style:      { background: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 100%)" },
    brightness: "dark", mood: "dramatic", energy: "high",
    works_with: ["light", "white", "yellow", "pink"],
    intent:     ["shock", "reveal", "curiosity"],
  },
  gradientMidnight: {
    style:      { background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" },
    brightness: "dark", mood: "cinematic", energy: "medium",
    works_with: ["light", "white", "cyan", "yellow"],
    intent:     ["proof", "explanation", "curiosity"],
  },
  gradientWarmLight: {
    style:      { background: "linear-gradient(135deg, #fef9c3 0%, #fde68a 50%, #fca5a5 100%)" },
    brightness: "light", mood: "warm", energy: "medium",
    works_with: ["dark", "brown", "navy"],
    intent:     ["punchline", "empathy", "proof"],
  },

  /* ── NEON / GLOW / MESH ──────────────────────────────────── */

  neonPurpleGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #7c3aed 0%, #3b0764 40%, #0a0514 100%)" },
    brightness: "dark", mood: "electric", energy: "high",
    works_with: ["light", "white", "pink", "cyan"],
    intent:     ["shock", "curiosity", "reveal"],
  },
  neonCyanGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #06b6d4 0%, #0c4a6e 40%, #000a0a 100%)" },
    brightness: "dark", mood: "futuristic", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "contrast", "reveal"],
  },
  neonPinkGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #ec4899 0%, #831843 40%, #0a0005 100%)" },
    brightness: "dark", mood: "vibrant", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["shock", "punchline", "curiosity"],
  },
  neonGreenGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #10b981 0%, #064e3b 40%, #000a05 100%)" },
    brightness: "dark", mood: "matrix", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "contrast", "reveal"],
  },

  meshPurpleBlue: {
    style:      { background: "radial-gradient(ellipse at 20% 20%, #7c3aed 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #2563eb 0%, transparent 55%), #0f0a1a" },
    brightness: "dark", mood: "cinematic", energy: "high",
    works_with: ["light", "white", "pink", "yellow"],
    intent:     ["reveal", "curiosity", "shock"],
  },
  meshSunsetFire: {
    style:      { background: "radial-gradient(ellipse at 20% 80%, #ea580c 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #dc2626 0%, transparent 50%), #1a0500" },
    brightness: "dark", mood: "intense", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["shock", "urgency", "contrast", "irony", "reveal"],
  },
  meshOceanBreeze: {
    style:      { background: "radial-gradient(ellipse at 30% 30%, #0ea5e9 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, #10b981 0%, transparent 50%), #041225" },
    brightness: "dark", mood: "calm", energy: "medium",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "explanation", "proof"],
  },

  /* ── PATTERNS ────────────────────────────────────────────── */

  gridWhite: {
    style:      { backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)", backgroundColor: "#111118", backgroundSize: "48px 48px, 48px 48px" },
    brightness: "dark", mood: "structured", energy: "low",
    works_with: ["light", "white", "cyan", "yellow"],
    intent:     ["proof", "explanation", "list"],
  },
  gridPurple: {
    style:      { backgroundImage: "linear-gradient(rgba(124,92,252,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.35) 1px, transparent 1px)", backgroundColor: "#0a0810", backgroundSize: "48px 48px, 48px 48px" },
    brightness: "dark", mood: "futuristic", energy: "high",
    works_with: ["light", "cyan", "pink", "yellow"],
    intent:     ["curiosity", "shock", "contrast"],
  },
  gridLight: {
    style:      { backgroundImage: "linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)", backgroundColor: "#f8fafc", backgroundSize: "40px 40px, 40px 40px" },
    brightness: "light", mood: "structured", energy: "low",
    works_with: ["dark", "black", "navy"],
    intent:     ["explanation", "proof", "list"],
  },
  dotsWhite: {
    style:      { backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.45) 2px, transparent 2px)", backgroundColor: "#111118", backgroundSize: "28px 28px" },
    brightness: "dark", mood: "playful", energy: "medium",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "punchline", "list"],
  },
  dotsColor: {
    style:      { backgroundImage: "radial-gradient(circle, rgba(124,92,252,0.6) 2px, transparent 2px)", backgroundColor: "#07060f", backgroundSize: "28px 28px" },
    brightness: "dark", mood: "electric", energy: "high",
    works_with: ["light", "white", "pink"],
    intent:     ["curiosity", "shock", "reveal"],
  },
  diagonalStripes: {
    style:      { backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 2px, transparent 2px, transparent 28px)", backgroundColor: "#111118", backgroundSize: "40px 40px" },
    brightness: "dark", mood: "dynamic", energy: "medium",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "contrast", "list"],
  },
  diagonalBright: {
    style:      { backgroundImage: "repeating-linear-gradient(45deg, rgba(234,88,12,0.25) 0px, rgba(234,88,12,0.25) 4px, transparent 4px, transparent 24px)", backgroundColor: "#1a0800", backgroundSize: "34px 34px" },
    brightness: "dark", mood: "energetic", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["urgency", "shock", "contrast", "irony", "reveal"],
  },
  crosshatch: {
    style:      { backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 32px)", backgroundColor: "#0d0d18", backgroundSize: "32px 32px" },
    brightness: "dark", mood: "structured", energy: "low",
    works_with: ["light", "white", "cyan"],
    intent:     ["proof", "explanation", "list"],
  },
};

/* ── Category map ─────────────────────────────────────────── */
export const backgroundCategories = {
  bright:   ["crimson","scarlet","orange","amber","sunYellow","lime","emerald","teal","sky","cobalt","violet","purple","hotPink","coral"],
  light:    ["warmCream","softWhite","blushPink","mintLight","lavenderLight","skyLight"],
  gradient: ["gradientSunset","gradientNeonPink","gradientPurpleFire","gradientOcean","gradientGold","gradientLime","gradientCandyFloss","gradientDeepPurple","gradientMidnight","gradientWarmLight"],
  neon:     ["neonPurpleGlow","neonCyanGlow","neonPinkGlow","neonGreenGlow","meshPurpleBlue","meshSunsetFire","meshOceanBreeze"],
  pattern:  ["gridWhite","gridPurple","gridLight","dotsWhite","dotsColor","diagonalStripes","diagonalBright","crosshatch"],
};

/* ── Color family membership ─────────────────────────────── */
// Used to bias background selection toward the video DNA's primary hue.
const COLOR_FAMILY_KEYS = {
  warm:     new Set(["crimson","scarlet","orange","amber","coral","gradientSunset","gradientGold","meshSunsetFire","diagonalBright"]),
  cool:     new Set(["emerald","teal","sky","cobalt","neonCyanGlow","neonGreenGlow","meshOceanBreeze","gradientOcean","gradientMidnight","gridWhite","crosshatch"]),
  electric: new Set(["violet","purple","hotPink","gradientNeonPink","gradientPurpleFire","neonPurpleGlow","neonPinkGlow","meshPurpleBlue","gridPurple","dotsColor"]),
  neutral:  new Set(["warmCream","softWhite","blushPink","mintLight","lavenderLight","skyLight","sunYellow","lime","gradientLime","gradientCandyFloss","dotsWhite","diagonalStripes"]),
};

/* ── Smart pickers ───────────────────────────────────────── */

/**
 * @param {string}  intent
 * @param {string|null} brightness   "light" | "mid" | "dark" | null — exact match
 * @param {string|null} colorFamily  "warm" | "cool" | "electric" | "neutral" | null
 * @param {boolean} excludeLight     When true, always exclude brightness:"light" entries
 *                                   (use when DNA bg is dark — light bgs clash badly)
 */
export function getBackgroundForIntent(intent, brightness = null, colorFamily = null, excludeLight = false) {
  let candidates = Object.entries(backgroundPatternRegistry)
    .filter(([, v]) => v.intent.includes(intent))
    .filter(([, v]) => !brightness || v.brightness === brightness)
    .filter(([, v]) => !excludeLight || v.brightness !== "light")
    .map(([k]) => k);

  if (!candidates.length) {
    candidates = Object.keys(backgroundPatternRegistry)
      .filter(k => !brightness || backgroundPatternRegistry[k].brightness === brightness)
      .filter(k => !excludeLight || backgroundPatternRegistry[k].brightness !== "light");
  }

  // Soft-bias toward DNA color family: 40% chance to prefer family, never forces it exclusively
  if (colorFamily && COLOR_FAMILY_KEYS[colorFamily] && Math.random() < 0.4) {
    const familyCandidates = candidates.filter(k => COLOR_FAMILY_KEYS[colorFamily].has(k));
    if (familyCandidates.length >= 2) candidates = familyCandidates;
  }

  const key = candidates[Math.floor(Math.random() * candidates.length)];
  return { key, ...backgroundPatternRegistry[key] };
}

export function getContrastingBackground(blockBrightness, intent = null) {
  const needed = blockBrightness === "light" ? "dark" : "light";
  return getBackgroundForIntent(intent || "explanation", needed);
}

export function getRandomBackground(category = "bright") {
  const keys = backgroundCategories[category] || backgroundCategories.bright;
  const key  = keys[Math.floor(Math.random() * keys.length)];
  return { key, ...backgroundPatternRegistry[key] };
}
