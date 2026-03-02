export const assetAnimationRegistry = {
  none: () => ({
    type: "none",
    duration: 0,
  }),

  fade: () => ({
    type: "fade",
    duration: 18,
  }),

  slideUp: () => ({
    type: "slideY",
    from: 140,
    duration: 22,
  }),

  slideDown: () => ({
    type: "slideY",
    from: -140,
    duration: 22,
  }),

  slideLeft: () => ({
    type: "slideX",
    from: 200,
    duration: 22,
  }),

  slideRight: () => ({
    type: "slideX",
    from: -200,
    duration: 22,
  }),

  zoomIn: () => ({
    type: "scale",
    from: 0.7,
    duration: 20,
  }),

  zoomOut: () => ({
    type: "scale",
    from: 1.3,
    duration: 20,
  }),

  punch: () => ({
    type: "springScale",
    from: 1.35,
    duration: 26,
  }),

  blurIn: () => ({
    type: "blur",
    from: 30,
    duration: 22,
  }),

  cinematicReveal: () => ({
    type: "combo",
    scaleFrom: 1.15,
    blurFrom: 20,
    duration: 30,
  }),
};