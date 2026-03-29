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
                    motion: "kenburns"
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
              motion: "kenburns"
            }
          }
        };

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
            style: beat.caption.style || "tiktokClean",
            animation: beat.caption.animation || "fade",
            position: beat.caption.position || "bottom"
          }
        : {
            text: "",
            style: "tiktokClean",
            animation: "fade",
            position: "bottom"
          },

      transition: beat.transition || {
        type: "cut",
        duration: 0.3
      },

      duration_sec: duration,

      start_sec,
      end_sec
    };

    if (beat.asset_settings) {
      cleanBeat.asset_settings = beat.asset_settings;
    }

    if (beat.audio_cues) {
      cleanBeat.audio_cues = beat.audio_cues;
    }

    return cleanBeat;

  });

}