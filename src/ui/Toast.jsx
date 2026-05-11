import { useState, useEffect } from "react";

/* ── Global event bus ── */
const listeners = new Set();

export function showToast(message, type = "error") {
  const id = Date.now() + Math.random();
  listeners.forEach(fn => fn({ id, message, type }));
}

const COLORS = {
  error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",   icon: "✕", iconColor: "#f87171" },
  success: { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",   icon: "✓", iconColor: "#4ade80" },
  info:    { bg: "rgba(124,92,252,0.12)", border: "rgba(124,92,252,0.3)",  icon: "ℹ", iconColor: "#a78bfa" },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 4000);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none",
    }}>
      {toasts.map(t => {
        const s = COLORS[t.type] || COLORS.error;
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 10, padding: "12px 16px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            maxWidth: 360, pointerEvents: "auto",
            fontFamily: "'Outfit', sans-serif",
            animation: "toast-in 0.2s ease",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: s.iconColor, flexShrink: 0, lineHeight: 1.4 }}>{s.icon}</span>
            <span style={{ fontSize: 14, color: "#e8e8f0", lineHeight: 1.5 }}>{t.message}</span>
          </div>
        );
      })}
      <style>{`@keyframes toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
