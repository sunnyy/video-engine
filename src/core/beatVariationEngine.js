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

  let currentStart = 0;

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

    /* ---------- duration variation ---------- */

    let duration = beat.duration_sec;

    const variance = (Math.random() * 0.8) - 0.4;

    duration = duration + variance;

    if (duration < 1.4) duration = 1.4;
    if (duration > 3.2) duration = 3.2;

    const start = currentStart;
    const end = start + duration;

    currentStart = end;

    return {
      ...beat,
      layout,
      duration_sec: Number(duration.toFixed(2)),
      start_sec: start,
      end_sec: end,
      caption: {
        ...beat.caption,
        animation
      }
    };

  });

}