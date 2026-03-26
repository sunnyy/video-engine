import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function BigWord({ block }) {

  const text = block.props.text;

  const words = text.split(" ");

  const highlight = words[Math.floor(words.length / 2)];

  const before = words.slice(0, Math.floor(words.length / 2)).join(" ");
  const after = words.slice(Math.floor(words.length / 2) + 1).join(" ");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 160, stiffness: 220 }
  });

  const scale = interpolate(progress, [0, 1], [0.6, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>

      <div style={{ textAlign: "center", width: "80%" }}>

        <div style={{ fontSize: 64, color: "white", marginBottom: 20 }}>
          {before}
        </div>

        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: "#00E5FF",
            transform: `scale(${scale})`
          }}
        >
          {highlight}
        </div>

        <div style={{ fontSize: 64, color: "white", marginTop: 20 }}>
          {after}
        </div>

      </div>

    </AbsoluteFill>
  );

}