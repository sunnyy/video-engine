import { layoutRegistry } from "./layoutRegistry";

export function validateBeats(beats) {

  if (!Array.isArray(beats)) return [];

  let currentTime = 0;

  return beats.map((beat, index) => {

    const duration =
      typeof beat.duration_sec === "number" && beat.duration_sec > 0
        ? beat.duration_sec
        : 2;

    const start_sec = currentTime;
    const end_sec = start_sec + duration;

    currentTime = end_sec;

    const layout = beat.layout || "FullZone";

    const layoutDef = layoutRegistry[layout];

    const zones = {};

    if (layoutDef) {

      layoutDef.zones.forEach((z) => {

        zones[z] =
          beat.zones && beat.zones[z]
            ? beat.zones[z]
            : {
                role: "asset",
                padding: {},
                content: {
                  kind: "asset",
                  asset: {
                    src: null,
                    type: "image",
                    objectFit: "cover",
                    motion: "none"
                  }
                }
              };

      });

    } else {

      zones.z1 =
        beat.zones?.z1 || {
          role: "asset",
          padding: {},
          content: {
            kind: "asset",
            asset: {
              src: null,
              type: "image",
              objectFit: "cover",
              motion: "none"
            }
          }
        };

    }

    // Preserve extra zones not in the layout def:
    // bz1 (block zones), _bg_img (injected background), element zones (el_*)
    if (beat.zones) {
      const defZoneSet = new Set(layoutDef ? layoutDef.zones : ["z1"]);
      Object.entries(beat.zones).forEach(([id, zone]) => {
        if (!defZoneSet.has(id)) zones[id] = zone;
      });
    }

    const cleanBeat = {

      id: beat.id || `beat_${index}`,

      order: index,

      layout,

      layoutBackground: beat.layoutBackground || {
        type: "color",
        value: "#000000",
        objectFit: "cover"
      },

      zones,

      blocks: beat.blocks || [],

      heading: beat.heading || null,

      text: beat.text || null,

      spoken: beat.spoken || "",

      components: beat.components || {},

      caption: beat.caption
        ? {
            text: beat.caption.text || "",
            style: beat.caption.style || "wordBlaze",
            animation: beat.caption.animation || "fade",
            position: typeof beat.caption.position === "number" ? beat.caption.position : 80
          }
        : {
            text: "",
            style: "wordBlaze",
            animation: "fade",
            position: 80
          },

      transition: beat.transition || {
        type: "cut",
        duration: 0.3
      },

      duration_sec: duration,

      start_sec,
      end_sec
    };

    if (beat.asset_settings) cleanBeat.asset_settings = beat.asset_settings;
    if (beat.audio_cues)    cleanBeat.audio_cues    = beat.audio_cues;

    // Preserve runtime fields that validators must not strip
    if (beat.composition)    cleanBeat.composition    = beat.composition;
    if (beat.overlays)       cleanBeat.overlays       = beat.overlays;
    if (beat.intent)         cleanBeat.intent         = beat.intent;
    if (beat.energy   != null) cleanBeat.energy       = beat.energy;
    if (beat.role)           cleanBeat.role           = beat.role;
    if (beat.language)       cleanBeat.language       = beat.language;
    if (beat.asset_hint)     cleanBeat.asset_hint     = beat.asset_hint;
    if (beat.visual_hint)    cleanBeat.visual_hint    = beat.visual_hint;
    if (beat.block_props)    cleanBeat.block_props    = beat.block_props;
    if (beat.block_candidate) cleanBeat.block_candidate = beat.block_candidate;
    if (beat.layoutPadding != null) cleanBeat.layoutPadding = beat.layoutPadding;
    if (beat.decoratives)    cleanBeat.decoratives    = beat.decoratives;
    if (beat.resolvedColors) cleanBeat.resolvedColors = beat.resolvedColors;

    return cleanBeat;

  });

}