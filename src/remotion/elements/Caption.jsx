import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { captionStyleRegistry } from "../../core/captionStyleRegistry";
import { captionAnimations } from "../../core/captionAnimationRegistry";
import { captionPositions } from "../../core/captionPositionRegistry";
import { getLayoutSafeAreas } from "../../core/getLayoutSafeAreas";

export default function Caption({ caption, beat, project }) {

  const globalFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!caption?.show || !caption?.text) return null;

  const startFrame = Math.floor(beat.start_sec * fps);
  const endFrame = Math.floor(beat.end_sec * fps);

  if (globalFrame < startFrame || globalFrame >= endFrame)
    return null;

  const localFrame = globalFrame - startFrame;

  const transitionOverlap = beat.transition?.duration || 0;

  const durationFrames =
    Math.floor((beat.duration_sec * fps) * 0.85) -
    transitionOverlap;

  const styleKey = caption.style;
  const animationKey = caption.animation;
  const positionKey = caption.position || "bottom";

  const brandColor =
    project?.meta?.brand_color || "#00F2EA";

  const styleConfig =
    captionStyleRegistry[styleKey]?.(brandColor) ||
    captionStyleRegistry.tiktokClean(brandColor);

  const animationRenderer =
    captionAnimations[animationKey] ||
    captionAnimations.fade;

  const positionConfig =
    captionPositions[positionKey] ||
    captionPositions.bottom;

  const safeAreas = getLayoutSafeAreas(beat.layout);
  const captionSafe = safeAreas?.caption || {};

  const words = caption.text.split(" ").map((word) => {

    const isEmphasis = word.includes("<em>");

    const cleanWord = word
      .replace("<em>", "")
      .replace("</em>", "");

    return {
      text: cleanWord,
      style: {
        display: "inline-block",
        marginRight: 6,
        ...(isEmphasis
          ? styleConfig.activeWord
          : styleConfig.word),
      }
    };

  });

  const animatedResult = animationRenderer({
    words,
    localFrame,
    durationFrames,
    fps,
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 100,
        paddingLeft: captionSafe.left || 0,
        paddingRight: captionSafe.right || 0,
        paddingBottom: captionSafe.bottom || 0,
        paddingTop: captionSafe.top || 0,
        ...positionConfig.container,
      }}
    >
      <div
        style={{
          lineHeight: 1.2,
          textAlign: "center",
          maxWidth: "85%",
          margin: "0 auto",
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