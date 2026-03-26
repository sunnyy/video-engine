import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function ComparisonBlock({ block, variant }) {

  const left = block?.props?.left || {};
  const right = block?.props?.right || {};

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationSec = block?.props?.duration_sec || 3;
  const durationFrames = Math.floor(durationSec * fps);

  const progress = interpolate(
    frame,
    [0, durationFrames * 0.25],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const leftX = interpolate(progress, [0, 1], [-120, 0]);
  const rightX = interpolate(progress, [0, 1], [120, 0]);

  const opacity = progress;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 50
      }}
    >

      <div
        style={{
          width: "90%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40
        }}
      >

        {/* LEFT */}

        <div
          style={{
            transform: `translateX(${leftX}px)`,
            opacity,
            background: "#111",
            borderRadius: 30,
            padding: 40,
            border: "4px solid #ffffff"
          }}
        >

          {left.title && (
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                marginBottom: 20,
                color: "#ffffff"
              }}
            >
              {left.title}
            </div>
          )}

          {left.image && (
            <img
              src={left.image}
              style={{
                width: "100%",
                height: 300,
                objectFit: "cover",
                borderRadius: 20,
                marginBottom: 20
              }}
            />
          )}

          {left.text && (
            <div
              style={{
                fontSize: 34,
                color: "#ddd"
              }}
            >
              {left.text}
            </div>
          )}

        </div>


        {/* RIGHT */}

        <div
          style={{
            transform: `translateX(${rightX}px)`,
            opacity,
            background: "#111",
            borderRadius: 30,
            padding: 40,
            border: "4px solid #ffffff"
          }}
        >

          {right.title && (
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                marginBottom: 20,
                color: "#ffffff"
              }}
            >
              {right.title}
            </div>
          )}

          {right.image && (
            <img
              src={right.image}
              style={{
                width: "100%",
                height: 300,
                objectFit: "cover",
                borderRadius: 20,
                marginBottom: 20
              }}
            />
          )}

          {right.text && (
            <div
              style={{
                fontSize: 34,
                color: "#ddd"
              }}
            >
              {right.text}
            </div>
          )}

        </div>

      </div>

    </AbsoluteFill>
  );

}