import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function KenBurns({ block }) {

  const images = block.props.images;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideDuration = fps * 3;

  const index = Math.floor(frame / slideDuration) % images.length;

  const localFrame = frame % slideDuration;

  const progress = localFrame / slideDuration;

  const scale = interpolate(progress, [0, 1], [1.1, 1.35]);

  const x = interpolate(progress, [0, 1], [-120, 120]);
  const y = interpolate(progress, [0, 1], [-60, 60]);

  const currentImage = images[index];

  return (
    <AbsoluteFill>
      <img
        src={currentImage}
        style={{
          width: "120%",
          height: "120%",
          objectFit: "cover",
          transform: `translate(${x}px, ${y}px) scale(${scale})`
        }}
      />
    </AbsoluteFill>
  );
}