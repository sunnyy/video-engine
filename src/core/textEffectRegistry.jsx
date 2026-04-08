/**
 * textEffectRegistry.js
 * src/core/textEffectRegistry.js
 *
 * Each effect exports:
 *   label   — display name in dropdowns
 *   render  — (text, local, totalDur, baseStyle, effectSpeed, interpolate) => JSX
 */

import React from "react";

/**
 * @param {string}   text
 * @param {number}   local        current frame within this beat
 * @param {number}   totalDur     total beat duration in frames
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
    render(text, local, totalDur, baseStyle, effectSpeed, interpolate) {
      const usableDur = (totalDur * 0.9) / (effectSpeed ?? 1.0);
      const chars     = text.split("");
      const visible   = Math.floor(interpolate(local, [0, usableDur], [0, chars.length], { extrapolateRight: "clamp" }));
      const blink     = Math.floor(local / 8) % 2 === 0;
      const shown     = chars.slice(0, visible).join("");
      const cursor    = visible < chars.length ? (blink ? "|" : "\u00A0") : "";
      return <div style={baseStyle}>{shown}{cursor}</div>;
    },
  },

  wordReveal: {
    label: "Word Reveal",
    render(text, local, totalDur, baseStyle, effectSpeed, interpolate) {
      const usableDur     = (totalDur * 0.9) / (effectSpeed ?? 1.0);
      const words         = text.split(/\s+/).filter(Boolean);
      const framesPerWord = usableDur / Math.max(1, words.length);
      const revealDur     = Math.max(framesPerWord * 0.6, 4);
      return (
        <div style={baseStyle}>
          <span>
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
          </span>
        </div>
      );
    },
  },

  fadeWords: {
    label: "Fade Words",
    render(text, local, totalDur, baseStyle, effectSpeed, interpolate) {
      const usableDur     = (totalDur * 0.9) / (effectSpeed ?? 1.0);
      const words         = text.split(/\s+/).filter(Boolean);
      const framesPerWord = usableDur / Math.max(1, words.length);
      const fadeDur       = Math.max(framesPerWord * 0.5, 3);
      return (
        <div style={baseStyle}>
          <span>
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
          </span>
        </div>
      );
    },
  },

  slideUp: {
    label: "Slide Up Lines",
    render(text, local, totalDur, baseStyle, effectSpeed, interpolate) {
      const usableDur     = (totalDur * 0.9) / (effectSpeed ?? 1.0);
      const words         = text.split(/\s+/).filter(Boolean);
      const lines         = [];
      for (let i = 0; i < words.length; i += 3) lines.push(words.slice(i, i + 3).join(" "));
      const framesPerLine = usableDur / Math.max(1, lines.length);
      const slideDur      = Math.max(framesPerLine * 0.6, 6);
      const align         = baseStyle.textAlign === "left" ? "flex-start" : baseStyle.textAlign === "right" ? "flex-end" : "center";
      return (
        <div style={{ ...baseStyle, flexDirection: "column", alignItems: align, gap: "0.15em" }}>
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
    render(text, local, _totalDur, baseStyle, _speed, _interpolate) {
      // Fast glitch offset that settles after ~12 frames
      const t      = Math.min(local, 14);
      const shake  = t < 12 ? (Math.sin(t * 3.7) * 3 * (1 - t / 12)) : 0;
      const hue    = t < 12 ? (t % 2 === 0 ? "rgba(255,0,80,0.7)" : "rgba(0,220,255,0.7)") : "transparent";
      return (
        <div style={{ ...baseStyle, position: "relative" }}>
          {t < 12 && (
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
      const dur    = Math.max(6, 18 / (effectSpeed ?? 1.0));
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
