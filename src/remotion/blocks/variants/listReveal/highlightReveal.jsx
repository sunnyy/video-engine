import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate
} from "remotion";

export default function HighlightReveal({ block }) {

  const items = block.props.items || [];

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!items.length) return null;

  const revealFrames = durationInFrames / items.length;

  const split = (text) => {
    const parts = text.split(" ");
    const highlightIndex = Math.floor(parts.length / 2);
    return {
      before: parts.slice(0, highlightIndex).join(" "),
      highlight: parts[highlightIndex],
      after: parts.slice(highlightIndex + 1).join(" ")
    };
  };

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
          gap: 36
        }}
      >

        {items.map((text, i) => {

          const start = Math.floor(i * revealFrames);

          const progress = spring({
            frame: frame - start,
            fps,
            config: {
              damping: 180,
              stiffness: 320
            }
          });

          const y = interpolate(progress, [0, 1], [140, 0]);

          const { before, highlight, after } = split(text);

          const highlightPop = spring({
            frame: frame - start - Math.floor(revealFrames * 0.15),
            fps,
            config: {
              damping: 160,
              stiffness: 400
            }
          });

          const scale = interpolate(highlightPop, [0, 1], [0.6, 1]);

          return (
            <div
              key={i}
              style={{
                fontSize: 62,
                fontWeight: 600,
                color: "white",
                transform: `translateY(${y}px)`
              }}
            >

              {before && <span>{before} </span>}

              <span
                style={{
                  color: "#00E5FF",
                  fontWeight: 800,
                  display: "inline-block",
                  transform: `scale(${scale})`
                }}
              >
                {highlight}
              </span>

              {after && <span> {after}</span>}

            </div>
          );

        })}

      </div>
    </AbsoluteFill>
  );

}