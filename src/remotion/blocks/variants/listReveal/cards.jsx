import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate
} from "remotion";

export default function Cards({ block }) {

  const items = block.props.items || [];

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!items.length) return null;

  const revealFrames = durationInFrames / items.length;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div
        style={{
          width: "78%",
          display: "flex",
          flexDirection: "column",
          gap: 28
        }}
      >

        {items.map((text, i) => {

          const start = Math.floor(i * revealFrames);

          const progress = spring({
            frame: frame - start,
            fps,
            config: {
              damping: 200,
              stiffness: 300
            }
          });

          const y = interpolate(progress, [0, 1], [140, 0]);
          const scale = interpolate(progress, [0, 1], [0.85, 1]);
          const opacity = interpolate(progress, [0, 0.2], [0, 1]);

          return (
            <div
              key={i}
              style={{
                background: "rgba(20,20,20,0.92)",
                borderRadius: 28,
                padding: "36px 44px",
                backdropFilter: "blur(10px)",
                fontSize: 56,
                fontWeight: 600,
                color: "white",
                transform: `translateY(${y}px) scale(${scale})`,
                opacity,
                boxShadow: "0 40px 100px rgba(0,0,0,0.45)"
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