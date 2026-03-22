export const beatTransitionRegistry = {

  cut: () => ({
    type: "cut",
    duration: 0,
  }),

  fade: () => ({
    type: "fade",
    duration: 12,
  }),

  slideLeft: () => ({
    type: "slideLeft",
    duration: 14,
  }),

  slideRight: () => ({
    type: "slideRight",
    duration: 14,
  }),

  slideUp: () => ({
    type: "slideUp",
    duration: 14,
  }),

  slideDown: () => ({
    type: "slideDown",
    duration: 14,
  }),

  scale: () => ({
    type: "scale",
    duration: 12,
  }),

  blurFade: () => ({
    type: "blurFade",
    duration: 16,
  })

};