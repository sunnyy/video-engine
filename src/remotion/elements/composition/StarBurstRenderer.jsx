/**
 * StarBurstRenderer.jsx
 * Renders a star/starburst SVG decorative element sized to fill its container.
 * Layer 4 — decorative.
 */
import React from "react";

function starPath(cx, cy, points, outerR, innerR) {
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r     = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x     = cx + r * Math.cos(angle);
    const y     = cy + r * Math.sin(angle);
    d += i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }
  return d + "Z";
}

export default function StarBurstRenderer({ el }) {
  const points = el.points ?? 8;
  const color  = el.color  ?? "#7c5cfc";

  // Fill the container — viewBox 0 0 100 100
  const cx     = 50;
  const cy     = 50;
  const outerR = 48;
  const innerR = points <= 4 ? 20 : 28;
  const path   = starPath(cx, cy, points, outerR, innerR);

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill={color}
        style={{ display: "block" }}
      >
        <path d={path} opacity={0.92} />
      </svg>
    </div>
  );
}
