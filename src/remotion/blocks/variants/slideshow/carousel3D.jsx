import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function Carousel3D({ block }) {

  const images = block.props.images;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const duration = fps * 4;

  const progress = (frame % duration) / duration;

  const rotate = interpolate(progress, [0, 1], [0, 360]);

  return (
    <AbsoluteFill
      style={{
        perspective: 1000,
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div
        style={{
          width: 340,
          height: 700,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateY(${rotate}deg)`
        }}
      >
        {images.map((img, i) => {

          const angle = (360 / images.length) * i;

          return (
            <img
              key={i}
              src={img}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `rotateY(${angle}deg) translateZ(420px)`,
                borderRadius: 20
              }}
            />
          );

        })}
      </div>
    </AbsoluteFill>
  );
}