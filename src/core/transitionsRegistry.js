export const transitionsRegistry = {

  cut: () => ({
    type: "cut",
    duration: 0
  }),

  fade: () => ({
    type: "fade",
    duration: 0.35
  }),

  slideLeft: () => ({
    type: "slideLeft",
    duration: 0.35
  }),

  slideRight: () => ({
    type: "slideRight",
    duration: 0.35
  }),

  slideUp: () => ({
    type: "slideUp",
    duration: 0.35
  }),

  slideDown: () => ({
    type: "slideDown",
    duration: 0.35
  }),

  scale: () => ({
    type: "scale",
    duration: 0.35
  }),

  blurFade: () => ({
    type: "blurFade",
    duration: 0.35
  })

};