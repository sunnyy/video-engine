import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function Pulse({ block }) {

  const value = block.props.value;
  const label = block.props.label || "";

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: {
      damping: 80,
      stiffness: 300
    }
  });

  const scale = interpolate(progress, [0, 1], [0.3, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center"
      }}
    >

      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center"
        }}
      >

        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: "#00E5FF"
          }}
        >
          {value}
        </div>

        {label && (
          <div
            style={{
              fontSize: 46,
              marginTop: 20,
              color: "#ddd"
            }}
          >
            {label}
          </div>
        )}

      </div>

    </AbsoluteFill>
  );

}