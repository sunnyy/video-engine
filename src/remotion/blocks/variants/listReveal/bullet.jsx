import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function Bullet({ block }) {

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

          const x = interpolate(progress, [0, 1], [-140, 0]);
          const opacity = interpolate(progress, [0, 0.2], [0, 1]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                transform: `translateX(${x}px)`,
                opacity
              }}
            >

              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "white"
                }}
              />

              <div
                style={{
                  fontSize: 58,
                  fontWeight: 600,
                  color: "white"
                }}
              >
                {text}
              </div>

            </div>
          );

        })}

      </div>
    </AbsoluteFill>
  );
}