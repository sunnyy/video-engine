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
- TRANSFORMS: NO skew, perspective, rotateX/rotateY/rotateZ, 3D, or matrix3d — each element flattens to an axis-aligned box, so those collapse (thin skewed bars balloon, tilts vanish, pieces scatter). A plain 2D rotate()/scale() survives ONLY on a single standalone LEAF element (a lone shape, icon, dot, or accent mark with nothing inside it). NEVER rotate or transform a CONTAINER/GROUP — a card, panel, or phone/app/device/dashboard mockup that holds child elements — because the flatten lays each child out as its own axis-aligned box and the group's rotation is lost, so the whole mockup un-tilts and its pieces scatter. Build all illustrations, dashboards, and device/app mockups perfectly FLAT and axis-aligned; never fake 3D depth or a tilted-perspective look.
- ARROWS & TRIANGLES: build any arrow, chevron, caret or triangle as a Lucide data-icon (e.g. data-icon="arrow-down", "chevron-right"), NEVER as a CSS border-triangle (width:0 + a thick one-sided border) — that flattens to a solid square.

KEEP IT SIMPLE — do NOT reconstruct a full product UI (a video editor, dashboard, IDE, a timeline with tracks/toolbars/panels, a multi-card app screen) in detail. A dense mockup is wasted on a 2–4s scene, takes huge effort for little payoff, and flattens into clutter. Suggest the idea with the FEWEST elements that read INSTANTLY — one panel, a play button, 2–3 bars, a single labelled card — not a pixel-complete app. Fewer, bigger, clearer; lean on negative space.`;
