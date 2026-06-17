import { useState } from "react";

/**
 * Field primitives — shared chrome for every dashboard chatbox field.
 * Each field module (language, voice, duration, style, format) builds on these:
 * a compact FieldChip that opens a FieldModal. One file per field keeps them clean.
 */

export const THEME = {
  accent:  "#7c5cfc",
  border:  "rgba(255,255,255,0.08)",
  surface: "#0e1018",
  text:    "#e8eaf0",
  muted:   "#8896a8",
  faint:   "#55667a",
};

export function FieldChip({ icon, label, value, onClick, accent = THEME.accent, tinted = false }) {
  const [hov, setHov] = useState(false);
  const bg = tinted ? `${accent}14` : (hov ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)");
  const bd = tinted ? `${accent}55` : THEME.border;
  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 10,
        background: bg, border: `1px solid ${bd}`, cursor: "pointer", fontFamily: "inherit",
        transition: "background 0.15s",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", color: tinted ? accent : THEME.muted }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: tinted ? accent : THEME.text }}>{value}</span>
    </button>
  );
}

export function FieldModal({ title, onClose, children, width = 520 }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth: "100%", maxHeight: "86vh", overflowY: "auto", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "22px 24px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text, fontFamily: "'Outfit',sans-serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: THEME.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
