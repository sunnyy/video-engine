export function applyBeatVariation(beats) {

  const layoutGroups = {
    hero: ["FullZone", "CenterAvatar"],
    split: ["SplitZone", "PictureInPicture"],
    grid: ["ThreeZone", "FourGrid"],
    stack: ["TwoTopOneBottom", "OneTopTwoBottom"]
  };

  const captionAnimations = [
    "fade",
    "word_pop",
    "word_reveal",
    "pop",
    "wave",
    "slide"
  ];

  let lastLayout = null;
  let lastGroup = null;

  return beats.map((beat, i) => {

    let layout = beat.layout;

    let currentGroup = Object.entries(layoutGroups).find(([_, layouts]) =>
      layouts.includes(layout)
    )?.[0];

    if (layout === lastLayout || currentGroup === lastGroup) {

      const groups = Object.keys(layoutGroups);
      const nextGroup = groups[(i + 1) % groups.length];
      const options = layoutGroups[nextGroup];

      if (options?.length) {
        layout = options[i % options.length];
        currentGroup = nextGroup;
      }

    }

    lastLayout = layout;
    lastGroup = currentGroup;

    const animation =
      captionAnimations[i % captionAnimations.length];

    return {
      ...beat,
      layout,
      caption: {
        ...beat.caption,
        animation
      }
    };

  });

}