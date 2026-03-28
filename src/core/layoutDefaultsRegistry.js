export const layoutDefaultsRegistry = {

  FullZone: {

    captionPosition: "bottom",

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

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "cinematicPush"
    },

    zones: {

      z1: {
        assetEnter: "slideLeftIn",
        assetExit: "none",
        assetMotion: "driftLeft",

        backgroundEnter: "fadeIn",
        backgroundExit: "none",
        backgroundMotion: "slowZoom"
      },

      z2: {
        assetEnter: "slideRightIn",
        assetExit: "none",
        assetMotion: "driftRight",

        backgroundEnter: "fadeIn",
        backgroundExit: "none",
        backgroundMotion: "slowZoom"
      }

    }

  },

  ThreeZone: {

    captionPosition: "bottom",

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: {
        assetEnter: "slideUpIn",
        assetMotion: "driftLeft"
      },

      z2: {
        assetEnter: "scaleIn",
        assetMotion: "slowZoom"
      },

      z3: {
        assetEnter: "slideDownIn",
        assetMotion: "driftRight"
      }

    }

  },

  TwoTopOneBottom: {

    captionPosition: "middle",

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "cinematicPush"
    },

    zones: {

      z1: {
        assetEnter: "slideLeftIn",
        assetMotion: "driftLeft"
      },

      z2: {
        assetEnter: "slideRightIn",
        assetMotion: "driftRight"
      },

      z3: {
        assetEnter: "scaleIn",
        assetMotion: "slowZoom"
      }

    }

  },

  OneTopTwoBottom: {

    captionPosition: "bottom",

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
        assetMotion: "driftLeft"
      },

      z3: {
        assetEnter: "slideRightIn",
        assetMotion: "driftRight"
      }

    }

  },

  FourGrid: {

    captionPosition: "bottom",

    layoutBackground: {
      enterTransition: "fadeIn",
      exitTransition: "none",
      motion: "slowZoom"
    },

    zones: {

      z1: { assetEnter: "scaleIn", assetMotion: "driftLeft" },
      z2: { assetEnter: "slideLeftIn", assetMotion: "driftRight" },
      z3: { assetEnter: "slideRightIn", assetMotion: "driftLeft" },
      z4: { assetEnter: "scaleIn", assetMotion: "driftRight" }

    }

  },

  PictureInPicture: {

    captionPosition: "middle",

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