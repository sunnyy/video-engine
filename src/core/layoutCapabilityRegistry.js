/**
 * layoutCapabilityRegistry.js
 * src/core/layoutCapabilityRegistry.js
 *
 * Defines what content types each zone in each layout supports.
 * Zone type (text/asset) is now authoritative from layoutDefinitions.
 * This registry is used for editor UI capability hints only.
 */
export const layoutCapabilityRegistry = {

  FullBleed: {
    zones: {
      z1: { roles: ["asset"] }
    },
    allowedBlocks: []
  },

  HeadlineOverAsset: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["text"]  }
    },
    allowedBlocks: []
  },

  SplitAssets: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["asset"] }
    },
    allowedBlocks: []
  },

  ThreeStack: {
    zones: {
      z1: { roles: ["asset"] },
      z2: { roles: ["asset"] },
      z3: { roles: ["asset"] }
    },
    allowedBlocks: []
  },

  HeadlineReveal: {
    zones: {
      z1: { roles: ["text"]  },
      z2: { roles: ["asset"] },
      z3: { roles: ["text"]  }
    },
    allowedBlocks: []
  },

  FourCollage: {
    zones: {
      z1: { roles: ["text"]  },
      z2: { roles: ["asset"] },
      z3: { roles: ["asset"] },
      z4: { roles: ["asset"] },
      z5: { roles: ["asset"] }
    },
    allowedBlocks: []
  },

};