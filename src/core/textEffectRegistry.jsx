/**
 * textEffectRegistry.js
 * src/core/textEffectRegistry.js
 *
 * Each effect exports:
 *   label   — display name in dropdowns
 *   render  — (text, local, totalDur, baseStyle, effectSpeed, interpolate) => JSX
 *
 * Timing philosophy:
 *   Effects use a FIXED base duration (not tied to beat length) so they always
 *   feel snappy. effectSpeed is a simple multiplier — higher = faster.
 *   Default effectSpeed is 1.0 → ~20 frames (~0.8s at 25fps) for most effects.
 *   Speed slider range should go up to 4.0+ so users can make effects instant.
 */

import React from "react";

// Base duration in frames at effectSpeed 1.0
// All multi-step effects derive their timing from this.
const BASE_FRAMES = 20;

/**
 * @param {string}   text
 * @param {number}   local        current frame within this beat
 * @param {number}   totalDur     total beat duration in frames (unused for timing now)
 * @param {object}   baseStyle    pre-built CSS style object
 * @param {number}   effectSpeed  multiplier from zone style (default 1.0)
 * @param {function} interpolate  Remotion interpolate
 */

const textEffectRegistry = {

  none: {
    label: "None",
    render(text, _local, _totalDur, baseStyle, _speed, _interpolate) {
      return <div style={baseStyle}>{text}</div>;
    },
  },

  typewriter: {
    label: "Typewriter",
    render(text, local, _totalDur, baseStyle, effectSpeed, interpolate) {
      const speed   = effectSpeed ?? 1.0;
      const dur     = BASE_FRAMES / speed;
      const chars   = text.split("");
      const visible = Math.floor(interpolate(local, [0, dur], [0, chars.length], { extrapolateRight: "clamp" }));
      const blink   = Math.floor(local / 6) % 2 === 0;
      const shown   = chars.slice(0, visible).join("");
      const cursor  = visible < chars.length ? (blink ? "|" : "\u00A0") : "";
      return <div style={baseStyle}>{shown}{cursor}</div>;
    },
  },

  wordReveal: {
    label: "Word Reveal",
    render(text, local, _totalDur, baseStyle, effectSpeed, interpolate) {
      const speed         = effectSpeed ?? 1.0;
      const totalAnim     = BASE_FRAMES / speed;
      const words         = text.split(/\s+/).filter(Boolean);
      const framesPerWord = totalAnim / Math.max(1, words.length);
      const revealDur     = Math.max(framesPerWord * 0.6, 2);
      return (
        <div style={baseStyle}>
          {words.map((word, i) => {
            const prog = interpolate(
              local,
              [i * framesPerWord, i * framesPerWord + revealDur],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <span key={i} style={{ opacity: prog, display: "inline" }}>
                {word}{i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      );
    },
  },

  fadeWords: {
    label: "Fade Words",
    render(text, local, _totalDur, baseStyle, effectSpeed, interpolate) {
      const speed         = effectSpeed ?? 1.0;
      const totalAnim     = BASE_FRAMES / speed;
      const words         = text.split(/\s+/).filter(Boolean);
      const framesPerWord = totalAnim / Math.max(1, words.length);
      const fadeDur       = Math.max(framesPerWord * 0.5, 2);
      return (
        <div style={baseStyle}>
          {words.map((word, i) => {
            const prog = interpolate(
              local,
              [i * framesPerWord, i * framesPerWord + fadeDur],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <span key={i} style={{ opacity: prog, display: "inline" }}>
                {word}{i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      );
    },
  },

  slideUp: {
    label: "Slide Up Lines",
    render(text, local, _totalDur, baseStyle, effectSpeed, interpolate) {
      const speed         = effectSpeed ?? 1.0;
      const totalAnim     = BASE_FRAMES / speed;
      const words         = text.split(/\s+/).filter(Boolean);
      const lines         = [];
      for (let i = 0; i < words.length; i += 3) lines.push(words.slice(i, i + 3).join(" "));
      const framesPerLine = totalAnim / Math.max(1, lines.length);
      const slideDur      = Math.max(framesPerLine * 0.6, 3);
      const align         = baseStyle.textAlign === "left" ? "flex-start" : baseStyle.textAlign === "right" ? "flex-end" : "center";
      return (
        <div style={{ ...baseStyle, display: "flex", flexDirection: "column", alignItems: align, gap: "0.15em" }}>
          {lines.map((line, i) => {
            const prog = interpolate(
              local,
              [i * framesPerLine, i * framesPerLine + slideDur],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <span key={i} style={{
                opacity:   prog,
                transform: `translateY(${interpolate(prog, [0, 1], [20, 0], { extrapolateRight: "clamp" })}px)`,
                display:   "block",
                width:     "100%",
              }}>
                {line}
              </span>
            );
          })}
        </div>
      );
    },
  },

  glitch: {
    label: "Glitch",
    render(text, local, _totalDur, baseStyle, effectSpeed, _interpolate) {
      const speed  = effectSpeed ?? 1.0;
      const settle = Math.round(12 / speed);
      const t      = Math.min(local, settle + 2);
      const shake  = t < settle ? (Math.sin(t * 3.7) * 3 * (1 - t / settle)) : 0;
      const hue    = t < settle ? (t % 2 === 0 ? "rgba(255,0,80,0.7)" : "rgba(0,220,255,0.7)") : "transparent";
      return (
        <div style={{ ...baseStyle, position: "relative" }}>
          {t < settle && (
            <div style={{ ...baseStyle, position: "absolute", inset: 0, color: hue, transform: `translateX(${shake * 2}px)`, mixBlendMode: "screen", pointerEvents: "none" }}>
              {text}
            </div>
          )}
          <div style={{ transform: `translateX(${shake}px)` }}>{text}</div>
        </div>
      );
    },
  },

  popIn: {
    label: "Pop In",
    render(text, local, _totalDur, baseStyle, effectSpeed, interpolate) {
      const dur    = Math.max(3, (BASE_FRAMES * 0.6) / (effectSpeed ?? 1.0));
      const prog   = interpolate(local, [0, dur], [0, 1], { extrapolateRight: "clamp" });
      const scale  = interpolate(prog, [0, 0.6, 0.8, 1], [0.5, 1.08, 0.96, 1], { extrapolateRight: "clamp" });
      const opacity = interpolate(prog, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
      return (
        <div style={{ ...baseStyle, transform: `scale(${scale})`, opacity }}>
          {text}
        </div>
      );
    },
  },

};

export default textEffectRegistry;

/** Ordered list for dropdowns */
export const TEXT_EFFECT_OPTIONS = Object.entries(textEffectRegistry).map(([key, entry]) => ({
  value: key,
  label: entry.label,
}));

/** Subset assigned by the AI pipeline — excludes "none" and gimmick-only effects */
export const PIPELINE_EFFECTS = ["typewriter", "wordReveal", "fadeWords", "slideUp", "popIn"];
