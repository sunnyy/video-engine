export const layoutCapabilityRegistry = {

  FullZone: {
    zones: {
      z1: {
        roles: ["asset","block"]
      }
    },
    allowedBlocks: [
      "HookImpact",
      "StatExplosion",
      "QuoteHighlight",
      "ListCountdown",
      "ProcessSteps",
      "ProgressBars",
      "MythVsFact",
      "BeforeAfter",
      "ProblemSolution",
      "SplitScreen",
      "KineticTypography",
      "CTAButton",
      "CountdownTimer",
      "ChapterTitle",
      "Testimonial",
      "BadgePack"
    ]
  },

  SplitZone: {
    zones: {
      z1: {
        roles: ["asset"]
      },
      z2: {
        roles: ["block","asset"]
      }
    },
    allowedBlocks: [
      "StatExplosion",
      "QuoteHighlight",
      "BeforeAfter",
      "MythVsFact",
      "SplitScreen",
      "ProgressBars",
      "Testimonial"
    ]
  },

  ThreeZone: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["block","asset"] },
      z3: { roles: ["asset"] }
    },
    allowedBlocks: [
      "StatExplosion",
      "QuoteHighlight",
      "ProgressBars",
      "ListCountdown",
      "ProcessSteps",
      "MythVsFact"
    ]
  },

  TwoTopOneBottom: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["asset"] },
      z3: { roles: ["block","asset"] }
    },
    allowedBlocks: [
      "ListCountdown",
      "ProcessSteps",
      "StatExplosion",
      "QuoteHighlight",
      "ProgressBars",
      "CTAButton"
    ]
  },

  OneTopTwoBottom: {
    zones: {
      z1: { roles: ["block","asset"] },
      z2: { roles: ["asset"] },
      z3: { roles: ["asset"] }
    },
    allowedBlocks: [
      "ListCountdown",
      "ProcessSteps",
      "StatExplosion",
      "QuoteHighlight",
      "ProgressBars",
      "HookImpact"
    ]
  },

  FourGrid: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["asset"] },
      z3: { roles: ["asset"] },
      z4: { roles: ["asset"] }
    },
    allowedBlocks: []
  },

  PictureInPicture: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["block","asset"] }
    },
    allowedBlocks: [
      "StatExplosion",
      "QuoteHighlight",
      "ProgressBars",
      "Testimonial",
      "CTAButton"
    ]
  }

};