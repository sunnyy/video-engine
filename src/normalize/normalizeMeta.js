import { DEFAULT_META, ORIENTATION_MAP } from "./constants";

function resolveOrientation(raw) {
  return ORIENTATION_MAP[raw] ? raw : DEFAULT_META.orientation;
}

function resolveMode(raw) {
  return raw === "talking_head" || raw === "faceless"
    ? raw
    : DEFAULT_META.mode;
}

function resolveFPS(raw) {
  return typeof raw === "number" && raw > 0
    ? raw
    : DEFAULT_META.fps;
}

export function normalizeMeta(raw = {}) {
  const orientation = resolveOrientation(raw.orientation);
  const mode = resolveMode(raw.mode);
  const fps = resolveFPS(raw.fps);

  const size = ORIENTATION_MAP[orientation];

  return {
    orientation,
    mode,
    fps,
    width: size.width,
    height: size.height,
  };
}