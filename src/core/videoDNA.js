/**
 * videoDNA.js
 * src/core/videoDNA.js
 *
 * Generates a deterministic Video DNA object from videoType + tone + niche.
 * No AI call — derived from known inputs.
 * Drives: background color story, typography font stack, motion pacing.
 */

import { resolveColorStory } from "./nichePaletteRegistry.js";

/* ── Typography systems ─────────────────────────────────────── */
export const TYPOGRAPHY_SYSTEMS = {
  brutal: {
    label:       "Brutal",
    display:     "'Bebas Neue', sans-serif",
    headline:    "'Bebas Neue', sans-serif",
    subtext:     "'Barlow Condensed', sans-serif",
    label:       "'Barlow Condensed', sans-serif",
    quote:       "'Barlow Condensed', sans-serif",
    stat:        "'Bebas Neue', sans-serif",
    weightDisplay: 900,
    weightBody:    700,
  },
  editorial: {
    label:       "Editorial",
    display:     "'Playfair Display', serif",
    headline:    "'Playfair Display', serif",
    subtext:     "'Lato', sans-serif",
    label:       "'Lato', sans-serif",
    quote:       "'Playfair Display', serif",
    stat:        "'Bebas Neue', sans-serif",
    weightDisplay: 700,
    weightBody:    400,
  },
  tech: {
    label:       "Tech",
    display:     "'Outfit', sans-serif",
    headline:    "'Outfit', sans-serif",
    subtext:     "'JetBrains Mono', monospace",
    label:       "'Outfit', sans-serif",
    quote:       "'Outfit', sans-serif",
    stat:        "'Outfit', sans-serif",
    weightDisplay: 800,
    weightBody:    500,
  },
  warm: {
    label:       "Warm",
    display:     "'Syne', sans-serif",
    headline:    "'Syne', sans-serif",
    subtext:     "'Nunito', sans-serif",
    label:       "'Nunito', sans-serif",
    quote:       "'Playfair Display', serif",
    stat:        "'Syne', sans-serif",
    weightDisplay: 800,
    weightBody:    600,
  },
  cinematic: {
    label:       "Cinematic",
    display:     "'Bebas Neue', sans-serif",
    headline:    "'Bebas Neue', sans-serif",
    subtext:     "'Outfit', sans-serif",
    label:       "'Outfit', sans-serif",
    quote:       "'Playfair Display', serif",
    stat:        "'Bebas Neue', sans-serif",
    weightDisplay: 900,
    weightBody:    500,
  },
  luxury: {
    label:       "Luxury",
    display:     "'Cormorant Garamond', serif",
    headline:    "'Cormorant Garamond', serif",
    subtext:     "'Lato', sans-serif",
    label:       "'Lato', sans-serif",
    quote:       "'Cormorant Garamond', serif",
    stat:        "'Bebas Neue', sans-serif",
    weightDisplay: 700,
    weightBody:    400,
  },
  energetic: {
    label:       "Energetic",
    display:     "'Oswald', sans-serif",
    headline:    "'Oswald', sans-serif",
    subtext:     "'Barlow Condensed', sans-serif",
    label:       "'Barlow Condensed', sans-serif",
    quote:       "'Barlow Condensed', sans-serif",
    stat:        "'Oswald', sans-serif",
    weightDisplay: 900,
    weightBody:    600,
  },
  minimal: {
    label:       "Minimal",
    display:     "'Outfit', sans-serif",
    headline:    "'Outfit', sans-serif",
    subtext:     "'Outfit', sans-serif",
    label:       "'Outfit', sans-serif",
    quote:       "'Playfair Display', serif",
    stat:        "'Outfit', sans-serif",
    weightDisplay: 700,
    weightBody:    400,
  },
};

/* ── Niche typography overrides ─────────────────────────────── */
// When a niche has a strong visual identity, it overrides the videoType+tone typography.
// Not all niches override — gaming/entertainment/sports let videoType+tone decide.
const NICHE_TYPOGRAPHY_MAP = {
  spiritual:    "editorial",   // Playfair italic feels devotional, not Bebas
  skincare:     "luxury",      // Cormorant Garamond — soft, premium
  food:         "warm",        // Syne + Nunito — approachable, warm
  travel:       "cinematic",   // Bebas + Outfit — adventure feel
  lifestyle:    "warm",        // Syne + Nunito — personal, relatable
  finance:      "minimal",     // Clean Outfit — trustworthy, professional
  tech:         "tech",        // Outfit + JetBrains Mono — digital native
  education:    "minimal",     // Clean, readable
  health:       "warm",        // Approachable, not clinical
  music:        "brutal",      // Bold, expressive
  comedy:       "warm",        // Playful, loose
  news:         "cinematic",   // Authoritative
  business:     "minimal",     // Professional
  motivational: "brutal",      // High energy, punchy
  gaming:       null,          // Let videoType+tone decide
  sports:       null,          // Let videoType+tone decide
  entertainment: null,         // Let videoType+tone decide
};

/* ── DNA presets — videoType:tone → typography + motion ─────── */
const DNA_PRESETS = {
  "viral:bold":               { typography: "brutal",    motion: "kinetic" },
  "viral:funny":              { typography: "warm",      motion: "kinetic" },
  "viral:conversational":     { typography: "warm",      motion: "smooth"  },
  "viral:emotional":          { typography: "editorial", motion: "smooth"  },
  "viral:educational":        { typography: "tech",      motion: "smooth"  },
  "entertainment:bold":       { typography: "brutal",    motion: "kinetic" },
  "entertainment:funny":      { typography: "warm",      motion: "kinetic" },
  "entertainment:emotional":  { typography: "editorial", motion: "smooth"  },
  "news:bold":                { typography: "cinematic", motion: "smooth"  },
  "news:educational":         { typography: "tech",      motion: "static"  },
  "news:conversational":      { typography: "cinematic", motion: "smooth"  },
  "explainer:educational":    { typography: "tech",      motion: "static"  },
  "explainer:bold":           { typography: "cinematic", motion: "smooth"  },
  "explainer:conversational": { typography: "warm",      motion: "smooth"  },
  "opinion:bold":             { typography: "brutal",    motion: "kinetic" },
  "opinion:conversational":   { typography: "warm",      motion: "smooth"  },
  "story:emotional":          { typography: "editorial", motion: "smooth"  },
  "story:conversational":     { typography: "warm",      motion: "smooth"  },
  "story:bold":               { typography: "cinematic", motion: "smooth"  },
};

const FALLBACK = { typography: "cinematic", motion: "smooth" };

/* ── Niche detection fallback ───────────────────────────────── */
const NICHE_MAP = {
  finance:       ["finance", "investing", "crypto", "stocks", "money", "economics", "trading"],
  tech:          ["tech", "ai", "software", "coding", "startup", "saas", "developer", "app"],
  health:        ["fitness", "health", "workout", "nutrition", "gym", "wellness", "diet"],
  business:      ["business", "entrepreneur", "marketing", "career", "sales", "productivity"],
  entertainment: ["entertainment", "celebrity", "music", "movies", "pop culture", "drama", "viral"],
  food:          ["food", "recipe", "cooking", "restaurant"],
  travel:        ["travel", "trip", "explore", "adventure", "destination"],
  education:     ["education", "learning", "self-improvement", "explainer", "how-to", "history", "science"],
  news:          ["news", "politics", "world events", "trending", "breaking"],
  skincare:      ["beauty", "skincare", "makeup", "style", "aesthetic", "cosmetic"],
  gaming:        ["gaming", "esports", "games", "highlights", "playthrough"],
  sports:        ["sports", "football", "cricket", "basketball", "athlete"],
  spiritual:     ["spiritual", "devotional", "shiva", "krishna", "meditation", "temple", "religion", "god", "divine"],
  motivational:  ["motivation", "mindset", "hustle", "success", "inspire", "grind"],
  comedy:        ["comedy", "funny", "meme", "joke", "humor", "roast"],
  lifestyle:     ["lifestyle", "vlog", "daily", "routine", "personal"],
  music:         ["music", "song", "artist", "album", "rapper", "singer"],
};

function detectNiche(videoType = "") {
  const lower = videoType.toLowerCase();
  for (const [niche, keywords] of Object.entries(NICHE_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return niche;
  }
  return null;
}

/* ── Main export ─────────────────────────────────────────────── */
export function generateVideoDNA({
  videoType  = "viral",
  tone       = "bold",
  niche      = null,
  energy     = 0.7,
  brandColor = null,
}) {
  const effectiveType = (!videoType || videoType === "auto") ? "viral" : videoType;
  const effectiveTone = (!tone     || tone     === "auto") ? "bold"  : tone;
  const key    = `${effectiveType}:${effectiveTone}`;
  const preset = DNA_PRESETS[key] || FALLBACK;

  // Resolve niche — AI-returned niche takes priority, else detect from topic
  const resolvedNiche = niche || detectNiche(effectiveType);

  // Typography: niche override takes priority over videoType+tone preset
  // Only niches with null in NICHE_TYPOGRAPHY_MAP fall back to videoType+tone
  const nicheTypography = resolvedNiche ? NICHE_TYPOGRAPHY_MAP[resolvedNiche] : null;
  const typographySystem = nicheTypography ?? preset.typography;

  // colorStory from niche palette registry
  // brandColor replaces primary only — never bg or text
  const colorStory = resolveColorStory(
    resolvedNiche,
    energy,
    effectiveType,
    brandColor || null
  );

  return {
    typographySystem,
    colorStory,
    motionStyle: preset.motion,
    niche:       resolvedNiche,
  };
}

/**
 * getTypographyForRole
 * Returns the correct fontFamily and fontWeight for a given zone role
 * based on the active typography system.
 *
 * @param {string} typographySystem — key from TYPOGRAPHY_SYSTEMS
 * @param {string} role — "headline" | "subtext" | "label" | "quote" | "stat" | "tagline"
 * @returns {{ fontFamily: string, fontWeight: number }}
 */
export function getTypographyForRole(typographySystem, role) {
  const system = TYPOGRAPHY_SYSTEMS[typographySystem] ?? TYPOGRAPHY_SYSTEMS.cinematic;

  const isDisplay = ["headline", "stat", "tagline"].includes(role);
  const fontFamily = system[role] ?? (isDisplay ? system.display : system.subtext);
  const fontWeight = isDisplay ? system.weightDisplay : system.weightBody;

  return { fontFamily, fontWeight };
}