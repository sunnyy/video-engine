/**
 * ColorTintRenderer.jsx
 * Renders a semi-transparent color overlay to unify the color story.
 * Layer 1 — overlay.
 */
import React from "react";

export default function ColorTintRenderer({ el }) {
  const color   = el.color   ?? "#000000";
  const opacity = el.opacity ?? 0.35;

  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      background:    color,
      opacity,
      pointerEvents: "none",
      mixBlendMode:  "multiply",
    }} />
  );
}
