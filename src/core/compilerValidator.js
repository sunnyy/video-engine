import { layoutRegistry } from "./registries/layoutRegistry";

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

        const zId = z.id || z;

        zones[zId] =
          beat.zones && beat.zones[zId]
            ? beat.zones[zId]
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

    // Preserve extra zones not in the layout def (block zones, element zones, user-added zones).
    // Skip orphan asset zones with no src — these are failed injected bg zones from image generation
    // that accumulate across reruns and render as phantom placeholder boxes in the video.
    if (beat.zones) {
      const defZoneSet = new Set(layoutDef ? layoutDef.zones.map(z => z.id || z) : ["z1"]);
      Object.entries(beat.zones).forEach(([id, zone]) => {
        if (defZoneSet.has(id)) return; // layout-def zones already handled above
        const isEmptyAsset = (zone?.type === "asset" || zone?.content?.kind === "asset")
          && !zone?.content?.asset?.src;
        if (!isEmptyAsset) zones[id] = zone;
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
    if (beat.resolvedColors) cleanBeat.resolvedColors = beat.resolvedColors;
    // avatarZone must survive validation — undefined = not set, null = explicitly none, string = zone id
    if (beat.avatarZone !== undefined) cleanBeat.avatarZone = beat.avatarZone;
    if (beat.deletedZones) cleanBeat.deletedZones = beat.deletedZones;

    // Pre-generated zone content seeds from the script director.
    // Must survive validation so generateZoneContent can use them as creative starting points.
    if (beat.headline) cleanBeat.headline = beat.headline;
    if (beat.subtext)  cleanBeat.subtext  = beat.subtext;
    if (beat.label)    cleanBeat.label    = beat.label;
    if (beat.stat)     cleanBeat.stat     = beat.stat;
    if (beat.tagline)  cleanBeat.tagline  = beat.tagline;
    if (beat.quote)    cleanBeat.quote    = beat.quote;
    if (beat.cta)      cleanBeat.cta      = beat.cta;

    return cleanBeat;

  });

}