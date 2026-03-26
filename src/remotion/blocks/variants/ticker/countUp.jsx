import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function CountUp({ block }) {

  const target = block.props.value;
  const label = block.props.label || "";

  const numeric = parseFloat(target);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200
    }
  });

  const value = Math.floor(interpolate(progress, [0, 1], [0, numeric]));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center"
      }}
    >

      <div style={{ textAlign: "center" }}>

        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: "white"
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