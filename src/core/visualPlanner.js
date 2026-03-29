import { layoutRegistry } from "./layoutRegistry";
import { layoutDefaultsRegistry } from "./layoutDefaultsRegistry";

function pickLayout({ visual_type, videoType }) {

  const map = {
    stat: ["ThreeZone","SplitZone","FullZone"],
    list: ["TwoTopOneBottom","OneTopTwoBottom"],
    comparison: ["SplitZone"],
    quote: ["ThreeZone","FullZone"],
    statement: ["FullZone","ThreeZone"],
    question: ["FullZone"]
  };

  let candidates = map[visual_type] || ["FullZone"];

  candidates = candidates.filter((l) => {

    const def = layoutRegistry[l];
    if (!def) return false;

    if (videoType === "faceless" && def.supportsAvatar === true)
      return false;

    return true;

  });

  if (!candidates.length) candidates = ["FullZone"];

  return candidates[Math.floor(Math.random() * candidates.length)];

}

function buildZones(layout) {

  const def = layoutRegistry[layout];
  const zones = {};

  def.zones.forEach((z) => {

    zones[z] = {
      role: "asset",
      content: {
        kind: "asset",
        asset: {
          src: null,
          type: "image",
          objectFit: "cover",
          motion: "kenburns"
        }
      },
      background: {},
      style: { padding: {} }
    };

  });

  return zones;

}

function chooseBlockZone(layout) {

  if (layout === "SplitZone") return "z2";
  if (layout === "ThreeZone") return "z2";
  if (layout === "TwoTopOneBottom") return "z3";
  if (layout === "OneTopTwoBottom") return "z1";
  if (layout === "PictureInPicture") return "z2";

  return "z1";

}

export function planBeatVisual({
  videoType,
  spoken = "",
  visual_type = "statement",
  block_candidate = null
}) {

  const layout = pickLayout({
    visual_type,
    videoType
  });

  const zones = buildZones(layout);
  const blocks = [];

  /* ONLY use AI-suggested blocks */

  if (block_candidate) {

    const zone = chooseBlockZone(layout);

    zones[zone] = {
      role: "block",
      content: {
        kind: "block",
        block: {
          type: block_candidate
        }
      },
      background: {},
      style: { padding: {} }
    };

    blocks.push({
      id: crypto.randomUUID(),
      type: block_candidate,
      zone,
      props: {}
    });

  }

  const defaults = layoutDefaultsRegistry[layout];

  if (defaults?.zones) {

    Object.keys(zones).forEach((z) => {

      const d = defaults.zones[z];
      if (!d) return;

      if (zones[z].role === "asset") {

        zones[z].content.asset = {
          ...zones[z].content.asset,
          enterTransition: d.assetEnter || "fadeIn",
          exitTransition: d.assetExit || "none",
          motion: d.assetMotion || "kenburns"
        };

      }

    });

  }

  return {
    layout,
    layoutPadding: 0,
    zones,
    blocks
  };

}