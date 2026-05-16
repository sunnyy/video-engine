import { useTimelineStore } from "../../../store/useTimelineStore";
import EditorModal from "./EditorModal";
import { makeLayerAt } from "./helpers";

const TEXT_PRESETS = [
  { name: "Big Title",  fontSize: 80, fontWeight: 800, color: "#ffffff", textAlign: "center" },
  { name: "Subtitle",   fontSize: 48, fontWeight: 600, color: "#e8e8f0", textAlign: "center" },
  { name: "Caption",    fontSize: 32, fontWeight: 400, color: "#ffffff", textAlign: "center" },
  { name: "Highlight",  fontSize: 56, fontWeight: 800, color: "#f5c518", textAlign: "center" },
  { name: "Minimal",    fontSize: 36, fontWeight: 300, color: "#ffffff", textAlign: "left"   },
];

export default function TextModal({ onClose }) {
  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addLayer    = useTimelineStore((s) => s.addLayer);

  const addText = (style = {}) => {
    const layer = makeLayerAt("text", project, currentTime, 5, { style });
    addLayer(layer);
    onClose();
  };

  return (
    <EditorModal title="Text" onClose={onClose} width={560}>
      <button
        onClick={() => addText()}
        style={{
          width: "100%", marginBottom: 16,
          background: "rgba(124,92,252,0.18)", border: "1px solid rgba(124,92,252,0.4)",
          borderRadius: 7, color: "#c8aaff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", padding: "10px 0",
        }}
      >
        + Add Plain Text
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TEXT_PRESETS.map((preset) => (
          <div
            key={preset.name}
            onClick={() => addText({ fontSize: preset.fontSize, fontWeight: preset.fontWeight, color: preset.color, textAlign: preset.textAlign })}
            style={{
              padding: "12px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8, cursor: "pointer", userSelect: "none",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.12)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            <div style={{ fontSize: 9, color: "#55557a", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {preset.name}
            </div>
            <div style={{ overflow: "hidden", height: 32, display: "flex", alignItems: "center" }}>
              <span style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: Math.round(preset.fontSize * 0.32),
                fontWeight: preset.fontWeight,
                color: preset.color,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}>
                Sample Text
              </span>
            </div>
          </div>
        ))}
      </div>
    </EditorModal>
  );
}
