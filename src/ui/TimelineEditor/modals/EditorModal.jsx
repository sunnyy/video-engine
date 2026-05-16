import { useEffect } from "react";

export default function EditorModal({ title, onClose, children, width = 760 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: Math.min(width, window.innerWidth - 32),
          maxHeight: "85vh",
          background: "#16161f",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0" }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#8888a8",
              fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div className="dark-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
