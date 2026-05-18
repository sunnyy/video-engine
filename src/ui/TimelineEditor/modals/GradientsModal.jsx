import { useState } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import EditorModal from "./EditorModal";

const GRADIENT_PRESETS = [
  { label: "Midnight",  value: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { label: "Sunset",    value: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #f7971e 100%)" },
  { label: "Ocean",     value: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" },
  { label: "Forest",    value: "linear-gradient(135deg, #1a3a1a 0%, #2d5a27 50%, #1a4a2e 100%)" },
  { label: "Fire",      value: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { label: "Purple",    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "Gold",      value: "linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)" },
  { label: "Neon",      value: "linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)" },
  { label: "Dark",      value: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)" },
  { label: "Rose",      value: "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)" },
  { label: "Slate",     value: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)" },
  { label: "Aurora",    value: "linear-gradient(135deg, #00b4db 0%, #8e24aa 50%, #00b4db 100%)" },
];

export default function GradientsModal({ onClose }) {
  const [colorA, setColorA] = useState("#7c5cfc");
  const [colorB, setColorB] = useState("#00c9ff");
  const [angle, setAngle]   = useState(135);

  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addLayer    = useTimelineStore((s) => s.addLayer);

  const totalDuration = project?.format?.duration ?? 30;
  const start = currentTime;
  const end   = Math.min(start + totalDuration, totalDuration);

  const customGradient = `linear-gradient(${angle}deg, ${colorA} 0%, ${colorB} 100%)`;

  function applyGradient(gradient) {
    const id = crypto.randomUUID();
    addLayer({
      id, trackId: id,
      type: "gradient",
      name: "Gradient",
      visible: true, locked: false,
      start, end,
      zIndex: 1,
      gradient,
      objectFit: "cover",
      transform: {
        x: 0, y: 0,
        width: project?.format?.width  ?? 1080,
        height: project?.format?.height ?? 1920,
        rotation: 0, scale: 1, opacity: 1, blur: 0,
        borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
      },
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      animation:  { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } },
      transition: { type: "none", duration: 0.5 },
      sfx: null,
    });
    onClose();
  }

  return (
    <EditorModal title="Gradients" onClose={onClose} width={520}>
      {/* Presets grid */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#7070a0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Presets
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyGradient(p.value)}
            title={p.label}
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 9,
              cursor: "pointer",
              overflow: "hidden",
              padding: 0,
              display: "flex",
              flexDirection: "column",
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.6)"; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            <div style={{ height: 60, background: p.value, width: "100%" }} />
            <div style={{ padding: "5px 6px", background: "#1a1a28", fontSize: 11, color: "#a0a0c0", textAlign: "center" }}>
              {p.label}
            </div>
          </button>
        ))}
      </div>

      {/* Custom builder */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#7070a0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        Custom
      </div>

      <div
        style={{
          height: 64,
          borderRadius: 10,
          background: customGradient,
          marginBottom: 16,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <span style={{ fontSize: 11, color: "#7070a0" }}>Color A</span>
          <input
            type="color"
            value={colorA}
            onChange={(e) => setColorA(e.target.value)}
            style={{ width: "100%", height: 36, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, cursor: "pointer", padding: 2, background: "transparent" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <span style={{ fontSize: 11, color: "#7070a0" }}>Color B</span>
          <input
            type="color"
            value={colorB}
            onChange={(e) => setColorB(e.target.value)}
            style={{ width: "100%", height: 36, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, cursor: "pointer", padding: 2, background: "transparent" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <span style={{ fontSize: 11, color: "#7070a0" }}>Angle: {angle}°</span>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#7c5cfc" }}
          />
        </div>
      </div>

      <button
        onClick={() => applyGradient(customGradient)}
        style={{
          width: "100%",
          padding: "11px 0",
          background: "rgba(124,92,252,0.2)",
          border: "1px solid rgba(124,92,252,0.4)",
          borderRadius: 9,
          color: "#a68dff",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "rgba(124,92,252,0.3)"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "rgba(124,92,252,0.2)"; }}
      >
        Add Custom Gradient
      </button>
    </EditorModal>
  );
}
