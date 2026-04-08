/**
 * BlobShapeRenderer.jsx
 * Renders an organic blob shape as a background accent.
 * Layer 0 — background.
 */
import React from "react";

export default function BlobShapeRenderer({ el }) {
  const color    = el.color    ?? "#7c5cfc";
  const position = el.position ?? "center";
  const size     = el.size     ?? 0.6; // 0-1 relative to canvas

  const pct = Math.round(size * 100);

  // Organic blob using SVG filter blur on a rounded rect
  const posStyles = {
    top:    { top: `-${pct / 3}%`,   left: "50%", transform: "translateX(-50%)" },
    bottom: { bottom: `-${pct / 3}%`, left: "50%", transform: "translateX(-50%)" },
    center: { top: "50%",  left: "50%", transform: "translate(-50%, -50%)" },
  };
  const pos = posStyles[position] || posStyles.center;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position:     "absolute",
        width:        `${pct}%`,
        aspectRatio:  "1",
        background:   color,
        borderRadius: "60% 40% 50% 70% / 50% 60% 40% 55%",
        filter:       "blur(48px)",
        opacity:      0.35,
        ...pos,
      }} />
    </div>
  );
}
