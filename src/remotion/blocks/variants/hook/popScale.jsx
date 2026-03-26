import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function PopScale({ block }) {

  const text = block.props.text;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 120, stiffness: 400 }
  });

  const scale = interpolate(progress, [0, 1], [0.2, 1]);

  const rotate = interpolate(progress, [0, 1], [-12, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center"
      }}
    >

      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: "white",
          transform: `scale(${scale}) rotate(${rotate}deg)`
        }}
      >
        {text}
      </div>

    </AbsoluteFill>
  );

}