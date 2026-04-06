/**
 * normalizeBeat.js
 * src/normalize/normalizeBeat.js
 */
import { layoutRegistry } from "../core/layoutRegistry.js";

function resolvePositionY(p) {
  if (typeof p === "number") return Math.max(0, Math.min(100, p));
  if (p === "top")    return 15;
  if (p === "middle") return 50;
  return 80;
}

export function normalizeBeat(raw = {}, index = 0, meta = {}) {
  const mode = meta?.mode || "faceless";

  const zones = raw.zones || {
    z1: {
      role: mode === "talking_head" ? "avatar" : "asset",
      content: { kind: "asset", asset: { src: null, type: "image", objectFit: "cover" } },
      background: {},
      style: {},
    },
  };

  const captionRaw = raw.caption || {};

  const layoutBackground = raw.layoutBackground || {
    type:      "color",
    value:     "#000000",
    objectFit: "cover",
  };

  let duration = raw.duration_sec;
  if (typeof duration !== "number" || isNaN(duration) || duration <= 0) {
    duration = 3.0;
  }

  const start = raw.start_sec ?? 0;
  const end   = start + duration;

  // Caption show default — driven by layout's captionStrategy
  const layoutDef       = layoutRegistry[raw.layout || "FullBleed"];
  const captionStrategy = layoutDef?.captionStrategy ?? "always";
  const captionShowDefault = captionStrategy === "never" ? false : true;
  const captionShow = captionRaw.show !== undefined ? captionRaw.show : captionShowDefault;

  return {
    id:    raw.id || crypto.randomUUID(),
    order: index,

    layout:           raw.layout || "FullBleed",
    layoutBackground,
    layoutPadding:    raw.layoutPadding || 0,

    zones,

    asset_settings:  raw.asset_settings  || {},
    heading:         raw.heading         || null,
    text:            raw.text            || null,
    spoken:          raw.spoken          || "",
    components:      raw.components      || {},
    overlays:        raw.overlays        || [],
    audio_cues:      raw.audio_cues      || [],
    blocks:          raw.blocks          || [],

    caption: {
      show:           captionShow,
      text:           captionRaw.text || raw.spoken || "",
      style:          captionRaw.style          || "wordBlaze",
      animation:      captionRaw.animation      || "fade",
      position:       resolvePositionY(captionRaw.position),
      emphasis_words: captionRaw.emphasis_words || [],
    },

    transition: raw.transition || {
      type:     "cut",
      duration: 0.3,
    },

    intent:      raw.intent      || "explanation",
    energy:      raw.energy      ?? 0.5,
    visual_hint: raw.visual_hint || "none",
    language:    raw.language    || meta?.language || "english",

    asset_hint: raw.asset_hint
      ? { keywords: Array.isArray(raw.asset_hint.keywords) ? raw.asset_hint.keywords : [],
          prompt:   String(raw.asset_hint.prompt || "").trim() }
      : null,

    duration_sec: duration,
    start_sec:    start,
    end_sec:      end,
  };
}