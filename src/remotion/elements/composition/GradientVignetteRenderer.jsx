/**
 * GradientVignetteRenderer.jsx
 * Renders a dark gradient vignette for text readability over assets.
 * Layer 1 — overlay.
 */
import React from "react";

export default function GradientVignetteRenderer({ el }) {
  const direction = el.direction ?? "bottom";
  const strength  = el.strength  ?? 0.8;
  const alpha     = Math.round(strength * 255).toString(16).padStart(2, "0");

  let background;
  if (direction === "bottom") {
    background = `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,${strength}) 100%)`;
  } else if (direction === "top") {
    background = `linear-gradient(to top, transparent 30%, rgba(0,0,0,${strength}) 100%)`;
  } else {
    // both
    background = [
      `linear-gradient(to bottom, rgba(0,0,0,${strength * 0.7}) 0%, transparent 35%, transparent 65%, rgba(0,0,0,${strength}) 100%)`,
    ].join(", ");
  }

  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      background,
      pointerEvents: "none",
    }} />
  );
}
