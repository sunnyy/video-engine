/**
 * nichePaletteRegistry.js
 * src/core/nichePaletteRegistry.js
 *
 * Curated color palettes per niche.
 * Each niche has 4-5 palette options picked by energy + videoType.
 * Palette defines: bg, text, primary, accent, colorFamily, mood.
 *
 * bg      — canvas/background base color
 * text    — default text color
 * primary — main accent (headlines, icons, decoratives)
 * accent  — secondary accent (labels, tags, highlights)
 * colorFamily — maps to backgroundPatternRegistry color families
 * mood    — descriptive tag
 * energy  — which energy levels this palette suits
 */

export const nichePaletteRegistry = {

  // ── Entertainment ─────────────────────────────────────────
  entertainment: {
    colorFamily: "electric",
    avoid: ["light"],
    palettes: [
      { bg: "#0a0a12", text: "#ffffff", primary: "#ff4500", accent: "#fbbf24", mood: "viral", energy: ["high"] },
      { bg: "#0f0500", text: "#ffffff", primary: "#ff6b00", accent: "#ffffff", mood: "fire", energy: ["high"] },
      { bg: "#050510", text: "#ffffff", primary: "#7c5cfc", accent: "#00f2ea", mood: "electric", energy: ["high"] },
      { bg: "#0a0a0a", text: "#ffffff", primary: "#ec4899", accent: "#fbbf24", mood: "pop", energy: ["medium"] },
      { bg: "#111118", text: "#ffffff", primary: "#f59e0b", accent: "#ffffff", mood: "premium", energy: ["medium"] },
    ],
  },

  // ── Gaming ────────────────────────────────────────────────
  gaming: {
    colorFamily: "electric",
    avoid: ["light", "neutral"],
    palettes: [
      { bg: "#050510", text: "#ffffff", primary: "#7c3aed", accent: "#00f2ea", mood: "neon", energy: ["high"] },
      { bg: "#0a0014", text: "#ffffff", primary: "#ec4899", accent: "#fbbf24", mood: "cyberpunk", energy: ["high"] },
      { bg: "#000a05", text: "#ffffff", primary: "#39ff14", accent: "#00f2ea", mood: "matrix", energy: ["high"] },
      { bg: "#0f0f1a", text: "#ffffff", primary: "#6366f1", accent: "#c026d3", mood: "galaxy", energy: ["medium"] },
      { bg: "#1a0000", text: "#ffffff", primary: "#dc2626", accent: "#f59e0b", mood: "danger", energy: ["high"] },
    ],
  },

  // ── Sports ────────────────────────────────────────────────
  sports: {
    colorFamily: "warm",
    avoid: ["light"],
    palettes: [
      { bg: "#0a0a0a", text: "#ffffff", primary: "#f59e0b", accent: "#ffffff", mood: "champion", energy: ["high"] },
      { bg: "#0f0500", text: "#ffffff", primary: "#ea580c", accent: "#fbbf24", mood: "power", energy: ["high"] },
      { bg: "#05050f", text: "#ffffff", primary: "#3b82f6", accent: "#ffffff", mood: "team", energy: ["high"] },
      { bg: "#000a00", text: "#ffffff", primary: "#22c55e", accent: "#ffffff", mood: "field", energy: ["medium"] },
      { bg: "#1a0a00", text: "#ffffff", primary: "#dc2626", accent: "#f59e0b", mood: "intense", energy: ["high"] },
    ],
  },

  // ── Finance ───────────────────────────────────────────────
  finance: {
    colorFamily: "cool",
    avoid: ["electric"],
    palettes: [
      { bg: "#0f172a", text: "#ffffff", primary: "#22c55e", accent: "#f5c518", mood: "growth", energy: ["medium"] },
      { bg: "#020817", text: "#ffffff", primary: "#3b82f6", accent: "#22c55e", mood: "trust", energy: ["low", "medium"] },
      { bg: "#0a0a0a", text: "#ffffff", primary: "#f5c518", accent: "#ffffff", mood: "wealth", energy: ["medium"] },
      { bg: "#1e293b", text: "#ffffff", primary: "#06b6d4", accent: "#f5c518", mood: "corporate", energy: ["low"] },
      { bg: "#f8fafc", text: "#0f172a", primary: "#1e40af", accent: "#22c55e", mood: "clean", energy: ["low"] },
    ],
  },

  // ── Education ─────────────────────────────────────────────
  education: {
    colorFamily: "cool",
    avoid: [],
    palettes: [
      { bg: "#0f172a", text: "#ffffff", primary: "#3b82f6", accent: "#fbbf24", mood: "learn", energy: ["medium"] },
      { bg: "#f8fafc", text: "#1e293b", primary: "#4f46e5", accent: "#f59e0b", mood: "bright", energy: ["low", "medium"] },
      { bg: "#0a0a12", text: "#ffffff", primary: "#8b5cf6", accent: "#06b6d4", mood: "knowledge", energy: ["medium"] },
      { bg: "#fef9c3", text: "#1a1a1a", primary: "#d97706", accent: "#1e40af", mood: "warm", energy: ["low"] },
      { bg: "#042f2e", text: "#ffffff", primary: "#10b981", accent: "#fbbf24", mood: "growth", energy: ["medium"] },
    ],
  },

  // ── Health & Fitness ──────────────────────────────────────
  health: {
    colorFamily: "cool",
    avoid: ["electric"],
    palettes: [
      { bg: "#f0fdf4", text: "#14532d", primary: "#16a34a", accent: "#84cc16", mood: "fresh", energy: ["low", "medium"] },
      { bg: "#0a1a0a", text: "#ffffff", primary: "#22c55e", accent: "#84cc16", mood: "vital", energy: ["high", "medium"] },
      { bg: "#fdf4ff", text: "#1a1a2e", primary: "#a855f7", accent: "#ec4899", mood: "wellness", energy: ["low"] },
      { bg: "#0c1a2e", text: "#ffffff", primary: "#06b6d4", accent: "#22c55e", mood: "performance", energy: ["high"] },
      { bg: "#fff7ed", text: "#1c1917", primary: "#ea580c", accent: "#16a34a", mood: "energy", energy: ["medium"] },
    ],
  },

  // ── Lifestyle ─────────────────────────────────────────────
  lifestyle: {
    colorFamily: "neutral",
    avoid: [],
    palettes: [
      { bg: "#fdf6f0", text: "#1a1a1a", primary: "#d4896a", accent: "#f5c518", mood: "warm", energy: ["low"] },
      { bg: "#0a0a12", text: "#ffffff", primary: "#ec4899", accent: "#fbbf24", mood: "bold", energy: ["high", "medium"] },
      { bg: "#f8f4f0", text: "#2d2d2d", primary: "#9333ea", accent: "#ec4899", mood: "chic", energy: ["medium"] },
      { bg: "#1a1a2e", text: "#ffffff", primary: "#f5c518", accent: "#ffffff", mood: "luxe", energy: ["medium"] },
      { bg: "#fef9f0", text: "#1a1a1a", primary: "#f97316", accent: "#84cc16", mood: "fresh", energy: ["medium"] },
    ],
  },

  // ── Food & Cooking ────────────────────────────────────────
  food: {
    colorFamily: "warm",
    avoid: ["electric", "cool"],
    palettes: [
      { bg: "#1c0a00", text: "#ffffff", primary: "#f97316", accent: "#fbbf24", mood: "spicy", energy: ["high"] },
      { bg: "#fef3c7", text: "#1c1917", primary: "#d97706", accent: "#dc2626", mood: "warm", energy: ["low", "medium"] },
      { bg: "#0a1a00", text: "#ffffff", primary: "#84cc16", accent: "#f97316", mood: "fresh", energy: ["medium"] },
      { bg: "#fff7ed", text: "#1c1917", primary: "#ea580c", accent: "#16a34a", mood: "natural", energy: ["low"] },
      { bg: "#0f0500", text: "#ffffff", primary: "#dc2626", accent: "#f59e0b", mood: "bold", energy: ["high"] },
    ],
  },

  // ── Travel ────────────────────────────────────────────────
  travel: {
    colorFamily: "cool",
    avoid: [],
    palettes: [
      { bg: "#0c1a3e", text: "#ffffff", primary: "#0ea5e9", accent: "#f5c518", mood: "adventure", energy: ["high", "medium"] },
      { bg: "#fef9f0", text: "#1a1a1a", primary: "#f97316", accent: "#0ea5e9", mood: "wanderlust", energy: ["medium"] },
      { bg: "#042f2e", text: "#ffffff", primary: "#10b981", accent: "#fbbf24", mood: "nature", energy: ["medium"] },
      { bg: "#0f0c29", text: "#ffffff", primary: "#8b5cf6", accent: "#06b6d4", mood: "dusk", energy: ["low"] },
      { bg: "#1a1a0a", text: "#ffffff", primary: "#d97706", accent: "#ffffff", mood: "desert", energy: ["medium"] },
    ],
  },

  // ── Tech ──────────────────────────────────────────────────
  tech: {
    colorFamily: "cool",
    avoid: ["warm", "neutral"],
    palettes: [
      { bg: "#050510", text: "#ffffff", primary: "#06b6d4", accent: "#7c5cfc", mood: "futuristic", energy: ["high"] },
      { bg: "#0f172a", text: "#ffffff", primary: "#6366f1", accent: "#06b6d4", mood: "digital", energy: ["medium"] },
      { bg: "#000a0a", text: "#00f2ea", primary: "#00f2ea", accent: "#7c5cfc", mood: "matrix", energy: ["high"] },
      { bg: "#f8fafc", text: "#0f172a", primary: "#4f46e5", accent: "#06b6d4", mood: "clean", energy: ["low"] },
      { bg: "#09090b", text: "#ffffff", primary: "#a855f7", accent: "#06b6d4", mood: "dark", energy: ["medium"] },
    ],
  },

  // ── Spiritual / Devotional ────────────────────────────────
  spiritual: {
    colorFamily: "warm",
    avoid: ["electric", "cool"],
    palettes: [
      { bg: "#1a0a00", text: "#ffffff", primary: "#f5c518", accent: "#ff6b00", mood: "saffron", energy: ["high", "medium"] },
      { bg: "#0a0014", text: "#ffffff", primary: "#9333ea", accent: "#f5c518", mood: "divine", energy: ["medium"] },
      { bg: "#1a0500", text: "#ffffff", primary: "#dc2626", accent: "#f5c518", mood: "sacred", energy: ["high"] },
      { bg: "#fef9f0", text: "#1a0a00", primary: "#d97706", accent: "#dc2626", mood: "temple", energy: ["low", "medium"] },
      { bg: "#050014", text: "#ffffff", primary: "#f5c518", accent: "#9333ea", mood: "cosmic", energy: ["low"] },
    ],
  },

  // ── Beauty / Skincare ─────────────────────────────────────
  skincare: {
    colorFamily: "neutral",
    avoid: ["electric", "cool"],
    palettes: [
      { bg: "#fdf6f0", text: "#1a1a1a", primary: "#e8a87c", accent: "#d4896a", mood: "soft", energy: ["low"] },
      { bg: "#1a0f0a", text: "#ffffff", primary: "#d4896a", accent: "#f5c518", mood: "luxe", energy: ["medium"] },
      { bg: "#fdf4ff", text: "#1a1a2e", primary: "#c084fc", accent: "#f9a8d4", mood: "glow", energy: ["low"] },
      { bg: "#fff0f6", text: "#1a1a1a", primary: "#ec4899", accent: "#f5c518", mood: "fresh", energy: ["medium"] },
      { bg: "#0f0a0a", text: "#ffffff", primary: "#f9a8d4", accent: "#c084fc", mood: "night", energy: ["low"] },
    ],
  },

  // ── Business / Marketing ──────────────────────────────────
  business: {
    colorFamily: "cool",
    avoid: [],
    palettes: [
      { bg: "#0f172a", text: "#ffffff", primary: "#3b82f6", accent: "#f5c518", mood: "professional", energy: ["medium"] },
      { bg: "#f8fafc", text: "#0f172a", primary: "#1e40af", accent: "#16a34a", mood: "corporate", energy: ["low"] },
      { bg: "#0a0a0a", text: "#ffffff", primary: "#f5c518", accent: "#ffffff", mood: "bold", energy: ["high"] },
      { bg: "#1e293b", text: "#ffffff", primary: "#22c55e", accent: "#3b82f6", mood: "growth", energy: ["medium"] },
      { bg: "#fafafa", text: "#111111", primary: "#111111", accent: "#f59e0b", mood: "minimal", energy: ["low"] },
    ],
  },

  // ── Music ─────────────────────────────────────────────────
  music: {
    colorFamily: "electric",
    avoid: ["light"],
    palettes: [
      { bg: "#050510", text: "#ffffff", primary: "#ec4899", accent: "#7c5cfc", mood: "rave", energy: ["high"] },
      { bg: "#0a0500", text: "#ffffff", primary: "#f97316", accent: "#fbbf24", mood: "warm", energy: ["high", "medium"] },
      { bg: "#000a14", text: "#ffffff", primary: "#06b6d4", accent: "#7c5cfc", mood: "chill", energy: ["low", "medium"] },
      { bg: "#1a001a", text: "#ffffff", primary: "#a855f7", accent: "#ec4899", mood: "vibe", energy: ["medium"] },
      { bg: "#0a0a0a", text: "#ffffff", primary: "#ffffff", accent: "#f5c518", mood: "classic", energy: ["medium"] },
    ],
  },

  // ── Comedy / Meme ─────────────────────────────────────────
  comedy: {
    colorFamily: "neutral",
    avoid: [],
    palettes: [
      { bg: "#fbbf24", text: "#1a1a1a", primary: "#dc2626", accent: "#1a1a1a", mood: "punchy", energy: ["high"] },
      { bg: "#0a0a12", text: "#ffffff", primary: "#fbbf24", accent: "#ec4899", mood: "meme", energy: ["high"] },
      { bg: "#f8fafc", text: "#111111", primary: "#111111", accent: "#dc2626", mood: "deadpan", energy: ["medium"] },
      { bg: "#ec4899", text: "#ffffff", primary: "#fbbf24", accent: "#ffffff", mood: "chaotic", energy: ["high"] },
      { bg: "#1a1a1a", text: "#fbbf24", primary: "#fbbf24", accent: "#ec4899", mood: "dark", energy: ["medium"] },
    ],
  },

  // ── News / Current Affairs ────────────────────────────────
  news: {
    colorFamily: "cool",
    avoid: [],
    palettes: [
      { bg: "#0f172a", text: "#ffffff", primary: "#dc2626", accent: "#ffffff", mood: "breaking", energy: ["high"] },
      { bg: "#f8fafc", text: "#0f172a", primary: "#1e40af", accent: "#dc2626", mood: "editorial", energy: ["medium"] },
      { bg: "#0a0a0a", text: "#ffffff", primary: "#f59e0b", accent: "#ffffff", mood: "urgent", energy: ["high"] },
      { bg: "#1e293b", text: "#ffffff", primary: "#3b82f6", accent: "#f59e0b", mood: "report", energy: ["medium"] },
      { bg: "#fafafa", text: "#111111", primary: "#111111", accent: "#dc2626", mood: "print", energy: ["low"] },
    ],
  },

  // ── Motivational / Self Help ──────────────────────────────
  motivational: {
    colorFamily: "warm",
    avoid: [],
    palettes: [
      { bg: "#0a0a0a", text: "#ffffff", primary: "#f59e0b", accent: "#ffffff", mood: "fire", energy: ["high"] },
      { bg: "#0f172a", text: "#ffffff", primary: "#8b5cf6", accent: "#f5c518", mood: "inspire", energy: ["medium"] },
      { bg: "#fef9f0", text: "#1a1a1a", primary: "#d97706", accent: "#dc2626", mood: "warm", energy: ["medium"] },
      { bg: "#050510", text: "#ffffff", primary: "#06b6d4", accent: "#8b5cf6", mood: "vision", energy: ["medium"] },
      { bg: "#1a0500", text: "#ffffff", primary: "#ea580c", accent: "#fbbf24", mood: "hustle", energy: ["high"] },
    ],
  },

};

/**
 * resolveNichePalette
 * Picks the best palette for a given niche + energy + videoType.
 *
 * @param {string} niche       — niche key from registry
 * @param {number} energy      — beat energy 0-1
 * @param {string} videoType   — "viral" | "explainer" | "story" | etc
 * @param {string|null} brandColor — user brand color, replaces primary if set
 * @returns {{ bg, text, primary, accent, colorFamily, mood }}
 */
export function resolveNichePalette(niche, energy = 0.7, videoType = "viral", brandColor = null) {
  const nicheData = nichePaletteRegistry[niche] ?? nichePaletteRegistry.entertainment;
  const energyLevel = energy >= 0.7 ? "high" : energy >= 0.4 ? "medium" : "low";

  // Filter palettes by energy match
  let candidates = nicheData.palettes.filter(p => p.energy.includes(energyLevel));

  // Fallback to all palettes if no energy match
  if (!candidates.length) candidates = nicheData.palettes;

  // Bias toward punchy palettes for viral video type
  if (videoType === "viral" && energyLevel !== "low") {
    const punchy = candidates.filter(p => ["viral","fire","electric","power","bold","punchy"].includes(p.mood));
    if (punchy.length) candidates = punchy;
  }

  // Pick randomly from valid pool
  const palette = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    bg:          palette.bg,
    text:        palette.text,
    primary:     brandColor ?? palette.primary,
    accent:      palette.accent,
    colorFamily: nicheData.colorFamily,
    mood:        palette.mood,
  };
}

/**
 * resolveColorStory
 * Produces a full colorStory object for videoDNA from niche + project settings.
 *
 * @param {string} niche
 * @param {number} energy
 * @param {string} videoType
 * @param {string|null} brandColor
 * @returns {{ bg, text, primary, accent, colorFamily }}
 */
export function resolveColorStory(niche, energy = 0.7, videoType = "viral", brandColor = null) {
  return resolveNichePalette(niche, energy, videoType, brandColor);
}

/**
 * getNicheColorFamily
 * Returns the color family for a niche — used by backgroundPatternRegistry filter.
 */
export function getNicheColorFamily(niche) {
  return nichePaletteRegistry[niche]?.colorFamily ?? "neutral";
}

/**
 * getNicheAvoid
 * Returns color families to avoid for a niche.
 */
export function getNicheAvoid(niche) {
  return nichePaletteRegistry[niche]?.avoid ?? [];
}