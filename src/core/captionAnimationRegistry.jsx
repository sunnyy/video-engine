import React from "react";
import { spring } from "remotion";

export const captionAnimations = {
  fade: ({ text }) => text,

  word_reveal: ({
    text,
    localFrame,
    durationFrames,
  }) => {
    const words = text.split(" ");
    const wordsToShow = Math.floor(
      (localFrame / durationFrames) * words.length
    );
    return words.slice(0, wordsToShow).join(" ");
  },

  word_pop: ({
    text,
    localFrame,
    durationFrames,
    fps,
  }) => {
    const words = text.split(" ");
    const wordDuration =
      durationFrames / words.length;

    return words.map((word, index) => {
      const start = index * wordDuration;
      const progress = spring({
        frame: localFrame - start,
        fps,
        config: {
          damping: 12,
          stiffness: 200,
        },
      });

      const scale =
        progress < 0 ? 0.8 : progress;

      return (
        <span
          key={index}
          style={{
            display: "inline-block",
            marginRight: 8,
            transform: `scale(${scale})`,
          }}
        >
          {word}
        </span>
      );
    });
  },
};