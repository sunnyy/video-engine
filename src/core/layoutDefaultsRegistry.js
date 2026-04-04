/**
 * layoutDefaultsRegistry.js
 * src/core/layoutDefaultsRegistry.js
 *
 * Default motion/transition hints per layout zone.
 * Used as fallback when zone definition doesn't specify motion.
 */
export const layoutDefaultsRegistry = {

  FullBleed: {
    captionPosition: "bottom",
    motionIntensity: 1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "kenburns" }
    }
  },

  HeadlineOverAsset: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "fadeIn",    assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none"     }
    }
  },

  SplitAssets: {
    captionPosition: "bottom",
    motionIntensity: 1.2,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "cinematicPush" },
    zones: {
      z1: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "pushSlow" },
      z2: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "kenburns" }
    }
  },

  ThreeStack: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "kenburns"      },
      z2: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "slowZoom"      },
      z3: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "cinematicPush" }
    }
  },

  HeadlineReveal: {
    captionPosition: "bottom",
    motionIntensity: 1.2,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "popIn",     assetExit: "slideUpOut", assetMotion: "none"     },
      z2: { assetEnter: "fadeIn",    assetExit: "none",       assetMotion: "kenburns" },
      z3: { assetEnter: "slideUpIn", assetExit: "none",       assetMotion: "none"     }
    }
  },

  FourCollage: {
    captionPosition: "bottom",
    motionIntensity: 1.3,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "fadeIn",       assetExit: "none", assetMotion: "none"          },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "microZoom"     },
      z3: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "kenburns"      },
      z4: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "pushSlow"      },
      z5: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "cinematicPush" }
    }
  },

};