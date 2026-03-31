/**
 * backgroundPatternRegistry.js
 * src/core/backgroundPatternRegistry.js
 *
 * Every entry has full metadata so the director can pick intelligently:
 *   brightness  → "dark" | "mid" | "light"
 *   mood        → emotional quality of the background
 *   works_with  → what block/text colors work ON TOP of this
 *   intent      → which beat intents this background suits
 *   energy      → "high" | "medium" | "low"
 */

export const backgroundPatternRegistry = {

  /* ── DARK SOLIDS ─────────────────────────────────────────── */

  pureBlack: {
    style:       { background: "#000000" },
    brightness:  "dark",
    mood:        "dramatic",
    energy:      "high",
    works_with:  ["light", "white", "yellow", "cyan"],
    intent:      ["shock", "urgency", "reveal", "punchline"],
  },
  inkBlack: {
    style:       { background: "#0b0b14" },
    brightness:  "dark",
    mood:        "cinematic",
    energy:      "medium",
    works_with:  ["light", "white", "yellow", "purple"],
    intent:      ["shock", "curiosity", "reveal", "contrast"],
  },
  charcoal: {
    style:       { background: "#111118" },
    brightness:  "dark",
    mood:        "structured",
    energy:      "medium",
    works_with:  ["light", "white", "yellow", "teal"],
    intent:      ["proof", "explanation", "contrast"],
  },
  graphite: {
    style:       { background: "#1a1a24" },
    brightness:  "dark",
    mood:        "neutral",
    energy:      "low",
    works_with:  ["light", "white", "orange"],
    intent:      ["explanation", "empathy", "proof"],
  },
  deepNavy: {
    style:       { background: "#0a0e1a" },
    brightness:  "dark",
    mood:        "serious",
    energy:      "medium",
    works_with:  ["light", "white", "yellow", "cyan"],
    intent:      ["proof", "curiosity", "explanation"],
  },
  deepPlum: {
    style:       { background: "#0e0714" },
    brightness:  "dark",
    mood:        "mysterious",
    energy:      "medium",
    works_with:  ["light", "white", "pink", "gold"],
    intent:      ["curiosity", "reveal", "irony"],
  },
  deepBurgundy: {
    style:       { background: "#120508" },
    brightness:  "dark",
    mood:        "intense",
    energy:      "high",
    works_with:  ["light", "white", "yellow"],
    intent:      ["shock", "urgency", "contrast"],
  },

  /* ── LIGHT SOLIDS ────────────────────────────────────────── */

  warmCream: {
    style:       { background: "#f7f3ea" },
    brightness:  "light",
    mood:        "warm",
    energy:      "low",
    works_with:  ["dark", "black", "brown", "navy"],
    intent:      ["empathy", "explanation", "story"],
  },
  softWhite: {
    style:       { background: "#f5f5f0" },
    brightness:  "light",
    mood:        "clean",
    energy:      "low",
    works_with:  ["dark", "black", "purple", "navy"],
    intent:      ["explanation", "proof", "empathy"],
  },
  lavenderLight: {
    style:       { background: "#ddd6f3" },
    brightness:  "light",
    mood:        "playful",
    energy:      "medium",
    works_with:  ["dark", "purple", "navy"],
    intent:      ["curiosity", "punchline", "empathy"],
  },
  skyLight: {
    style:       { background: "#dcebfa" },
    brightness:  "light",
    mood:        "calm",
    energy:      "low",
    works_with:  ["dark", "navy", "black"],
    intent:      ["explanation", "empathy", "proof"],
  },
  mintLight: {
    style:       { background: "#d9f0e3" },
    brightness:  "light",
    mood:        "fresh",
    energy:      "low",
    works_with:  ["dark", "green", "black"],
    intent:      ["proof", "punchline", "empathy"],
  },

  /* ── DARK GRADIENTS ──────────────────────────────────────── */

  gradientPurpleNight: {
    style:       { background: "linear-gradient(135deg, #1a0b2e 0%, #0a0512 100%)" },
    brightness:  "dark",
    mood:        "mysterious",
    energy:      "medium",
    works_with:  ["light", "white", "pink", "yellow"],
    intent:      ["curiosity", "reveal", "irony"],
  },
  gradientBlueDepth: {
    style:       { background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
    brightness:  "dark",
    mood:        "cinematic",
    energy:      "medium",
    works_with:  ["light", "white", "cyan", "yellow"],
    intent:      ["proof", "explanation", "curiosity"],
  },
  gradientRoyalDark: {
    style:       { background: "linear-gradient(135deg, #17142a 0%, #312e81 100%)" },
    brightness:  "dark",
    mood:        "dramatic",
    energy:      "high",
    works_with:  ["light", "white", "yellow", "pink"],
    intent:      ["shock", "reveal", "curiosity"],
  },
  gradientCyber: {
    style:       { background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
    brightness:  "dark",
    mood:        "futuristic",
    energy:      "high",
    works_with:  ["light", "cyan", "pink", "yellow"],
    intent:      ["shock", "curiosity", "contrast"],
  },
  gradientRedDark: {
    style:       { background: "linear-gradient(135deg, #1a0505 0%, #3d0a0a 100%)" },
    brightness:  "dark",
    mood:        "intense",
    energy:      "high",
    works_with:  ["light", "white", "yellow", "orange"],
    intent:      ["shock", "urgency", "contrast"],
  },
  gradientEmeraldNight: {
    style:       { background: "linear-gradient(135deg, #0b1f1a 0%, #1f4d3a 100%)" },
    brightness:  "dark",
    mood:        "grounded",
    energy:      "medium",
    works_with:  ["light", "white", "yellow", "mint"],
    intent:      ["proof", "empathy", "explanation"],
  },
  gradientNightSky: {
    style:       { background: "linear-gradient(135deg, #141e30 0%, #243b55 100%)" },
    brightness:  "dark",
    mood:        "calm",
    energy:      "low",
    works_with:  ["light", "white", "cyan"],
    intent:      ["empathy", "story", "explanation"],
  },

  /* ── VIBRANT GRADIENTS ───────────────────────────────────── */

  gradientSunset: {
    style:       { background: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)" },
    brightness:  "mid",
    mood:        "energetic",
    energy:      "high",
    works_with:  ["dark", "white", "navy"],
    intent:      ["punchline", "urgency", "shock"],
  },
  gradientNeonPink: {
    style:       { background: "linear-gradient(135deg, #ff00cc 0%, #333399 100%)" },
    brightness:  "mid",
    mood:        "playful",
    energy:      "high",
    works_with:  ["light", "white", "yellow"],
    intent:      ["punchline", "curiosity", "irony"],
  },
  gradientGold: {
    style:       { background: "linear-gradient(135deg, #4a3510 0%, #c9a84c 50%, #ffd700 100%)" },
    brightness:  "mid",
    mood:        "premium",
    energy:      "high",
    works_with:  ["dark", "black", "navy"],
    intent:      ["proof", "reveal", "punchline"],
  },
  gradientOcean: {
    style:       { background: "linear-gradient(135deg, #2e3192 0%, #1bffff 100%)" },
    brightness:  "mid",
    mood:        "fresh",
    energy:      "medium",
    works_with:  ["dark", "navy", "white"],
    intent:      ["curiosity", "explanation", "proof"],
  },
  gradientLavender: {
    style:       { background: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)" },
    brightness:  "mid",
    mood:        "dreamy",
    energy:      "medium",
    works_with:  ["dark", "white", "black"],
    intent:      ["empathy", "curiosity", "story"],
  },
  gradientWarmLight: {
    style:       { background: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)" },
    brightness:  "light",
    mood:        "warm",
    energy:      "medium",
    works_with:  ["dark", "brown", "navy"],
    intent:      ["punchline", "empathy", "proof"],
  },

  /* ── NEON / GLOW ─────────────────────────────────────────── */

  neonPurple: {
    style:       { background: "radial-gradient(ellipse at center, #2d0a5e 0%, #0a0514 70%)" },
    brightness:  "dark",
    mood:        "electric",
    energy:      "high",
    works_with:  ["light", "white", "pink", "cyan"],
    intent:      ["shock", "curiosity", "reveal"],
  },
  neonRed: {
    style:       { background: "radial-gradient(ellipse at center, #4d0000 0%, #0a0000 70%)" },
    brightness:  "dark",
    mood:        "danger",
    energy:      "high",
    works_with:  ["light", "white", "yellow"],
    intent:      ["shock", "urgency", "contrast"],
  },
  neonCyan: {
    style:       { background: "radial-gradient(ellipse at center, #003333 0%, #000a0a 70%)" },
    brightness:  "dark",
    mood:        "futuristic",
    energy:      "high",
    works_with:  ["light", "white", "yellow"],
    intent:      ["curiosity", "contrast", "reveal"],
  },

  /* ── MESH ────────────────────────────────────────────────── */

  meshPurpleBlue: {
    style:       { background: "radial-gradient(ellipse at 20% 20%, #2d1b69 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, #1a0a40 0%, transparent 50%), #0a0514" },
    brightness:  "dark",
    mood:        "cinematic",
    energy:      "high",
    works_with:  ["light", "white", "pink", "yellow"],
    intent:      ["reveal", "curiosity", "shock"],
  },
  meshOrangeRed: {
    style:       { background: "radial-gradient(ellipse at 20% 80%, #4d1a00 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #3d0a0a 0%, transparent 50%), #0a0000" },
    brightness:  "dark",
    mood:        "intense",
    energy:      "high",
    works_with:  ["light", "white", "yellow"],
    intent:      ["shock", "urgency", "contrast"],
  },

  /* ── PATTERNS ────────────────────────────────────────────── */

  darkGrid: {
    style:       { background: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), #0b0b14", backgroundSize: "32px 32px, 32px 32px" },
    brightness:  "dark",
    mood:        "structured",
    energy:      "low",
    works_with:  ["light", "white", "cyan", "yellow"],
    intent:      ["proof", "explanation", "list"],
  },
  darkDots: {
    style:       { background: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px), #0b0b14", backgroundSize: "20px 20px" },
    brightness:  "dark",
    mood:        "playful",
    energy:      "medium",
    works_with:  ["light", "white", "yellow"],
    intent:      ["curiosity", "punchline", "list"],
  },
  neonGrid: {
    style:       { background: "linear-gradient(rgba(124,92,252,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.15) 1px, transparent 1px), #080810", backgroundSize: "40px 40px, 40px 40px" },
    brightness:  "dark",
    mood:        "futuristic",
    energy:      "high",
    works_with:  ["light", "cyan", "pink", "yellow"],
    intent:      ["curiosity", "shock", "contrast"],
  },
  lightGrid: {
    style:       { background: "linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), #f5f3ee", backgroundSize: "28px 28px, 28px 28px" },
    brightness:  "light",
    mood:        "structured",
    energy:      "low",
    works_with:  ["dark", "black", "navy"],
    intent:      ["explanation", "proof", "list"],
  },
};

/* ── Category map ─────────────────────────────────────────── */
export const backgroundCategories = {
  dark:     ["pureBlack","inkBlack","charcoal","graphite","deepNavy","deepPlum","deepBurgundy"],
  light:    ["warmCream","softWhite","lavenderLight","skyLight","mintLight"],
  gradient: ["gradientPurpleNight","gradientBlueDepth","gradientRoyalDark","gradientCyber","gradientRedDark","gradientEmeraldNight","gradientNightSky"],
  vibrant:  ["gradientSunset","gradientNeonPink","gradientGold","gradientOcean","gradientLavender","gradientWarmLight"],
  neon:     ["neonPurple","neonRed","neonCyan"],
  mesh:     ["meshPurpleBlue","meshOrangeRed"],
  pattern:  ["darkGrid","darkDots","neonGrid","lightGrid"],
};

/* ── Smart pickers ───────────────────────────────────────── */

/**
 * Pick a background by intent. Returns the style object.
 * @param {string} intent
 * @param {string} [brightness] — force "dark"|"light"|"mid" or null for any
 */
export function getBackgroundForIntent(intent, brightness = null) {
  const candidates = Object.entries(backgroundPatternRegistry)
    .filter(([, v]) => v.intent.includes(intent))
    .filter(([, v]) => !brightness || v.brightness === brightness)
    .map(([k]) => k);

  const pool = candidates.length ? candidates
    : Object.keys(backgroundPatternRegistry).filter(k =>
        !brightness || backgroundPatternRegistry[k].brightness === brightness
      );

  const key = pool[Math.floor(Math.random() * pool.length)];
  return { key, ...backgroundPatternRegistry[key] };
}

/**
 * Pick a background that contrasts with a given surface color type.
 * @param {string} blockBrightness — "light"|"dark" (the block's dominant color)
 */
export function getContrastingBackground(blockBrightness, intent = null) {
  const needed = blockBrightness === "light" ? "dark" : "light";
  return getBackgroundForIntent(intent || "explanation", needed);
}

/**
 * Get random background from a category.
 */
export function getRandomBackground(category = "dark") {
  const keys = backgroundCategories[category] || backgroundCategories.dark;
  const key  = keys[Math.floor(Math.random() * keys.length)];
  return { key, ...backgroundPatternRegistry[key] };
}