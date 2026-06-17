/**
 * serviceFields.js — single source of truth for the dashboard chatbox.
 *
 * Declares, per video service: the PRIMARY input (prompt / url / upload), the
 * SHARED fields it exposes (rendered as chips inside the chatbox, components in
 * src/ui/fields/), and their per-service option lists / defaults. Service-specific
 * fields render BELOW the chatbox and are added per service as we convert each.
 *
 * Scope: dashboard chatbox only — the existing service pages are untouched.
 */

// AI Video (Prompt to Video) visual styles
export const AI_VIDEO_STYLES = [
  { id: "auto",            label: "Auto",            desc: "Director picks from your topic", colors: ["#8896a8", "#38bdf8"] },
  { id: "editorial_retro", label: "Editorial Retro", desc: "Vintage print, bold two-tone",   colors: ["#c2410c", "#1e3a8a"] },
  { id: "minimal",         label: "Minimal",         desc: "Quiet, spacious, restrained",    colors: ["#f8fafc", "#0f172a"] },
  { id: "bold_pop",        label: "Bold Pop",        desc: "Loud blocks, huge type",         colors: ["#ec4899", "#facc15"] },
  { id: "dark_cinematic",  label: "Dark Cinematic",  desc: "Moody, filmic, atmospheric",     colors: ["#0a0a0a", "#f59e0b"] },
  { id: "corporate_clean", label: "Corporate",       desc: "Polished, structured, trusted",  colors: ["#1e40af", "#f8fafc"] },
  { id: "meme_chaos",      label: "Meme Energy",     desc: "Internet-native chaos",          colors: ["#ef4444", "#fde047"] },
];

export const AI_VIDEO_DURATIONS = [
  { id: 15, label: "15s" },
  { id: 30, label: "30s" },
  { id: 45, label: "45s" },
  { id: 60, label: "60s" },
];

/**
 * SERVICE_FIELDS[serviceId] = {
 *   primary: "prompt" | "url" | "upload",
 *   shared:  { <fieldId>: { options?, default? } }   // fields rendered in the chatbox
 * }
 * Only AI Video is wired today; others are added as their chatboxes are converted.
 */
// Orientation is UNIVERSAL — every service uses it EXCEPT video-captions (which
// keeps the user's uploaded video's own ratio). Options live in the field module.
// Visual Style is also UNIVERSAL — every service gets a style selector. A service
// may pass its own backend-mapped options (AI Video does, via AI_VIDEO_STYLES);
// otherwise the StyleField falls back to the universal VISUAL_STYLES set (which
// will grow with hand-curated styles).

// ── SaaS (Promo) option lists — mirror src/pages/PromoVideo.jsx so the chatbox
//    sends backend-valid values (visual_style / target_duration / tone / theme). ──
export const SAAS_STYLES = [
  { id: "radiant",       label: "Radiant",       desc: "Glows & depth",    colors: ["#06040e", "#6366f1"] },
  { id: "minimal",       label: "Minimal",       desc: "Clean & flat",     colors: ["#f2f2f6", "#111111"] },
  { id: "professional",  label: "Professional",  desc: "Structured, dark", colors: ["#0c1118", "#38bdf8"] },
  { id: "high-contrast", label: "High Contrast", desc: "Bold & sharp",     colors: ["#000000", "#f5c518"] },
];
export const SAAS_DURATIONS = [
  { id: 12, label: "10–15s" },
  { id: 22, label: "15–30s" },
  { id: 45, label: "30–60s" },
];
export const SAAS_TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual",       label: "Casual" },
  { id: "energetic",    label: "Energetic" },
  { id: "minimal",      label: "Minimal" },
];
export const SAAS_THEMES = [
  { id: "dark",   label: "Dark" },
  { id: "medium", label: "Medium" },
  { id: "light",  label: "Light" },
];
export const SAAS_ACCENTS = [
  { id: "#f5c518", label: "Vidquence",     color: "#f5c518" },
  { id: "#6366f1", label: "Electric Blue", color: "#6366f1" },
  { id: "#8b5cf6", label: "Violet",        color: "#8b5cf6" },
  { id: "#10b981", label: "Emerald",       color: "#10b981" },
  { id: "#f59e0b", label: "Amber",         color: "#f59e0b" },
  { id: "#f43f5e", label: "Rose",          color: "#f43f5e" },
  { id: "#f97316", label: "Coral",         color: "#f97316" },
  { id: "#06b6d4", label: "Cyan",          color: "#06b6d4" },
];

// ── Product Video option lists (mirror src/pages/ProductVideoGenerator.jsx) ──
export const PRODUCT_GOALS = [
  { id: "launch",    label: "Launch",    cta: "Get Yours First" },
  { id: "promo",     label: "Promo",     cta: "Shop Now" },
  { id: "discount",  label: "Discount",  cta: "Claim Offer" },
  { id: "awareness", label: "Awareness", cta: "Learn More" },
];
export const PRODUCT_LENGTHS = [
  { id: 1, label: "1 Scene" },
  { id: 3, label: "3 Scenes" },
  { id: 5, label: "5 Scenes" },
];
export const PRODUCT_VISUALS = [
  { id: "image",  label: "Image Only" },
  { id: "hybrid", label: "Image + Video" },
  { id: "video",  label: "Full Video" },
];

export const SERVICE_FIELDS = {
  "ai-video": {
    primary: "prompt",
    accent:  "#f59e0b",
    shared: {
      style:         { options: AI_VIDEO_STYLES,   default: "auto" },
      voiceLanguage: { default: { language: "en", voiceId: null } },
      duration:      { options: AI_VIDEO_DURATIONS, default: 30 },
      orientation:   { default: "9:16" },
    },
  },
  "social-video": {
    primary: "url",
    accent:  "#22d3ee",
    shared: {
      style:         { default: "auto" },   // universal styles (forward-compat for Social)
      voiceLanguage: { default: { language: "en", voiceId: null } },
      duration:      { options: [{ id: 20, label: "20s" }, { id: 30, label: "30s" }, { id: 45, label: "45s" }], default: 30 },
      orientation:   { default: "9:16" },
    },
  },
  // SaaS Video (Promo) — chatbox covers the FACELESS one-shot (create→render→poll).
  // Talking-head + per-scene asset review stay in the full Promo wizard.
  "promo-video": {
    primary: "url",   // URL or typed info (toggle)
    accent:  "#f5c518",
    shared: {
      style:         { options: SAAS_STYLES, default: "radiant" },   // backend visual_style
      voiceLanguage: { default: { language: "en", voiceId: null } },
      duration:      { options: SAAS_DURATIONS, default: 22 },        // target_duration
      orientation:   { default: "9:16" },                            // format_ratio
    },
    specific: {
      tone:   { options: SAAS_TONES,   default: "professional" },
      theme:  { options: SAAS_THEMES,  default: "dark" },
      accent: { options: SAAS_ACCENTS, default: "#f5c518" },
    },
  },
  // Product Video — image-upload (or product URL) primary input. Essentials in the
  // chatbox; offer/website/logo/description stay in the full Product page.
  "product-video": {
    primary: "upload",
    accent:  "#f97316",
    shared: {
      voiceLanguage: { default: { language: "en", voiceId: null } },
      orientation:   { default: "9:16" },
    },
    specific: {
      goal:    { options: PRODUCT_GOALS,   default: "promo" },
      length:  { options: PRODUCT_LENGTHS, default: 3 },
      visuals: { options: PRODUCT_VISUALS, default: "image" },
    },
  },
  // Typography Video — prompt/script input, kinetic text (no media). Style/orientation
  // are universal (forward-compat); duration → targetDuration.
  "typography-video": {
    primary: "prompt",
    accent:  "#7c5cfc",
    shared: {
      style:         { default: "auto" },
      voiceLanguage: { default: { language: "en", voiceId: null } },
      duration:      { options: [{ id: 30, label: "30s" }, { id: 40, label: "40s" }, { id: 60, label: "60s" }], default: 40 },
      orientation:   { default: "9:16" },
    },
  },
  // Add Captions — the odd one out: a video UPLOAD that's transcribed + styled.
  // No universal fields (no voice/language/orientation/duration — the video keeps
  // its own). Caption-style options come from the caption registry at render time.
  "video-captions": {
    primary: "upload",
    accent:  "#34d399",
    specific: {
      captionStyle: { default: "wordBlaze" },
      position:     { options: [{ id: 20, label: "Top" }, { id: 50, label: "Middle" }, { id: 80, label: "Bottom" }], default: 80 },
    },
  },
};
