import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export default function Caption({ beat }) {
  const frame = useCurrentFrame();

  const { spoken, caption } = beat;
  if (!spoken) return null;

  const opacity =
    caption.animation === "fade"
      ? interpolate(frame, [0, 10], [0, 1], {
          extrapolateRight: "clamp",
        })
      : 1;

  const positionStyles = {
    bottom: { bottom: 120 },
    top: { top: 120 },
    center: { top: "50%", transform: "translateY(-50%)" },
  };

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
          left: 80,
          right: 80,
          textAlign: "center",
          color: "#fff",
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.2,
          opacity,
          ...positionStyles[caption.position],
        }}
      >
        {spoken}
      </div>
    </AbsoluteFill>
  );
}