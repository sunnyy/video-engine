/**
 * ZonePreview.jsx
 * src/ui/Editor/zones/ZonePreview.jsx
 */
import React from "react";

export default function ZonePreview({ zone, mode = "content", zoneType }) {
  const content    = zone?.content    || {};
  const background = zone?.background || {};
  const style      = zone?.style      || {};
  const radius     = style.borderRadius ?? 0;
  const shadow     = style.shadowBlur   ?? 0;
  const scale      = style.scale        ?? 1;

  const renderBackground = () => {
    if (!background?.kind) return null;
    if (background.kind === "color") return <div className="absolute inset-0" style={{ background: background.color }} />;
    if (background.kind === "asset") {
      const asset = background.asset || {};
      if (asset.type === "image") return <img src={asset.src} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: asset.opacity ?? 1 }} />;
      if (asset.type === "video") return <video src={asset.src} muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />;
    }
    return null;
  };

  const renderContent = () => {
    if (!content?.kind) return null;

    if (zoneType === "text" || content.kind === "text") {
      return (
        <div className="absolute inset-0 flex items-center justify-center p-2"
          style={{ background: style.background || "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
          <p style={{
            fontSize:   Math.min((style.fontSize || 32) * 0.17, 11),
            fontWeight: style.fontWeight || 700,
            fontFamily: style.fontFamily || "inherit",
            color:      style.color      || "#ffffff",
            textAlign:  style.textAlign  || "center",
            lineHeight: 1.2,
            opacity:    style.opacity    ?? 1,
            wordBreak:  "break-word",
            display:    "-webkit-box",
            WebkitLineClamp:   4,
            WebkitBoxOrient:   "vertical",
            overflow:   "hidden",
          }}>
            {content.text || "Text zone"}
          </p>
        </div>
      );
    }

    const scaleOffset = scale < 1 ? `${((1-scale)/2)*100}%` : "0%";
    const wrapStyle = {
      position: "absolute", top: scaleOffset, right: scaleOffset, bottom: scaleOffset, left: scaleOffset,
      overflow: "hidden",
      borderRadius: radius > 0 ? Math.round(radius * scale * 0.25) : 0,
      boxShadow:    shadow > 0 ? `0 ${shadow*0.15}px ${shadow*0.35}px rgba(0,0,0,0.6)` : "none",
    };

    if (content.kind === "color") return <div style={{ ...wrapStyle, background: content.color }} />;
    if (content.kind === "asset") {
      const asset = content.asset || {};
      const fit   = asset.objectFit || "cover";
      if (asset.type === "image") return <div style={wrapStyle}><img src={asset.src} className="w-full h-full" style={{ objectFit: fit }} /></div>;
      if (asset.type === "video") return <div style={wrapStyle}><video src={asset.src} muted playsInline className="w-full h-full" style={{ objectFit: fit }} /></div>;
    }
    if (content.kind === "block") {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
          style={{ background: "linear-gradient(160deg,#1a0b2e,#0f0720,#1c1c28)" }}>
          <div style={{ width:24, height:24, borderRadius:"50%", background:"rgba(124,92,252,0.2)", border:"1px solid rgba(124,92,252,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>⬡</div>
          <span className="text-[8px] font-bold text-[#a78fff] text-center px-1">{content.block?.type || "Block"}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[5px] bg-[#111118]" style={{ paddingTop:"120%" }}>
      <div className="absolute inset-0">
        {renderBackground()}
        {mode === "content"    && renderContent()}
        {mode === "background" && renderBackground()}
        {mode === "content"    && !content.kind && !background.kind && <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] text-[#55556a]">Empty</span></div>}
        {mode === "background" && !background.kind && <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] text-[#55556a]">No bg</span></div>}
      </div>
    </div>
  );
}