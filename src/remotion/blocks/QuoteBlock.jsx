import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function QuoteBlock({ block, variant }) {

  const text = block?.props?.text || "";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationSec = block?.props?.duration_sec || 3;
  const durationFrames = Math.floor(durationSec * fps);

  const opacity = interpolate(
    frame,
    [0, durationFrames * 0.2],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    frame,
    [0, durationFrames * 0.2],
    [40, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "0 120px",
        pointerEvents: "none",
        zIndex: 50
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`
        }}
      >
        <div
          style={{
            fontSize: 70,
            fontWeight: 600,
            color: "#ffffff",
            lineHeight: 1.3
          }}
        >
          “{text}”
        </div>
      </div>
    </AbsoluteFill>
  );
}