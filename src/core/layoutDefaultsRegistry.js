/**
 * layoutDefaultsRegistry.js
 * src/core/layoutDefaultsRegistry.js
 */
export const layoutDefaultsRegistry = {
  FullBleed: {
    captionPosition: "bottom",
    motionIntensity: 1,
    zones: { z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "kenburns" } },
  },

  HeadlineOverAsset: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    zones: {
      z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  SplitAssets: {
    captionPosition: "bottom",
    motionIntensity: 1.2,
    zones: {
      z1: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "pushSlow" },
      z2: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "kenburns" },
    },
  },

  ThreeStack: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    zones: {
      z1: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "slowZoom" },
      z3: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "cinematicPush" },
    },
  },

  HeadlineReveal: {
    captionPosition: "bottom",
    motionIntensity: 1.2,
    zones: {
      z1: { assetEnter: "popIn", assetExit: "slideUpOut", assetMotion: "none" },
      z2: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "kenburns" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  FourCollage: {
    captionPosition: "bottom",
    motionIntensity: 1.3,
    zones: {
      z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "microZoom" },
      z3: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "kenburns" },
      z4: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "pushSlow" },
      z5: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "cinematicPush" },
    },
  },

  CinematicLowerThird: {
    captionPosition: "bottom",
    motionIntensity: 0.9,
    zones: {
      z1: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  SideBySide: {
    captionPosition: "bottom",
    motionIntensity: 1.0,
    zones: {
      z1: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "microZoom" },
      z2: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  BigQuote: {
    captionPosition: "top",
    motionIntensity: 0.8,
    zones: {
      z1: { assetEnter: "popIn", assetExit: "none", assetMotion: "none" },
      z2: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  NumberHook: {
    captionPosition: "bottom",
    motionIntensity: 1.3,
    zones: {
      z1: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "popIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  ListReveal: {
    captionPosition: "top",
    motionIntensity: 1.0,
    zones: {
      z1: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "none" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z4: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  AssetWithList: {
    captionPosition: "bottom",
    motionIntensity: 1.0,
    zones: {
      z1: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z4: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  SplitTextAsset: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    zones: {
      z1: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "none" },
      z2: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "kenburns" },
      z3: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  StackedDuo: {
    captionPosition: "middle",
    motionIntensity: 1.2,
    zones: {
      z1: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "microZoom" },
      z3: { assetEnter: "popIn", assetExit: "none", assetMotion: "none" },
    },
  },

  Magazine: {
    captionPosition: "bottom",
    motionIntensity: 0.9,
    zones: {
      z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "microZoom" },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },
};
