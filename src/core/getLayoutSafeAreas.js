import { layoutRegistry } from "./registries/layoutRegistry.js";

export function getLayoutSafeAreas(layoutName) {

  const layout = layoutRegistry[layoutName];

  if (!layout) {
    return {
      heading: {},
      caption: {},
      blocks: {}
    };
  }

  const safe = layout.safeAreas || {};

  return {
    heading: safe.heading || {},
    caption: safe.caption || {},
    blocks: safe.blocks || {}
  };

}