/**
 * DiagonalCutRenderer.jsx
 * Renders an angled two-tone background split.
 * Layer 0 — background.
 */
import React from "react";

export default function DiagonalCutRenderer({ el }) {
  const colorA = el.colorA ?? "#7c5cfc";
  const colorB = el.colorB ?? "#0a0a0a";
  const angle  = el.angle  ?? -15;

  // Use a clip-path polygon for a crisp diagonal edge
  // Convert angle to skew percentage
  const skewPct = Math.tan((Math.abs(angle) * Math.PI) / 180) * 100;
  const isLeft  = angle < 0;

  // Panel A: main color
  // Panel B: accent fills the remaining triangle
  const clipPath = isLeft
    ? `polygon(0 0, ${100 + skewPct}% 0, ${100}% 100%, 0 100%)`
    : `polygon(0 0, 100% 0, ${100 - skewPct}% 100%, 0 100%)`;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Full background color B */}
      <div style={{ position: "absolute", inset: 0, background: colorB }} />
      {/* Clipped panel A */}
      <div style={{
        position:  "absolute",
        inset:     0,
        background: colorA,
        clipPath,
      }} />
    </div>
  );
}
