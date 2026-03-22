export const componentMotionRegistry = {

  none: () => ({
    type: "none"
  }),

  pop: () => ({
    type: "scale",
    from: 0.6,
    duration: 12
  }),

  slideUp: () => ({
    type: "translateY",
    from: 80,
    duration: 14
  }),

  fade: () => ({
    type: "opacity",
    from: 0,
    duration: 14
  })

};