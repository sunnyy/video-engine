import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function Grid({ block }) {

  const items = block.props.items || [];

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!items.length) return null;

  const revealFrames = durationInFrames / items.length;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>

      <div
        style={{
          width: "78%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24
        }}
      >

        {items.map((text, i) => {

          const start = Math.floor(i * revealFrames);

          const progress = spring({
            frame: frame - start,
            fps,
            config: { damping: 180, stiffness: 320 }
          });

          const scale = interpolate(progress, [0, 1], [0.7, 1]);
          const rotate = interpolate(progress, [0, 1], [-6, 0]);

          return (
            <div
              key={i}
              style={{
                background: "rgba(20,20,20,0.92)",
                borderRadius: 26,
                padding: "32px 36px",
                color: "white",
                fontSize: 48,
                fontWeight: 600,
                transform: `scale(${scale}) rotate(${rotate}deg)`,
                boxShadow: "0 30px 90px rgba(0,0,0,0.45)"
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