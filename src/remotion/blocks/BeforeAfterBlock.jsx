import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function BeforeAfterBlock({ block, variant }) {

  const before = block?.props?.before;
  const after = block?.props?.after;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!before || !after) return null;

  const durationSec = block?.props?.duration_sec || 3;
  const durationFrames = Math.floor(durationSec * fps);

  const reveal = interpolate(
    frame,
    [0, durationFrames * 0.4],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 50
      }}
    >
      <div
        style={{
          width: "90%",
          height: "90%",
          position: "relative",
          overflow: "hidden",
          borderRadius: 40,
          border: "6px solid #ffffff",
          boxShadow: "0 40px 80px rgba(0,0,0,0.4)"
        }}
      >

        <img
          src={before}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${reveal * 100}%`,
            overflow: "hidden"
          }}
        >
          <img
            src={after}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </div>

      </div>
    </AbsoluteFill>
  );

}