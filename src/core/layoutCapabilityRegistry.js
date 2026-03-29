export const layoutCapabilityRegistry = {

  FullZone: {
    zones: {
      z1: {
        roles: ["asset","block"]
      }
    },
    allowedBlocks: [
      "Hook",
      "Stat",
      "Quote",
      "NumberTicker",
      "ListReveal"
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
      "Stat",
      "Comparison",
      "Quote"
    ]
  },

  ThreeZone: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["block","asset"] },
      z3: { roles: ["asset"] }
    },
    allowedBlocks: [
      "Stat",
      "Quote",
      "NumberTicker"
    ]
  },

  TwoTopOneBottom: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["asset"] },
      z3: { roles: ["block","asset"] }
    },
    allowedBlocks: [
      "ListReveal",
      "Stat",
      "Quote"
    ]
  },

  OneTopTwoBottom: {
    zones: {
      z1: { roles: ["block","asset"] },
      z2: { roles: ["asset"] },
      z3: { roles: ["asset"] }
    },
    allowedBlocks: [
      "ListReveal",
      "Stat",
      "Quote"
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
      "Stat",
      "Quote"
    ]
  }

};