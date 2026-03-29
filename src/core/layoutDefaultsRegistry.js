export const layoutDefaultsRegistry = {

  FullZone: {

    captionPosition: "bottom",

    motionIntensity: 1,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: {
        assetEnter: "scaleIn",
        assetExit: "none",
        assetMotion: "slowZoom",

        backgroundEnter: "fadeIn",
        backgroundExit: "none",
        backgroundMotion: "slowZoom"
      }

    }

  },

  SplitZone: {

    captionPosition: "middle",

    motionIntensity: 1.2,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "cinematicPush"
    },

    zones: {

      z1: {
        assetEnter: "slideLeftIn",
        assetExit: "none",
        assetMotion: "pushSlow",

        backgroundEnter: "fadeIn",
        backgroundExit: "none",
        backgroundMotion: "slowZoom"
      },

      z2: {
        assetEnter: "slideRightIn",
        assetExit: "none",
        assetMotion: "kenburns",

        backgroundEnter: "fadeIn",
        backgroundExit: "none",
        backgroundMotion: "slowZoom"
      }

    }

  },

  ThreeZone: {

    captionPosition: "bottom",

    motionIntensity: 1.1,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: {
        assetEnter: "slideUpIn",
        assetMotion: "kenburns"
      },

      z2: {
        assetEnter: "scaleIn",
        assetMotion: "slowZoom"
      },

      z3: {
        assetEnter: "slideDownIn",
        assetMotion: "pushSlow"
      }

    }

  },

  TwoTopOneBottom: {

    captionPosition: "middle",

    motionIntensity: 1.2,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "cinematicPush"
    },

    zones: {

      z1: {
        assetEnter: "slideLeftIn",
        assetMotion: "cinematicPush"
      },

      z2: {
        assetEnter: "slideRightIn",
        assetMotion: "cinematicPush"
      },

      z3: {
        assetEnter: "scaleIn",
        assetMotion: "slowZoom"
      }

    }

  },

  OneTopTwoBottom: {

    captionPosition: "bottom",

    motionIntensity: 1.2,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "cinematicPush"
    },

    zones: {

      z1: {
        assetEnter: "scaleIn",
        assetMotion: "slowZoom"
      },

      z2: {
        assetEnter: "slideLeftIn",
        assetMotion: "kenburns"
      },

      z3: {
        assetEnter: "slideRightIn",
        assetMotion: "cinematicPush"
      }

    }

  },

  FourGrid: {

    captionPosition: "bottom",

    motionIntensity: 1.3,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: { assetEnter: "scaleIn", assetMotion: "pushSlow" },
      z2: { assetEnter: "slideLeftIn", assetMotion: "kenburns" },
      z3: { assetEnter: "slideRightIn", assetMotion: "cinematicPush" },
      z4: { assetEnter: "scaleIn", assetMotion: "pushSlow" }

    }

  },

  PictureInPicture: {

    captionPosition: "middle",

    motionIntensity: 1.1,

    layoutBackground: {
      enterTransition: "blurIn",
      exitTransition: "none",
      motion: "cinematicPush"
    },

    zones: {

      z1: {
        assetEnter: "blurIn",
        assetMotion: "slowZoom"
      },

      z2: {
        assetEnter: "slideUpIn",
        assetMotion: "pullSlow"
      }

    }

  },

  CenterAvatar: {

    captionPosition: "middle",

    motionIntensity: 0.8,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: {
        assetEnter: "fadeIn",
        assetMotion: "slowZoom"
      },

      z2: {
        assetEnter: "scaleIn",
        assetMotion: "none"
      }

    }

  },

  FloatingAvatar: {

    captionPosition: "middle",

    motionIntensity: 0.9,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: {
        assetEnter: "fadeIn",
        assetMotion: "slowZoom"
      },

      z2: {
        assetEnter: "slideUpIn",
        assetMotion: "none"
      }

    }

  },

  SideAvatar: {

    captionPosition: "middle",

    motionIntensity: 0.9,

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: {
        assetEnter: "fadeIn",
        assetMotion: "slowZoom"
      },

      z2: {
        assetEnter: "slideLeftIn",
        assetMotion: "none"
      }

    }

  }

};