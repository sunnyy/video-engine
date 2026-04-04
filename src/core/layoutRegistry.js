/**
 * layoutRegistry.js
 * src/core/layoutRegistry.js
 *
 * Layouts are now JSON definitions from layoutDefinitions.js.
 * No JSX component imports per layout.
 * LayoutRenderer.jsx is the single universal renderer.
 */

import { layoutDefinitions } from "./layoutDefinitions.js";

/**
 * layoutRegistry
 * Each entry exposes the layout definition for AI selection and rendering.
 * `def` is the full JSON zone definition from layoutDefinitions.
 */
export const layoutRegistry = Object.fromEntries(
  Object.entries(layoutDefinitions).map(([id, def]) => [
    id,
    {
      id,
      label:       def.label,
      def,                        // full zone definition
      intent:      def.intent,    // array: ["hook","stat",...]
      energy:      def.energy,    // array: ["low","medium","high"]
      orientation: def.orientation, // array: ["9:16","16:9"]
      assetCount:  def.assetCount,
      textCount:   def.textCount,

      // Legacy compat fields — kept so nothing else breaks during migration
      zones:          def.zones.map(z => z.id),
      supportsAvatar: def.zones.some(z => z.content?.kind === "avatar"),
      captionPosition: "bottom",
      structure: { heading: true, blocks: true, caption: true },
    }
  ])
);

/**
 * getLayoutDef(layoutId)
 * Returns the raw zone definition for a layout id.
 */
export function getLayoutDef(layoutId) {
  return layoutRegistry[layoutId]?.def || null;
}

/**
 * findLayouts({ intent, energy, orientation, assetCount, textCount })
 * Returns all layouts matching the given criteria.
 * All filters are optional — omitting one means "any".
 */
export function findLayouts({ intent, energy, orientation, assetCount, textCount } = {}) {
  return Object.values(layoutRegistry).filter(layout => {
    if (intent      && !layout.intent.includes(intent))           return false;
    if (energy      && !layout.energy.includes(energy))           return false;
    if (orientation && !layout.orientation.includes(orientation)) return false;
    if (assetCount  !== undefined && layout.assetCount !== assetCount) return false;
    if (textCount   !== undefined && layout.textCount  !== textCount)  return false;
    return true;
  });
}