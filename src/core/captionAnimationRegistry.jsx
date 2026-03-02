import { spring, interpolate, Easing } from "remotion";

export const captionAnimations = {
  fade: ({ words, localFrame, fps }) => {
    const fadeDuration = fps; // 1 second

    const opacity = localFrame <= 0 ? 0 : localFrame >= fadeDuration ? 1 : localFrame / fadeDuration;

    return words.map((wordObj) => ({
      ...wordObj,
      style: {
        ...wordObj.style,
        opacity,
      },
    }));
  },

  word_reveal: ({ words, localFrame, durationFrames }) => {
    const totalWords = words.length || 1;

    const progress = localFrame / durationFrames;

    const wordsToShow = Math.min(totalWords, Math.floor(progress * totalWords));

    return words.slice(0, wordsToShow);
  },

  word_pop: ({ words, localFrame, durationFrames }) => {
    const totalWords = words.length || 1;
    const wordDuration = durationFrames / totalWords;

    const activeIndex = Math.min(Math.floor(localFrame / wordDuration), totalWords - 1);

    return words.map((wordObj, index) => {
      const isActive = index === activeIndex;

      return {
        ...wordObj,
        style: {
          ...wordObj.style,
          marginRight: 4, // reduce word gap
          transform: `scale(${isActive ? 1.25 : 0.9})`,
          fontWeight: isActive ? 800 : 500,
          opacity: isActive ? 1 : 0.7,
          letterSpacing: isActive ? "3px" : "0.5px",
          padding: isActive ? "0 30px" : 0,
        },
      };
    });
  },
};
