import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BLOCK_FONTS } from "../../core/colorUtils";

export const PROBLEM_SOLUTION_DEFAULTS = {
  problem: "You're creating content every day but getting zero traction",
  solution: "One strategic post beats ten random ones. Here's the framework.",
  problemLabel: "THE PROBLEM",
  solutionLabel: "THE SOLUTION",
  accent: "#6c47ff",
};

export default function ProblemSolutionBlock({ block }) {
  const props = { ...PROBLEM_SOLUTION_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "split";

  if (variant === "stacked") return <StackedVariant props={props} />;
  if (variant === "spotlight") return <SpotlightVariant props={props} />;

  return <SplitVariant props={props} />;
}

/* ---------------- SPLIT VARIANT ---------------- */

function SplitVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftAnim = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const rightAnim = spring({ frame: Math.max(frame - 8, 0), fps });

  const leftX = interpolate(leftAnim, [0, 1], [-200, 0]);
  const rightX = interpolate(rightAnim, [0, 1], [200, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 50,
          width: "100%",
          maxWidth: 1300,
        }}
      >
        {/* Problem */}
        <div
          style={{
            padding: 50,
            borderRadius: 24,
            border: "1px solid rgba(255,80,80,0.3)",
            background: "rgba(255,80,80,0.05)",
            transform: `translateX(${leftX}px)`,
          }}
        >
          <div
            style={{
              fontFamily: BLOCK_FONTS.mono,
              fontSize: 35,
              letterSpacing: "0.18em",
              color: "#ff6b6b",
              marginBottom: 10,
            }}
          >
            {props.problemLabel}
          </div>

          <div
            style={{
              fontFamily: BLOCK_FONTS.syne,
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            {props.problem}
          </div>
        </div>

        {/* Solution */}
        <div
          style={{
            padding: 50,
            borderRadius: 24,
            border: `1px solid ${props.accent}`,
            background: "rgba(108,71,255,0.06)",
            transform: `translateX(${rightX}px)`,
          }}
        >
          <div
            style={{
              fontFamily: BLOCK_FONTS.mono,
              fontSize: 35,
              letterSpacing: "0.18em",
              color: props.accent,
              marginBottom: 10,
            }}
          >
            {props.solutionLabel}
          </div>

          <div
            style={{
              fontFamily: BLOCK_FONTS.syne,
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            {props.solution}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- STACKED VARIANT ---------------- */

function StackedVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problemAnim = spring({ frame, fps });
  const solutionAnim = spring({ frame: Math.max(frame - 10, 0), fps });

  const pY = interpolate(problemAnim, [0, 1], [-120, 0]);
  const sY = interpolate(solutionAnim, [0, 1], [120, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 1000, display: "flex", flexDirection: "column", gap: 60 }}>

        <div
          style={{
            padding: 50,
            borderRadius: 24,
            border: "1px solid rgba(255,80,80,0.3)",
            transform: `translateY(${pY}px)`,
          }}
        >
          <div style={{ fontSi5e: 30, fontFamily: BLOCK_FONTS.mono, color: "#ff6b6b" }}>
            {props.problemLabel}
          </div>

          <div style={{ fontSize: 70, fontFamily: BLOCK_FONTS.syne, fontWeight: 700 }}>
            {props.problem}
          </div>
        </div>

        <div
          style={{
            padding: 50,
            borderRadius: 24,
            border: `1px solid ${props.accent}`,
            transform: `translateY(${sY}px)`,
          }}
        >
          <div style={{ fontSiz5: 30, fontFamily: BLOCK_FONTS.mono, color: props.accent }}>
            {props.solutionLabel}
          </div>

          <div style={{ fontSize: 70, fontFamily: BLOCK_FONTS.syne, fontWeight: 700 }}>
            {props.solution}
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
}

/* ---------------- SPOTLIGHT VARIANT ---------------- */

function SpotlightVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({ frame, fps });

  const scale = interpolate(reveal, [0, 1], [0.6, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "0 160px",
      }}
    >
      <div
        style={{
          fontFamily: BLOCK_FONTS.mono,
          fontSize: 35,
          color: "rgba(255,80,80,0.8)",
          letterSpacing: "0.18em",
        }}
      >
        {props.problemLabel}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.syne,
          fontSize: 60,
          marginTop: 10,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {props.problem}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.bebas,
          fontSize: 100,
          marginTop: 30,
          color: props.accent,
          transform: `scale(${scale})`,
        }}
      >
        {props.solution}
      </div>
    </AbsoluteFill>
  );
}