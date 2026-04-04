/**
 * normalizeBeat.js
 * src/normalize/normalizeBeat.js
 */
export function normalizeBeat(raw = {}, index = 0, meta = {}) {
  const mode = meta?.mode || "faceless";

  /* ── Zones — preserve existing zone data fully ── */
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
    type: "color",
    value: "#000000",
    objectFit: "cover",
  };

  /* ── Duration — no artificial cap here, calculateTimeline handles it ── */
  let duration = raw.duration_sec;
  if (typeof duration !== "number" || isNaN(duration) || duration <= 0) {
    duration = 3.0;
  }

  const start = raw.start_sec ?? 0;
  const end = start + duration;

  return {
    id: raw.id || crypto.randomUUID(),
    order: index,

    layout: raw.layout || "FullBleed",
    layoutBackground,
    layoutPadding: raw.layoutPadding || 0,

    zones,

    asset_settings: raw.asset_settings || {},
    heading: raw.heading || null,
    text: raw.text || null,
    spoken: raw.spoken || "",
    components: raw.components || {},
    overlays: raw.overlays || [],
    audio_cues: raw.audio_cues || [],

    blocks: raw.blocks || [],

    caption: {
      show: captionRaw.show !== undefined ? captionRaw.show : true,
      text: captionRaw.text || raw.spoken || "",
      style: captionRaw.style || "wordBlaze",
      animation: captionRaw.animation || "fade",
      position: captionRaw.position || "bottom",
      emphasis_words: captionRaw.emphasis_words || [],
    },

    transition: raw.transition || {
      type: index === 0 ? "cut" : "cut",
      duration: 0.3,
    },

    intent: raw.intent || "explanation",
    energy: raw.energy ?? 0.5,
    visual_hint: raw.visual_hint || "none",
    language: raw.language || meta?.language || "english",

    duration_sec: duration,
    start_sec: start,
    end_sec: end,
  };
}
