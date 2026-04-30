/**
 * creditCosts.js
 * src/core/utils/creditCosts.js
 *
 * Single source of truth for credit costs across server and client.
 * Server enforces deductions; client uses these for pre-flight UI warnings.
 */

export const CREDIT_COSTS = {
  base_generation:  10,  // script + beats + layouts + zone content
  ai_image:         2,   // per image generated via Fal.ai
  image_reuse:      0,   // reused from library — free
  tts_generation:   5,   // full video TTS
  export_local:     8,   // local render export
  export_lambda:    8,   // cloud render export
  layout_swap:      1,   // swap layout on a beat
  individual_tts:   2,   // single beat TTS regeneration
  transcription:    3,   // Fal.ai Whisper video transcription
  // Product Ad breakdown
  product_ad_analyze:    5,   // GPT-4o strategy analysis
  product_ad_base_image: 8,   // base model image (Fal.ai)
  product_ad_scenes:     40,  // 5 scene images
  product_ad_clip:       50,  // video clip (LTX per clip)
  // Other tools
  poster_generate:       10,  // Poster Studio
  thumbnail_generate:    10,  // Thumbnail Generator
  outfit_tryon:           8,  // Virtual Try-On
  social_post:           10,  // Banner Design / Social Post
  caption_studio:         8,  // Caption Studio (render)
};

// Full cost estimates per service — used by CreditConfirmModal
export const SERVICE_COSTS = {
  product_ad_full: {
    total: 303,
    breakdown: {
      "Analyze product":    5,
      "Base scene image":   8,
      "Scene images (5)":  40,
      "Video clips (5)":  250,
    },
  },
  poster: {
    total: 10,
    breakdown: { "Generate poster": 10 },
  },
  thumbnail: {
    total: 10,
    breakdown: { "Generate thumbnail": 10 },
  },
  outfit_tryon: {
    total: 8,
    breakdown: { "Virtual try-on": 8 },
  },
  social_post: {
    total: 10,
    breakdown: { "Generate banner": 10 },
  },
  caption_render: {
    total: 8,
    breakdown: { "Render captions": 8 },
  },
};

/**
 * Estimate credit cost before generation starts.
 * @param {"short"|"medium"|"long"} duration
 * @param {{ tts: boolean, aiImages: boolean }} options
 */
export function estimateCreditCost(duration, options = {}) {
  const beatCount = duration === "short" ? 5 : duration === "medium" ? 10 : 18;
  const base      = CREDIT_COSTS.base_generation;
  const tts       = options.tts       ? CREDIT_COSTS.tts_generation : 0;
  const images    = options.aiImages  ? beatCount * CREDIT_COSTS.ai_image : 0;
  const exportCost = CREDIT_COSTS.export_local;
  const total     = base + tts + images + exportCost;
  return { total, breakdown: { base, tts, images, export: exportCost, beatCount } };
}

export const PLANS = {
  starter: { price: 15, credits: 1800, label: "Starter"        },
  pro:     { price: 29, credits: 3500, label: "Pro"            },
  agency:  { price: 50, credits: 6000, label: "Agency"         },
  payg:    { price: 9,  credits: 80,   label: "Pay As You Go"  },
};
