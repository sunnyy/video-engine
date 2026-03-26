import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function Kinetic({ block }) {

  const text = block.props.text;
  const words = text.split(" ");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gap = 6;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", width: "80%" }}>

        {words.map((word, i) => {

          const start = i * gap;

          const progress = spring({
            frame: frame - start,
            fps,
            config: { damping: 180, stiffness: 300 }
          });

          const y = interpolate(progress, [0, 1], [160, 0]);
          const scale = interpolate(progress, [0, 1], [0.6, 1]);

          return (
            <div
              key={i}
              style={{
                fontSize: 110,
                fontWeight: 900,
                color: "white",
                transform: `translateY(${y}px) scale(${scale})`
              }}
            >
              {word}
            </div>
          );

        })}

      </div>

    </AbsoluteFill>
  );

}