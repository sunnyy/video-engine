/**
 * HeroWordRenderer.jsx
 * Renders a giant decorative background word extracted from the beat's spoken text.
 * Layer 3 — typography (renders as background text, behind zone content).
 */
import React from "react";

function extractHeroWord(spoken = "") {
  const words = spoken.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "NOW";
  // Prefer the longest capitalized word or first word
  const caps = words.filter(w => w.length >= 3);
  const best = caps.sort((a, b) => b.length - a.length)[0] || words[0];
  return best.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function HeroWordRenderer({ el, beat }) {
  const style     = el.style     ?? "fill";
  const weight    = el.weight    ?? 900;
  const splitColor = el.splitColor ?? false;

  const word = extractHeroWord(beat?.spoken);
  if (!word) return null;

  const isOutline = style === "outline";
  const color     = "#ffffff";

  const textStyle = {
    position:      "absolute",
    inset:         0,
    display:       "flex",
    alignItems:    "center",
    justifyContent:"center",
    pointerEvents: "none",
    overflow:      "hidden",
  };

  const wordStyle = {
    fontSize:      "clamp(80px, 28vw, 280px)",
    fontWeight:    weight,
    fontFamily:    "'Bebas Neue', 'Barlow Condensed', sans-serif",
    letterSpacing: "-0.02em",
    lineHeight:    1,
    userSelect:    "none",
    whiteSpace:    "nowrap",
    color:         isOutline ? "transparent" : `${color}18`,
    WebkitTextStroke: isOutline ? `2px ${color}22` : "none",
    textStroke:    isOutline ? `2px ${color}22` : "none",
  };

  return (
    <div style={textStyle}>
      <span style={wordStyle}>{word}</span>
    </div>
  );
}
