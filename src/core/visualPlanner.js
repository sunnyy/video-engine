export function planBeatVisual({ intent, videoType }) {

  let block = null;
  let layout = "FullZone";

  switch (intent) {

    case "hook":
      block = "HookBlock";
      layout = "FullZone";
      break;

    case "stat":
      block = "StatBlock";
      layout = "FullZone";
      break;

    case "list":
      block = "ListRevealBlock";
      layout = "TwoTopOneBottom";
      break;

    case "comparison":
      block = "ComparisonBlock";
      layout = "SplitZone";
      break;

    case "quote":
      block = "QuoteBlock";
      layout = "FullZone";
      break;

    default:
      block = null;
      layout = "FullZone";
      break;

  }

  let zones = {};

  if (layout === "SplitZone") {

    zones = {
      z1: {
        role: videoType === "talking_head" ? "avatar" : "asset",
        src: null,
        objectFit: "cover",
        padding: {},
        background: null
      },
      z2: {
        role: "block",
        src: null,
        objectFit: "cover",
        padding: {},
        background: null
      }
    };

  } else if (layout === "TwoTopOneBottom") {

    zones = {
      z1: {
        role: videoType === "talking_head" ? "avatar" : "asset",
        src: null,
        objectFit: "cover",
        padding: {},
        background: null
      },
      z2: {
        role: videoType === "talking_head" ? "avatar" : "asset",
        src: null,
        objectFit: "cover",
        padding: {},
        background: null
      },
      z3: {
        role: "block",
        src: null,
        objectFit: "cover",
        padding: {},
        background: null
      }
    };

  } else {

    zones = {
      z1: {
        role: block ? "block" : (videoType === "talking_head" ? "avatar" : "asset"),
        src: null,
        objectFit: "cover",
        padding: {},
        background: null
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

  return {
    layout,
    zones,
    blocks
  };

}