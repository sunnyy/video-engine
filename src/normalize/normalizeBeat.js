import { VALID_LAYOUTS, DEFAULT_BEAT, DEFAULT_CAPTION, DEFAULT_TRANSITION } from "./constants";
import { matchAsset } from "../core/assetMatcher";

function resolveVisualMode(raw, projectMode) {
  if (VALID_LAYOUTS.includes(raw)) return raw;
  return projectMode === "talking_head" ? "split" : "full";
}

function resolveDuration(raw) {
  return typeof raw === "number" && raw > 0 ? raw : DEFAULT_BEAT.duration_sec;
}

function resolveVisible(raw) {
  return typeof raw === "boolean" ? raw : DEFAULT_BEAT.visible;
}

function resolveSpoken(raw) {
  return typeof raw === "string" ? raw : DEFAULT_BEAT.spoken;
}

function normalizeCaption(raw = {}) {
  return {
    show: typeof raw.show === "boolean" ? raw.show : DEFAULT_CAPTION.show,
    style: raw.style || DEFAULT_CAPTION.style,
    position: raw.position || DEFAULT_CAPTION.position,
    animation: raw.animation || DEFAULT_CAPTION.animation,
  };
}

function normalizeTransition(raw = {}) {
  return {
    type: raw.type || DEFAULT_TRANSITION.type,
    duration: typeof raw.duration === "number" ? raw.duration : DEFAULT_TRANSITION.duration,
  };
}

function normalizeAvatarPosition(raw, visualMode) {
  if (visualMode !== "split") return null;
  return raw === "bottom" ? "bottom" : "top";
}

function resolveAsset(rawAsset, meta) {
  if (!rawAsset) return null;

  // Preserve background
  if (rawAsset.type === "background") {
    return rawAsset;
  }

  // Preserve upload
  if (rawAsset.type === "upload") {
    return rawAsset;
  }

  // Preserve library if already structured
  if (rawAsset.type === "library" && rawAsset.src) {
    return rawAsset;
  }

  // Fallback match
  return matchAsset({
    orientation: meta.orientation,
  });
}

export function normalizeBeat(raw = {}, index, meta) {
  const visual_mode = resolveVisualMode(
    raw.visual_mode,
    meta.mode
  );

  return {
    id:
      raw.id ||
      "beat_" +
        index +
        "_" +
        Math.random()
          .toString(36)
          .slice(2, 6),

    order: index,
    beat_type: raw.beat_type || "default",
    visual_mode,

    // 🔥 PRESERVE content_type
    content_type:
      raw.content_type ||
      (meta.mode === "talking_head"
        ? "avatar"
        : "asset"),

    duration_sec: resolveDuration(raw.duration_sec),
    start_sec: 0,
    end_sec: 0,
    spoken: resolveSpoken(raw.spoken),
    visible: resolveVisible(raw.visible),
    avatar_position: normalizeAvatarPosition(
      raw.avatar_position,
      visual_mode
    ),

    assets: {
      main: resolveAsset(raw.assets?.main, meta),
      secondary: resolveAsset(
        raw.assets?.secondary,
        meta
      ),
    },

    caption: normalizeCaption(raw.caption),
    transition: normalizeTransition(
      raw.transition
    ),
    components: Array.isArray(raw.components)
      ? raw.components
      : [],
  };
}
