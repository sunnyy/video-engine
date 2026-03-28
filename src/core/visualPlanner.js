import { layoutDefaultsRegistry } from "./layoutDefaultsRegistry";

let lastLayouts = [];

function pickLayout(intent) {

  const intentLayouts = {

    hook: ["FullZone"],
    stat: ["FullZone","ThreeZone"],
    list: ["TwoTopOneBottom","OneTopTwoBottom"],
    comparison: ["SplitZone"],
    quote: ["FullZone","ThreeZone"]

  };

  const candidates = intentLayouts[intent] || ["FullZone"];

  for (let i = 0; i < candidates.length; i++) {

    if (!lastLayouts.includes(candidates[i])) {
      return candidates[i];
    }

  }

  return candidates[Math.floor(Math.random() * candidates.length)];

}

function registerLayout(layout) {

  lastLayouts.push(layout);

  if (lastLayouts.length > 3) {
    lastLayouts.shift();
  }

}

function balanceMotion(layout, zones) {

  const motionPairs = {

    SplitZone: { z1: "driftLeft", z2: "driftRight" },

    TwoTopOneBottom: {
      z1: "driftLeft",
      z2: "driftRight",
      z3: "slowZoom"
    },

    ThreeZone: {
      z1: "driftLeft",
      z2: "slowZoom",
      z3: "driftRight"
    },

    FourGrid: {
      z1: "driftLeft",
      z2: "driftRight",
      z3: "driftLeft",
      z4: "driftRight"
    }

  };

  const pattern = motionPairs[layout];
  if (!pattern) return zones;

  Object.keys(pattern).forEach((z) => {

    if (!zones[z]) return;

    if (zones[z].content && zones[z].content.kind === "asset") {

      zones[z].content.asset.motion = pattern[z];

    }

  });

  return zones;

}

function applyEntryStagger(layout, zones) {

  const staggerPatterns = {

    SplitZone: { z1: 0, z2: 6 },

    TwoTopOneBottom: { z1: 0, z2: 4, z3: 8 },

    ThreeZone: { z1: 0, z2: 4, z3: 8 },

    FourGrid: { z1: 0, z2: 4, z3: 8, z4: 12 }

  };

  const pattern = staggerPatterns[layout];
  if (!pattern) return zones;

  Object.keys(pattern).forEach((z) => {

    if (!zones[z]) return;

    if (zones[z].content && zones[z].content.kind === "asset") {

      zones[z].content.asset.enterDelay = pattern[z];

    }

  });

  return zones;

}

export function planBeatVisual({ intent, videoType }) {

  const layout = pickLayout(intent);
  registerLayout(layout);

  let block = null;

  switch (intent) {

    case "hook":
      block = "HookBlock";
      break;

    case "stat":
      block = "StatBlock";
      break;

    case "list":
      block = "ListRevealBlock";
      break;

    case "comparison":
      block = "ComparisonBlock";
      break;

    case "quote":
      block = "QuoteBlock";
      break;

    default:
      block = null;

  }

  const layoutPaddingDefaults = {

    FullZone: 50,
    SplitZone: 50,
    ThreeZone: 50,
    TwoTopOneBottom: 80,
    OneTopTwoBottom: 80,
    FourGrid: 80,
    PictureInPicture: 100,
    CenterAvatar: 100,
    FloatingAvatar: 100,
    SideAvatar: 100

  };

  let zones = {};

  if (layout === "SplitZone") {

    zones = {
      z1: { role: videoType === "talking_head" ? "avatar" : "asset", padding:{} },
      z2: { role: "block", padding:{} }
    };

  }

  else if (layout === "TwoTopOneBottom") {

    zones = {
      z1: { role: videoType === "talking_head" ? "avatar" : "asset", padding:{} },
      z2: { role: videoType === "talking_head" ? "avatar" : "asset", padding:{} },
      z3: { role: "block", padding:{} }
    };

  }

  else if (layout === "ThreeZone") {

    zones = {
      z1: { role: "asset", padding:{} },
      z2: { role: "block", padding:{} },
      z3: { role: "asset", padding:{} }
    };

  }

  else {

    zones = {
      z1: {
        role: block
          ? "block"
          : (videoType === "talking_head" ? "avatar" : "asset"),
        padding:{}
      }
    };

  }

  const blocks = [];

  if (block) {

    blocks.push({
      type: block,
      zone: Object.keys(zones).find(z => zones[z].role === "block") || "z1",
      props: {}
    });

  }

  const defaults = layoutDefaultsRegistry[layout];

  if (defaults?.zones) {

    Object.keys(zones).forEach((zoneKey) => {

      const zoneDefaults = defaults.zones[zoneKey];
      if (!zoneDefaults) return;

      if (zones[zoneKey].role === "asset") {

        zones[zoneKey].content = {
          kind: "asset",
          asset: {
            src: null,
            type: "image",
            objectFit: "cover",
            enterTransition: zoneDefaults.assetEnter || "fadeIn",
            exitTransition: zoneDefaults.assetExit || "none",
            motion: zoneDefaults.assetMotion || "slowZoom",
            enterDelay: 0
          }
        };

      }

      if (zoneDefaults.backgroundEnter || zoneDefaults.backgroundMotion) {

        zones[zoneKey].background = {
          kind: "asset",
          asset: {
            src: null,
            type: "image",
            objectFit: "cover",
            enterTransition: zoneDefaults.backgroundEnter || "fadeIn",
            exitTransition: zoneDefaults.backgroundExit || "none",
            motion: zoneDefaults.backgroundMotion || "none"
          }
        };

      }

    });

  }

  zones = balanceMotion(layout, zones);

  zones = applyEntryStagger(layout, zones);

  return {

    layout,
    layoutPadding: layoutPaddingDefaults[layout] || 50,
    zones,
    blocks

  };

}