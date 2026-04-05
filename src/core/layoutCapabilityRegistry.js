/**
 * layoutCapabilityRegistry.js
 * src/core/layoutCapabilityRegistry.js
 */
export const layoutCapabilityRegistry = {
  FullBleed: { zones: { z1: { roles: ["asset"] } }, allowedBlocks: [] },
  HeadlineOverAsset: { zones: { z1: { roles: ["asset"] }, z2: { roles: ["text"] } }, allowedBlocks: [] },
  SplitAssets: { zones: { z1: { roles: ["asset"] }, z2: { roles: ["asset"] } }, allowedBlocks: [] },
  ThreeStack: {
    zones: { z1: { roles: ["asset"] }, z2: { roles: ["asset"] }, z3: { roles: ["asset"] } },
    allowedBlocks: [],
  },
  HeadlineReveal: {
    zones: { z1: { roles: ["text"] }, z2: { roles: ["asset"] }, z3: { roles: ["text"] } },
    allowedBlocks: [],
  },
  FourCollage: {
    zones: {
      z1: { roles: ["text"] },
      z2: { roles: ["asset"] },
      z3: { roles: ["asset"] },
      z4: { roles: ["asset"] },
      z5: { roles: ["asset"] },
    },
    allowedBlocks: [],
  },
  CinematicLowerThird: {
    zones: { z1: { roles: ["asset"] }, z2: { roles: ["text"] }, z3: { roles: ["text"] } },
    allowedBlocks: [],
  },
  SideBySide: {
    zones: { z1: { roles: ["asset"] }, z2: { roles: ["text"] }, z3: { roles: ["text"] } },
    allowedBlocks: [],
  },
  BigQuote: { zones: { z1: { roles: ["text"] }, z2: { roles: ["text"] } }, allowedBlocks: [] },
  NumberHook: {
    zones: { z1: { roles: ["asset"] }, z2: { roles: ["text"] }, z3: { roles: ["text"] } },
    allowedBlocks: [],
  },
  ListReveal: {
    zones: { z1: { roles: ["text"] }, z2: { roles: ["text"] }, z3: { roles: ["text"] }, z4: { roles: ["text"] } },
    allowedBlocks: [],
  },
  AssetWithList: {
    zones: { z1: { roles: ["asset"] }, z2: { roles: ["text"] }, z3: { roles: ["text"] }, z4: { roles: ["text"] } },
    allowedBlocks: [],
  },
  SplitTextAsset: {
    zones: { z1: { roles: ["text"] }, z2: { roles: ["asset"] }, z3: { roles: ["text"] } },
    allowedBlocks: [],
  },
  StackedDuo: {
    zones: { z1: { roles: ["asset"] }, z2: { roles: ["asset"] }, z3: { roles: ["text"] } },
    allowedBlocks: [],
  },
  Magazine: {
    zones: { z1: { roles: ["asset"] }, z2: { roles: ["text"] }, z3: { roles: ["text"] } },
    allowedBlocks: [],
  },
};
