import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function StatBlock({ block, variant }) {

  const value = block?.props?.value || "";
  const label = block?.props?.label || "";

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationSec = block?.props?.duration_sec || 3;
  const durationFrames = Math.floor(durationSec * fps);

  const scale = interpolate(
    frame,
    [0, durationFrames * 0.2],
    [0.6, 1],
    { extrapolateRight: "clamp" }
  );

  const opacity = interpolate(
    frame,
    [0, durationFrames * 0.15],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 50
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: "#ffffff"
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize: 42,
            marginTop: 20,
            color: "#dddddd"
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
}