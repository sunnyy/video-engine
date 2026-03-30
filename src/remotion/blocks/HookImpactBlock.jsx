import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BLOCK_FONTS } from "../../core/colorUtils";

export const HOOK_IMPACT_DEFAULTS = {
  eyebrow: "Stop scrolling",
  headline: "THIS CHANGES EVERYTHING",
  sub: "The one insight that 99% of creators miss completely",
  cta: "Watch Now →",
  accent: "#ff4d6d",
};

export default function HookImpactBlock({ block }) {
  const props = { ...HOOK_IMPACT_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "zoomBlur";

  if (variant === "stamp") return <StampVariant props={props} />;
  if (variant === "splitReveal") return <SplitRevealVariant props={props} />;

  return <ZoomBlurVariant props={props} />;
}

/* ---------------- ZOOM BLUR (main demo style) ---------------- */

function ZoomBlurVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const main = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  const scale = interpolate(main, [0, 1], [1.4, 1]);
  const blur = interpolate(main, [0, 1], [12, 0]);
  const opacity = interpolate(main, [0, 0.35], [0, 1]);

  const subAnim = spring({
    frame: Math.max(frame - 12, 0),
    fps,
  });

  const ctaAnim = spring({
    frame: Math.max(frame - 24, 0),
    fps,
  });

  const words = props.headline.split(" ");

  const line1 = words[0] || "";
  const line2 = words[1] || "";
  const line3 = words.slice(2).join(" ");

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "0 0",
      }}
    >
      {/* eyebrow */}
      <div
        style={{
          fontFamily: BLOCK_FONTS.mono,
          fontSize: 46,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: props.accent,
          opacity,
        }}
      >
        {props.eyebrow}
      </div>

      {/* headline */}
      <div
        style={{
          marginTop: 18,
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
          opacity,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: BLOCK_FONTS.bebas,
            fontSize: 160,
            lineHeight: 0.8,
            color: "#e8e8f0",
          }}
        >
          {line1}
        </div>

        <div
          style={{
            fontFamily: BLOCK_FONTS.bebas,
            fontSize: 160,
            lineHeight: 0.9,
            color: "transparent",
            WebkitTextStroke: `6px ${props.accent}`,
            letterSpacing: "0.02em",
          }}
        >
          {line2}
        </div>

        <div
          style={{
            fontFamily: BLOCK_FONTS.bebas,
            fontSize: 160,
            lineHeight: 0.9,
            color: "#e8e8f0",
          }}
        >
          {line3}
        </div>
      </div>

      {/* sub */}
      <div
        style={{
          marginTop: 32,
          fontFamily: BLOCK_FONTS.dm,
          fontSize: 48,
          color: "rgba(255,255,255,0.55)",
          opacity: subAnim,
          maxWidth: 900,
        }}
      >
        {props.sub}
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 42,
          background: props.accent,
          color: "#ffffff",
          fontFamily: BLOCK_FONTS.syne,
          fontSize: 40,
          fontWeight: 700,
          padding: "18px 48px",
          borderRadius: 100,
          opacity: ctaAnim,
          boxShadow: "0 0 40px rgba(255,77,109,0.35)",
        }}
      >
        {props.cta}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- STAMP VARIANT ---------------- */

function StampVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const scale = interpolate(p, [0, 1], [1.6, 1]);
  const rot = interpolate(p, [0, 1], [-6, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: BLOCK_FONTS.mono,
          fontSize: 26,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: props.accent,
        }}
      >
        {props.eyebrow}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.bebas,
          fontSize: 140,
          color: props.accent,
          transform: `scale(${scale}) rotate(${rot}deg)`,
          marginTop: 12,
        }}
      >
        {props.headline}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.dm,
          fontSize: 46,
          marginTop: 26,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {props.sub}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- SPLIT REVEAL VARIANT ---------------- */

function SplitRevealVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame, fps });

  const clip = interpolate(p, [0, 1], [50, 0]);

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
          fontSize: 26,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: props.accent,
        }}
      >
        {props.eyebrow}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.bebas,
          fontSize: 140,
          marginTop: 18,
          clipPath: `inset(0 ${clip}% 0 ${clip}%)`,
        }}
      >
        {props.headline}
      </div>

      <div
        style={{
          fontFamily: BLOCK_FONTS.dm,
          fontSize: 46,
          marginTop: 30,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {props.sub}
      </div>
    </AbsoluteFill>
  );
}