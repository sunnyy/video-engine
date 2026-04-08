/**
 * DotGridRenderer.jsx
 * Renders a grid of dots as a subtle background pattern.
 * Layer 4 — decorative.
 */
import React from "react";

export default function DotGridRenderer({ el }) {
  const color   = el.color   ?? "#ffffff";
  const opacity = el.opacity ?? 0.3;
  const size    = el.size    ?? 3;
  const gap     = el.gap     ?? 12;

  // Build SVG dot pattern as a data URI
  const dotSvg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><circle cx='${gap/2}' cy='${gap/2}' r='${size/2}' fill='${color}'/></svg>`
  );

  return (
    <div style={{
      position:        "absolute",
      inset:           0,
      opacity,
      backgroundImage: `url("data:image/svg+xml,${dotSvg}")`,
      backgroundSize:  `${gap}px ${gap}px`,
      pointerEvents:   "none",
    }} />
  );
}
