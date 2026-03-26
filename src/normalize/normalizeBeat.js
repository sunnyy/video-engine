export function normalizeBeat(raw = {}, index = 0, meta = {}) {

  const mode = meta?.mode || "faceless";

  const zones =
    raw.zones || {
      z1: {
        role: mode === "talking_head" ? "avatar" : "asset",
        src: null,
        objectFit: "cover",
        padding: {},
        background: null
      }
    };

  const captionRaw = raw.caption || {};

  const layoutBackground = raw.layoutBackground || {
    type: "color",
    value: "#000000",
    objectFit: "cover"
  };

  return {

    id: raw.id || crypto.randomUUID(),

    order: index,

    layout: raw.layout || "FullZone",

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

    caption: {
      show: captionRaw.show !== undefined ? captionRaw.show : true,
      text: captionRaw.text || "",
      style: captionRaw.style || "tiktokClean",
      animation: captionRaw.animation || "fade",
      position: captionRaw.position || "bottom"
    },

    transition: raw.transition || {
      type: "cut",
      duration: 0.3
    },

    duration_sec: raw.duration_sec || 3,

    start_sec: raw.start_sec || 0,

    end_sec: raw.end_sec || 0

  };

}