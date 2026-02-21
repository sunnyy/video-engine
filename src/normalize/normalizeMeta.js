export function normalizeMeta(raw = {}) {
  const orientation = raw.orientation || "9:16";
  const mode = raw.mode || "faceless";
  const fps = raw.fps || 30;

  let width = 1080;
  let height = 1920;

  if (orientation === "16:9") {
    width = 1920;
    height = 1080;
  }

  return {
    orientation,
    mode,
    fps,
    width,
    height,
  };
}