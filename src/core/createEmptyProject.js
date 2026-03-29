export function createEmptyProject({
  orientation = "9:16",
  mode = "faceless",
  brand_color = "#f5c518"
} = {}) {
  return {
    meta: {
      orientation,
      mode,
      fps: 25,
      brand_color
    },

    captionPreset: {
      style: "clean",
      animation: "fade",
    },

    avatar:
      mode === "talking_head"
        ? {
            src: null,
            duration_sec: 0,
            speed: 1,
          }
        : null,

    music: null,

    beats: [],

    duration_sec: 0,
  };
}