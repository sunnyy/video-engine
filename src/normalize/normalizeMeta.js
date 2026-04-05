export function normalizeMeta(raw = {}) {
  const orientation = raw.orientation ?? "9:16";
  const mode = raw.mode ?? "faceless";
  const fps = raw.fps ?? 25;

  // Respect explicit width/height if set (e.g. after orientation toggle)
  // otherwise derive from orientation
  const isVertical = orientation === "9:16" || orientation === "vertical";
  const width = raw.width ?? (isVertical ? 1080 : 1920);
  const height = raw.height ?? (isVertical ? 1920 : 1080);

  return {
    // Spread all raw fields first so nothing unknown gets dropped
    ...raw,
    // Then enforce/normalize the known fields
    orientation,
    mode,
    fps,
    width,
    height,
    brand_color: raw.brand_color ?? null,
    // Preserve brand object (name, color, font)
    brand: raw.brand ?? {},
    // Preserve name
    name: raw.name ?? "",
  };
}
