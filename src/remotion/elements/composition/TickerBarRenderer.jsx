/**
 * TickerBarRenderer.jsx
 * Renders a horizontally scrolling ticker bar.
 * Layer 2 — frame.
 */
import React from "react";

export default function TickerBarRenderer({ el, beat }) {
  const color    = el.color    ?? "#7c5cfc";
  const speed    = el.speed    ?? 30;
  const position = el.position ?? "bottom";

  const text = (beat?.spoken || "WATCH NOW • FOLLOW FOR MORE • ").toUpperCase();
  const repeated = `${text} • ${text} • ${text} • `;

  return (
    <div style={{
      position:   "absolute",
      inset:      0,
      overflow:   "hidden",
      background: color,
      display:    "flex",
      alignItems: "center",
      pointerEvents: "none",
    }}>
      <div style={{
        display:     "flex",
        whiteSpace:  "nowrap",
        animation:   `tickerScroll ${speed}s linear infinite`,
        willChange:  "transform",
      }}>
        <span style={{
          fontSize:      "clamp(10px, 1.8vw, 16px)",
          fontWeight:    700,
          fontFamily:    "'Barlow Condensed', 'Outfit', sans-serif",
          letterSpacing: "0.12em",
          color:         "#ffffff",
          padding:       "0 16px",
        }}>
          {repeated}
        </span>
      </div>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
