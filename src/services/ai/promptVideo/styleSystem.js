/**
 * styleSystem.js
 * src/services/ai/promptVideo/styleSystem.js
 *
 * The style preset system — declared ONCE per video, inherited by every beat.
 * Coherence across a generated video comes from locking these choices up
 * front: the illustration style string goes into every AI-image prompt
 * verbatim, the type system and palette guidance go into every design call,
 * and the motion profile drives transitions and cut energy.
 *
 * Users pick a named style (or Auto). They never pick an architecture.
 */

export const STYLE_PRESETS = {
  editorial_retro: {
    id: "editorial_retro",
    label: "Editorial Retro",
    description: "Vintage print magazine — bold two-tone illustrations, halftone texture, punchy headlines",
    illustrationStyle: "retro editorial illustration, limited two-tone palette, mid-century print style, halftone texture, bold flat shapes, screen-print grain, textless artwork",
    photoStyle: "editorial magazine photograph, dramatic studio lighting, slight film grain",
    paletteGuidance: "Two dominant inks on a paper-like OR near-black field, high contrast, flat poster feel — the topic palette picks the actual inks; do NOT default every frame to orange-on-cream, and alternate the field (some paper, some dark) across beats.",
    typeSystem: "Condensed bold display type (Oswald, Barlow Condensed, Anton) for headlines, clean grotesque for labels. Uppercase headlines welcome.",
    motion: { energy: "punchy", transitions: ["slide-left", "zoom", "slide-up"], cutSeconds: 2.8 },
    treatmentBias: { ai_illustration: 3, artifact: 2, cutout_colorblock: 2, annotated_photo: 2, typography_punch: 1, stock_moment: 1, versus_split: 1 },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Quiet confidence — generous space, restrained type, one accent",
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
    illustrationStyle: "bold pop-art illustration, saturated color blocking, thick outlines, comic energy, high contrast",
    photoStyle: "vibrant editorial photograph, punchy saturated colors, hard light",
    paletteGuidance: "Saturated colour-block backgrounds that ALTERNATE per beat (hues drawn from the topic palette, not a fixed set). Black or white type at maximum weight.",
    typeSystem: "Ultra-bold display (Archivo Black via Anton/Unbounded, Outfit 900). Huge. Uppercase.",
    motion: { energy: "aggressive", transitions: ["zoom", "slide-left", "slide-down"], cutSeconds: 2.4 },
    treatmentBias: { cutout_colorblock: 3, typography_punch: 2, ai_illustration: 2, versus_split: 2, annotated_photo: 1, artifact: 1, stock_moment: 1 },
  },
  dark_cinematic: {
    id: "dark_cinematic",
    label: "Dark Cinematic",
    description: "Moody, filmic, atmospheric — trailer energy",
    illustrationStyle: "cinematic concept art, moody atmospheric lighting, deep shadows, volumetric light, film still quality",
    photoStyle: "cinematic film still, anamorphic look, moody low-key lighting, shallow depth of field",
    paletteGuidance: "Near-black fields, one glowing accent (amber, teal, crimson). Light is the decoration — which means every frame MUST contain visible light: a glow, a lit subject, a luminous accent. A frame of flat darkness is a failure, not a mood.",
    typeSystem: "Wide-tracked uppercase serif or grotesque (Playfair Display, Space Grotesk). Restrained sizes, dramatic spacing.",
    motion: { energy: "slow-burn", transitions: ["fade", "zoom"], cutSeconds: 3.2 },
    treatmentBias: { stock_moment: 3, ai_illustration: 2, typography_punch: 2, annotated_photo: 1, cutout_colorblock: 1, artifact: 1, versus_split: 1 },
  },
  corporate_clean: {
    id: "corporate_clean",
    label: "Corporate Clean",
    description: "Trustworthy, structured, polished — enterprise-grade",
    illustrationStyle: "clean corporate isometric illustration, professional flat design, structured grid, soft shadows",
    photoStyle: "professional corporate photograph, bright office light, polished, optimistic",
    paletteGuidance: "White or deep navy fields, one brand-grade accent (blue, teal, green). Cards and thin dividers structure everything.",
    typeSystem: "Professional sans (Inter, Plus Jakarta Sans) at 600-800. Sentence case. Clear hierarchy.",
    motion: { energy: "measured", transitions: ["slide-up", "fade"], cutSeconds: 3.0 },
    treatmentBias: { artifact: 3, ai_illustration: 2, stock_moment: 2, typography_punch: 2, cutout_colorblock: 1, annotated_photo: 1, versus_split: 1 },
  },
  meme_chaos: {
    id: "meme_chaos",
    label: "Meme Energy",
    description: "Internet-native chaos — annotations, arrows, reaction energy",
    illustrationStyle: "internet meme style illustration, exaggerated expressions, deep-fried saturation, sticker outlines",
    photoStyle: "candid reaction photograph, flash photography look, raw and unpolished",
    paletteGuidance: "Whatever is loudest. Reds, yellows, harsh white. Red circles, arrows, and underlines as decoration.",
    typeSystem: "Impact-adjacent ultra-bold (Anton, Archivo via Outfit 900). White with black stroke feel via heavy text-shadow.",
    motion: { energy: "chaotic", transitions: ["zoom", "slide-down", "slide-left"], cutSeconds: 2.2 },
    treatmentBias: { annotated_photo: 3, cutout_colorblock: 2, typography_punch: 2, versus_split: 2, ai_illustration: 1, artifact: 1, stock_moment: 1 },
  },
};

export const STYLE_IDS = Object.keys(STYLE_PRESETS);

export function getStyle(styleId) {
  return STYLE_PRESETS[styleId] ?? null;
}

/** Compact one-line summaries for the director's auto-pick decision. */
export function styleMenuForDirector() {
  return STYLE_IDS.map(id => `${id}: ${STYLE_PRESETS[id].description}`).join("\n");
}

/** The style directive block injected into the director and every designer call.
 * The style is a LOOSE MOOD/LEANING, not a lock — colour comes from the video's
 * topic-grounded palette and the per-beat field variation, so scenes don't all
 * end up the same wash. Palette guidance here is a feel, not a fixed set of hues. */
export function styleDirectiveBlock(style) {
  return `## STYLE LEANING (a loose mood for the whole video — vary treatment scene to scene): ${style.label}
${style.description}
- Palette feel (a direction, NOT fixed hues — the topic palette decides actual colours): ${style.paletteGuidance}
- Typography: ${style.typeSystem}
- Motion energy: ${style.motion.energy} — cuts every ~${style.motion.cutSeconds}s, transitions from: ${style.motion.transitions.join(", ")}`;
}
