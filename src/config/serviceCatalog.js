/**
 * serviceCatalog.js — single source of truth for the product's services: marketing tier,
 * homepage/dashboard ordering, beta flags, category, route, credit pricing, and publishability.
 * Both the dashboard and the marketing homepage should render from THIS so the service hierarchy
 * lives in one place (no more hand-ordered, drifting lists like the old pricing page).
 *
 * Positioning (locked): "The only video tool you'll ever need." Lead with the three strongest
 * video services (prompt / website / content), tier the rest, beta-tag the unproven, and group the
 * lighter image/audio tools as supporting evidence — not competitors to the platform story.
 *
 *   tier 1  → hero "Create Videos" (featured)
 *   tier 2  → "More Video Types"
 *   tier 3  → advanced / beta
 *   tier 4  → "Plus 10+ AI Tools" (supporting image/audio utilities)
 *
 * `creditKey` points into CREDIT_COSTS (the charging source of truth). `pricing` describes how a
 * service is priced for display: duration-banded video, scene-tiered promo, incremental, or flat.
 */
import { CREDIT_COSTS, VIDEO_DURATION_BANDS } from "../core/utils/creditCosts.js";

const durationPricing = { model: "duration", bands: VIDEO_DURATION_BANDS };

export const SERVICE_CATALOG = [
  // ── Tier 1 — hero video services (prompt / website / content = a complete story) ──
  { key: "ai_video", name: "AI Video", category: "create", tier: 1, featured: true, beta: false,
    route: "/ai-video", creditKey: "ai_video", pricing: durationPricing, publishable: true,
    blurb: "Generate a unique video from a prompt — every scene designed by AI, no templates." },
  { key: "promo_video", name: "Promo Video", category: "create", tier: 1, featured: true, beta: false,
    route: "/promo-video", creditKey: "promo_video", pricing: { model: "scene", tiers: CREDIT_COSTS.promo_video }, publishable: false,
    blurb: "Turn your product or website into a polished promo (includes URL mode)." },
  { key: "social_video", name: "Social Video", category: "create", tier: 1, featured: true, beta: false,
    route: "/social-video", creditKey: "social_video", pricing: durationPricing, publishable: false,
    blurb: "Repurpose a post or any content into a ready-to-publish video." },

  // ── Tier 2 — more video types (valuable, less proven; listed, not featured) ──
  { key: "talking_head", name: "Talking Head", category: "create", tier: 2, featured: false, beta: true,
    route: "/talking-head", creditKey: "talking_head", pricing: { model: "flat", credits: CREDIT_COSTS.talking_head }, publishable: false,
    blurb: "Upload your talking-head clip — auto captions, cuts and B-roll. Charged by clip length." },
  { key: "product_video", name: "Product Video", category: "create", tier: 2, featured: false, beta: false,
    route: "/product-video", creditKey: "product_video", pricing: { model: "scene", perScene: CREDIT_COSTS.product_video_per_scene.image }, publishable: false,
    blurb: "Turn a product image into a designed promo video (charged per scene)." },
  { key: "typography_video", name: "Typography Video", category: "create", tier: 2, featured: false, beta: false,
    route: "/typography-video", creditKey: "typography_video", pricing: durationPricing, publishable: false,
    blurb: "Kinetic text videos for punchy, muted-friendly social clips." },

  // ── Tier 4 — supporting tools ("Plus 10+ AI Tools") ──
  { key: "ai_images", name: "AI Images", category: "tool", tier: 4, featured: false, beta: false,
    route: "/image-generation", creditKey: "ai_image", pricing: { model: "per_image", credits: CREDIT_COSTS.ai_image }, publishable: false, blurb: "Generate images from a prompt." },
  { key: "product_poster", name: "Product Poster", category: "tool", tier: 4, featured: false, beta: false,
    route: "/product-poster", creditKey: "poster_generate", pricing: { model: "flat", credits: CREDIT_COSTS.poster_generate }, publishable: false, blurb: "Poster Studio." },
  { key: "banner_design", name: "Banner Design", category: "tool", tier: 4, featured: false, beta: false,
    route: "/banner-design", creditKey: "social_post", pricing: { model: "flat", credits: CREDIT_COSTS.social_post }, publishable: false, blurb: "Social/banner graphics." },
  { key: "thumbnail", name: "Thumbnail Generator", category: "tool", tier: 4, featured: false, beta: false,
    route: "/thumbnail", creditKey: "thumbnail_generate", pricing: { model: "flat", credits: CREDIT_COSTS.thumbnail_generate }, publishable: false, blurb: "YouTube/social thumbnails." },
  { key: "virtual_tryon", name: "Virtual Try-On", category: "tool", tier: 4, featured: false, beta: false,
    route: "/virtual-tryon", creditKey: "outfit_tryon", pricing: { model: "flat", credits: CREDIT_COSTS.outfit_tryon }, publishable: false, blurb: "Outfit try-on." },
  { key: "voiceover", name: "AI Voiceover", category: "tool", tier: 4, featured: false, beta: false,
    route: "/voiceover", creditKey: "tts_generation", pricing: { model: "flat", credits: CREDIT_COSTS.tts_generation }, publishable: false, blurb: "Text-to-speech voiceover." },
  { key: "speech_to_text", name: "Speech to Text", category: "tool", tier: 4, featured: false, beta: false,
    route: "/speech-to-text", creditKey: "transcription", pricing: { model: "flat", credits: CREDIT_COSTS.transcription }, publishable: false, blurb: "Transcribe audio/video." },
  { key: "auto_captions", name: "Auto Captions", category: "tool", tier: 4, featured: false, beta: false,
    route: "/video-captions", creditKey: "caption_studio", pricing: { model: "flat", credits: CREDIT_COSTS.caption_studio }, publishable: false, blurb: "Add captions to a video." },

  // NOTE: "SaaS Video" intentionally removed — folded into Promo Video's URL mode. Do not list separately.
];

// ── Helpers ──
export const byTier = (t) => SERVICE_CATALOG.filter((s) => s.tier === t);
export const featuredServices = () => SERVICE_CATALOG.filter((s) => s.featured);
export const videoServices = () => SERVICE_CATALOG.filter((s) => s.category === "create");
export const supportingTools = () => SERVICE_CATALOG.filter((s) => s.category === "tool");
export const getService = (key) => SERVICE_CATALOG.find((s) => s.key === key) || null;
