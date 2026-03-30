import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BLOCK_FONTS } from "../../core/colorUtils";

export const SLIDESHOW_DEFAULTS = {
  slides: [
    { title: "Golden Hour", sub: "Cinematic landscape series" },
    { title: "City Pulse", sub: "Urban motion collection" },
    { title: "Ocean Drift", sub: "Aerial coastal footage" },
  ],
  accent: "#f0e040",
};

export default function SlideshowBlock({ block }) {
  const props = { ...SLIDESHOW_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "kenBurns";

  if (variant === "stackCards") return <StackCardsVariant props={props} />;
  if (variant === "zoomFade") return <ZoomFadeVariant props={props} />;

  return <KenBurnsVariant props={props} />;
}

/* ---------------- KEN BURNS ---------------- */

function KenBurnsVariant({ props }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const slideCount = props.slides.length;
  const framesPerSlide = durationInFrames / slideCount;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {props.slides.map((slide, i) => {
        const start = i * framesPerSlide;
        const mid = start + framesPerSlide * 0.2;
        const endFade = start + framesPerSlide * 0.8;
        const end = start + framesPerSlide;

        const opacity = interpolate(frame, [start, mid, endFade, end], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const scale = interpolate(frame, [start, end], [1.15, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              textAlign: "center",
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                fontFamily: BLOCK_FONTS.bebas,
                fontSize: 160,
                color: "#ffffff",
              }}
            >
              {slide.title}
            </div>

            <div
              style={{
                fontFamily: BLOCK_FONTS.dm,
                fontSize: 50,
                color: "rgba(255,255,255,0.6)",
                marginTop: 20,
              }}
            >
              {slide.sub}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ---------------- STACK CARDS ---------------- */

function StackCardsVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          width: 900,
          height: 600,
          position: "relative",
        }}
      >
        {props.slides.map((slide, i) => {
          const anim = spring({
            frame: Math.max(frame - i * 8, 0),
            fps,
          });

          const y = interpolate(anim, [0, 1], [300, 0]);
          const scale = interpolate(anim, [0, 1], [0.7, 1]);
          const rotate = interpolate(anim, [0, 1], [-8 + i * 4, 0]);

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 24,
                padding: 60,
                transform: `translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: BLOCK_FONTS.bebas,
                  fontSize: 140,
                  color: props.accent,
                }}
              >
                {slide.title}
              </div>

              <div
                style={{
                  fontFamily: BLOCK_FONTS.dm,
                  fontSize: 48,
                  marginTop: 20,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {slide.sub}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- ZOOM FADE ---------------- */

function ZoomFadeVariant({ props }) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const slideCount = props.slides.length;
  const framesPerSlide = durationInFrames / slideCount;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {props.slides.map((slide, i) => {
        const start = i * framesPerSlide;
        const localFrame = frame - start;

        const anim = spring({
          frame: localFrame,
          fps,
        });

        const scale = interpolate(anim, [0, 1], [0.6, 1]);
        const opacity = interpolate(anim, [0, 0.4], [0, 1]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              textAlign: "center",
              transform: `scale(${scale})`,
              opacity,
            }}
          >
            <div
              style={{
                fontFamily: BLOCK_FONTS.bebas,
                fontSize: 170,
                color: "#ffffff",
              }}
            >
              {slide.title}
            </div>

            <div
              style={{
                fontFamily: BLOCK_FONTS.dm,
                fontSize: 54,
                color: "rgba(255,255,255,0.65)",
                marginTop: 18,
              }}
            >
              {slide.sub}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
