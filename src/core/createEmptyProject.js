export function createEmptyProject({
  orientation = "9:16",
  mode = "faceless",
} = {}) {
  return {
    meta: {
      orientation,
      mode,
      fps: 30,
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

    beats: [
      {
        beat_type: "intro",
        visual_mode: mode === "talking_head" ? "split" : "full",
        duration_sec: 3,
        spoken: "",
        visible: true,
        assets: {
          main: null,
          secondary: null,
        },
        caption: {
          show: true,
          style: "clean",
          position: "bottom",
          animation: "fade",
        },
        transition: {
          type: "cut",
          duration: 0.3,
        },
        components: [],
      },
    ],
  };
}