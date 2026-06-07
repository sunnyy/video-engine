/**
 * creditCosts.js
 * src/core/utils/creditCosts.js
 *
 * Single source of truth for credit costs across server and client.
 * Server enforces deductions; client uses these for pre-flight UI warnings.
 */

export const CREDIT_COSTS = {
  base_generation:  25,  // script + beats + layouts + zone content
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
  product_ad_clip:       60,  // video clip (LTX per clip)
  // Other tools
  poster_generate:       10,  // Poster Studio
  thumbnail_generate:    10,  // Thumbnail Generator
  outfit_tryon:          15,  // Virtual Try-On
  social_post:           15,  // Banner Design / Social Post
  caption_studio:         8,  // Caption Studio (render)
  promo_video:           { 1: 50, 3: 120, 5: 200 }, // SaaS/Promo Video — per scene count
  promo_video_th:        180,                       // Talking Head video — flat rate
};

// Full cost estimates per service — used by CreditConfirmModal
export const SERVICE_COSTS = {
  product_ad_full: {
    total: 353,
    breakdown: {
      "Analyze product":    5,
      "Base scene image":   8,
      "Scene images (5)":  40,
      "Video clips (5)":  300,
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
    total: 15,
    breakdown: { "Virtual try-on": 15 },
  },
  social_post: {
    total: 15,
    breakdown: { "Generate banner": 15 },
  },
  caption_render: {
    total: 8,
    breakdown: { "Render captions": 8 },
  },
  typography_video: {
    total: 15,
    breakdown: {
      "Script & layout generation": 10,
      "AI voiceover": 5,
    },
  },
  explainer_video: {
    total: 13,
    breakdown: {
      "Transcription": 3,
      "Build layout": 10,
    },
  },
  voiceover: {
    total: 5,
    breakdown: { "Generate voiceover": 5 },
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
