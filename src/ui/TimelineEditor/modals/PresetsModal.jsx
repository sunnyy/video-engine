import EditorModal from "./EditorModal";
import { backgroundPatternRegistry, backgroundCategories } from "../../../core/registries/backgroundPatternRegistry";

export default function PresetsModal({ onClose, onSelect, categories = ["bright", "light", "dark", "gradient", "neon", "pattern"] }) {

  return (
    <EditorModal title="Presets" onClose={onClose} width={560}>
      {categories.map((cat) => {
        const keys = backgroundCategories[cat] ?? [];
        if (!keys.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7070a0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              {cat}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {keys.map((key) => {
                const entry = backgroundPatternRegistry[key];
                if (!entry) return null;
                return (
                  <div
                    key={key}
                    title={key}
                    onClick={() => { onSelect(key, entry); onClose(); }}
                    style={{
                      width: 48, height: 48, borderRadius: 8, cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.15)",
                      flexShrink: 0,
                      transition: "transform 0.1s, box-shadow 0.1s",
                      ...entry.style,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "scale(1.12)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.55)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "";
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </EditorModal>
  );
}
