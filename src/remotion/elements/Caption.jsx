import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { captionStyleRegistry } from "../../core/captionStyleRegistry";
import { captionAnimations } from "../../core/captionAnimationRegistry";
import { captionPositions } from "../../core/captionPositionRegistry";

export default function Caption({ beat }) {
  const globalFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!beat?.spoken || !beat.caption?.show) return null;

  const startFrame = Math.floor(beat.start_sec * fps);
  const endFrame = Math.floor(beat.end_sec * fps);

  if (globalFrame < startFrame || globalFrame >= endFrame)
    return null;

  const localFrame = globalFrame - startFrame;

  const transitionOverlap = beat.transition?.duration || 0;

  const durationFrames =
    Math.floor((beat.duration_sec * fps) * 0.85) -
    transitionOverlap;

  const { style, animation, position } = beat.caption;

  const styleConfig =
    captionStyleRegistry[style]?.() ||
    captionStyleRegistry.tiktokClean();

  const animationRenderer =
    captionAnimations[animation] ||
    captionAnimations.fade;

  const positionConfig =
    captionPositions[position] ||
    captionPositions.bottom;

  const words = beat.spoken.split(" ");

  const baseWords = words.map((word, index) => {
    const isLast = index === words.length - 1;

    const highlightStyle =
      styleConfig.activeWord && isLast
        ? styleConfig.activeWord
        : {};

    return {
      text: word,
      style: {
        display: "inline-block",
        marginRight: 6,
        ...styleConfig.word,
        ...highlightStyle,
      },
    };
  });

  const animatedResult = animationRenderer({
    words: baseWords,
    localFrame,
    durationFrames,
    fps,
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 100,
        ...positionConfig.container,
      }}
    >
      <div
        style={{
          lineHeight: 1.2,
          textAlign: "center",
          maxWidth: "85%",
          ...styleConfig.container,
        }}
      >
        {Array.isArray(animatedResult)
          ? animatedResult.map((w, i) => (
              <span key={i} style={w.style}>
                {w.text}
              </span>
            ))
          : animatedResult}
      </div>
    </AbsoluteFill>
  );
}