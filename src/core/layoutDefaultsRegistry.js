/**
 * layoutDefaultsRegistry.js
 * src/core/layoutDefaultsRegistry.js
 *
 * Default enter transitions and motions for every layout's zones.
 * All motions must exist in motionsRegistry.
 */
export const layoutDefaultsRegistry = {

  FullZone: {
    captionPosition: "bottom",
    motionIntensity: 1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "slowZoom" }
    }
  },

  SplitZone: {
    captionPosition: "middle",
    motionIntensity: 1.2,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "cinematicPush" },
    zones: {
      z1: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "pushSlow"  },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "kenburns"  }
    }
  },

  ThreeZone: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "slideUpIn",   assetExit: "none", assetMotion: "kenburns"  },
      z2: { assetEnter: "scaleIn",     assetExit: "none", assetMotion: "slowZoom"  },
      z3: { assetEnter: "slideDownIn", assetExit: "none", assetMotion: "pushSlow"  }
    }
  },

  TwoTopOneBottom: {
    captionPosition: "middle",
    motionIntensity: 1.2,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "cinematicPush" },
    zones: {
      z1: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "cinematicPush" },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "cinematicPush" },
      z3: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "slowZoom"      }
    }
  },

  OneTopTwoBottom: {
    captionPosition: "bottom",
    motionIntensity: 1.2,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "cinematicPush" },
    zones: {
      z1: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "slowZoom"      },
      z2: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "kenburns"      },
      z3: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "cinematicPush" }
    }
  },

  FourGrid: {
    captionPosition: "bottom",
    motionIntensity: 1.3,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "pushSlow"      },
      z2: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "kenburns"      },
      z3: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "cinematicPush" },
      z4: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "pushSlow"      }
    }
  },

  SixGrid: {
    captionPosition: "bottom",
    motionIntensity: 1.3,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "microZoom"     },
      z2: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "kenburns"      },
      z3: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "pushSlow"      },
      z4: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "microZoom"     },
      z5: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "slowZoom"      },
      z6: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "cinematicPush" }
    }
  },

  BigTopSmallBottom: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "kenburns"      },
      z2: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "pushSlow"      },
      z3: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "microZoom"     }
    }
  },

  SmallTopBigBottom: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "pushSlow"      },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "microZoom"     },
      z3: { assetEnter: "scaleIn",      assetExit: "none", assetMotion: "kenburns"      }
    }
  },

  LeftHeavy: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "kenburns"  },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "pushSlow"  }
    }
  },

  RightHeavy: {
    captionPosition: "bottom",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "pushSlow"  },
      z2: { assetEnter: "slideRightIn", assetExit: "none", assetMotion: "kenburns"  }
    }
  },

  PictureInPicture: {
    captionPosition: "middle",
    motionIntensity: 1.1,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "cinematicPush" },
    zones: {
      z1: { assetEnter: "fadeIn",    assetExit: "none", assetMotion: "slowZoom"  },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "pullSlow"  }
    }
  },

  CenterAvatar: {
    captionPosition: "middle",
    motionIntensity: 0.8,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "fadeIn", assetExit: "none", assetMotion: "slowZoom" },
      z2: { assetEnter: "scaleIn", assetExit: "none", assetMotion: "none"    }
    }
  },

  FloatingAvatar: {
    captionPosition: "middle",
    motionIntensity: 0.9,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "fadeIn",    assetExit: "none", assetMotion: "slowZoom" },
      z2: { assetEnter: "slideUpIn", assetExit: "none", assetMotion: "none"     }
    }
  },

  SideAvatar: {
    captionPosition: "middle",
    motionIntensity: 0.9,
    layoutBackground: { enterTransition: "fadeIn", exitTransition: "none", motion: "slowZoom" },
    zones: {
      z1: { assetEnter: "fadeIn",       assetExit: "none", assetMotion: "slowZoom" },
      z2: { assetEnter: "slideLeftIn",  assetExit: "none", assetMotion: "none"     }
    }
  },

};