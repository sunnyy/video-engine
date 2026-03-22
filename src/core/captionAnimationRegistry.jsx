import { spring, interpolate } from "remotion";

export const captionAnimations = {

  fade: ({ words, localFrame, fps }) => {

    const fadeDuration = fps;

    const opacity =
      localFrame <= 0
        ? 0
        : localFrame >= fadeDuration
        ? 1
        : localFrame / fadeDuration;

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

    const wordsToShow = Math.min(
      totalWords,
      Math.floor(progress * totalWords)
    );

    return words.slice(0, wordsToShow);
  },

  word_pop: ({ words, localFrame, durationFrames }) => {

    const totalWords = words.length || 1;

    const wordDuration = durationFrames / totalWords;

    const activeIndex = Math.min(
      Math.floor(localFrame / wordDuration),
      totalWords - 1
    );

    return words.map((wordObj, index) => {

      const isActive = index === activeIndex;

      return {
        ...wordObj,
        style: {
          ...wordObj.style,
          transform: `scale(${isActive ? 1.2 : 1})`,
          opacity: isActive ? 1 : 0.7,
          fontWeight: isActive ? 800 : 500,
        },
      };

    });
  },

  pop: ({ words, localFrame, fps }) => {

    const progress = spring({
      frame: localFrame,
      fps,
      config: {
        damping: 10,
        stiffness: 120,
      },
    });

    return words.map((wordObj) => ({
      ...wordObj,
      style: {
        ...wordObj.style,
        transform: `scale(${interpolate(progress, [0, 1], [0.7, 1])})`,
        opacity: progress,
      },
    }));

  },

  wave: ({ words, localFrame, fps }) => {

    return words.map((wordObj, index) => {

      const delay = index * 4;

      const progress = spring({
        frame: Math.max(localFrame - delay, 0),
        fps,
      });

      return {
        ...wordObj,
        style: {
          ...wordObj.style,
          transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
          opacity: progress,
        },
      };

    });

  },

  slide: ({ words, localFrame, fps }) => {

    const progress = spring({
      frame: localFrame,
      fps,
    });

    return words.map((wordObj) => ({
      ...wordObj,
      style: {
        ...wordObj.style,
        transform: `translateY(${interpolate(progress, [0, 1], [60, 0])}px)`,
        opacity: progress,
      },
    }));

  }

};