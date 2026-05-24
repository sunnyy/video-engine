import { useState } from "react";
import { createPortal } from "react-dom";
import { useTimelineStore } from "../../../store/useTimelineStore";

const KEYFRAMES = `
@keyframes tm-cf-out  { 0%,30%{opacity:1}              70%,100%{opacity:0} }
@keyframes tm-cf-in   { 0%,30%{opacity:0}              70%,100%{opacity:1} }
@keyframes tm-sl-aout { 0%,30%{transform:translateX(0)}       70%,100%{transform:translateX(-100%)} }
@keyframes tm-sl-ain  { 0%,30%{transform:translateX(100%)}    70%,100%{transform:translateX(0)} }
@keyframes tm-sr-aout { 0%,30%{transform:translateX(0)}       70%,100%{transform:translateX(100%)} }
@keyframes tm-sr-ain  { 0%,30%{transform:translateX(-100%)}   70%,100%{transform:translateX(0)} }
@keyframes tm-su-aout { 0%,30%{transform:translateY(0)}       70%,100%{transform:translateY(-100%)} }
@keyframes tm-su-ain  { 0%,30%{transform:translateY(100%)}    70%,100%{transform:translateY(0)} }
@keyframes tm-sd-aout { 0%,30%{transform:translateY(0)}       70%,100%{transform:translateY(100%)} }
@keyframes tm-sd-ain  { 0%,30%{transform:translateY(-100%)}   70%,100%{transform:translateY(0)} }
@keyframes tm-zi-out  { 0%,30%{opacity:1;transform:scale(1)}    70%,100%{opacity:0;transform:scale(0.8)} }
@keyframes tm-zi-in   { 0%,30%{opacity:0;transform:scale(0.8)}  70%,100%{opacity:1;transform:scale(1)} }
`;

const DUR  = "2.8s";
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const COL_A = "#3b5bdb";
const COL_B = "#7c5cfc";

const CONFIGS = {
  crossfade:    { ea: "tm-cf-out",   eb: "tm-cf-in"  },
  "slide-left": { ea: "tm-sl-aout",  eb: "tm-sl-ain" },
  "slide-right":{ ea: "tm-sr-aout",  eb: "tm-sr-ain" },
  "slide-up":   { ea: "tm-su-aout",  eb: "tm-su-ain" },
  "slide-down": { ea: "tm-sd-aout",  eb: "tm-sd-ain" },
  "zoom-in":    { ea: "tm-zi-out",   eb: "tm-zi-in"  },
};

const TRANSITIONS = [
  { value: "none",         label: "None" },
  { value: "crossfade",    label: "Cross Fade" },
  { value: "slide-left",   label: "Slide Left" },
  { value: "slide-right",  label: "Slide Right" },
  { value: "slide-up",     label: "Slide Up" },
  { value: "slide-down",   label: "Slide Down" },
  { value: "zoom-in",      label: "Zoom In" },
];

const DURATIONS = [0.3, 0.5, 0.8];

function block(color, anim) {
  return {
    position: "absolute", inset: 0, background: color,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)",
    letterSpacing: "0.05em",
    ...(anim ? { animation: `${anim} ${DUR} ${EASE} infinite` } : {}),
  };
}

function Preview({ type }) {
  const wrap = { position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 6, background: "#0d0d18" };

  if (type === "none") {
    return (
      <div style={wrap}>
        <div style={{ ...block(COL_A), right: "50%", left: 0 }}>A</div>
        <div style={{ ...block(COL_B), left: "50%", right: 0 }}>B</div>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.15)" }} />
      </div>
    );
  }

  const cfg = CONFIGS[type] ?? CONFIGS.crossfade;
  return (
    <div style={wrap}>
      <div style={block(COL_A, cfg.ea)}>A</div>
      <div style={block(COL_B, cfg.eb)}>B</div>
    </div>
  );
}

export default function TransitionModal({ time, layers, onClose }) {
  const existingOut = layers.find(
    l => Math.abs(l.end - time) < 0.05 && l.transition?.out?.type && l.transition.out.type !== "none"
  )?.transition?.out;

  const [type, setType]         = useState(existingOut?.type ?? "crossfade");
  const [duration, setDuration] = useState(existingOut?.duration ?? 0.5);
  const updateLayer = useTimelineStore((s) => s.updateLayer);

  const apply = () => {
    layers.forEach(layer => {
      if (layer.type === "audio") return;
      const existing = layer.transition || {};
      if (Math.abs(layer.end - time) < 0.05) {
        updateLayer(layer.id, { transition: { ...existing, out: { type, duration } } });
      } else if (Math.abs(layer.start - time) < 0.05) {
        updateLayer(layer.id, { transition: { ...existing, in: { type, duration } } });
      }
    });
    onClose();
  };

  const card = (t) => {
    const active = type === t.value;
    return (
      <div
        key={t.value}
        onClick={() => setType(t.value)}
        style={{
          display: "flex", flexDirection: "column", gap: 8,
          padding: 8, borderRadius: 8, cursor: "pointer",
          border: `2px solid ${active ? "#00e5ff" : "rgba(255,255,255,0.06)"}`,
          background: active ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.02)",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <div style={{ height: 72 }}>
          <Preview type={t.value} />
        </div>
        <div style={{ fontSize: 11, color: active ? "#00e5ff" : "#777", textAlign: "center", fontWeight: 600 }}>
          {t.label}
        </div>
      </div>
    );
  };

  return createPortal(
    <>
      <style>{KEYFRAMES}</style>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: "#1c1c28", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14, padding: "24px 24px 20px", width: 580,
            boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Scene Transition</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Applied to all layers at this scene boundary</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>✕</button>
          </div>

          {/* Transition grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {TRANSITIONS.map(card)}
          </div>

          {/* Duration */}
          {type !== "none" && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Duration</div>
              <div style={{ display: "flex", gap: 8 }}>
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    style={{
                      padding: "6px 18px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                      border: `1px solid ${duration === d ? "#00e5ff" : "rgba(255,255,255,0.1)"}`,
                      background: duration === d ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)",
                      color: duration === d ? "#00e5ff" : "#777",
                      fontWeight: duration === d ? 600 : 400,
                    }}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#777", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={apply} style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: "#00e5ff", color: "#0a0a14", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
