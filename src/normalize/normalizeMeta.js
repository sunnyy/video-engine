export function normalizeMeta(raw = {}) {

  const orientation =
    raw.orientation !== undefined
      ? raw.orientation
      : "vertical";

  const mode =
    raw.mode !== undefined
      ? raw.mode
      : "faceless";

  const fps =
    raw.fps !== undefined
      ? raw.fps
      : 25;

  let width = 1080;
  let height = 1920;

  if (orientation === "horizontal") {
    width = 1920;
    height = 1080;
  }

  const brand_color =
    raw.brand_color !== undefined
      ? raw.brand_color
      : null;

  return {
    orientation,
    mode,
    fps,
    width,
    height,
    brand_color
  };

}