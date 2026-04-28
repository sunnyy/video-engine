/**
 * backgroundPatternRegistry.js
 * src/core/registries/backgroundPatternRegistry.js
 *
 * Added fields per entry:
 *   niche    — array of niches this background suits
 *   category — "bright" | "light" | "gradient" | "neon" | "pattern" | "dark"
 */

export const backgroundPatternRegistry = {

  /* ── BRIGHT SOLIDS ───────────────────────────────────────── */

  crimson: {
    style:      { background: "#dc2626" },
    brightness: "mid", mood: "intense", energy: "high",
    works_with: ["white", "black", "yellow"],
    intent:     ["shock", "urgency", "contrast", "irony"],
    niche:      ["entertainment", "sports", "gaming"],
    category:   "bright",
  },
  scarlet: {
    style:      { background: "#e11d48" },
    brightness: "mid", mood: "bold", energy: "high",
    works_with: ["white", "black", "yellow"],
    intent:     ["shock", "urgency", "punchline", "reveal", "irony"],
    niche:      ["entertainment", "sports", "gaming"],
    category:   "bright",
  },
  orange: {
    style:      { background: "#ea580c" },
    brightness: "mid", mood: "energetic", energy: "high",
    works_with: ["white", "black", "dark"],
    intent:     ["urgency", "punchline", "curiosity", "contrast"],
    niche:      ["entertainment", "food", "sports"],
    category:   "bright",
  },
  amber: {
    style:      { background: "#d97706" },
    brightness: "mid", mood: "warm", energy: "high",
    works_with: ["dark", "black", "white"],
    intent:     ["punchline", "proof", "urgency", "reveal", "contrast"],
    niche:      ["finance", "food", "lifestyle"],
    category:   "bright",
  },
  sunYellow: {
    style:      { background: "#eab308" },
    brightness: "light", mood: "punchy", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["punchline", "shock", "curiosity"],
    niche:      ["entertainment", "education", "food"],
    category:   "bright",
  },
  lime: {
    style:      { background: "#84cc16" },
    brightness: "light", mood: "fresh", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["punchline", "proof", "curiosity"],
    niche:      ["health", "sports", "lifestyle"],
    category:   "bright",
  },
  emerald: {
    style:      { background: "#10b981" },
    brightness: "mid", mood: "growth", energy: "medium",
    works_with: ["white", "dark", "black"],
    intent:     ["proof", "empathy", "explanation"],
    niche:      ["health", "finance", "education"],
    category:   "bright",
  },
  teal: {
    style:      { background: "#14b8a6" },
    brightness: "mid", mood: "calm", energy: "medium",
    works_with: ["white", "dark", "black"],
    intent:     ["explanation", "proof", "curiosity"],
    niche:      ["health", "education", "lifestyle"],
    category:   "bright",
  },
  sky: {
    style:      { background: "#0ea5e9" },
    brightness: "mid", mood: "open", energy: "medium",
    works_with: ["white", "dark", "black"],
    intent:     ["explanation", "curiosity", "empathy"],
    niche:      ["travel", "education", "lifestyle"],
    category:   "bright",
  },
  cobalt: {
    style:      { background: "#2563eb" },
    brightness: "mid", mood: "serious", energy: "medium",
    works_with: ["white", "yellow", "light"],
    intent:     ["proof", "explanation", "curiosity"],
    niche:      ["finance", "tech", "education"],
    category:   "bright",
  },
  violet: {
    style:      { background: "#7c3aed" },
    brightness: "mid", mood: "creative", energy: "high",
    works_with: ["white", "yellow", "light"],
    intent:     ["curiosity", "reveal", "punchline"],
    niche:      ["entertainment", "gaming", "lifestyle"],
    category:   "bright",
  },
  purple: {
    style:      { background: "#9333ea" },
    brightness: "mid", mood: "playful", energy: "high",
    works_with: ["white", "yellow", "light"],
    intent:     ["curiosity", "irony", "punchline"],
    niche:      ["entertainment", "gaming", "lifestyle"],
    category:   "bright",
  },
  hotPink: {
    style:      { background: "#ec4899" },
    brightness: "mid", mood: "vibrant", energy: "high",
    works_with: ["white", "dark", "black"],
    intent:     ["punchline", "curiosity", "irony"],
    niche:      ["lifestyle", "entertainment", "food"],
    category:   "bright",
  },
  coral: {
    style:      { background: "#f43f5e" },
    brightness: "mid", mood: "lively", energy: "high",
    works_with: ["white", "dark", "black"],
    intent:     ["urgency", "punchline", "shock", "irony", "contrast"],
    niche:      ["entertainment", "lifestyle", "food"],
    category:   "bright",
  },
  // New bright solids
  roseRed: {
    style:      { background: "#f43f5e" },
    brightness: "mid", mood: "bold", energy: "high",
    works_with: ["white", "black"],
    intent:     ["hook", "shock", "urgency"],
    niche:      ["entertainment", "sports", "lifestyle"],
    category:   "bright",
  },
  indigoBlue: {
    style:      { background: "#4338ca" },
    brightness: "mid", mood: "serious", energy: "medium",
    works_with: ["white", "yellow", "light"],
    intent:     ["proof", "explanation", "curiosity"],
    niche:      ["tech", "finance", "education"],
    category:   "bright",
  },
  deepTeal: {
    style:      { background: "#0f766e" },
    brightness: "dark", mood: "calm", energy: "low",
    works_with: ["white", "light", "yellow"],
    intent:     ["explanation", "proof", "empathy"],
    niche:      ["health", "education", "finance"],
    category:   "bright",
  },
  forestGreen: {
    style:      { background: "#15803d" },
    brightness: "mid", mood: "grounded", energy: "medium",
    works_with: ["white", "yellow", "light"],
    intent:     ["proof", "empathy", "explanation"],
    niche:      ["health", "travel", "lifestyle"],
    category:   "bright",
  },
  slateBlue: {
    style:      { background: "#334155" },
    brightness: "dark", mood: "minimal", energy: "low",
    works_with: ["white", "light", "cyan"],
    intent:     ["explanation", "visual_rest", "proof"],
    niche:      ["finance", "tech", "education"],
    category:   "bright",
  },
  warmBrown: {
    style:      { background: "#92400e" },
    brightness: "dark", mood: "earthy", energy: "medium",
    works_with: ["white", "yellow", "light"],
    intent:     ["empathy", "story", "reveal"],
    niche:      ["food", "travel", "lifestyle"],
    category:   "bright",
  },

  /* ── LIGHT SOLIDS ────────────────────────────────────────── */

  warmCream: {
    style:      { background: "#fef3c7" },
    brightness: "light", mood: "warm", energy: "low",
    works_with: ["dark", "black", "brown", "navy"],
    intent:     ["empathy", "explanation", "story"],
    niche:      ["lifestyle", "food", "education"],
    category:   "light",
  },
  softWhite: {
    style:      { background: "#f8fafc" },
    brightness: "light", mood: "clean", energy: "low",
    works_with: ["dark", "black", "purple", "navy"],
    intent:     ["explanation", "proof", "empathy"],
    niche:      ["tech", "finance", "education", "health"],
    category:   "light",
  },
  blushPink: {
    style:      { background: "#fce7f3" },
    brightness: "light", mood: "gentle", energy: "low",
    works_with: ["dark", "purple", "navy"],
    intent:     ["empathy", "story", "curiosity"],
    niche:      ["lifestyle", "health", "food"],
    category:   "light",
  },
  mintLight: {
    style:      { background: "#d1fae5" },
    brightness: "light", mood: "fresh", energy: "low",
    works_with: ["dark", "green", "black"],
    intent:     ["proof", "punchline", "empathy"],
    niche:      ["health", "lifestyle", "education"],
    category:   "light",
  },
  lavenderLight: {
    style:      { background: "#ede9fe" },
    brightness: "light", mood: "playful", energy: "medium",
    works_with: ["dark", "purple", "navy"],
    intent:     ["curiosity", "punchline", "empathy"],
    niche:      ["lifestyle", "entertainment", "education"],
    category:   "light",
  },
  skyLight: {
    style:      { background: "#e0f2fe" },
    brightness: "light", mood: "calm", energy: "low",
    works_with: ["dark", "navy", "black"],
    intent:     ["explanation", "empathy", "proof"],
    niche:      ["travel", "education", "health"],
    category:   "light",
  },
  // New light solids
  peachLight: {
    style:      { background: "#fed7aa" },
    brightness: "light", mood: "warm", energy: "low",
    works_with: ["dark", "brown", "navy"],
    intent:     ["empathy", "story", "curiosity"],
    niche:      ["food", "lifestyle", "travel"],
    category:   "light",
  },
  lemonLight: {
    style:      { background: "#fef9c3" },
    brightness: "light", mood: "cheerful", energy: "medium",
    works_with: ["dark", "navy", "black"],
    intent:     ["punchline", "curiosity", "proof"],
    niche:      ["education", "food", "lifestyle"],
    category:   "light",
  },
  roseLight: {
    style:      { background: "#ffe4e6" },
    brightness: "light", mood: "gentle", energy: "low",
    works_with: ["dark", "navy", "purple"],
    intent:     ["empathy", "story", "curiosity"],
    niche:      ["lifestyle", "health", "food"],
    category:   "light",
  },
  slateLight: {
    style:      { background: "#f1f5f9" },
    brightness: "light", mood: "neutral", energy: "low",
    works_with: ["dark", "navy", "black"],
    intent:     ["explanation", "proof", "visual_rest"],
    niche:      ["finance", "tech", "education"],
    category:   "light",
  },

  /* ── DARK SOLIDS ─────────────────────────────────────────── */

  pitchBlack: {
    style:      { background: "#000000" },
    brightness: "dark", mood: "cinematic", energy: "low",
    works_with: ["white", "yellow", "cyan", "light"],
    intent:     ["visual_rest", "reveal", "contrast"],
    niche:      ["entertainment", "gaming", "finance", "tech"],
    category:   "dark",
  },
  nearBlack: {
    style:      { background: "#0a0a0f" },
    brightness: "dark", mood: "minimal", energy: "low",
    works_with: ["white", "light", "yellow"],
    intent:     ["visual_rest", "explanation", "proof"],
    niche:      ["tech", "finance", "gaming", "entertainment"],
    category:   "dark",
  },
  deepNavy: {
    style:      { background: "#0f172a" },
    brightness: "dark", mood: "serious", energy: "low",
    works_with: ["white", "cyan", "yellow", "light"],
    intent:     ["proof", "explanation", "visual_rest"],
    niche:      ["finance", "tech", "education"],
    category:   "dark",
  },
  richBlack: {
    style:      { background: "#09090b" },
    brightness: "dark", mood: "premium", energy: "low",
    works_with: ["white", "gold", "yellow"],
    intent:     ["reveal", "visual_rest", "proof"],
    niche:      ["lifestyle", "finance", "entertainment"],
    category:   "dark",
  },
  darkBrown: {
    style:      { background: "#1c0a00" },
    brightness: "dark", mood: "warm", energy: "low",
    works_with: ["white", "yellow", "light"],
    intent:     ["empathy", "story", "visual_rest"],
    niche:      ["food", "travel", "lifestyle"],
    category:   "dark",
  },
  darkSlate: {
    style:      { background: "#1e293b" },
    brightness: "dark", mood: "structured", energy: "low",
    works_with: ["white", "cyan", "light"],
    intent:     ["explanation", "proof", "visual_rest"],
    niche:      ["tech", "finance", "education"],
    category:   "dark",
  },

  /* ── GRADIENTS ───────────────────────────────────────────── */

  gradientSunset: {
    style:      { background: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)" },
    brightness: "mid", mood: "energetic", energy: "high",
    works_with: ["dark", "white", "navy"],
    intent:     ["punchline", "urgency", "shock", "reveal", "contrast"],
    niche:      ["entertainment", "lifestyle", "travel"],
    category:   "gradient",
  },
  gradientNeonPink: {
    style:      { background: "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)" },
    brightness: "mid", mood: "electric", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["punchline", "curiosity", "irony"],
    niche:      ["entertainment", "lifestyle", "gaming"],
    category:   "gradient",
  },
  gradientPurpleFire: {
    style:      { background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)" },
    brightness: "mid", mood: "bold", energy: "high",
    works_with: ["white", "yellow", "light"],
    intent:     ["shock", "reveal", "curiosity"],
    niche:      ["entertainment", "gaming", "lifestyle"],
    category:   "gradient",
  },
  gradientOcean: {
    style:      { background: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)" },
    brightness: "mid", mood: "fresh", energy: "medium",
    works_with: ["dark", "white", "navy"],
    intent:     ["curiosity", "explanation", "proof"],
    niche:      ["travel", "tech", "education"],
    category:   "gradient",
  },
  gradientGold: {
    style:      { background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" },
    brightness: "mid", mood: "premium", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["proof", "reveal", "punchline"],
    niche:      ["finance", "lifestyle", "entertainment"],
    category:   "gradient",
  },
  gradientLime: {
    style:      { background: "linear-gradient(135deg, #84cc16 0%, #10b981 100%)" },
    brightness: "mid", mood: "fresh", energy: "high",
    works_with: ["dark", "black", "navy"],
    intent:     ["punchline", "proof", "curiosity"],
    niche:      ["health", "sports", "lifestyle"],
    category:   "gradient",
  },
  gradientCandyFloss: {
    style:      { background: "linear-gradient(135deg, #f9a8d4 0%, #c084fc 100%)" },
    brightness: "light", mood: "playful", energy: "medium",
    works_with: ["dark", "navy", "purple"],
    intent:     ["curiosity", "empathy", "punchline"],
    niche:      ["lifestyle", "entertainment", "food"],
    category:   "gradient",
  },
  gradientDeepPurple: {
    style:      { background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)" },
    brightness: "dark", mood: "cinematic", energy: "medium",
    works_with: ["light", "white", "cyan", "yellow"],
    intent:     ["proof", "explanation", "curiosity"],
    niche:      ["gaming", "tech", "entertainment"],
    category:   "gradient",
  },
  gradientMidnight: {
    style:      { background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" },
    brightness: "dark", mood: "cinematic", energy: "medium",
    works_with: ["light", "white", "cyan", "yellow"],
    intent:     ["proof", "explanation", "curiosity"],
    niche:      ["finance", "tech", "education"],
    category:   "gradient",
  },
  gradientWarmLight: {
    style:      { background: "linear-gradient(135deg, #fef9c3 0%, #fde68a 50%, #fca5a5 100%)" },
    brightness: "light", mood: "warm", energy: "medium",
    works_with: ["dark", "brown", "navy"],
    intent:     ["punchline", "empathy", "proof"],
    niche:      ["food", "lifestyle", "travel"],
    category:   "gradient",
  },
  // New gradients
  gradientAurora: {
    style:      { background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)" },
    brightness: "mid", mood: "electric", energy: "high",
    works_with: ["white", "dark", "black"],
    intent:     ["hook", "reveal", "curiosity"],
    niche:      ["gaming", "entertainment", "tech"],
    category:   "gradient",
  },
  gradientVolcano: {
    style:      { background: "linear-gradient(135deg, #1c0500 0%, #7f1d1d 50%, #ea580c 100%)" },
    brightness: "dark", mood: "intense", energy: "high",
    works_with: ["white", "yellow", "light"],
    intent:     ["shock", "urgency", "contrast"],
    niche:      ["entertainment", "gaming", "sports"],
    category:   "gradient",
  },
  gradientForest: {
    style:      { background: "linear-gradient(135deg, #052e16 0%, #166534 50%, #84cc16 100%)" },
    brightness: "dark", mood: "grounded", energy: "medium",
    works_with: ["white", "yellow", "light"],
    intent:     ["proof", "empathy", "explanation"],
    niche:      ["health", "travel", "lifestyle"],
    category:   "gradient",
  },
  gradientSteel: {
    style:      { background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)" },
    brightness: "dark", mood: "minimal", energy: "low",
    works_with: ["white", "cyan", "yellow"],
    intent:     ["explanation", "proof", "visual_rest"],
    niche:      ["finance", "tech", "education"],
    category:   "gradient",
  },
  gradientCotton: {
    style:      { background: "linear-gradient(135deg, #fdf4ff 0%, #fce7f3 50%, #eff6ff 100%)" },
    brightness: "light", mood: "soft", energy: "low",
    works_with: ["dark", "navy", "purple"],
    intent:     ["empathy", "visual_rest", "story"],
    niche:      ["lifestyle", "health", "food"],
    category:   "gradient",
  },
  gradientDusk: {
    style:      { background: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
    brightness: "dark", mood: "cinematic", energy: "medium",
    works_with: ["white", "light", "cyan"],
    intent:     ["reveal", "visual_rest", "curiosity"],
    niche:      ["entertainment", "gaming", "travel"],
    category:   "gradient",
  },
  gradientChrome: {
    style:      { background: "linear-gradient(135deg, #c0c0c0 0%, #ffffff 40%, #a0a0a0 100%)" },
    brightness: "light", mood: "premium", energy: "medium",
    works_with: ["dark", "black", "navy"],
    intent:     ["proof", "reveal", "contrast"],
    niche:      ["tech", "finance", "lifestyle"],
    category:   "gradient",
  },
  gradientNeonBlue: {
    style:      { background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" },
    brightness: "mid", mood: "futuristic", energy: "high",
    works_with: ["white", "dark", "black"],
    intent:     ["curiosity", "hook", "reveal"],
    niche:      ["tech", "gaming", "entertainment"],
    category:   "gradient",
  },
  gradientSherbet: {
    style:      { background: "linear-gradient(135deg, #fbbf24 0%, #f87171 50%, #c084fc 100%)" },
    brightness: "mid", mood: "playful", energy: "high",
    works_with: ["dark", "navy", "black"],
    intent:     ["punchline", "curiosity", "hook"],
    niche:      ["food", "entertainment", "lifestyle"],
    category:   "gradient",
  },

  /* ── NEON / GLOW / MESH ──────────────────────────────────── */

  neonPurpleGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #7c3aed 0%, #3b0764 40%, #0a0514 100%)" },
    brightness: "dark", mood: "electric", energy: "high",
    works_with: ["light", "white", "pink", "cyan"],
    intent:     ["shock", "curiosity", "reveal"],
    niche:      ["gaming", "entertainment", "tech"],
    category:   "neon",
  },
  neonCyanGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #06b6d4 0%, #0c4a6e 40%, #000a0a 100%)" },
    brightness: "dark", mood: "futuristic", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "contrast", "reveal"],
    niche:      ["tech", "gaming", "entertainment"],
    category:   "neon",
  },
  neonPinkGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #ec4899 0%, #831843 40%, #0a0005 100%)" },
    brightness: "dark", mood: "vibrant", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["shock", "punchline", "curiosity"],
    niche:      ["entertainment", "lifestyle", "gaming"],
    category:   "neon",
  },
  neonGreenGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #10b981 0%, #064e3b 40%, #000a05 100%)" },
    brightness: "dark", mood: "matrix", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "contrast", "reveal"],
    niche:      ["tech", "gaming", "sports"],
    category:   "neon",
  },
  neonOrangeGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #ea580c 0%, #7c2d12 40%, #0f0500 100%)" },
    brightness: "dark", mood: "intense", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["shock", "urgency", "hook"],
    niche:      ["sports", "gaming", "entertainment"],
    category:   "neon",
  },
  neonGoldGlow: {
    style:      { background: "radial-gradient(ellipse at 50% 40%, #f59e0b 0%, #78350f 40%, #0a0600 100%)" },
    brightness: "dark", mood: "premium", energy: "high",
    works_with: ["light", "white", "black"],
    intent:     ["reveal", "proof", "punchline"],
    niche:      ["finance", "lifestyle", "entertainment"],
    category:   "neon",
  },
  meshPurpleBlue: {
    style:      { background: "radial-gradient(ellipse at 20% 20%, #7c3aed 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #2563eb 0%, transparent 55%), #0f0a1a" },
    brightness: "dark", mood: "cinematic", energy: "high",
    works_with: ["light", "white", "pink", "yellow"],
    intent:     ["reveal", "curiosity", "shock"],
    niche:      ["gaming", "tech", "entertainment"],
    category:   "neon",
  },
  meshSunsetFire: {
    style:      { background: "radial-gradient(ellipse at 20% 80%, #ea580c 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #dc2626 0%, transparent 50%), #1a0500" },
    brightness: "dark", mood: "intense", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["shock", "urgency", "contrast", "irony", "reveal"],
    niche:      ["sports", "gaming", "entertainment"],
    category:   "neon",
  },
  meshOceanBreeze: {
    style:      { background: "radial-gradient(ellipse at 30% 30%, #0ea5e9 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, #10b981 0%, transparent 50%), #041225" },
    brightness: "dark", mood: "calm", energy: "medium",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "explanation", "proof"],
    niche:      ["travel", "health", "education"],
    category:   "neon",
  },
  // New neon/mesh
  meshRoseGold: {
    style:      { background: "radial-gradient(ellipse at 20% 20%, #f43f5e 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #f59e0b 0%, transparent 55%), #1a0a10" },
    brightness: "dark", mood: "premium", energy: "high",
    works_with: ["white", "light", "yellow"],
    intent:     ["reveal", "punchline", "hook"],
    niche:      ["lifestyle", "entertainment", "finance"],
    category:   "neon",
  },
  meshNeonTriad: {
    style:      { background: "radial-gradient(ellipse at 15% 15%, #06b6d4 0%, transparent 40%), radial-gradient(ellipse at 85% 15%, #ec4899 0%, transparent 40%), radial-gradient(ellipse at 50% 90%, #7c3aed 0%, transparent 40%), #05050f" },
    brightness: "dark", mood: "electric", energy: "high",
    works_with: ["white", "light"],
    intent:     ["hook", "shock", "curiosity"],
    niche:      ["gaming", "entertainment", "tech"],
    category:   "neon",
  },
  meshForestGlow: {
    style:      { background: "radial-gradient(ellipse at 30% 40%, #166534 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, #84cc16 0%, transparent 40%), #020d04" },
    brightness: "dark", mood: "grounded", energy: "medium",
    works_with: ["white", "light", "yellow"],
    intent:     ["proof", "empathy", "explanation"],
    niche:      ["health", "travel", "lifestyle"],
    category:   "neon",
  },
  meshCinema: {
    style:      { background: "radial-gradient(ellipse at 50% 0%, #374151 0%, transparent 60%), #111827" },
    brightness: "dark", mood: "cinematic", energy: "low",
    works_with: ["white", "light", "yellow"],
    intent:     ["visual_rest", "reveal", "explanation"],
    niche:      ["entertainment", "education", "lifestyle"],
    category:   "neon",
  },

  /* ── PATTERNS ────────────────────────────────────────────── */

  gridWhite: {
    style:      { backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)", backgroundColor: "#111118", backgroundSize: "48px 48px" },
    brightness: "dark", mood: "structured", energy: "low",
    works_with: ["light", "white", "cyan", "yellow"],
    intent:     ["proof", "explanation", "list"],
    niche:      ["tech", "finance", "education"],
    category:   "pattern",
  },
  gridPurple: {
    style:      { backgroundImage: "linear-gradient(rgba(124,92,252,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.35) 1px, transparent 1px)", backgroundColor: "#0a0810", backgroundSize: "48px 48px" },
    brightness: "dark", mood: "futuristic", energy: "high",
    works_with: ["light", "cyan", "pink", "yellow"],
    intent:     ["curiosity", "shock", "contrast"],
    niche:      ["gaming", "tech", "entertainment"],
    category:   "pattern",
  },
  gridLight: {
    style:      { backgroundImage: "linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)", backgroundColor: "#f8fafc", backgroundSize: "40px 40px" },
    brightness: "light", mood: "structured", energy: "low",
    works_with: ["dark", "black", "navy"],
    intent:     ["explanation", "proof", "list"],
    niche:      ["education", "finance", "tech"],
    category:   "pattern",
  },
  dotsWhite: {
    style:      { backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.45) 2px, transparent 2px)", backgroundColor: "#111118", backgroundSize: "28px 28px" },
    brightness: "dark", mood: "playful", energy: "medium",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "punchline", "list"],
    niche:      ["entertainment", "lifestyle", "education"],
    category:   "pattern",
  },
  dotsColor: {
    style:      { backgroundImage: "radial-gradient(circle, rgba(124,92,252,0.6) 2px, transparent 2px)", backgroundColor: "#07060f", backgroundSize: "28px 28px" },
    brightness: "dark", mood: "electric", energy: "high",
    works_with: ["light", "white", "pink"],
    intent:     ["curiosity", "shock", "reveal"],
    niche:      ["gaming", "tech", "entertainment"],
    category:   "pattern",
  },
  diagonalStripes: {
    style:      { backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 2px, transparent 2px, transparent 28px)", backgroundColor: "#111118", backgroundSize: "40px 40px" },
    brightness: "dark", mood: "dynamic", energy: "medium",
    works_with: ["light", "white", "yellow"],
    intent:     ["curiosity", "contrast", "list"],
    niche:      ["entertainment", "sports", "gaming"],
    category:   "pattern",
  },
  diagonalBright: {
    style:      { backgroundImage: "repeating-linear-gradient(45deg, rgba(234,88,12,0.25) 0px, rgba(234,88,12,0.25) 4px, transparent 4px, transparent 24px)", backgroundColor: "#1a0800", backgroundSize: "34px 34px" },
    brightness: "dark", mood: "energetic", energy: "high",
    works_with: ["light", "white", "yellow"],
    intent:     ["urgency", "shock", "contrast", "irony", "reveal"],
    niche:      ["sports", "gaming", "entertainment"],
    category:   "pattern",
  },
  crosshatch: {
    style:      { backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 32px)", backgroundColor: "#0d0d18", backgroundSize: "32px 32px" },
    brightness: "dark", mood: "structured", energy: "low",
    works_with: ["light", "white", "cyan"],
    intent:     ["proof", "explanation", "list"],
    niche:      ["tech", "finance", "education"],
    category:   "pattern",
  },
  // New patterns
  noiseDark: {
    style:      { backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\")", backgroundColor: "#0f0f13", backgroundSize: "256px 256px" },
    brightness: "dark", mood: "cinematic", energy: "low",
    works_with: ["white", "light", "yellow"],
    intent:     ["visual_rest", "reveal", "explanation"],
    niche:      ["entertainment", "lifestyle", "finance"],
    category:   "pattern",
  },
  chevronDark: {
    style:      { backgroundImage: "repeating-linear-gradient(120deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(60deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 60px)", backgroundColor: "#111118", backgroundSize: "70px 120px" },
    brightness: "dark", mood: "dynamic", energy: "medium",
    works_with: ["white", "light", "yellow"],
    intent:     ["curiosity", "contrast", "hook"],
    niche:      ["sports", "gaming", "entertainment"],
    category:   "pattern",
  },
  honeycomb: {
    style:      { backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08) 25%, transparent 26%), radial-gradient(circle at 0% 50%, rgba(255,255,255,0.08) 25%, transparent 26%)", backgroundColor: "#0d0d18", backgroundSize: "40px 70px" },
    brightness: "dark", mood: "structured", energy: "medium",
    works_with: ["white", "yellow", "cyan"],
    intent:     ["explanation", "proof", "curiosity"],
    niche:      ["tech", "education", "gaming"],
    category:   "pattern",
  },
  dotsLarge: {
    style:      { backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 4px, transparent 4px)", backgroundColor: "#0a0a12", backgroundSize: "44px 44px" },
    brightness: "dark", mood: "playful", energy: "medium",
    works_with: ["white", "light", "yellow"],
    intent:     ["curiosity", "punchline", "hook"],
    niche:      ["entertainment", "lifestyle", "food"],
    category:   "pattern",
  },
  scanlines: {
    style:      { backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 4px)", backgroundColor: "#111118", backgroundSize: "100% 4px" },
    brightness: "dark", mood: "retro", energy: "medium",
    works_with: ["white", "cyan", "green"],
    intent:     ["contrast", "curiosity", "hook"],
    niche:      ["gaming", "tech", "entertainment"],
    category:   "pattern",
  },
  gridColorCyan: {
    style:      { backgroundImage: "linear-gradient(rgba(6,182,212,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.25) 1px, transparent 1px)", backgroundColor: "#020d10", backgroundSize: "44px 44px" },
    brightness: "dark", mood: "futuristic", energy: "high",
    works_with: ["white", "light", "yellow"],
    intent:     ["hook", "curiosity", "reveal"],
    niche:      ["tech", "gaming", "entertainment"],
    category:   "pattern",
  },
};

/* ── Category map ─────────────────────────────────────────── */
export const backgroundCategories = {
  bright:   ["crimson","scarlet","orange","amber","sunYellow","lime","emerald","teal","sky","cobalt","violet","purple","hotPink","coral","roseRed","indigoBlue","deepTeal","forestGreen","slateBlue","warmBrown"],
  light:    ["warmCream","softWhite","blushPink","mintLight","lavenderLight","skyLight","peachLight","lemonLight","roseLight","slateLight"],
  dark:     ["pitchBlack","nearBlack","deepNavy","richBlack","darkBrown","darkSlate"],
  gradient: ["gradientSunset","gradientNeonPink","gradientPurpleFire","gradientOcean","gradientGold","gradientLime","gradientCandyFloss","gradientDeepPurple","gradientMidnight","gradientWarmLight","gradientAurora","gradientVolcano","gradientForest","gradientSteel","gradientCotton","gradientDusk","gradientChrome","gradientNeonBlue","gradientSherbet"],
  neon:     ["neonPurpleGlow","neonCyanGlow","neonPinkGlow","neonGreenGlow","neonOrangeGlow","neonGoldGlow","meshPurpleBlue","meshSunsetFire","meshOceanBreeze","meshRoseGold","meshNeonTriad","meshForestGlow","meshCinema"],
  pattern:  ["gridWhite","gridPurple","gridLight","dotsWhite","dotsColor","diagonalStripes","diagonalBright","crosshatch","noiseDark","chevronDark","honeycomb","dotsLarge","scanlines","gridColorCyan"],
};

/* ── Color family membership ─────────────────────────────── */
const COLOR_FAMILY_KEYS = {
  warm:     new Set(["crimson","scarlet","orange","amber","coral","roseRed","warmBrown","darkBrown","gradientSunset","gradientGold","gradientVolcano","gradientSherbet","meshSunsetFire","neonOrangeGlow","neonGoldGlow","meshRoseGold","diagonalBright"]),
  cool:     new Set(["emerald","teal","sky","cobalt","deepTeal","forestGreen","deepNavy","darkSlate","slateBlue","indigoBlue","gradientOcean","gradientMidnight","gradientForest","gradientSteel","gradientNeonBlue","neonCyanGlow","neonGreenGlow","meshOceanBreeze","meshForestGlow","gridWhite","crosshatch","gridColorCyan"]),
  electric: new Set(["violet","purple","hotPink","gradientNeonPink","gradientPurpleFire","gradientAurora","gradientDusk","neonPurpleGlow","neonPinkGlow","meshPurpleBlue","meshNeonTriad","gridPurple","dotsColor","scanlines"]),
  neutral:  new Set(["warmCream","softWhite","blushPink","mintLight","lavenderLight","skyLight","peachLight","lemonLight","roseLight","slateLight","pitchBlack","nearBlack","richBlack","sunYellow","lime","gradientLime","gradientCandyFloss","gradientCotton","gradientChrome","meshCinema","noiseDark","dotsWhite","dotsLarge","diagonalStripes","honeycomb","chevronDark"]),
};

/* ── Niche map ───────────────────────────────────────────── */
export function getBackgroundsForNiche(niche) {
  return Object.entries(backgroundPatternRegistry)
    .filter(([, v]) => v.niche?.includes(niche))
    .map(([k]) => k);
}

/* ── Smart pickers ───────────────────────────────────────── */

/**
 * @param {string}  intent
 * @param {string|null} brightness   "light" | "mid" | "dark" | null
 * @param {string|null} colorFamily  "warm" | "cool" | "electric" | "neutral" | null
 * @param {boolean} excludeLight
 * @param {string|null} niche        filter by niche when provided
 */
export function getBackgroundForIntent(intent, brightness = null, colorFamily = null, excludeLight = false, niche = null, avoid = []) {
  // Resolve which color family a background key belongs to using COLOR_FAMILY_KEYS sets
  const getFamilyOf = (k) => {
    for (const [family, keys] of Object.entries(COLOR_FAMILY_KEYS)) {
      if (keys.has(k)) return family;
    }
    return null;
  };

  // True if this key's color family is in the avoid list
  const isAvoided = (k) => {
    if (!avoid?.length) return false;
    const bgFamily = getFamilyOf(k);
    return bgFamily !== null && avoid.includes(bgFamily);
  };

  let candidates = Object.entries(backgroundPatternRegistry)
    .filter(([, v]) => v.intent.includes(intent))
    .filter(([, v]) => !brightness || v.brightness === brightness)
    .filter(([, v]) => !excludeLight || v.brightness !== "light")
    .filter(([, v]) => !niche || v.niche?.includes(niche))
    .map(([k]) => k)
    .filter(k => !isAvoided(k));

  if (!candidates.length) {
    // Relax niche constraint, keep avoid
    candidates = Object.keys(backgroundPatternRegistry)
      .filter(k => !brightness || backgroundPatternRegistry[k].brightness === brightness)
      .filter(k => !excludeLight || backgroundPatternRegistry[k].brightness !== "light")
      .filter(k => !isAvoided(k));
  }

  // Last resort — no filtering at all
  if (!candidates.length) {
    candidates = Object.keys(backgroundPatternRegistry);
  }

  // colorFamily filter: always apply when a family is specified.
  // Requires only 1 match so the DNA color family is always honoured — even when the
  // intent+niche pool is small. Prevents warm-family (red) backgrounds being picked
  // for videos whose DNA accent is cool or electric.
  if (colorFamily && COLOR_FAMILY_KEYS[colorFamily]) {
    const familyCandidates = candidates.filter(k => COLOR_FAMILY_KEYS[colorFamily].has(k));
    if (familyCandidates.length >= 1) candidates = familyCandidates;
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