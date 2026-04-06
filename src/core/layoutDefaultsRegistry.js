/**
 * layoutDefaultsRegistry.js
 * src/core/layoutDefaultsRegistry.js
 */
export const layoutDefaultsRegistry = {
  FullBleed: {
    captionPosition: 80,
    motionIntensity: 1,
    zones: { z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "kenburns" } },
  },

  HeadlineOverAsset: {
    captionPosition: 80,
    motionIntensity: 1.1,
    zones: {
      z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  SplitAssets: {
    captionPosition: 80,
    motionIntensity: 1.2,
    zones: {
      z1: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "pushSlow" },
      z2: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "kenburns" },
    },
  },

  ThreeStack: {
    captionPosition: 80,
    motionIntensity: 1.1,
    zones: {
      z1: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "slowZoom" },
      z3: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "cinematicPush" },
    },
  },

  HeadlineReveal: {
    captionPosition: 80,
    motionIntensity: 1.2,
    zones: {
      z1: { assetEnter: "popIn", assetExit: "slideUpOut", assetMotion: "none" },
      z2: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "kenburns" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  FourCollage: {
    captionPosition: 80,
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
    captionPosition: 80,
    motionIntensity: 0.9,
    zones: {
      z1: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  SideBySide: {
    captionPosition: 80,
    motionIntensity: 1.0,
    zones: {
      z1: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "microZoom" },
      z2: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  BigQuote: {
    captionPosition: 15,
    motionIntensity: 0.8,
    zones: {
      z1: { assetEnter: "popIn", assetExit: "none", assetMotion: "none" },
      z2: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  NumberHook: {
    captionPosition: 80,
    motionIntensity: 1.3,
    zones: {
      z1: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "popIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  ListReveal: {
    captionPosition: 15,
    motionIntensity: 1.0,
    zones: {
      z1: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "none" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z4: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  AssetWithList: {
    captionPosition: 80,
    motionIntensity: 1.0,
    zones: {
      z1: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
      z4: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },

  SplitTextAsset: {
    captionPosition: 80,
    motionIntensity: 1.1,
    zones: {
      z1: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "none" },
      z2: { assetEnter: "slideLeftIn", assetExit: "none", assetMotion: "kenburns" },
      z3: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "none" },
    },
  },

  StackedDuo: {
    captionPosition: 50,
    motionIntensity: 1.2,
    zones: {
      z1: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "kenburns" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "microZoom" },
      z3: { assetEnter: "popIn", assetExit: "none", assetMotion: "none" },
    },
  },

  Magazine: {
    captionPosition: 80,
    motionIntensity: 0.9,
    zones: {
      z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "microZoom" },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "none" },
      z3: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none" },
    },
  },
};
