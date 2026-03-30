/**
 * backgroundPatternRegistry.js
 * src/core/backgroundPatternRegistry.js
 *
 * Single source of truth for all zone backgrounds.
 * Used by:
 *   - ZonePickerModal > ColorsTab (user picks manually)
 *   - visualPlanner.js / visualDirector.js (automated selection)
 *
 * Each entry is a function returning a CSS style object.
 * Keys are used for automated selection — keep them semantic.
 *
 * Categories: dark | light | gradient | neon | pattern | cinematic
 */

export const backgroundPatternRegistry = {

  /* ─── PURE DARK ─────────────────────────────────────────── */

  pureBlack: () => ({
    background: "#000000",
  }),

  deepBlack: () => ({
    background: "#080810",
  }),

  inkBlack: () => ({
    background: "#0b0b14",
  }),

  charcoal: () => ({
    background: "#111118",
  }),

  graphite: () => ({
    background: "#1a1a24",
  }),

  deepNavy: () => ({
    background: "#0a0e1a",
  }),

  midnightBlue: () => ({
    background: "#080d1f",
  }),

  deepTeal: () => ({
    background: "#060f12",
  }),

  deepForest: () => ({
    background: "#070e08",
  }),

  deepPlum: () => ({
    background: "#0e0714",
  }),

  deepBurgundy: () => ({
    background: "#120508",
  }),

  /* ─── PURE LIGHT ─────────────────────────────────────────── */

  pureWhite: () => ({
    background: "#ffffff",
  }),

  softWhite: () => ({
    background: "#f5f5f0",
  }),

  warmCream: () => ({
    background: "#f7f3ea",
  }),

  coolGray: () => ({
    background: "#f0f0f5",
  }),

  warmSand: () => ({
    background: "#e9dfc8",
  }),

  softBlush: () => ({
    background: "#f4d8d8",
  }),

  mintLight: () => ({
    background: "#d9f0e3",
  }),

  skyLight: () => ({
    background: "#dcebfa",
  }),

  lavenderLight: () => ({
    background: "#ddd6f3",
  }),

  /* ─── DARK GRADIENTS ─────────────────────────────────────── */

  gradientDark: () => ({
    background: "linear-gradient(135deg, #111118 0%, #000000 100%)",
  }),

  gradientPurpleNight: () => ({
    background: "linear-gradient(135deg, #1a0b2e 0%, #0a0512 100%)",
  }),

  gradientBlueDepth: () => ({
    background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  }),

  gradientRoyalDark: () => ({
    background: "linear-gradient(135deg, #17142a 0%, #312e81 100%)",
  }),

  gradientEmeraldNight: () => ({
    background: "linear-gradient(135deg, #0b1f1a 0%, #1f4d3a 100%)",
  }),

  gradientBurgundyDark: () => ({
    background: "linear-gradient(135deg, #1a0f14 0%, #4a1f2d 100%)",
  }),

  gradientSteelDark: () => ({
    background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
  }),

  gradientCyber: () => ({
    background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  }),

  gradientNightSky: () => ({
    background: "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
  }),

  gradientRedDark: () => ({
    background: "linear-gradient(135deg, #1a0505 0%, #3d0a0a 100%)",
  }),

  /* ─── VIBRANT GRADIENTS ──────────────────────────────────── */

  gradientSunset: () => ({
    background: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)",
  }),

  gradientOrangeGlow: () => ({
    background: "linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)",
  }),

  gradientNeonPink: () => ({
    background: "linear-gradient(135deg, #ff00cc 0%, #333399 100%)",
  }),

  gradientAqua: () => ({
    background: "linear-gradient(135deg, #13547a 0%, #80d0c7 100%)",
  }),

  gradientEmerald: () => ({
    background: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
  }),

  gradientOcean: () => ({
    background: "linear-gradient(135deg, #2e3192 0%, #1bffff 100%)",
  }),

  gradientLavender: () => ({
    background: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)",
  }),

  gradientRose: () => ({
    background: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  }),

  gradientGold: () => ({
    background: "linear-gradient(135deg, #4a3510 0%, #c9a84c 50%, #ffd700 100%)",
  }),

  gradientForest: () => ({
    background: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  }),

  gradientWarmLight: () => ({
    background: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  }),

  /* ─── NEON / GLOW ────────────────────────────────────────── */

  neonPurple: () => ({
    background: "radial-gradient(ellipse at center, #2d0a5e 0%, #0a0514 70%)",
  }),

  neonBlue: () => ({
    background: "radial-gradient(ellipse at center, #001a4d 0%, #000510 70%)",
  }),

  neonGreen: () => ({
    background: "radial-gradient(ellipse at center, #003320 0%, #000a05 70%)",
  }),

  neonRed: () => ({
    background: "radial-gradient(ellipse at center, #4d0000 0%, #0a0000 70%)",
  }),

  neonCyan: () => ({
    background: "radial-gradient(ellipse at center, #003333 0%, #000a0a 70%)",
  }),

  /* ─── MESH / RADIAL ──────────────────────────────────────── */

  meshPurpleBlue: () => ({
    background: `
      radial-gradient(ellipse at 20% 20%, #2d1b69 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, #1a0a40 0%, transparent 50%),
      #0a0514
    `,
  }),

  meshTealPurple: () => ({
    background: `
      radial-gradient(ellipse at 30% 70%, #0f3d3d 0%, transparent 50%),
      radial-gradient(ellipse at 70% 30%, #2d0a5e 0%, transparent 50%),
      #080810
    `,
  }),

  meshOrangeRed: () => ({
    background: `
      radial-gradient(ellipse at 20% 80%, #4d1a00 0%, transparent 50%),
      radial-gradient(ellipse at 80% 20%, #3d0a0a 0%, transparent 50%),
      #0a0000
    `,
  }),

  radialBurst: () => ({
    background: "radial-gradient(circle at center, #1a1a2e 0%, #000000 70%)",
  }),

  radialWarm: () => ({
    background: "radial-gradient(circle at center, #2e1a0a 0%, #000000 70%)",
  }),

  /* ─── PATTERNS ───────────────────────────────────────────── */

  darkGrid: () => ({
    background: `
      linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
      #0b0b14
    `,
    backgroundSize: "32px 32px, 32px 32px",
  }),

  darkDots: () => ({
    background: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px), #0b0b14",
    backgroundSize: "20px 20px",
  }),

  darkDiagonal: () => ({
    background: `
      repeating-linear-gradient(
        45deg,
        #111118 0px, #111118 18px,
        #16161f 18px, #16161f 20px
      )
    `,
  }),

  lightGrid: () => ({
    background: `
      linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px),
      #f5f3ee
    `,
    backgroundSize: "28px 28px, 28px 28px",
  }),

  lightDots: () => ({
    background: "radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px), #f5f3ee",
    backgroundSize: "18px 18px",
  }),

  diagonalStripe: () => ({
    background: `
      repeating-linear-gradient(
        135deg,
        #f7e6a6 0px, #f7e6a6 12px,
        #f2d16b 12px, #f2d16b 24px
      )
    `,
  }),

  softStripe: () => ({
    background: `
      repeating-linear-gradient(
        90deg,
        #f8edeb 0px, #f8edeb 16px,
        #fcd5ce 16px, #fcd5ce 32px
      )
    `,
  }),

  neonGrid: () => ({
    background: `
      linear-gradient(rgba(124,92,252,0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(124,92,252,0.15) 1px, transparent 1px),
      #080810
    `,
    backgroundSize: "40px 40px, 40px 40px",
  }),

};

/* ─── Category map for automated selection ───────────────── */
export const backgroundCategories = {
  dark:      ["pureBlack","deepBlack","inkBlack","charcoal","graphite","deepNavy","midnightBlue","deepTeal","deepForest","deepPlum","deepBurgundy"],
  light:     ["pureWhite","softWhite","warmCream","coolGray","warmSand","softBlush","mintLight","skyLight","lavenderLight"],
  gradient:  ["gradientDark","gradientPurpleNight","gradientBlueDepth","gradientRoyalDark","gradientEmeraldNight","gradientBurgundyDark","gradientSteelDark","gradientCyber","gradientNightSky","gradientRedDark"],
  vibrant:   ["gradientSunset","gradientOrangeGlow","gradientNeonPink","gradientAqua","gradientEmerald","gradientOcean","gradientLavender","gradientRose","gradientGold","gradientForest","gradientWarmLight"],
  neon:      ["neonPurple","neonBlue","neonGreen","neonRed","neonCyan"],
  mesh:      ["meshPurpleBlue","meshTealPurple","meshOrangeRed","radialBurst","radialWarm"],
  pattern:   ["darkGrid","darkDots","darkDiagonal","lightGrid","lightDots","diagonalStripe","softStripe","neonGrid"],
};

/* ─── Intent → background suggestions ───────────────────── */
export const backgroundByIntent = {
  shock:       ["gradientRedDark","deepBurgundy","neonRed","gradientCyber"],
  curiosity:   ["gradientPurpleNight","gradientRoyalDark","neonPurple","meshPurpleBlue"],
  proof:       ["charcoal","graphite","gradientSteelDark","darkGrid"],
  reveal:      ["gradientCyber","gradientBlueDepth","neonBlue","meshTealPurple"],
  urgency:     ["gradientRedDark","gradientOrangeGlow","neonRed","deepBurgundy"],
  empathy:     ["gradientLavender","gradientRose","lavenderLight","softBlush"],
  explanation: ["charcoal","deepNavy","gradientSteelDark","darkDots"],
  contrast:    ["gradientSunset","gradientGold","gradientOcean","gradientEmerald"],
  punchline:   ["gradientOrangeGlow","gradientNeonPink","gradientSunset","neonCyan"],
  irony:       ["gradientNeonPink","neonGreen","diagonalStripe","darkDiagonal"],
};

/**
 * Get a random background from a category.
 * @param {string} category
 * @returns {object} CSS style object
 */
export function getRandomBackground(category = "dark") {
  const keys = backgroundCategories[category] || backgroundCategories.dark;
  const key  = keys[Math.floor(Math.random() * keys.length)];
  return backgroundPatternRegistry[key]?.() || backgroundPatternRegistry.inkBlack();
}

/**
 * Get a background suggestion for a beat intent.
 * @param {string} intent
 * @returns {object} CSS style object
 */
export function getBackgroundForIntent(intent) {
  const keys = backgroundByIntent[intent] || backgroundCategories.dark;
  const key  = keys[Math.floor(Math.random() * keys.length)];
  return backgroundPatternRegistry[key]?.() || backgroundPatternRegistry.inkBlack();
}

export default backgroundPatternRegistry;