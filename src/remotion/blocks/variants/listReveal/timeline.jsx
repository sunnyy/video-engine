import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function Timeline({ block }) {

  const items = block.props.items || [];

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!items.length) return null;

  const revealFrames = durationInFrames / items.length;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "70%", position: "relative" }}>

        <div
          style={{
            position: "absolute",
            left: 20,
            top: 0,
            bottom: 0,
            width: 4,
            background: "white"
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 50 }}>

          {items.map((text, i) => {

            const start = Math.floor(i * revealFrames);

            const progress = interpolate(
              frame,
              [start, start + revealFrames * 0.6],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const x = interpolate(progress, [0, 1], [60, 0]);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 30,
                  transform: `translateX(${x}px)`,
                  opacity: progress
                }}
              >

                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white"
                  }}
                />

                <div
                  style={{
                    fontSize: 58,
                    color: "white"
                  }}
                >
                  {text}
                </div>

              </div>
            );

          })}

        </div>

      </div>
    </AbsoluteFill>
  );

}