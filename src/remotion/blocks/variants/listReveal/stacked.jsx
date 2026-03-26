import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function Stacked({ block }) {

  const items = block.props.items || [];

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!items.length) return null;

  const revealFrames = durationInFrames / items.length;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "78%", display: "flex", flexDirection: "column", gap: 28 }}>

        {items.map((text, i) => {

          const start = Math.floor(i * revealFrames);

          const progress = spring({
            frame: frame - start,
            fps,
            config: { damping: 200, stiffness: 300 }
          });

          const y = interpolate(progress, [0, 1], [140, 0]);
          const scale = interpolate(progress, [0, 1], [0.9, 1]);

          return (
            <div
              key={i}
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: "white",
                transform: `translateY(${y}px) scale(${scale})`
              }}
            >
              {text}
            </div>
          );

        })}

      </div>
    </AbsoluteFill>
  );
}