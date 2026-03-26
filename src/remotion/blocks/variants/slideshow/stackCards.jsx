import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function StackCards({ block }) {

  const images = block.props.images;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideDuration = fps * 2;

  const index = Math.floor(frame / slideDuration) % images.length;

  const localFrame = frame % slideDuration;

  const progress = localFrame / slideDuration;

  const rotate = interpolate(progress, [0, 1], [-12, 0]);

  const scale = interpolate(progress, [0, 1], [0.85, 1]);

  const opacity = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp"
  });

  const currentImage = images[index];

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div
        style={{
          width: "75%",
          height: "75%",
          overflow: "hidden",
          borderRadius: 40,
          transform: `rotate(${rotate}deg) scale(${scale})`,
          opacity,
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)"
        }}
      >
        <img
          src={currentImage}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </div>
    </AbsoluteFill>
  );
}