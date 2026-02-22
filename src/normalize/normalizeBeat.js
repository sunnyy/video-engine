import { VALID_LAYOUTS, DEFAULT_BEAT, DEFAULT_TRANSITION } from "./constants";
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

  if (rawAsset.type === "background" || rawAsset.type === "upload" || (rawAsset.type === "library" && rawAsset.src)) {
    return rawAsset;
  }

  return matchAsset({
    orientation: meta.orientation,
  });
}

export function normalizeBeat(raw = {}, index, meta) {
  const visual_mode = resolveVisualMode(raw.visual_mode, meta.mode);

  return {
    id: raw.id || "beat_" + index + "_" + Math.random().toString(36).slice(2, 6),

    order: index,
    beat_type: raw.beat_type || "default",
    visual_mode,

    content_type: raw.content_type || (meta.mode === "talking_head" ? "avatar" : "asset"),

    duration_sec: resolveDuration(raw.duration_sec),
    start_sec: 0,
    end_sec: 0,
    spoken: resolveSpoken(raw.spoken),
    visible: resolveVisible(raw.visible),

    avatar_position: normalizeAvatarPosition(raw.avatar_position, visual_mode),

    avatar_object_fit: raw.avatar_object_fit || "cover",

    assets: {
      main: raw.assets?.main
        ? {
            ...resolveAsset(raw.assets.main, meta),
            object_fit: raw.assets.main.object_fit || "cover",
          }
        : null,

      secondary: raw.assets?.secondary
        ? {
            ...resolveAsset(raw.assets.secondary, meta),
            object_fit: raw.assets.secondary.object_fit || "cover",
          }
        : null,
    },

    caption: {
      show: typeof raw.caption?.show === "boolean" ? raw.caption.show : true,
    },

    transition: normalizeTransition(raw.transition),

    components: Array.isArray(raw.components) ? raw.components : [],
  };
}
