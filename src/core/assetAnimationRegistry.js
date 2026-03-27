export const assetAnimationRegistry = {

  /* ---------------- ENTRY ANIMATIONS ---------------- */

  fadeIn: () => ({
    layer: "entry",
    type: "fade",
    duration: 14,
  }),

  slideUpIn: () => ({
    layer: "entry",
    type: "slideY",
    from: 220,
    duration: 16,
  }),

  slideDownIn: () => ({
    layer: "entry",
    type: "slideY",
    from: -220,
    duration: 16,
  }),

  slideLeftIn: () => ({
    layer: "entry",
    type: "slideX",
    from: 320,
    duration: 16,
  }),

  slideRightIn: () => ({
    layer: "entry",
    type: "slideX",
    from: -320,
    duration: 16,
  }),

  scaleIn: () => ({
    layer: "entry",
    type: "scale",
    from: 0.7,
    duration: 18,
  }),

  punchIn: () => ({
    layer: "entry",
    type: "springScale",
    from: 1.5,
    duration: 22,
  }),

  blurReveal: () => ({
    layer: "entry",
    type: "blur",
    from: 40,
    duration: 18,
  }),

  cinematicReveal: () => ({
    layer: "entry",
    type: "combo",
    scaleFrom: 1.25,
    blurFrom: 30,
    duration: 24,
  }),

  wipeReveal: () => ({
    layer: "entry",
    type: "wipe",
    direction: "left",
    duration: 20,
  }),

  /* ---------------- CONTINUOUS MOTION ---------------- */

  none: () => ({
    layer: "motion",
    type: "none",
  }),

  slowZoom: () => ({
    layer: "motion",
    type: "scaleDrift",
    scaleStart: 1.05,
    scaleEnd: 1.2,
  }),

  cinematicPush: () => ({
    layer: "motion",
    type: "scaleDrift",
    scaleStart: 1.12,
    scaleEnd: 1.35,
  }),

  pushSlow: () => ({
    layer: "motion",
    type: "scaleDrift",
    scaleStart: 1.05,
    scaleEnd: 1.25,
  }),

  pullSlow: () => ({
    layer: "motion",
    type: "scaleDrift",
    scaleStart: 1.25,
    scaleEnd: 1.05,
  }),

  driftLeft: () => ({
    layer: "motion",
    type: "drift",
    xStart: 0,
    xEnd: -120,
    scaleStart: 1.1,
    scaleEnd: 1.2,
  }),

  driftRight: () => ({
    layer: "motion",
    type: "drift",
    xStart: 0,
    xEnd: 120,
    scaleStart: 1.1,
    scaleEnd: 1.2,
  }),

  driftUp: () => ({
    layer: "motion",
    type: "drift",
    yStart: 0,
    yEnd: -100,
    scaleStart: 1.08,
    scaleEnd: 1.18,
  }),

  driftDown: () => ({
    layer: "motion",
    type: "drift",
    yStart: 0,
    yEnd: 100,
    scaleStart: 1.08,
    scaleEnd: 1.18,
  }),

  kenburns: () => ({
    layer: "motion",
    type: "kenburns",
    scaleStart: 1.1,
    scaleEnd: 1.35,
    panX: -80,
    panY: -40
  }),

};