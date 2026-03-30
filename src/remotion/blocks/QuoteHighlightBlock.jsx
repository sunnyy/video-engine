/**
 * QuoteHighlightBlock.jsx
 * Place at: src/remotion/blocks/QuoteHighlightBlock.jsx
 *
 * block.props keys:
 *   text    string   "The best time to start..."
 *   author  string   "Unknown"
 *   role    string   "Timeless wisdom"
 *   accent  string   "#6c47ff"
 *
 * block.variant:
 *   "default" | "large" | "minimal"
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
export const QUOTE_HIGHLIGHT_DEFAULTS = {
  text:   "The best time to start was yesterday. The second best time is now.",
  author: "Unknown",
  role:   "Timeless wisdom",
  accent: "#6c47ff",
};

/* ── Presets ──────────────────────────────────────────────── */
const PRESETS = {
  default: {
    label:       "Default",
    treatment:   "dark",
    quoteFont:   "syne",
    quoteFontSize: 72,
    showMark:    true,
    showLine:    true,
    showAuthor:  true,
    markSize:    320,
  },
  large: {
    label:       "Large",
    treatment:   "dark",
    quoteFont:   "bebas",
    quoteFontSize: 96,
    showMark:    false,
    showLine:    true,
    showAuthor:  true,
    markSize:    0,
  },
  minimal: {
    label:       "Minimal",
    treatment:   "dark",
    quoteFont:   "playfair",
    quoteFontSize: 68,
    showMark:    false,
    showLine:    false,
    showAuthor:  true,
    markSize:    0,
  },
};

/* ── Main renderer ────────────────────────────────────────── */
export default function QuoteHighlightBlock({ block }) {
  const props   = { ...QUOTE_HIGHLIGHT_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "default";
  const preset  = PRESETS[variant] || PRESETS.default;
  const colors  = deriveColors(props.accent, preset.treatment);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Vertical line draws down first ── */
  const lineP = spring({ frame, fps, config: { damping: 22, stiffness: 100 } });
  const lineH = interpolate(lineP, [0, 1], [0, 100]); // percent

  /* ── Quote mark fades in ── */
  const markP = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });

  /* ── Text wipes left→right ── */
  const textP = spring({
    frame: Math.max(frame - 6, 0),
    fps,
    config: { damping: 16, stiffness: 110 },
  });
  const textClip = interpolate(textP, [0, 1], [100, 0]);
  const textY    = interpolate(textP, [0, 1], [40, 0]);

  /* ── Author fades up last ── */
  const authorP = spring({
    frame: Math.max(frame - 18, 0),
    fps,
    config: { damping: 18, stiffness: 100 },
  });
  const authorOp = interpolate(authorP, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  const authorY  = interpolate(authorP, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "0 72px",
    }}>

      {/* Ghost quotation mark */}
      {preset.showMark && (
        <div style={{
          position: "absolute",
          top: 60,
          left: 50,
          fontFamily: BLOCK_FONTS.bebas,
          fontSize: preset.markSize,
          lineHeight: 0.8,
          color: colors.accent,
          opacity: interpolate(markP, [0, 1], [0, 0.07]),
          userSelect: "none",
          pointerEvents: "none",
        }}>
          "
        </div>
      )}

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        display: "flex",
        gap: 40,
        alignItems: "flex-start",
      }}>

        {/* Vertical accent line */}
        {preset.showLine && (
          <div style={{
            width: 6,
            height: `${lineH}%`,
            minHeight: 6,
            maxHeight: 600,
            background: `linear-gradient(to bottom, ${colors.accent}, ${colors.analogous || colors.accent})`,
            borderRadius: 3,
            flexShrink: 0,
            marginTop: 8,
            boxShadow: makeGlow(colors.accent, 1),
          }} />
        )}

        <div style={{ flex: 1 }}>

          {/* Quote text */}
          <div style={{
            fontFamily: BLOCK_FONTS[preset.quoteFont],
            fontSize: preset.quoteFontSize,
            fontWeight: preset.quoteFont === "bebas" ? 400 : 700,
            lineHeight: 1.25,
            letterSpacing: preset.quoteFont === "bebas" ? "0.02em" : "-0.5px",
            color: colors.text,
            clipPath: `inset(0 ${textClip}% 0 0)`,
            transform: `translateY(${textY}px)`,
          }}>
            {props.text}
          </div>

          {/* Author */}
          {preset.showAuthor && (props.author || props.role) && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: 48,
              opacity: authorOp,
              transform: `translateY(${authorY}px)`,
            }}>
              {/* Avatar circle */}
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.analogous || colors.accent})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: BLOCK_FONTS.syne,
                fontSize: 36,
                fontWeight: 700,
                color: "#000",
                flexShrink: 0,
                border: `2px solid ${colors.border2}`,
              }}>
                {props.author?.charAt(0) || "?"}
              </div>

              <div>
                <div style={{
                  fontFamily: BLOCK_FONTS.syne,
                  fontSize: 40,
                  fontWeight: 700,
                  color: colors.text,
                  lineHeight: 1.2,
                }}>
                  {props.author}
                </div>
                {props.role && (
                  <div style={{
                    fontFamily: BLOCK_FONTS.mono,
                    fontSize: 28,
                    color: colors.accent,
                    letterSpacing: "0.06em",
                    marginTop: 6,
                  }}>
                    {props.role}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </AbsoluteFill>
  );
}