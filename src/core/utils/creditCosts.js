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
  // NOTE: timeline/editor video export is FREE — the user already paid to generate;
  // re-exports/edits aren't charged. Free-tier monetization is the watermark.
  promo_video:           { 1: 50, 3: 120, 5: 200 }, // SaaS/Promo Video — per scene count
  promo_video_th:        180,                       // SaaS Talking Head mode — flat rate
  talking_head:          20,                         // standalone Talking Head — NOMINAL display only; real charge is duration-based (creditsForTalkingHead)
  video_clipping:        20,                         // Video Clipping — NOMINAL display only; real charge scales with SOURCE length (creditsForClipping)
  // Dashboard video services (plan → produce)
  ai_video:              75,  // Prompt to Video / AI Video
  social_video:          30,  // Social Video
  typography_video:      15,  // Typography Video
  // Product Video — per scene, by visual mode (hybrid/video use LTX clips → cost far more than image scenes)
  product_video_per_scene: { image: 20, hybrid: 35, video: 50 },
};

// App Promo Video reuses SaaS/Promo's scene-based pricing (kept in sync via this alias).
CREDIT_COSTS.app_video = CREDIT_COSTS.promo_video;

/**
 * Duration → credit cost bands for free-design video services (AI Video, Social, Typography).
 * COGS scales ~linearly with duration (more beats = more GPT-5.4 scene calls + TTS + images), so
 * a 60s video must cost more than a 15s one. Margin-calibrated to ~72–76% at the $49/1,500 plan rate.
 * WIRED into charging: generate routes deduct via creditsForDuration() — AI Video (promptVideo.js)
 * and Typography charge by the chosen duration; Social uses the smallest band (no duration picker).
 */
export const VIDEO_DURATION_BANDS = { 15: 15, 30: 30, 45: 45, 60: 60 };
// ^ ~1 credit/second (2026-06-23). MEASURED: a 41s video = ~$0.70 (OpenAI $0.42 + Fal $0.25 +
// ElevenLabs ~$0.03) → COGS ≈ 15s $0.30 / 30s $0.53 / 60s $0.99. At the Pro rate ($0.0327/cr):
// 60s = $1.96/video @ ~49% margin (was $3.26) — competitive with faceless-video tools.
// $49/1,500cr → ~25× 60s or ~100× 15s. COGS hard floor ≈ $0.99 for 60s (can't price below it).

/** Credits for a free-design video of `seconds`: the smallest band ≥ duration; extrapolated beyond the top band. */
export function creditsForDuration(seconds, bands = VIDEO_DURATION_BANDS) {
  const keys = Object.keys(bands).map(Number).sort((a, b) => a - b);
  const sec = Math.max(1, Math.round(Number(seconds)) || keys[0]);
  for (const k of keys) if (sec <= k) return bands[k];
  const top = keys[keys.length - 1];
  return Math.round(bands[top] * (sec / top)); // beyond the largest band → per-second extrapolation
}

// Standalone Talking Head service — DURATION-BASED (input clip length), unlike the flat SaaS TH
// rate. Cost scales with minutes of footage (transcription + editorial director + B-roll). Tunable.
export const TALKING_HEAD_PER_30S = 10;
export function creditsForTalkingHead(seconds) {
  const sec = Math.max(1, Math.round(Number(seconds)) || 30);
  return Math.max(15, Math.ceil(sec / 30) * TALKING_HEAD_PER_30S);
}

// Video Clipping — charged by SOURCE length (transcription + per-clip cut/caption work scale with
// minutes of footage uploaded, not by number of clips returned). NOMINAL floor + per-minute rate.
export const VIDEO_CLIPPING_PER_MIN = 4;
export function creditsForClipping(seconds) {
  const sec = Math.max(1, Math.round(Number(seconds)) || 60);
  return Math.max(20, Math.ceil(sec / 60) * VIDEO_CLIPPING_PER_MIN);
}

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

// Reference only — the live source of truth for plans is the `plans` DB table (see plans_single.sql).
export const PLANS = {
  starter: { price: 29, credits: 600,  label: "Starter" },
  pro:     { price: 49, credits: 1500, label: "Pro"     },
  agency:  { price: 99, credits: 4000, label: "Agency"  },
};
