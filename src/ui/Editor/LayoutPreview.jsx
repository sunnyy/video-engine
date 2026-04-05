/**
 * LayoutPreview.jsx
 * src/ui/Editor/LayoutPreview.jsx
 *
 * Renders a 9:16 thumbnail from layoutDefinitions zone structure.
 * Image zones → gradient blocks. Text zones → label bars.
 * Accurate positions matching real layout percentages.
 */
import React from "react";
import { getLayoutDef } from "../../core/layoutRegistry";

// Visual palette for asset zones — cycles through
const ASSET_GRADIENTS = [
  "linear-gradient(135deg, #2a2a45 0%, #1a1a32 100%)",
  "linear-gradient(135deg, #1e2a3a 0%, #0f1a28 100%)",
  "linear-gradient(135deg, #2a1e3a 0%, #1a0f28 100%)",
  "linear-gradient(135deg, #1a2a2a 0%, #0f1e1e 100%)",
];

const TEXT_COLOR   = "rgba(255,255,255,0.85)";
const TEXT_BG      = "rgba(255,255,255,0.10)";
const TEXT_BG_DARK = "rgba(0,0,0,0.35)";

function ZoneBlock({ zone, index, totalAssets }) {
  const isAsset = zone.type === "asset";
  const isText  = zone.type === "text";

  const style = {
    position:     "absolute",
    left:         `${zone.x}%`,
    top:          `${zone.y}%`,
    width:        `${zone.width}%`,
    height:       `${zone.height}%`,
    zIndex:       zone.zIndex ?? 1,
    borderRadius: (zone.style?.borderRadius ?? 0) * 0.3, // scale down for preview
    overflow:     "hidden",
    boxSizing:    "border-box",
  };

  if (isAsset) {
    const gradient = ASSET_GRADIENTS[index % ASSET_GRADIENTS.length];
    // Small image icon in center
    return (
      <div style={{ ...style, background: gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="30%" height="30%" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
          <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
          <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  if (isText) {
    const fs = zone.style?.fontSize ?? 32;
    // Scale font size to preview — preview is ~90px wide typically
    const previewScale = 0.12;
    const scaledFs     = Math.max(4, Math.round(fs * previewScale));
    const isBig        = fs >= 60;
    const isMedium     = fs >= 36 && fs < 60;

    return (
      <div style={{
        ...style,
        display:        "flex",
        alignItems:     "center",
        justifyContent: zone.style?.textAlign === "left" ? "flex-start" : zone.style?.textAlign === "right" ? "flex-end" : "center",
        padding:        "0 6%",
        boxSizing:      "border-box",
        background:     zone.style?.background && zone.style.background !== "transparent"
          ? "rgba(255,255,255,0.08)"
          : "transparent",
      }}>
        {isBig ? (
          // Big text — show as bold lines
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12%" }}>
            <div style={{ height: Math.max(3, scaledFs * 0.9), background: TEXT_COLOR, borderRadius: 1, opacity: 0.9 }} />
            <div style={{ height: Math.max(3, scaledFs * 0.9), background: TEXT_COLOR, borderRadius: 1, opacity: 0.7, width: "75%" }} />
          </div>
        ) : isMedium ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10%" }}>
            <div style={{ height: Math.max(2, scaledFs * 0.8), background: TEXT_COLOR, borderRadius: 1, opacity: 0.9 }} />
            <div style={{ height: Math.max(2, scaledFs * 0.8), background: TEXT_COLOR, borderRadius: 1, opacity: 0.6, width: "60%" }} />
          </div>
        ) : (
          // Small text — single line
          <div style={{ width: "85%", height: Math.max(1.5, scaledFs * 0.7), background: TEXT_COLOR, borderRadius: 1, opacity: 0.7 }} />
        )}
      </div>
    );
  }

  return null;
}

export default function LayoutPreview({ layout, isActive = false }) {
  const def = getLayoutDef(layout);

  const renderZones = () => {
    if (!def?.zones?.length) {
      return <div style={{ width:"100%", height:"100%", background:"#1a1a2e" }} />;
    }

    // Sort by zIndex for render order
    const sorted = [...def.zones].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
    let assetIdx = 0;

    return (
      <div style={{ position:"relative", width:"100%", height:"100%", background:"#0d0d1a" }}>
        {sorted.map((zone) => {
          const idx = zone.type === "asset" ? assetIdx++ : 0;
          return <ZoneBlock key={zone.id} zone={zone} index={idx} />;
        })}
      </div>
    );
  };

  return (
    <div style={{
      width:        "100%",
      paddingTop:   "177.78%",
      position:     "relative",
      borderRadius: 6,
      overflow:     "hidden",
      background:   "#0b0b10",
      border:       isActive
        ? "1.5px solid #7c5cfc"
        : "1px solid rgba(255,255,255,0.07)",
      boxShadow:    isActive ? "0 0 0 2px rgba(124,92,252,0.25)" : "none",
      transition:   "border-color 0.15s, box-shadow 0.15s",
      cursor:       "pointer",
    }}>
      <div style={{ position:"absolute", inset:0 }}>
        {renderZones()}
      </div>

      {/* Active indicator dot */}
      {isActive && (
        <div style={{
          position:     "absolute",
          top:          4,
          right:        4,
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   "#7c5cfc",
        }} />
      )}
    </div>
  );
}