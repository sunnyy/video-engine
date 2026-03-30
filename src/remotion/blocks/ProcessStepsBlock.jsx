import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BLOCK_FONTS } from "../../core/colorUtils";

export const PROCESS_STEPS_DEFAULTS = {
  steps: [
    {
      title: "Define your goal",
      desc: "Get crystal clear on what you want to achieve",
      time: "Day 1",
    },
    {
      title: "Build the system",
      desc: "Create repeatable processes that work without you",
      time: "Week 1–2",
    },
    {
      title: "Scale and optimise",
      desc: "Double down on what works, cut what doesn't",
      time: "Month 1+",
    },
  ],
  accent: "#6c47ff",
};

export default function ProcessStepsBlock({ block }) {
  const props = { ...PROCESS_STEPS_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "timeline";

  if (variant === "cards") return <CardsVariant props={props} />;
  if (variant === "spotlight") return <SpotlightVariant props={props} />;

  return <TimelineVariant props={props} />;
}

/* ---------------- TIMELINE VARIANT ---------------- */

function TimelineVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: "0",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100 }}>
        {props.steps.map((step, i) => {
          const anim = spring({
            frame: Math.max(frame - i * 8, 0),
            fps,
            config: { damping: 16, stiffness: 120 },
          });

          const y = interpolate(anim, [0, 1], [80, 0]);
          const opacity = interpolate(anim, [0, 0.4], [0, 1]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 50,
                transform: `translateY(${y}px)`,
                opacity,
                position: "relative",
              }}
            >
              {/* line */}
              {i < props.steps.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 25,
                    top: 60,
                    width: 2,
                    height: 200,
                    background: `linear-gradient(${props.accent},transparent)`,
                  }}
                />
              )}

              {/* number */}
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: "#111",
                  border: `1px solid ${props.accent}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: BLOCK_FONTS.bebas,
                  fontSize: 28,
                  color: props.accent,
                }}
              >
                {i + 1}
              </div>

              <div>
                <div
                  style={{
                    fontFamily: BLOCK_FONTS.syne,
                    fontSize: 60,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {step.title}
                </div>

                <div
                  style={{
                    fontFamily: BLOCK_FONTS.dm,
                    fontSize: 40,
                    color: "rgba(255,255,255,0.6)",
                    marginTop: 6,
                  }}
                >
                  {step.desc}
                </div>

                <div
                  style={{
                    fontFamily: BLOCK_FONTS.mono,
                    fontSize: 28,
                    color: props.accent,
                    marginTop: 6,
                  }}
                >
                  {step.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- CARDS VARIANT ---------------- */

function CardsVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 40,
          width: "100%",
          maxWidth: 1200,
        }}
      >
        {props.steps.map((step, i) => {
          const anim = spring({
            frame: Math.max(frame - i * 10, 0),
            fps,
          });

          const scale = interpolate(anim, [0, 1], [0.6, 1]);
          const opacity = interpolate(anim, [0, 0.5], [0, 1]);

          return (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 24,
                padding: 40,
                transform: `scale(${scale})`,
                opacity,
              }}
            >
              <div
                style={{
                  fontFamily: BLOCK_FONTS.bebas,
                  fontSize: 80,
                  color: props.accent,
                }}
              >
                {i + 1}
              </div>

              <div
                style={{
                  fontFamily: BLOCK_FONTS.syne,
                  fontSize: 50,
                  marginTop: 6,
                }}
              >
                {step.title}
              </div>

              <div
                style={{
                  fontFamily: BLOCK_FONTS.dm,
                  fontSize: 36,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 10,
                }}
              >
                {step.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- SPOTLIGHT VARIANT ---------------- */

function SpotlightVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepIndex = Math.floor(frame / (fps * 1.5)) % props.steps.length;
  const step = props.steps[stepIndex];

  const anim = spring({ frame, fps });

  const scale = interpolate(anim, [0, 1], [0.8, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "0",
      }}
    >
      <div
        style={{
          fontFamily: BLOCK_FONTS.bebas,
          fontSize: 160,
          color: props.accent,
          transform: `scale(${scale})`,
        }}
      >
        {stepIndex + 1}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.syne,
          fontSize: 80,
          marginTop: 10,
        }}
      >
        {step.title}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.dm,
          fontSize: 46,
          color: "rgba(255,255,255,0.6)",
          marginTop: 10,
        }}
      >
        {step.desc}
      </div>
    </AbsoluteFill>
  );
}