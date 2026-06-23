/**
 * aiModels.js — inventory of every PAID AI model/provider we call, and where. Fill in the unit
 * cost fields from each provider's pricing page; together with usage counts this gives us the
 * real COGS per service (see serviceCogs.js, which is the per-service total this rolls up into).
 *
 * Costs are left null until you add them. Units differ by model:
 *   - OpenAI: priced per 1M tokens (input vs output separately)
 *   - ElevenLabs: priced per character (or amortized from the subscription tier)
 *   - Fal.ai: priced per image, or per second/clip for video
 *
 * `usedIn` = which user-facing services hit this model (helps attribute cost). Confirm the Fal
 * video model id for Product Ad clips and the flux-kontext usage when you fill costs.
 */
export const aiModels = {
  // ── OpenAI ──
  "gpt-4.1": {
    provider: "OpenAI", kind: "text+vision",
    usedFor: ["script generation", "product/brief vision analysis", "TH transcript normalization", "per-transition motion intent"],
    usedIn: ["ai_video", "social_video", "typography_video", "promo_video", "product_video", "product_ad"],
    inputPer1M: 2.00, cachedInputPer1M: 0.50, outputPer1M: 8.00, notes: "Per OpenAI pricing (text tokens, per 1M). 1M context, 32,768 max output.",
  },
  "gpt-5.4": {
    provider: "OpenAI", kind: "text",
    usedFor: ["scene HTML/CSS design (primary creative model)", "per-element motion intent"],
    usedIn: ["ai_video", "social_video", "typography_video", "promo_video", "product_video", "product_ad"],
    inputPer1M: 2.50, cachedInputPer1M: 0.25, outputPer1M: 15.00, notes: "Per OpenAI (text tokens, per 1M). Reasoning model — reasoning tokens bill as OUTPUT ($15), so cost is output-heavy; called once per scene/beat. Prompts >272K input tokens bill 2x input / 1.5x output. ~$0.05–0.10 per scene-design call (audit estimate).",
  },
  "gpt-4o": {
    provider: "OpenAI", kind: "vision",
    usedFor: ["Product Ad strategy analysis", "sticker auto-tagging", "admin layout→zone conversion"],
    usedIn: ["product_ad", "admin"],
    inputPer1M: 2.50, cachedInputPer1M: 1.25, outputPer1M: 10.00, notes: "Per OpenAI (text tokens, per 1M). Vision input (images) bills as input tokens. 128K context, 16,384 max output.",
  },

  // ── ElevenLabs (TTS) ──
  "eleven_multilingual_v2": {
    provider: "ElevenLabs", kind: "tts",
    usedFor: ["full-script voiceover with word-level timestamps", "single-beat TTS regeneration"],
    usedIn: ["ai_video", "social_video", "typography_video", "promo_video", "product_video", "product_ad", "voiceover"],
    costPerChar: 0.0001, costPer1kChars: 0.10, notes: "PAYG / overage rate: $0.10 per 1,000 chars (~$0.0001/char). On a monthly plan, characters deduct from quota; effective rate is lower until quota is exhausted (Creator ~$22/mo for ~110k–220k chars ≈ $0.0001–0.0002/char), then the same $0.10/1k overage applies. Use $0.0001/char as the marginal COGS. Cost scales with script length.",
  },

  // ── Fal.ai (images) ──
  "fal-ai/flux/schnell": {
    provider: "Fal.ai", kind: "image",
    usedFor: ["fast background / stock-style image generation"],
    usedIn: ["ai_video", "social_video", "promo_video"],
    costPerMegapixel: 0.003, costPerImage: 0.0062, notes: "Priced $0.003 per megapixel. costPerImage is the estimate for a 1080×1920 portrait (~2.07 MP ≈ $0.0062); a 608×1080 image (~0.66 MP) ≈ $0.002. 4 inference steps. N images per video.",
  },
  "fal-ai/flux/dev": {
    provider: "Fal.ai", kind: "image",
    usedFor: ["higher-quality images, admin layout generation"],
    usedIn: ["admin"],
    costPerMegapixel: 0.025, costPerImage: 0.0518, notes: "Priced $0.025 per megapixel. costPerImage is the estimate for 1080×1920 (~2.07 MP ≈ $0.052); a 608×1080 image (~0.66 MP) ≈ $0.016. 28 inference steps. Admin/layout generation only (not user-facing video COGS).",
  },
  "fal-ai/flux-kontext": {
    provider: "Fal.ai", kind: "image",
    usedFor: ["product shot generation"],
    usedIn: ["product_video"],
    costPerMegapixel: 0.035, costPerImage: 0.0726, notes: "Priced $0.035 per megapixel. costPerImage is the estimate for 1080×1920 (~2.07 MP ≈ $0.073). Confirm if still used vs nano-banana.",
  },
  "fal-ai/nano-banana/edit": {
    provider: "Fal.ai", kind: "image-edit",
    usedFor: ["product scene shots (edit on a base image)"],
    usedIn: ["product_video", "product_ad"],
    costPerImage: 0.039, notes: "Flat $0.039 per image (~25 images per $1), regardless of resolution.",
  },
  "fal-ai/birefnet": {
    provider: "Fal.ai", kind: "background-removal",
    usedFor: ["cut product/subject out of background"],
    usedIn: ["product_video", "product_ad", "editor"],
    costPerImage: 0.003, notes: "$0.003 per image (background removal).",
  },

  // ── Fal.ai (video) ──
  "fal-ai/ltx-video": {
    provider: "Fal.ai", kind: "video",
    usedFor: ["Product Ad motion clips (per scene)"],
    usedIn: ["product_ad"],
    costPerClip: 0.30, notes: "$0.30 per clip — the single most expensive call. Product Ad generates one per scene (5 scenes ≈ $1.50 in clips alone).",
  },

  // NOTE: stock/entity media (Pixabay, Pexels, Wikipedia) is FREE — no per-call cost to track here.
};
