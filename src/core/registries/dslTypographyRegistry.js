/**
 * dslTypographyRegistry.js
 * src/core/registries/dslTypographyRegistry.js
 *
 * Typography presets for the DSL layout engine.
 * Each preset defines font metrics (family, size, weight, tracking, leading)
 * for the six text roles used across all intent renderers.
 * Colors and shadows come from the palette — only metrics live here.
 */

export const typographyPresets = {

  bold_impact: {
    headline: { fontFamily: "Bebas Neue",   fontSize: 110, fontWeight: 400, letterSpacing: 3,    lineHeight: 1.0,  textTransform: "uppercase" },
    subhead:  { fontFamily: "DM Sans",      fontSize: 36,  fontWeight: 400, letterSpacing: 0.5,  lineHeight: 1.4,  textTransform: "none"      },
    body:     { fontFamily: "DM Sans",      fontSize: 32,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.5,  textTransform: "none"      },
    label:    { fontFamily: "DM Sans",      fontSize: 20,  fontWeight: 600, letterSpacing: 4,    lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Bebas Neue",   fontSize: 160, fontWeight: 400, letterSpacing: 4,    lineHeight: 1.0,  textTransform: "uppercase" },
    badge:    { fontFamily: "DM Sans",      fontSize: 22,  fontWeight: 700, letterSpacing: 3,    lineHeight: 1.3,  textTransform: "uppercase" },
  },

  modern_clean: {
    headline: { fontFamily: "DM Sans",      fontSize: 84,  fontWeight: 800, letterSpacing: -2,   lineHeight: 1.08, textTransform: "none"      },
    subhead:  { fontFamily: "DM Sans",      fontSize: 36,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.45, textTransform: "none"      },
    body:     { fontFamily: "DM Sans",      fontSize: 32,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.55, textTransform: "none"      },
    label:    { fontFamily: "DM Sans",      fontSize: 20,  fontWeight: 500, letterSpacing: 3,    lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "DM Sans",      fontSize: 140, fontWeight: 800, letterSpacing: -3,   lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "DM Sans",      fontSize: 22,  fontWeight: 600, letterSpacing: 2,    lineHeight: 1.3,  textTransform: "uppercase" },
  },

  editorial: {
    headline: { fontFamily: "Playfair Display", fontSize: 88,  fontWeight: 700, letterSpacing: -1,  lineHeight: 1.08, textTransform: "none"      },
    subhead:  { fontFamily: "Lora",             fontSize: 34,  fontWeight: 400, letterSpacing: 0.5, lineHeight: 1.5,  textTransform: "none"      },
    body:     { fontFamily: "Lora",             fontSize: 30,  fontWeight: 400, letterSpacing: 0.5, lineHeight: 1.6,  textTransform: "none"      },
    label:    { fontFamily: "Raleway",          fontSize: 18,  fontWeight: 600, letterSpacing: 5,   lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Playfair Display", fontSize: 144, fontWeight: 700, letterSpacing: -2,  lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "Raleway",          fontSize: 20,  fontWeight: 600, letterSpacing: 4,   lineHeight: 1.3,  textTransform: "uppercase" },
  },

  saas_product: {
    headline: { fontFamily: "Inter",        fontSize: 82,  fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.08, textTransform: "none"      },
    subhead:  { fontFamily: "Inter",        fontSize: 38,  fontWeight: 400, letterSpacing: -0.5, lineHeight: 1.4,  textTransform: "none"      },
    body:     { fontFamily: "Inter",        fontSize: 34,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.5,  textTransform: "none"      },
    label:    { fontFamily: "Inter",        fontSize: 22,  fontWeight: 600, letterSpacing: 2,    lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Inter",        fontSize: 144, fontWeight: 900, letterSpacing: -4,   lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "Inter",        fontSize: 24,  fontWeight: 700, letterSpacing: 2,    lineHeight: 1.3,  textTransform: "uppercase" },
  },

  energetic: {
    headline: { fontFamily: "Barlow Condensed", fontSize: 108, fontWeight: 800, letterSpacing: -1,  lineHeight: 1.0,  textTransform: "uppercase" },
    subhead:  { fontFamily: "Barlow",           fontSize: 40,  fontWeight: 600, letterSpacing: 0,   lineHeight: 1.3,  textTransform: "none"      },
    body:     { fontFamily: "Barlow",           fontSize: 34,  fontWeight: 500, letterSpacing: 0,   lineHeight: 1.45, textTransform: "none"      },
    label:    { fontFamily: "Barlow",           fontSize: 22,  fontWeight: 700, letterSpacing: 3,   lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Barlow Condensed", fontSize: 160, fontWeight: 800, letterSpacing: -2,  lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "Barlow",           fontSize: 26,  fontWeight: 800, letterSpacing: 2,   lineHeight: 1.3,  textTransform: "uppercase" },
  },

  minimal: {
    headline: { fontFamily: "Josefin Sans", fontSize: 80,  fontWeight: 700, letterSpacing: 2,    lineHeight: 1.1,  textTransform: "uppercase" },
    subhead:  { fontFamily: "Josefin Sans", fontSize: 32,  fontWeight: 300, letterSpacing: 3,    lineHeight: 1.5,  textTransform: "none"      },
    body:     { fontFamily: "Josefin Sans", fontSize: 28,  fontWeight: 300, letterSpacing: 2,    lineHeight: 1.6,  textTransform: "none"      },
    label:    { fontFamily: "Josefin Sans", fontSize: 18,  fontWeight: 400, letterSpacing: 5,    lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Josefin Sans", fontSize: 136, fontWeight: 700, letterSpacing: 4,    lineHeight: 1.0,  textTransform: "uppercase" },
    badge:    { fontFamily: "Josefin Sans", fontSize: 18,  fontWeight: 400, letterSpacing: 5,    lineHeight: 1.3,  textTransform: "uppercase" },
  },

  corporate: {
    headline: { fontFamily: "Raleway",      fontSize: 80,  fontWeight: 800, letterSpacing: -1,   lineHeight: 1.1,  textTransform: "none"      },
    subhead:  { fontFamily: "Raleway",      fontSize: 34,  fontWeight: 400, letterSpacing: 0.5,  lineHeight: 1.4,  textTransform: "none"      },
    body:     { fontFamily: "Lato",         fontSize: 32,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.5,  textTransform: "none"      },
    label:    { fontFamily: "Raleway",      fontSize: 20,  fontWeight: 700, letterSpacing: 3,    lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Raleway",      fontSize: 140, fontWeight: 900, letterSpacing: -2,   lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "Raleway",      fontSize: 22,  fontWeight: 700, letterSpacing: 3,    lineHeight: 1.3,  textTransform: "uppercase" },
  },

  cinematic: {
    headline: { fontFamily: "Cormorant Garamond", fontSize: 96, fontWeight: 700, letterSpacing: 2,  lineHeight: 1.05, textTransform: "none"      },
    subhead:  { fontFamily: "Raleway",            fontSize: 28, fontWeight: 300, letterSpacing: 6,  lineHeight: 1.5,  textTransform: "uppercase" },
    body:     { fontFamily: "Raleway",            fontSize: 26, fontWeight: 300, letterSpacing: 3,  lineHeight: 1.6,  textTransform: "none"      },
    label:    { fontFamily: "Raleway",            fontSize: 16, fontWeight: 300, letterSpacing: 7,  lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Cormorant Garamond", fontSize: 152,fontWeight: 700, letterSpacing: 2,  lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "Raleway",            fontSize: 18, fontWeight: 300, letterSpacing: 6,  lineHeight: 1.3,  textTransform: "uppercase" },
  },

  playful: {
    headline: { fontFamily: "Fredoka One",  fontSize: 90,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.1,  textTransform: "none"      },
    subhead:  { fontFamily: "Nunito",       fontSize: 38,  fontWeight: 600, letterSpacing: 0,    lineHeight: 1.35, textTransform: "none"      },
    body:     { fontFamily: "Nunito",       fontSize: 32,  fontWeight: 500, letterSpacing: 0,    lineHeight: 1.5,  textTransform: "none"      },
    label:    { fontFamily: "Nunito",       fontSize: 22,  fontWeight: 700, letterSpacing: 1,    lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Fredoka One",  fontSize: 148, fontWeight: 400, letterSpacing: 0,    lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "Nunito",       fontSize: 26,  fontWeight: 800, letterSpacing: 1,    lineHeight: 1.3,  textTransform: "uppercase" },
  },

  finance: {
    headline: { fontFamily: "Unbounded",    fontSize: 72,  fontWeight: 800, letterSpacing: -2,   lineHeight: 1.1,  textTransform: "none"      },
    subhead:  { fontFamily: "Inter",        fontSize: 34,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.4,  textTransform: "none"      },
    body:     { fontFamily: "Inter",        fontSize: 30,  fontWeight: 400, letterSpacing: 0,    lineHeight: 1.5,  textTransform: "none"      },
    label:    { fontFamily: "Inter",        fontSize: 20,  fontWeight: 600, letterSpacing: 3,    lineHeight: 1.3,  textTransform: "uppercase" },
    stat:     { fontFamily: "Unbounded",    fontSize: 120, fontWeight: 900, letterSpacing: -3,   lineHeight: 1.0,  textTransform: "none"      },
    badge:    { fontFamily: "Inter",        fontSize: 22,  fontWeight: 700, letterSpacing: 2,    lineHeight: 1.3,  textTransform: "uppercase" },
  },

};

export function getTypographyPreset(niche, mood) {
  const nicheMap = {
    saas:          "saas_product",
    tech:          "saas_product",
    software:      "saas_product",
    finance:       "finance",
    fintech:       "finance",
    crypto:        "finance",
    fitness:       "energetic",
    sports:        "energetic",
    health:        "energetic",
    creative:      "editorial",
    art:           "editorial",
    design:        "editorial",
    corporate:     "corporate",
    enterprise:    "corporate",
    business:      "corporate",
    education:     "modern_clean",
    elearning:     "modern_clean",
    course:        "modern_clean",
    entertainment: "playful",
    gaming:        "playful",
    kids:          "playful",
    luxury:        "cinematic",
    fashion:       "cinematic",
    beauty:        "cinematic",
    minimal:       "minimal",
    lifestyle:     "minimal",
  };

  const moodMap = {
    premium:     "cinematic",
    energetic:   "energetic",
    modern:      "saas_product",
    educational: "modern_clean",
    corporate:   "corporate",
    playful:     "playful",
  };

  const key = nicheMap[niche?.toLowerCase()] || moodMap[mood?.toLowerCase()] || "bold_impact";
  return typographyPresets[key];
}
