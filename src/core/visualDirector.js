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
    HookBlock: { emphasis: true },
    StatBlock: { highlight: true },
    ListRevealBlock: { stagger: true },
    QuoteBlock: { cinematic: true },
    ComparisonBlock: { splitFocus: true }
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

    return {
      ...beat,
      layout,
      blocks
    };

  });

}