export const beatTransitionRegistry = {
  none: () => ({
    type: "none",
    duration: 0,
  }),

  crossfade: () => ({
    type: "fade",
    duration: 20,
  }),

  slideLeft: () => ({
    type: "slideX",
    from: 100,
    duration: 20,
  }),

  slideRight: () => ({
    type: "slideX",
    from: -100,
    duration: 20,
  }),

  zoomIn: () => ({
    type: "scale",
    from: 0.5,
    duration: 10,
  }),

  zoomOut: () => ({
    type: "scale",
    from: 4.1,
    duration: 10,
  }),

  blurFade: () => ({
    type: "blur",
    from: 20,
    duration: 20,
  }),
};