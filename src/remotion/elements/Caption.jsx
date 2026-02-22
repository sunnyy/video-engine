import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { captionStyles } from "../../core/captionStyleRegistry";
import { captionAnimations } from "../../core/captionAnimationRegistry";

export default function Caption({ beat, project }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!beat?.spoken || !beat.caption?.show) return null;

  // frame is already local because of <Sequence>
  const localFrame = frame;

  const durationFrames = Math.floor(
    beat.duration_sec * fps
  );

  const { style, animation } =
    project.captionPreset;

  const styleConfig =
    captionStyles[style] ||
    captionStyles.clean;

  const animationRenderer =
    captionAnimations[animation] ||
    captionAnimations.fade;

  const animatedText = animationRenderer({
    text: beat.spoken,
    localFrame,
    durationFrames,
    fps,
  });

  const fadeOpacity =
    animation === "fade"
      ? interpolate(localFrame, [0, 10], [0, 1], {
          extrapolateRight: "clamp",
        })
      : 1;

  let positionStyle = { bottom: 120 };

  if (
    beat.visual_mode === "split" ||
    beat.visual_mode === "dual"
  ) {
    positionStyle = {
      top: "50%",
      transform: "translateY(-50%)",
    };
  }

  if (beat.visual_mode === "floating") {
    positionStyle = { top: 120 };
  }

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          margin: "auto",
          width: "auto",
          textAlign: "center",
          lineHeight: 1.2,
          opacity: fadeOpacity,
          ...styleConfig,
          ...positionStyle,
        }}
      >
        {animatedText}
      </div>
    </AbsoluteFill>
  );
}