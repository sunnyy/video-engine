/**
 * shared/visualStyles.js — the ONE visual-style registry for all video services
 * (Prompt to Video, Social, Product, SaaS). Typography and Auto Captions opt out.
 *
 * Each style is a full definition: UI swatch (colors), AI-image generation strings
 * (photoStyle / illustrationStyle), and design "feel" hints (paletteGuidance,
 * typeSystem, motion). Services consume the facets they need:
 *   - image generation everywhere uses photoStyle / illustrationStyle (style-aware)
 *   - headless-design services use paletteGuidance/typeSystem as a HINT (their
 *     per-beat palettes stay dynamic — these don't hard-override colour)
 *
 * Pure data + pure functions — safe to import from both the server pipelines and
 * the frontend (serviceFields).
 */

export const VISUAL_STYLES = {
  editorial_retro: {
    id: "editorial_retro",
    label: "Editorial Retro",
    description: "Vintage print magazine — bold two-tone illustrations, halftone texture, punchy headlines",
    colors: ["#c2410c", "#1e3a8a"],
    illustrationStyle: "retro editorial illustration, limited two-tone palette, mid-century print style, halftone texture, bold flat shapes, screen-print grain, textless artwork",
    photoStyle: "editorial magazine photograph, dramatic studio lighting, slight film grain",
    paletteGuidance: "Two dominant inks on a paper-like OR near-black field, high contrast, flat poster feel — the topic palette picks the actual inks; do NOT default every frame to orange-on-cream, and alternate the field (some paper, some dark) across beats.",
    typeSystem: "High-contrast serif headlines (Playfair Display, Cormorant Garamond) at magazine scale, paired with a condensed uppercase grotesque (Oswald, Barlow Condensed) for kickers and labels. Classic print hierarchy.",
    motion: { energy: "punchy", transitions: ["slide-left", "zoom", "slide-up"], cutSeconds: 2.8 },
    treatmentBias: { ai_illustration: 3, artifact: 2, cutout_colorblock: 2, annotated_photo: 2, typography_punch: 1, stock_moment: 1, versus_split: 1 },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Quiet confidence — generous space, restrained type, one accent",
    colors: ["#f8fafc", "#0f172a"],
    illustrationStyle: "minimal flat vector illustration, single accent color on neutral background, thin line work, generous negative space",
    photoStyle: "clean minimal photograph, soft natural light, muted tones, negative space",
    paletteGuidance: "Near-white or near-black field, one restrained accent. Whitespace is the design.",
    typeSystem: "Light-to-medium weight modern sans (Inter, DM Sans, Manrope). Lowercase or sentence case. Tight, small, deliberate.",
    motion: { energy: "calm", transitions: ["fade", "slide-up"], cutSeconds: 3.4 },
    treatmentBias: { typography_punch: 3, ai_illustration: 2, artifact: 2, stock_moment: 2, cutout_colorblock: 1, annotated_photo: 1, versus_split: 1 },
  },
  bold_pop: {
    id: "bold_pop",
    label: "Bold Pop",
    description: "Loud color blocks, cutouts, huge type — feed-stopping energy",
    colors: ["#ec4899", "#facc15"],
    illustrationStyle: "bold pop-art illustration, saturated color blocking, thick outlines, comic energy, high contrast",
    photoStyle: "vibrant editorial photograph, punchy saturated colors, hard light",
    paletteGuidance: "Saturated colour-block backgrounds that ALTERNATE per beat (hues drawn from the topic palette, not a fixed set). Black or white type at maximum weight.",
    typeSystem: "Ultra-bold display at maximum weight (Anton, Unbounded, Outfit 900). Huge, uppercase, tightly set — type as a graphic block.",
    motion: { energy: "aggressive", transitions: ["zoom", "slide-left", "slide-down"], cutSeconds: 2.4 },
    treatmentBias: { cutout_colorblock: 3, typography_punch: 2, ai_illustration: 2, versus_split: 2, annotated_photo: 1, artifact: 1, stock_moment: 1 },
  },
  dark_cinematic: {
    id: "dark_cinematic",
    label: "Dark Cinematic",
    description: "Moody, filmic, atmospheric — trailer energy",
    colors: ["#0a0a0a", "#f59e0b"],
    illustrationStyle: "cinematic concept art, moody atmospheric lighting, deep shadows, volumetric light, film still quality",
    photoStyle: "cinematic film still, anamorphic look, moody low-key lighting, shallow depth of field",
    paletteGuidance: "Near-black fields, one glowing accent (amber, teal, crimson). Light is the decoration — which means every frame MUST contain visible light: a glow, a lit subject, a luminous accent. A frame of flat darkness is a failure, not a mood.",
    typeSystem: "Wide letter-spaced uppercase grotesque (Space Grotesk) for titles, or an elegant serif (Playfair Display, Cormorant Garamond) for emotional lines. Restrained sizes, dramatic spacing.",
    motion: { energy: "slow-burn", transitions: ["fade", "zoom"], cutSeconds: 3.2 },
    treatmentBias: { stock_moment: 3, ai_illustration: 2, typography_punch: 2, annotated_photo: 1, cutout_colorblock: 1, artifact: 1, versus_split: 1 },
  },
  corporate_clean: {
    id: "corporate_clean",
    label: "Corporate",
    description: "Trustworthy, structured, polished — enterprise-grade",
    colors: ["#1e40af", "#f8fafc"],
    illustrationStyle: "clean corporate isometric illustration, professional flat design, structured grid, soft shadows",
    photoStyle: "professional corporate photograph, bright office light, polished, optimistic",
    paletteGuidance: "White or deep navy fields, one brand-grade accent (blue, teal, green). Cards and thin dividers structure everything.",
    typeSystem: "Professional geometric sans (Plus Jakarta Sans, Inter, Manrope) at 600-800. Sentence case, clear hierarchy, even rhythm.",
    motion: { energy: "measured", transitions: ["slide-up", "fade"], cutSeconds: 3.0 },
    treatmentBias: { artifact: 3, ai_illustration: 2, stock_moment: 2, typography_punch: 2, cutout_colorblock: 1, annotated_photo: 1, versus_split: 1 },
  },
  gradient_glow: {
    id: "gradient_glow",
    label: "Gradient Glow",
    description: "Smooth aurora gradients, glass cards — modern app promo",
    colors: ["#7c3aed", "#22d3ee"],
    illustrationStyle: "modern 3D gradient illustration, smooth glossy shapes, soft glassmorphism, vibrant aurora gradient lighting, subtle depth",
    photoStyle: "vibrant product photograph on a smooth gradient backdrop, soft studio glow, glossy reflection",
    paletteGuidance: "Smooth multi-stop gradient fields (aurora blends from the topic palette) with frosted-glass cards and soft glow. Avoid flat single-colour fields — the gradient is the design, and the blend shifts per beat.",
    typeSystem: "Clean geometric sans (Outfit, Space Grotesk, Plus Jakarta Sans) at 600-800, generous spacing, slightly rounded — modern app aesthetic.",
    motion: { energy: "smooth", transitions: ["fade", "slide-up", "zoom"], cutSeconds: 3.0 },
    treatmentBias: { ai_illustration: 3, artifact: 2, typography_punch: 2, stock_moment: 2, cutout_colorblock: 1, annotated_photo: 1, versus_split: 1 },
  },
  meme_chaos: {
    id: "meme_chaos",
    label: "Meme Energy",
    description: "Internet-native chaos — annotations, arrows, reaction energy",
    colors: ["#ef4444", "#fde047"],
    illustrationStyle: "internet meme style illustration, exaggerated expressions, deep-fried saturation, sticker outlines",
    photoStyle: "candid reaction photograph, flash photography look, raw and unpolished",
    paletteGuidance: "Whatever is loudest. Reds, yellows, harsh white. Red circles, arrows, and underlines as decoration.",
    typeSystem: "Impact-style ultra-bold (Anton, Unbounded) with a heavy black stroke/shadow feel. Uppercase, loud, deliberately uneven sizing.",
    motion: { energy: "chaotic", transitions: ["zoom", "slide-down", "slide-left"], cutSeconds: 2.2 },
    treatmentBias: { annotated_photo: 3, cutout_colorblock: 2, typography_punch: 2, versus_split: 2, ai_illustration: 1, artifact: 1, stock_moment: 1 },
  },
};

export const STYLE_IDS = Object.keys(VISUAL_STYLES);

export function getStyle(styleId) {
  return VISUAL_STYLES[styleId] ?? null;
}

/** Image-generation strings for a style — used by every service's AI image tier.
 *  kind: "illustration" | "photo". Falls back gracefully for unknown ids. */
export function styleImagePrompt(styleId, kind = "photo") {
  const s = VISUAL_STYLES[styleId];
  if (!s) return kind === "illustration" ? "clean modern illustration" : "cinematic editorial photograph, dramatic lighting, premium, slight film grain";
  return kind === "illustration" ? s.illustrationStyle : s.photoStyle;
}

/** Compact one-line summaries for the director's auto-pick decision. */
export function styleMenuForDirector() {
  return STYLE_IDS.map(id => `${id}: ${VISUAL_STYLES[id].description}`).join("\n");
}

/** The style directive block injected into the director and every designer call. */
export function styleDirectiveBlock(style) {
  return `## STYLE LEANING (a loose mood for the whole video — vary treatment scene to scene): ${style.label}
${style.description}
- Palette feel (a direction, NOT fixed hues — the topic palette decides actual colours): ${style.paletteGuidance}
- Typography: ${style.typeSystem}
- Motion energy: ${style.motion.energy} — cuts every ~${style.motion.cutSeconds}s, transitions from: ${style.motion.transitions.join(", ")}`;
}

/** UI option list for the shared StyleField (chatbox). No explicit "Auto" card —
 *  Auto is the implicit default (styleId stays "auto" until the user picks a style,
 *  and the director picks per topic). */
export const VISUAL_STYLE_OPTIONS =
  STYLE_IDS.map(id => ({ id, label: VISUAL_STYLES[id].label, desc: VISUAL_STYLES[id].description, colors: VISUAL_STYLES[id].colors }));
