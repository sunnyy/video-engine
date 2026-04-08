/**
 * layoutDefinitions.js
 * src/core/layoutDefinitions.js
 *
 * Aggregates all archetype-based layout definitions into a single flat map.
 * 60 layouts total — 10 per archetype — each structurally distinct.
 *
 * Niche flavor (colors, fonts, elements) is applied by Video DNA on top.
 * The layout itself is archetype-driven, not niche-driven.
 *
 * Archetypes: hook | proof | visual_rest | escalate | reveal | cta
 *
 * captionStrategy:
 *   "always" — pure asset layouts, captions render on top freely
 *   "never"  — layout has text zones which serve as the captions
 */

import hookLayouts         from "./layouts/hook/index.js";
import proofLayouts        from "./layouts/proof/index.js";
import visualRestLayouts   from "./layouts/visual_rest/index.js";
import escalateLayouts     from "./layouts/escalate/index.js";
import revealLayouts       from "./layouts/reveal/index.js";
import ctaLayouts          from "./layouts/cta/index.js";
import statLayouts         from "./layouts/stat/index.js";
import explanationLayouts  from "./layouts/explanation/index.js";
import testimonialLayouts  from "./layouts/testimonial/index.js";
import contrastLayouts     from "./layouts/contrast/index.js";

const ALL_LAYOUTS = [
  ...hookLayouts,
  ...proofLayouts,
  ...visualRestLayouts,
  ...escalateLayouts,
  ...revealLayouts,
  ...ctaLayouts,
  ...statLayouts,
  ...explanationLayouts,
  ...testimonialLayouts,
  ...contrastLayouts,
];

// Flat map keyed by layout id — used by getLayoutDef(), ZoneCanvas, LayoutRenderer
export const layoutDefinitions = Object.fromEntries(
  ALL_LAYOUTS.map(l => [l.id, l])
);

// Ordered array — available if needed for iteration
export const layoutDefinitionsArray = ALL_LAYOUTS;
