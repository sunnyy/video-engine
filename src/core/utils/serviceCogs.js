/**
 * serviceCogs.js — COGS (Cost Of Goods Sold): what each service costs US to run, in USD.
 *
 * `usd` values below are COMPUTED ESTIMATES derived from the real model unit prices in aiModels.js
 * (filled 2026-06-23) × typical usage per service (see cogsEstimator.js for the math). They are
 * grounded in real per-call prices but the usage counts (esp. GPT-5.4 output tokens) are assumed —
 * replace with hand-measured spend from a real run when you can, and set `measuredAt`.
 *
 * `creditPrice` is the representative credits charged for the reference config noted per service
 * (duration-banded services use a 30s reference; per-scene services use 3 scenes). Margin at the
 * Pro rate (~$0.0327/credit) is ~70–95% across the board.
 */

export const serviceCogs = {
  // ── Free-design video (duration-banded ~1 credit/sec: 15/30/45/60) — ref = 30s ──
  // MEASURED 2026-06-23: a 41s video = ~$0.70 (OpenAI $0.42 + Fal $0.25 + ElevenLabs ~$0.03).
  // → per-duration ≈ 15s $0.30 / 30s $0.53 / 45s $0.77 / 60s $0.99.
  ai_video:         { creditPrice: 30, usd: 0.53, ref: "30s", apis: "GPT-4.1 script + N×GPT-5.4 scenes + Fal images + TTS + render", measuredAt: "2026-06-23 (41s run)" },
  typography_video: { creditPrice: 30, usd: 0.50, ref: "30s", apis: "GPT-4.1 script + N×GPT-5.4 scenes + TTS + render (no images)", measuredAt: null },
  social_video:     { creditPrice: 30, usd: 0.30, ref: "flat 15s band", apis: "GPT-4.1 + GPT-5.4 scenes + images + TTS + render", measuredAt: "2026-06-23 (derived)" },

  // ── Product Video (per scene by mode: image 20 / hybrid 35 / video 50) — ref = 3 image scenes ──
  product_video:    { creditPrice: 60,  usd: 0.41, ref: "3 image scenes", apis: "GPT-4.1 vision + per-scene GPT-5.4 overlay + nano-banana image + TTS + render; hybrid/video add LTX clips", measuredAt: null },

  // ── Promo Video (scene tiers 1/3/5 = 50/120/200) ──
  promo_video_1:    { creditPrice: 50,  usd: 0.59, ref: "1 scene",  apis: "GPT + image + TTS + render", measuredAt: null },
  promo_video_3:    { creditPrice: 120, usd: 1.10, ref: "3 scenes", apis: "GPT + images + TTS + render", measuredAt: null },
  promo_video_5:    { creditPrice: 200, usd: 1.60, ref: "5 scenes", apis: "GPT + images + TTS + render", measuredAt: null },
  promo_video_th:   { creditPrice: 180, usd: 0.35, ref: "talking head", apis: "TTS-heavy + render (UNCERTAIN — confirm avatar/clip provider cost)", measuredAt: null },

  // ── Image / other services (flat) ──
  poster_generate:    { creditPrice: 10, usd: 0.016, apis: "GPT + 1 Fal image", measuredAt: null },
  thumbnail_generate: { creditPrice: 10, usd: 0.016, apis: "GPT + 1 Fal image", measuredAt: null },
  social_post:        { creditPrice: 15, usd: 0.02,  apis: "GPT + 1 Fal image (Banner/Social Post)", measuredAt: null },
  outfit_tryon:       { creditPrice: 15, usd: 0.04,  apis: "Fal try-on model (UNCERTAIN — confirm model cost)", measuredAt: null },

  // ── Editor micro-actions (pay-as-you-go) ──
  ai_image:        { creditPrice: 2, usd: 0.006, apis: "1 Fal FLUX schnell image (1080×1920)", measuredAt: null },
  tts_generation:  { creditPrice: 5, usd: 0.05,  apis: "ElevenLabs full-video TTS", measuredAt: null },
  individual_tts:  { creditPrice: 2, usd: 0.005, apis: "ElevenLabs single-beat TTS", measuredAt: null },
  transcription:   { creditPrice: 3, usd: 0.01,  apis: "Fal Whisper transcription (UNCERTAIN)", measuredAt: null },
  export_render:   { creditPrice: 0, usd: 0.03,  apis: "Remotion render compute (Railway $/min) — free to user", measuredAt: null },
};

/**
 * Gross margin for a service. `creditUsdValue` = what one credit is worth in plan revenue
 * (Pro: $49 / 1,500 ≈ $0.0327; Max: $99 / 4,000 ≈ $0.0248). Returns 0..1 or null.
 */
export function grossMargin(serviceKey, creditUsdValue = 0.0327) {
  const s = serviceCogs[serviceKey];
  if (!s || s.usd == null || !creditUsdValue) return null;
  const revenue = s.creditPrice * creditUsdValue;
  if (revenue <= 0) return null;
  return (revenue - s.usd) / revenue;
}
