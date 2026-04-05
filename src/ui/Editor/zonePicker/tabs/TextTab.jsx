/**
 * TextTab.jsx
 * src/ui/Editor/zonePicker/tabs/TextTab.jsx
 *
 * Shows text style presets as visual cards.
 * Clicking one creates a text zone with that preset applied.
 */
import React from "react";
import { textStylePresets } from "../../../../core/textStylePresets";

const BG_PREVIEWS = {
  hero:           "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)",
  headline:       "linear-gradient(135deg, #0a0a1a 0%, #0a1a2e 100%)",
  editorial:      "linear-gradient(160deg, #f5f0e8 0%, #e8e4db 100%)",
  caption:        "#0d0d18",
  pill:           "#0a0a12",
  neon:           "#050510",
  brutal:         "#ff2200",
  mono:           "#0a0f0a",
  "gradient-text":"#0a0a0a",
  subtitle:       "#0d0d18",
};

export default function TextTab({ onSelect }) {

  const handleSelect = (preset) => {
    onSelect({
      kind: "text",
      text: preset.preview?.text || "Your text here",
      style: preset.style,
    });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="text-[12px] text-[#55556a] mb-1">
        Pick a style — you can edit the text and tweak any setting after adding.
      </div>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto content-start">
        {textStylePresets.map(preset => {
          const bg       = BG_PREVIEWS[preset.id] || "#0d0d18";
          const st       = preset.style;
          const isLight  = preset.id === "editorial";
          const fontSize = Math.min(st.fontSize || 32, 52); // cap preview size

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

              {/* Label */}
              <div style={{
                padding:     "6px 10px",
                borderTop:   "1px solid rgba(255,255,255,0.05)",
                fontSize:    11,
                fontWeight:  600,
                color:       "rgba(148,148,168,0.7)",
                background:  "rgba(0,0,0,0.3)",
                display:     "flex",
                alignItems:  "center",
                justifyContent: "space-between",
              }}>
                <span>{preset.label}</span>
                <span style={{ fontSize: 9, color: "#55556a", fontFamily: "monospace" }}>
                  {st.fontSize}px · {st.fontWeight}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}