/**
 * designConstraints.js
 * src/services/ai/shared/designConstraints.js
 *
 * The single source of truth for what the GPT scene designer is allowed to use, given
 * that every design is FLATTENED to absolutely-positioned layers by the shared converter
 * (htmlMeasure). Anything that depends on a rendering feature the flatten doesn't carry
 * (pseudo-elements, clip-path, masks, blend modes, vertical text, stacked duplicate text…)
 * renders broken once flattened — so we tell the designer up front to stay inside the medium.
 *
 * Import this into each service's design prompt so the rule set never drifts per service.
 */

export const RENDERER_CONSTRAINTS = `RENDERER CONSTRAINTS — your design is FLATTENED into separate layers, so build ONLY with what survives the flatten:
- One visible thing = ONE tagged element. NEVER stack duplicate copies of the same text (no fake glitch / RGB-split / chromatic-aberration / echo / layered-shadow-as-copies) — stacked duplicates flatten into separate overlapping copies of the words.
- Each text element is ONE uniform style: no per-word or per-letter colors, gradients, or effects inside a text block. Accent a word by making it its OWN element, not a span inside another.
- Effects may ONLY come from: solid or gradient background color, text-shadow, border, border-radius, opacity, and rotation. These all survive the flatten.
- Do NOT rely on any of these for an essential visual (they are DROPPED when flattened): ::before/::after pseudo-elements, clip-path, mask/-webkit-mask, mix-blend-mode, background-clip:text / text gradients, writing-mode / vertical text, or translate-based stacking/offset layering. If an effect needs one of these, don't use it.
- TRANSFORMS: only ONE simple rotate or scale on an element survives the flatten. NO skew, perspective, rotateX/rotateY/rotateZ, 3D, or matrix3d. Each element is reduced to an axis-aligned box + that simple rotation, so skewed/3D illustrations COLLAPSE — thin skewed bars balloon into white blobs, the tilt is lost, pieces scatter. Build illustrations, dashboards, and device/app mockups FLAT and axis-aligned (a small whole-element rotate is OK); never fake 3D depth with skew or perspective.`;
