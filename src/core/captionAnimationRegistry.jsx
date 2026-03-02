import { spring, interpolate, Easing } from "remotion";

export const captionAnimations = {
  fade: ({ children, localFrame }) => {
    const opacity = interpolate(
      localFrame,
      [0, 12],
      [0, 1],
      {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      }
    );

    return (
      <div style={{ opacity }}>
        {children}
      </div>
    );
  },

  word_reveal: ({
    words,
    localFrame,
    durationFrames,
  }) => {
    const totalWords = words.length || 1;

    const progress =
      localFrame / durationFrames;

    const wordsToShow = Math.min(
      totalWords,
      Math.floor(progress * totalWords)
    );

    return words.slice(0, wordsToShow);
  },

  word_pop: ({
    words,
    localFrame,
    durationFrames,
    fps,
  }) => {
    const totalWords = words.length || 1;
    const wordDuration =
      durationFrames / totalWords;

    return words.map((wordObj, index) => {
      const start = index * wordDuration;

      const progress = spring({
        frame: localFrame - start,
        fps,
        config: {
          damping: 10,
          stiffness: 180,
          mass: 0.5,
        },
      });

      const scale =
        localFrame < start
          ? 0.8
          : progress;

      return {
        ...wordObj,
        style: {
          ...wordObj.style,
          transform: `scale(${scale})`,
        },
      };
    });
  },
};