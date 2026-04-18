export const transitionsRegistry = {

  /* ---------- ENTER TRANSITIONS ---------- */

  enter: {

    none: () => ({
      layer: "entry",
      type: "none",
      duration: 0
    }),

    fadeIn: () => ({
      layer: "entry",
      type: "fade",
      duration: 14
    }),

    slideUpIn: () => ({
      layer: "entry",
      type: "slideY",
      from: 220,
      duration: 16
    }),

    slideDownIn: () => ({
      layer: "entry",
      type: "slideY",
      from: -220,
      duration: 16
    }),

    slideLeftIn: () => ({
      layer: "entry",
      type: "slideX",
      from: 320,
      duration: 16
    }),

    slideRightIn: () => ({
      layer: "entry",
      type: "slideX",
      from: -320,
      duration: 16
    }),

    scaleIn: () => ({
      layer: "entry",
      type: "scale",
      from: 0.7,
      duration: 18
    }),

    springScaleIn: () => ({
      layer: "entry",
      type: "springScale",
      from: 1.4,
      duration: 22
    }),

    blurIn: () => ({
      layer: "entry",
      type: "blur",
      from: 40,
      duration: 18
    }),

    wipeReveal: () => ({
      layer: "entry",
      type: "wipe",
      duration: 20
    }),

    irisReveal: () => ({
      layer: "entry",
      type: "iris",
      duration: 22
    }),

    glitchIn: () => ({
      layer: "entry",
      type: "glitch",
      duration: 16
    })

  },


  /* ---------- EXIT TRANSITIONS ---------- */

  exit: {

    none: () => ({
      layer: "exit",
      type: "none",
      duration: 0
    }),

    fadeOut: () => ({
      layer: "exit",
      type: "fade",
      duration: 14
    }),

    slideUpOut: () => ({
      layer: "exit",
      type: "slideY",
      to: 220,
      duration: 16
    }),

    slideDownOut: () => ({
      layer: "exit",
      type: "slideY",
      to: -220,
      duration: 16
    }),

    slideLeftOut: () => ({
      layer: "exit",
      type: "slideX",
      to: 320,
      duration: 16
    }),

    slideRightOut: () => ({
      layer: "exit",
      type: "slideX",
      to: -320,
      duration: 16
    }),

    scaleOut: () => ({
      layer: "exit",
      type: "scale",
      to: 0.7,
      duration: 18
    }),

    blurOut: () => ({
      layer: "exit",
      type: "blur",
      to: 40,
      duration: 18
    }),

    dissolveOut: () => ({
      layer: "exit",
      type: "dissolve",
      duration: 18
    }),

    glitchOut: () => ({
      layer: "exit",
      type: "glitch",
      duration: 16
    })

  },


  /* ---------- BEAT TRANSITIONS ---------- */

  beat: {

    cut: () => ({
      type: "cut",
      duration: 0
    }),

    fade: () => ({
      type: "fade",
      duration: 14
    }),

    dissolve: () => ({
      type: "dissolve",
      duration: 18
    }),

    dipBlack: () => ({
      type: "dipBlack",
      duration: 16
    }),

    dipWhite: () => ({
      type: "dipWhite",
      duration: 16
    }),

    slideLeft: () => ({
      type: "slideLeft",
      duration: 16
    }),

    slideRight: () => ({
      type: "slideRight",
      duration: 16
    }),

    slideUp: () => ({
      type: "slideUp",
      duration: 16
    }),

    slideDown: () => ({
      type: "slideDown",
      duration: 16
    }),

    zoom: () => ({
      type: "zoom",
      duration: 18
    }),

    whipPan: () => ({
      type: "whipPan",
      duration: 12
    }),

    spin: () => ({
      type: "spin",
      duration: 16
    }),

    glitch: () => ({
      type: "glitch",
      duration: 14
    }),

    flash: () => ({
      type: "flash",
      duration: 10
    })

  }

};