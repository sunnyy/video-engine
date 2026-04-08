/**
 * NoiseGradientRenderer.jsx
 * Renders a multi-stop gradient background with radial accent glow + noise texture.
 * Layer 0 — background.
 */
import React from "react";

export default function NoiseGradientRenderer({ el }) {
  const colors = el.colors || ["#07060f", "#7c5cfc"];
  const angle  = el.angle  ?? 135;
  const [c1, c2] = colors;

  // Primary gradient — solid, always covers canvas
  const gradient = `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;

  // Radial accent glow — adds depth using the accent (c2) color
  // For ng_accent: c1=primary, c2=bg → glow from c1
  // For ng_dark: both dark → glow is subtle
  const glowColor = c1.startsWith("#0") || c1.startsWith("#1") ? c2 : c1;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Base gradient */}
      <div style={{ position: "absolute", inset: 0, background: gradient }} />
      {/* Radial accent glow at top-left */}
      <div style={{
        position: "absolute",
        inset:    0,
        background: `radial-gradient(ellipse at 20% 15%, ${glowColor}55 0%, transparent 60%)`,
      }} />
      {/* Subtle second glow at bottom-right */}
      <div style={{
        position: "absolute",
        inset:    0,
        background: `radial-gradient(ellipse at 80% 85%, ${glowColor}33 0%, transparent 50%)`,
      }} />
      {/* Film grain noise */}
      <div style={{
        position:        "absolute",
        inset:           0,
        opacity:         0.06,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize:  "256px 256px",
        mixBlendMode:    "overlay",
      }} />
    </div>
  );
}
