/**
 * videoDNA.js
 * src/core/videoDNA.js
 *
 * Generates a deterministic Video DNA object from videoType + tone.
 * No AI call — derived from known inputs.
 * Drives: background color story, typography font stack, motion pacing.
 */

/* ── Typography systems ─────────────────────────────────────── */
export const TYPOGRAPHY_SYSTEMS = {
  brutal: {
    label:   "Brutal",
    heading: "'Bebas Neue', sans-serif",
    body:    "'Barlow Condensed', sans-serif",
  },
  editorial: {
    label:   "Editorial",
    heading: "'Playfair Display', serif",
    body:    "'Lato', sans-serif",
  },
  tech: {
    label:   "Tech",
    heading: "'Outfit', sans-serif",
    body:    "'JetBrains Mono', monospace",
  },
  warm: {
    label:   "Warm",
    heading: "'Syne', sans-serif",
    body:    "'Nunito', sans-serif",
  },
  cinematic: {
    label:   "Cinematic",
    heading: "'Bebas Neue', sans-serif",
    body:    "'Outfit', sans-serif",
  },
};

/* ── Color stories ──────────────────────────────────────────── */
// Each story is a consistent palette applied across all beats.
const COLOR_STORIES = {
  electric: { bg: "#07060f", primary: "#7c5cfc", text: "#ffffff" },
  fire:     { bg: "#0f0500", primary: "#ff4500", text: "#ffffff" },
  gold:     { bg: "#090700", primary: "#f5c518", text: "#ffffff" },
  neon:     { bg: "#030a08", primary: "#00f2ea", text: "#ffffff" },
  crimson:  { bg: "#0f0005", primary: "#e11d48", text: "#ffffff" },
  ocean:    { bg: "#020c18", primary: "#0ea5e9", text: "#ffffff" },
  carbon:   { bg: "#0d0d0d", primary: "#ffffff", text: "#ffffff" },
  midnight: { bg: "#0f172a", primary: "#818cf8", text: "#ffffff" },
};

/* ── DNA presets — videoType:tone → typography + color + motion ─ */
const DNA_PRESETS = {
  "viral:bold":            { typography: "brutal",    color: "fire",     motion: "kinetic" },
  "viral:funny":           { typography: "warm",      color: "gold",     motion: "kinetic" },
  "viral:conversational":  { typography: "warm",      color: "electric", motion: "smooth"  },
  "viral:emotional":       { typography: "editorial", color: "crimson",  motion: "smooth"  },
  "viral:educational":     { typography: "tech",      color: "midnight", motion: "smooth"  },
  "entertainment:bold":    { typography: "brutal",    color: "electric", motion: "kinetic" },
  "entertainment:funny":   { typography: "warm",      color: "gold",     motion: "kinetic" },
  "entertainment:emotional":{ typography: "editorial",color: "crimson",  motion: "smooth"  },
  "news:bold":             { typography: "cinematic", color: "crimson",  motion: "smooth"  },
  "news:educational":      { typography: "tech",      color: "ocean",    motion: "static"  },
  "news:conversational":   { typography: "cinematic", color: "midnight", motion: "smooth"  },
  "explainer:educational": { typography: "tech",      color: "ocean",    motion: "static"  },
  "explainer:bold":        { typography: "cinematic", color: "midnight", motion: "smooth"  },
  "explainer:conversational":{ typography: "warm",    color: "electric", motion: "smooth"  },
  "opinion:bold":          { typography: "brutal",    color: "fire",     motion: "kinetic" },
  "opinion:conversational":{ typography: "warm",      color: "gold",     motion: "smooth"  },
  "story:emotional":       { typography: "editorial", color: "midnight", motion: "smooth"  },
  "story:conversational":  { typography: "warm",      color: "gold",     motion: "smooth"  },
  "story:bold":            { typography: "cinematic", color: "crimson",  motion: "smooth"  },
};

const FALLBACK = { typography: "cinematic", color: "electric", motion: "smooth" };

/* ── Niche detection ─────────────────────────────────────────── */
// Maps videoType keywords to layout niches (must match folder names in src/core/layouts/)
const NICHE_MAP = {
  finance:       ["finance", "investing", "crypto", "stocks", "money", "economics", "trading"],
  tech:          ["tech", "ai", "software", "coding", "startup", "saas", "developer", "app"],
  fitness:       ["fitness", "health", "workout", "nutrition", "gym", "wellness", "diet"],
  business:      ["business", "entrepreneur", "marketing", "career", "sales", "productivity"],
  entertainment: ["entertainment", "celebrity", "music", "movies", "pop culture", "drama", "viral"],
  food:          ["food", "recipe", "cooking", "restaurant", "travel", "lifestyle"],
  education:     ["education", "learning", "self-improvement", "explainer", "how-to", "history", "science"],
  news:          ["news", "politics", "world events", "trending", "breaking"],
  beauty:        ["beauty", "fashion", "skincare", "makeup", "style", "aesthetic"],
  gaming:        ["gaming", "esports", "sports", "games", "highlights"],
};

function detectNiche(videoType = "") {
  const lower = videoType.toLowerCase();
  for (const [niche, keywords] of Object.entries(NICHE_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return niche;
  }
  return null; // null → universal layouts only
}

/* ── Main export ─────────────────────────────────────────────── */
export function generateVideoDNA({ videoType = "viral", tone = "bold" }) {
  const key    = `${videoType}:${tone}`;
  const preset = DNA_PRESETS[key] || FALLBACK;

  return {
    typographySystem: preset.typography,
    colorStory:       COLOR_STORIES[preset.color] || COLOR_STORIES.electric,
    motionStyle:      preset.motion,
    niche:            detectNiche(videoType),
  };
}
