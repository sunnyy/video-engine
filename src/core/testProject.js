export const testProject = {
  meta: {
    width: 1080,
    height: 1920,
    fps: 30,
    mode: "faceless"
  },

  duration_sec: 6,

  music: null,

  beats: [
    {
      id: "b1",
      order: 0,
      layout: "FullZone",

      zones: {
        z1: {
          type: "asset",
          src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          objectFit: "cover"
        }
      },

      heading: "Test Headline",

      components: {},

      caption: {
        show: true,
        style: "wordBlaze",
        animation: "fade",
        position: "bottom",
        segments: []
      },

      transition: {
        type: "cut",
        duration: 0.3
      },

      spoken: "This is a test beat",

      visible: true,

      duration_sec: 3,
      start_sec: 0,
      end_sec: 3
    },

    {
      id: "b2",
      order: 1,
      layout: "SplitZone",

      zones: {
        z1: {
          type: "asset",
          src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          objectFit: "cover"
        },
        z2: {
          type: "asset",
          src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          objectFit: "cover"
        }
      },

      heading: "Second Beat",

      components: {},

      caption: {
        show: true,
        style: "wordBlaze",
        animation: "fade",
        position: "bottom",
        segments: []
      },

      transition: {
        type: "fade",
        duration: 0.4
      },

      spoken: "Second test beat",

      visible: true,

      duration_sec: 3,
      start_sec: 3,
      end_sec: 6
    }
  ]
};