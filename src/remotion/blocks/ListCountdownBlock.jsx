/**
 * ListCountdownBlock.jsx
 * Place at: src/remotion/blocks/ListCountdownBlock.jsx
 *
 * block.props keys:
 *   title   string   "Top reasons to start today"
 *   items   array    [{ title, desc, value }]  value = 0–100 bar fill %
 *   accent  string   "#f0e040"
 *
 * block.variant:
 *   "cards" | "bars" | "minimal"
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { deriveColors, BLOCK_FONTS, makeGlow } from "../../core/colorUtils";

/* ── Defaults ─────────────────────────────────────────────── */
export const LIST_COUNTDOWN_DEFAULTS = {
  title: "Top reasons to start today",
  items: [
    { title: "Save 10 hours a week",  desc: "Automation handles the heavy lifting", value: 60 },
    { title: "3× better results",     desc: "Proven across 50,000+ users",          value: 80 },
    { title: "Zero learning curve",   desc: "Up and running in under 5 minutes",    value: 95 },
  ],
  accent: "#f0e040",
};

/* ── Variant presets ──────────────────────────────────────── */
const PRESETS = {
  cards: {
    label:     "Cards",
    treatment: "dark",
    showBar:   true,
    showDesc:  true,
    cardBg:    true,
  },
  bars: {
    label:     "Bars",
    treatment: "dark",
    showBar:   true,
    showDesc:  false,
    cardBg:    false,
  },
  minimal: {
    label:     "Minimal",
    treatment: "dark",
    showBar:   false,
    showDesc:  true,
    cardBg:    false,
  },
};

/* ── Animated bar ─────────────────────────────────────────── */
function Bar({ value, frame, fps, delay, color }) {
  const p = spring({
    frame: Math.max(frame - delay, 0),
    fps,
    config: { damping: 22, stiffness: 80, mass: 1 },
  });
  const w = interpolate(p, [0, 1], [0, value]);

  return (
    <div style={{
      height: 6,
      background: "rgba(255,255,255,0.08)",
      borderRadius: 4,
      marginTop: 14,
      overflow: "hidden",
    }}>
      <div style={{
        height: "100%",
        width: `${w}%`,
        background: color,
        borderRadius: 4,
        boxShadow: `0 0 10px ${color}80`,
      }} />
    </div>
  );
}

/* ── Main renderer ────────────────────────────────────────── */
export default function ListCountdownBlock({ block }) {
  const props   = { ...LIST_COUNTDOWN_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "cards";
  const preset  = PRESETS[variant] || PRESETS.cards;
  const colors  = deriveColors(props.accent, preset.treatment);
  const items   = props.items || [];

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const staggerWindow = durationInFrames * 0.6;
  const staggerStep   = items.length > 1 ? staggerWindow / items.length : 0;

  const titleP = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });

  return (
    <AbsoluteFill style={{
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "0 64px",
    }}>
      <div style={{ width: "100%" }}>

        {/* Title */}
        <div style={{
          fontFamily: BLOCK_FONTS.mono,
          fontSize: 42,
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: colors.textDim,
          marginBottom: 36,
          opacity: interpolate(titleP, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(titleP, [0, 1], [14, 0])}px)`,
        }}>
          {props.title}
        </div>

        {/* Items */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: variant === "cards" ? 24 : 20,
        }}>
          {items.map((item, i) => {
            const itemDelay = Math.round(staggerStep * i);
            const p = spring({
              frame: Math.max(frame - itemDelay, 0),
              fps,
              config: { damping: 16, stiffness: 160 },
            });
            const y  = interpolate(p, [0, 1], [70, 0]);
            const op = interpolate(p, [0, 0.25], [0, 1], { extrapolateRight: "clamp" });
            const revNum = items.length - i;

            /* ── CARDS ── */
            if (variant === "cards") {
              return (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  background: colors.bg2,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `5px solid ${colors.accent}`,
                  borderRadius: 18,
                  padding: "24px 28px",
                  transform: `translateY(${y}px)`,
                  opacity: op,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
                }}>
                  {/* Countdown number */}
                  <div style={{
                    fontFamily: BLOCK_FONTS.bebas,
                    fontSize: 126,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: colors.accent,
                    opacity: 0.2,
                    minWidth: 72,
                    textAlign: "right",
                    flexShrink: 0,
                  }}>
                    {revNum}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: BLOCK_FONTS.syne,
                      fontSize: 42,
                      fontWeight: 700,
                      color: colors.text,
                      lineHeight: 1.15,
                      letterSpacing: "-0.5px",
                    }}>
                      {item.title}
                    </div>
                    {item.desc && (
                      <div style={{
                        fontFamily: BLOCK_FONTS.dm,
                        fontSize: 34,
                        color: colors.textDim,
                        marginTop: 6,
                        lineHeight: 1.4,
                      }}>
                        {item.desc}
                      </div>
                    )}
                    {item.value != null && (
                      <Bar
                        value={item.value}
                        frame={frame}
                        fps={fps}
                        delay={itemDelay + 8}
                        color={colors.accent}
                      />
                    )}
                  </div>

                  {/* % badge */}
                  {item.value != null && (
                    <div style={{
                      fontFamily: BLOCK_FONTS.mono,
                      fontSize: 38,
                      fontWeight: 600,
                      color: colors.accent,
                      flexShrink: 0,
                    }}>
                      {item.value}%
                    </div>
                  )}
                </div>
              );
            }

            /* ── BARS ── */
            if (variant === "bars") {
              return (
                <div key={i} style={{
                  transform: `translateY(${y}px)`,
                  opacity: op,
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 8,
                  }}>
                    <div style={{
                      fontFamily: BLOCK_FONTS.syne,
                      fontSize: 38,
                      fontWeight: 700,
                      color: colors.text,
                      letterSpacing: "-0.5px",
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontFamily: BLOCK_FONTS.mono,
                      fontSize: 38,
                      fontWeight: 600,
                      color: colors.accent,
                    }}>
                      {item.value}%
                    </div>
                  </div>
                  <div style={{
                    height: 8,
                    background: colors.bg3,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                    <Bar
                      value={item.value}
                      frame={frame}
                      fps={fps}
                      delay={itemDelay + 6}
                      color={colors.accent}
                    />
                  </div>
                </div>
              );
            }

            /* ── MINIMAL ── */
            return (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                paddingBottom: 18,
                borderBottom: i < items.length - 1
                  ? `1px solid ${colors.border}`
                  : "none",
                transform: `translateY(${y}px)`,
                opacity: op,
              }}>
                <div style={{
                  fontFamily: BLOCK_FONTS.mono,
                  fontSize: 42,
                  fontWeight: 600,
                  color: colors.accent,
                  minWidth: 36,
                  paddingTop: 4,
                  flexShrink: 0,
                }}>
                  {String(revNum).padStart(2, "0")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: BLOCK_FONTS.syne,
                    fontSize: 40,
                    fontWeight: 700,
                    color: colors.text,
                    lineHeight: 1.2,
                    letterSpacing: "-0.4px",
                  }}>
                    {item.title}
                  </div>
                  {item.desc && (
                    <div style={{
                      fontFamily: BLOCK_FONTS.dm,
                      fontSize: 42,
                      color: colors.textDim,
                      marginTop: 5,
                      lineHeight: 1.4,
                    }}>
                      {item.desc}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AbsoluteFill>
  );
}