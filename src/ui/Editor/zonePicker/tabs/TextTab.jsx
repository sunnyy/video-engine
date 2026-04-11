/**
 * TextTab.jsx
 * src/ui/Editor/zonePicker/tabs/TextTab.jsx
 *
 * Shows text style presets as visual cards.
 * Clicking one creates a text zone with that preset applied.
 */
import React from "react";
import { textStylePresets } from "../../../../core/registries/textStylePresets";

const ENERGY_COLOR = {
  explosive: "#f87171",
  high:      "#fb923c",
  medium:    "#a78bfa",
  calm:      "#34d399",
  low:       "#60a5fa",
};

export default function TextTab({ onSelect }) {

  const handleSelect = (preset) => {
    // Apply only visual flair — fontSize/fontWeight/textAlign/opacity come from the layout or user intent
    const { fontSize, fontWeight, textAlign, opacity, ...flair } = preset.style;
    onSelect({
      kind: "text",
      text: preset.preview?.text || "Your text here",
      style: flair,
    });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="text-[12px] text-[#55556a] mb-1">
        Pick a style — you can edit the text and tweak any setting after adding.
      </div>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto content-start">
        {textStylePresets.map(preset => {
          const bg       = preset.preview?.bg || "#0d0d18";
          const st       = preset.style;
          const isLight  = preset.id === "editorial";
          const fontSize = Math.min(st.fontSize || 32, 52); // cap preview size
          const energyColor = ENERGY_COLOR[preset.energy] || "#55556a";

          return (
            <div
              key={preset.id}
              onClick={() => handleSelect(preset)}
              className="cursor-pointer rounded-[12px] overflow-hidden border border-[rgba(255,255,255,0.07)] hover:border-[#7c5cfc] transition-all group"
              style={{ background: bg }}
            >
              {/* Preview */}
              <div className="h-[100px] flex items-center justify-center px-4 overflow-hidden">
                <span style={{
                  fontSize:      Math.max(14, fontSize * 0.55),
                  fontWeight:    st.fontWeight || 700,
                  fontFamily:    st.fontFamily || "inherit",
                  color:         st.color || (isLight ? "#1a1a1a" : "#ffffff"),
                  textAlign:     st.textAlign || "center",
                  textShadow:    st.textShadow || "none",
                  letterSpacing: st.letterSpacing || "normal",
                  lineHeight:    st.lineHeight || 1.1,
                  background:    st.background || "transparent",
                  borderRadius:  st.borderRadius
                    ? Math.round(st.borderRadius * 0.5) : 0,
                  padding:       st.background && st.background !== "transparent"
                    ? "4px 10px" : 0,
                  display:       "block",
                  maxWidth:      "100%",
                  overflow:      "hidden",
                  whiteSpace:    "nowrap",
                  textOverflow:  "ellipsis",
                }}>
                  {preset.preview?.text || "Sample Text"}
                </span>
              </div>

              {/* Label + metadata */}
              <div style={{
                padding:     "5px 8px",
                borderTop:   "1px solid rgba(255,255,255,0.05)",
                background:  "rgba(0,0,0,0.35)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(148,148,168,0.85)" }}>{preset.label}</span>
                  {preset.energy && (
                    <span style={{ fontSize: 8, fontFamily: "monospace", color: energyColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {preset.energy}
                    </span>
                  )}
                </div>
                {preset.roles?.length > 0 && (
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {preset.roles.slice(0, 3).map(r => (
                      <span key={r} style={{
                        fontSize: 8, fontFamily: "monospace", color: "#55556a",
                        background: "rgba(255,255,255,0.05)", borderRadius: 3,
                        padding: "1px 4px",
                      }}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}