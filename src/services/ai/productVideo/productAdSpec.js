/**
 * productAdSpec.js
 * The single source of truth that flows through every pipeline step.
 * Every step reads from and enriches this object.
 * Nothing is reinvented between scenes.
 */

export function createProductAdSpec({
  productImageUrl,
  logoUrl = null,
  brandName = "",
  videoType = "promo", // promo | launch | feature | brand
  offerText = "",      // e.g. "50% OFF"
  ctaText = "Shop Now",
  website = "",
  tagline = "",
}) {
  return {
    // User inputs
    productImageUrl,
    productCutoutUrl: null,  // filled after bg removal
    logoUrl,
    brandName,
    videoType,
    offerText,
    ctaText,
    website,
    tagline,

    // Filled by analysis step
    productAnalysis: null,

    // Filled by direction step — LOCKED for entire video
    palette: null,    // { primary, secondary, accent, bg, text }
    font: null,       // single font family for entire video
    tone: null,
    energy: null,
    musicMood: null,

    // Filled by scene planner
    scenes: [],

    // Filled by asset generation
    heroBackgroundUrl: null,
    lifestyleImageUrl: null,

    // Final output
    layers: [],
  };
}
