export const assetTransitions = {

  fadeIn: () => ({
    type: "fadeIn",
    duration: 14
  }),

  fadeOut: () => ({
    type: "fadeOut",
    duration: 14
  }),

  slideUpIn: () => ({
    type: "slideY",
    from: 220,
    duration: 16
  }),

  slideUpOut: () => ({
    type: "slideY",
    to: 220,
    duration: 16
  }),

  slideDownIn: () => ({
    type: "slideY",
    from: -220,
    duration: 16
  }),

  slideDownOut: () => ({
    type: "slideY",
    to: -220,
    duration: 16
  }),

  slideLeftIn: () => ({
    type: "slideX",
    from: 320,
    duration: 16
  }),

  slideLeftOut: () => ({
    type: "slideX",
    to: 320,
    duration: 16
  }),

  slideRightIn: () => ({
    type: "slideX",
    from: -320,
    duration: 16
  }),

  slideRightOut: () => ({
    type: "slideX",
    to: -320,
    duration: 16
  }),

  scaleIn: () => ({
    type: "scale",
    from: 0.7,
    duration: 18
  }),

  scaleOut: () => ({
    type: "scale",
    to: 0.7,
    duration: 18
  }),

  blurIn: () => ({
    type: "blur",
    from: 40,
    duration: 18
  }),

  blurOut: () => ({
    type: "blur",
    to: 40,
    duration: 18
  }),

  wipeReveal: () => ({
    type: "wipe",
    direction: "left",
    duration: 20
  }),

  none: () => ({
    type: "none",
    duration: 0
  })

};