import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function ZoomFade({ block }) {

  const images = block.props.images;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideDuration = fps * 2;

  const index = Math.floor(frame / slideDuration) % images.length;

  const localFrame = frame % slideDuration;

  const progress = localFrame / slideDuration;

  const scale = interpolate(progress, [0, 1], [1.2, 1]);

  const opacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp"
  });

  const currentImage = images[index];

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        
      }}
    >
      <img
        src={currentImage}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          opacity,
          borderRadius: "80px",
        }}
      />
    </AbsoluteFill>
  );
}