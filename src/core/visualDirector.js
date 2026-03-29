export function applyVisualDirection(beats = []) {

  const layoutCycle = [
    "FullZone",
    "SplitZone",
    "ThreeZone",
    "TwoTopOneBottom",
    "OneTopTwoBottom",
    "FourGrid",
    "PictureInPicture"
  ];

  const blockEnhancements = {
    Hook: { emphasis: true },
    Stat: { highlight: true },
    ListReveal: { stagger: true },
    Quote: { cinematic: true },
    Comparison: { splitFocus: true }
  };

  const energyMotions = {
    low: ["slowZoom", "kenburns"],
    medium: ["pushSlow", "cinematicPush"],
    high: ["cinematicPush", "pushSlow"]
  };

  let lastLayout = null;

  return beats.map((beat, index) => {

    let layout = beat.layout;

    if (layout === lastLayout) {
      layout = layoutCycle[index % layoutCycle.length];
    }

    lastLayout = layout;

    let blocks = beat.blocks || [];

    blocks = blocks.map((block) => {

      const enhance = blockEnhancements[block.type];

      if (!enhance) return block;

      return {
        ...block,
        props: {
          ...(block.props || {}),
          ...enhance
        }
      };

    });

    let energy = "medium";

    if (beat.intent === "hook") energy = "high";
    else if (beat.intent === "stat") energy = "medium";
    else if (beat.intent === "quote") energy = "low";

    const motionPool = energyMotions[energy];

    const zones = { ...beat.zones };

    Object.keys(zones).forEach((z, zi) => {

      const zone = zones[z];

      if (zone.role !== "asset") return;

      if (!zone.content?.asset) return;

      zones[z] = {
        ...zone,
        content: {
          ...zone.content,
          asset: {
            ...zone.content.asset,
            motion:
              motionPool[(index + zi) % motionPool.length]
          }
        }
      };

    });

    return {
      ...beat,
      layout,
      zones,
      blocks
    };

  });

}