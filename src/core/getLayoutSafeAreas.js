import { layoutRegistry } from "./layoutRegistry";

export function getLayoutSafeAreas(layoutName) {

  const layout = layoutRegistry[layoutName];

  if (!layout) {
    return {
      heading: {},
      caption: {},
      components: {}
    };
  }

  return layout.safeAreas || {
    heading: {},
    caption: {},
    components: {}
  };

}