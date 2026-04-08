/**
 * LabelBadgeRenderer.jsx
 * Renders a pill or rectangle label badge with beat role text.
 * Layer 3 — typography. Renders ABOVE zone content (z-index 15).
 */
import React from "react";

const ROLE_LABELS = {
  hook:        "WATCH THIS",
  proof:       "FACTS",
  escalate:    "WAIT...",
  reveal:      "THE TRUTH",
  cta:         "FOLLOW NOW",
  visual_rest: "AND...",
};

export default function LabelBadgeRenderer({ el, beat }) {
  const shape  = el.shape  ?? "pill";
  const bg     = el.bg     ?? "#7c5cfc";
  const border = el.border ?? false;

  const role = beat?.role || "hook";
  const text = ROLE_LABELS[role] || role.toUpperCase();

  const isTransparent = bg === "transparent";
  const borderRadius  = shape === "pill" ? 100 : 6;

  return (
    <div style={{
      position:       "absolute",
      inset:          0,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "flex-start",
      pointerEvents:  "none",
    }}>
      <div style={{
        background:    isTransparent ? "rgba(0,0,0,0.35)" : bg,
        border:        border ? `2px solid #ffffff` : "none",
        borderRadius,
        padding:       "5px 14px",
        color:         "#ffffff",
        fontSize:      "clamp(10px, 2vw, 16px)",
        fontWeight:    700,
        fontFamily:    "'Outfit', 'Barlow Condensed', sans-serif",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        whiteSpace:    "nowrap",
        backdropFilter:"blur(6px)",
        boxShadow:     `0 2px 16px rgba(0,0,0,0.4)`,
        lineHeight:    1.2,
      }}>
        {text}
      </div>
    </div>
  );
}
