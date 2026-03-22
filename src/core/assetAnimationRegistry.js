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
    from: 220,
    duration: 18,
  }),

  slideDown: () => ({
    type: "slideY",
    from: -220,
    duration: 18,
  }),

  slideLeft: () => ({
    type: "slideX",
    from: 320,
    duration: 18,
  }),

  slideRight: () => ({
    type: "slideX",
    from: -320,
    duration: 18,
  }),

  zoomIn: () => ({
    type: "scale",
    from: 0.6,
    duration: 20,
  }),

  zoomOut: () => ({
    type: "scale",
    from: 1.4,
    duration: 20,
  }),

  punch: () => ({
    type: "springScale",
    from: 1.6,
    duration: 26,
  }),

  blurIn: () => ({
    type: "blur",
    from: 40,
    duration: 20,
  }),

  cinematicReveal: () => ({
    type: "combo",
    scaleFrom: 1.25,
    blurFrom: 30,
    duration: 26,
  }),

  dramaticZoom: () => ({
    type: "scale",
    from: 0.4,
    duration: 16
  }),

  verticalReveal: () => ({
    type: "slideY",
    from: 300,
    duration: 20
  }),

  horizontalReveal: () => ({
    type: "slideX",
    from: 300,
    duration: 20
  }),

  /* ---- HIGH IMPACT CAMERA MOTION ---- */

  pushSlow: () => ({
    type: "pushSlow",
    scaleStart: 1.05,
    scaleEnd: 1.25,
  }),

  pullSlow: () => ({
    type: "pushSlow",
    scaleStart: 1.25,
    scaleEnd: 1.05,
  }),

  driftLeft: () => ({
    type: "drift",
    xStart: 0,
    xEnd: -120,
    scaleStart: 1.1,
    scaleEnd: 1.2,
  }),

  driftRight: () => ({
    type: "drift",
    xStart: 0,
    xEnd: 120,
    scaleStart: 1.1,
    scaleEnd: 1.2,
  }),

  driftUp: () => ({
    type: "drift",
    yStart: 0,
    yEnd: -100,
    scaleStart: 1.08,
    scaleEnd: 1.18,
  }),

  driftDown: () => ({
    type: "drift",
    yStart: 0,
    yEnd: 100,
    scaleStart: 1.08,
    scaleEnd: 1.18,
  }),

  kenburnsPro: () => ({
    type: "kenburns",
    scaleStart: 1.1,
    scaleEnd: 1.35,
    panX: -80,
    panY: -40
  }),

  cinematicPush: () => ({
    type: "pushSlow",
    scaleStart: 1.15,
    scaleEnd: 1.4
  }),

};