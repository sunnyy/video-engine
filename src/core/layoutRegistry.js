/**
 * layoutRegistry.js
 * src/core/layoutRegistry.js
 */

import { layoutDefinitions } from "./layoutDefinitions.js";

export const layoutRegistry = Object.fromEntries(
  Object.entries(layoutDefinitions).map(([id, def]) => [
    id,
    {
      id,
      label: def.label,
      def,
      intent: def.intent,
      energy: def.energy,
      orientation: def.orientation,
      niche: def.niche || [],
      assetCount: def.assetCount,
      textCount: def.textCount,
      captionStrategy: def.captionStrategy ?? "always",
      zones: def.zones.map((z) => z.id),
      supportsAvatar: def.zones.some((z) => z.content?.kind === "avatar"),
      captionPosition: 80,
      structure: { heading: true, blocks: true, caption: true },
    },
  ]),
);

export function getLayoutDef(layoutId) {
  return layoutRegistry[layoutId]?.def || null;
}

export function findLayouts({ intent, energy, orientation, assetCount, textCount, niche } = {}) {
  return Object.values(layoutRegistry).filter((layout) => {
    if (intent && !layout.intent.includes(intent)) return false;
    if (energy && !layout.energy.includes(energy)) return false;
    if (orientation && !layout.orientation.includes(orientation)) return false;
    if (assetCount !== undefined && layout.assetCount !== assetCount) return false;
    if (textCount !== undefined && layout.textCount !== textCount) return false;
    // Niche filter: only exclude if layout has explicit niches AND this niche isn't listed
    if (niche && layout.niche?.length > 0 && !layout.niche.includes(niche)) return false;
    return true;
  });
}
