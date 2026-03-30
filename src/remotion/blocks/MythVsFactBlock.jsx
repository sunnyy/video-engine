import React from "react";
import {
  AbsoluteFill,
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { deriveColors, BLOCK_FONTS, makeGlow } from "../../core/colorUtils";

export const DEFAULT_MYTH_VS_FACT_PROPS = {
  kicker: "COMMON MISCONCEPTION",
  title: "Myth vs Fact",
  mythLabel: "Myth",
  factLabel: "Fact",
  myth: "You need to post every day to grow.",
  fact: "Consistency matters more than volume. Strong ideas and better hooks usually outperform raw frequency.",
  accent: "#7c3aed",
  bg: "#0f1115",
  text: "#f5f7fb",
  subtext: "#9aa4b2",
  mythTone: "#fb7185",
  factTone: "#2dd4bf",
  split: 0.5,
  showBadge: true,
  showDivider: true,
  emphasis: "fact",
  align: "left",
};

const VARIANTS = {
  default: {
    titleSize: 82,
    bodySize: 34,
    labelSize: 22,
    outerPadX: 88,
    outerPadY: 76,
    panelRadius: 30,
    headerGap: 18,
    panelGap: 22,
  },
  compact: {
    titleSize: 70,
    bodySize: 28,
    labelSize: 20,
    outerPadX: 72,
    outerPadY: 64,
    panelRadius: 24,
    headerGap: 16,
    panelGap: 18,
  },
  bold: {
    titleSize: 92,
    bodySize: 38,
    labelSize: 24,
    outerPadX: 92,
    outerPadY: 82,
    panelRadius: 34,
    headerGap: 20,
    panelGap: 24,
  },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function MythVsFactBlock({ block }) {
  const props = { ...DEFAULT_MYTH_VS_FACT_PROPS, ...(block?.props || {}) };
  const variant = VARIANTS[block?.variant || "default"] || VARIANTS.default;

  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const colors = deriveColors({
    accent: props.accent,
    bg: props.bg,
    text: props.text,
    subtext: props.subtext,
  });

  const split = clamp(Number(props.split ?? 0.5), 0.35, 0.65);

  const bgEnter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.9 },
  });

  const badgeEnter = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 130 },
  });

  const titleEnter = spring({
    frame: frame - 5,
    fps,
    config: { damping: 16, stiffness: 115 },
  });

  const mythEnter = spring({
    frame: frame - 10,
    fps,
    config: { damping: 17, stiffness: 110 },
  });

  const factEnter = spring({
    frame: frame - 16,
    fps,
    config: { damping: 17, stiffness: 110 },
  });

  const dividerEnter = spring({
    frame: frame - 14,
    fps,
    config: { damping: 20, stiffness: 120 },
  });

  const bgOpacity = interpolate(bgEnter, [0, 1], [0.35, 1]);
  const titleOpacity = interpolate(titleEnter, [0, 1], [0, 1]);
  const titleY = interpolate(titleEnter, [0, 1], [32, 0]);

  const mythOpacity = interpolate(mythEnter, [0, 1], [0, 1]);
  const mythX = interpolate(mythEnter, [0, 1], [-48, 0]);

  const factOpacity = interpolate(factEnter, [0, 1], [0, 1]);
  const factX = interpolate(factEnter, [0, 1], [48, 0]);

  const badgeOpacity = interpolate(badgeEnter, [0, 1], [0, 1]);
  const badgeScale = interpolate(badgeEnter, [0, 1], [0.9, 1]);

  const dividerOpacity = interpolate(dividerEnter, [0, 1], [0, 0.95]);
  const dividerScale = interpolate(dividerEnter, [0, 1], [0, 1]);

  const contentTop = variant.outerPadY + 128;
  const panelHeight = height - contentTop - variant.outerPadY;
  const totalGap = variant.panelGap;
  const panelWidth = Math.floor((width - variant.outerPadX * 2 - totalGap) / 2);

  const mythBg =
    props.emphasis === "myth"
      ? "linear-gradient(180deg, rgba(251,113,133,0.18) 0%, rgba(251,113,133,0.08) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.025) 100%)";

  const factBg =
    props.emphasis === "fact"
      ? "linear-gradient(180deg, rgba(45,212,191,0.18) 0%, rgba(45,212,191,0.08) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.025) 100%)";

  return (
    <AbsoluteFill
      style={{
        background: colors.bg,
        color: colors.text,
        fontFamily: BLOCK_FONTS.sans,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: bgOpacity,
          background: `
            radial-gradient(circle at 12% 18%, rgba(255,255,255,0.07), transparent 28%),
            radial-gradient(circle at 86% 80%, rgba(255,255,255,0.05), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
          `,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: `${variant.outerPadY}px ${variant.outerPadX}px`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: props.align === "center" ? "center" : "flex-start",
            textAlign: props.align,
            gap: variant.headerGap,
          }}
        >
          {props.showBadge ? (
            <div
              style={{
                opacity: badgeOpacity,
                transform: `scale(${badgeScale})`,
                transformOrigin: props.align === "center" ? "center" : "left center",
                padding: "10px 16px",
                borderRadius: 999,
                fontSize: 17,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 800,
                color: colors.subtext,
                border: `1px solid ${colors.accent}55`,
                background: "rgba(255,255,255,0.05)",
                ...makeGlow(colors.accent, 0.18),
              }}
            >
              {props.kicker}
            </div>
          ) : null}

          <div
            style={{
              maxWidth: props.align === "center" ? 1100 : 920,
              fontSize: variant.titleSize,
              lineHeight: 0.94,
              letterSpacing: "-0.05em",
              fontWeight: 900,
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
            }}
          >
            {props.title}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: 38,
            display: "flex",
            gap: totalGap,
            height: panelHeight,
          }}
        >
          <div
            style={{
              width: panelWidth,
              height: "100%",
              borderRadius: variant.panelRadius,
              padding: 30,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: mythBg,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                props.emphasis === "myth"
                  ? "0 0 0 1px rgba(251,113,133,0.22), 0 22px 80px rgba(251,113,133,0.14)"
                  : "0 24px 60px rgba(0,0,0,0.16)",
              opacity: mythOpacity,
              transform: `translateX(${mythX}px)`,
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(251,113,133,0.14)",
                color: props.mythTone,
                fontSize: variant.labelSize,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {props.mythLabel}
            </div>

            <div
              style={{
                fontSize: variant.bodySize,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                fontWeight: 850,
                maxWidth: "95%",
              }}
            >
              {props.myth}
            </div>

            <div
              style={{
                fontSize: 16,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
                color: colors.subtext,
              }}
            >
              Misleading belief
            </div>
          </div>

          <div
            style={{
              width: panelWidth,
              height: "100%",
              borderRadius: variant.panelRadius,
              padding: 30,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: factBg,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                props.emphasis === "fact"
                  ? "0 0 0 1px rgba(45,212,191,0.22), 0 22px 80px rgba(45,212,191,0.14)"
                  : "0 24px 60px rgba(0,0,0,0.16)",
              opacity: factOpacity,
              transform: `translateX(${factX}px)`,
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(45,212,191,0.14)",
                color: props.factTone,
                fontSize: variant.labelSize,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {props.factLabel}
            </div>

            <div
              style={{
                fontSize: variant.bodySize,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                fontWeight: 850,
                maxWidth: "95%",
              }}
            >
              {props.fact}
            </div>

            <div
              style={{
                fontSize: 16,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
                color: colors.subtext,
              }}
            >
              Better explanation
            </div>
          </div>

          {props.showDivider ? (
            <div
              style={{
                position: "absolute",
                left: `calc(50% - 1px)`,
                top: 24,
                bottom: 24,
                width: 2,
                borderRadius: 999,
                opacity: dividerOpacity,
                transform: `scaleY(${dividerScale})`,
                transformOrigin: "center top",
                background: `linear-gradient(180deg, transparent, ${colors.accent}, transparent)`,
                boxShadow: `0 0 20px ${colors.accent}66`,
              }}
            />
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
}