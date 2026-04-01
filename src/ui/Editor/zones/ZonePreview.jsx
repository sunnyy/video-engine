/**
 * ZonePreview.jsx
 * src/ui/Editor/zones/ZonePreview.jsx
 *
 * 9:16 portrait thumbnail — same ratio as the video canvas.
 * Shows background behind content when mode="content".
 */
import React from "react";

export default function ZonePreview({ zone, mode = "content" }) {
  const content    = zone?.content    || {};
  const background = zone?.background || {};
  const radius = zone?.style?.borderRadius ?? 0;
  const shadow = zone?.style?.shadowBlur   ?? 0;
  const scale  = zone?.style?.scale        ?? 1;

  /* ── Background layer ── */
  const renderBackground = () => {
    if (!background?.kind) return null;

    if (background.kind === "color") {
      return (
        <div
          className="absolute inset-0"
          style={{ background: background.color, backgroundSize: "auto" }}
        />
      );
    }

    if (background.kind === "asset") {
      const asset = background.asset || {};
      const opacity = asset.opacity ?? 1;
      const blur    = asset.blur    ?? 0;

      if (asset.type === "image") {
        return (
          <img
            src={asset.src}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity, filter: blur > 0 ? `blur(${blur * 0.4}px)` : "none" }}
          />
        );
      }
      if (asset.type === "video") {
        return (
          <video
            src={asset.src}
            muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity, filter: blur > 0 ? `blur(${blur * 0.4}px)` : "none" }}
          />
        );
      }
    }
    return null;
  };

  /* ── Content layer ── */
  const renderContent = () => {
    if (!content?.kind) return null;

    // Scale: asset shrinks from center, background shows around it
    const scaleOffset = scale < 1 ? `${((1 - scale) / 2) * 100}%` : "0%";
    const wrapStyle = {
      position:     "absolute",
      top:          scaleOffset,
      right:        scaleOffset,
      bottom:       scaleOffset,
      left:         scaleOffset,
      overflow:     "hidden",
      borderRadius: radius > 0 ? Math.round(radius * scale * 0.25) : 0,
      boxShadow:    shadow > 0 ? `0 ${shadow * 0.15}px ${shadow * 0.35}px rgba(0,0,0,0.6)` : "none",
    };

    if (content.kind === "color") {
      return <div style={{ ...wrapStyle, background: content.color }} />;
    }

    if (content.kind === "asset") {
      const asset = content.asset || {};
      const fit   = asset.objectFit || "cover";

      if (asset.type === "image") {
        return (
          <div style={wrapStyle}>
            <img src={asset.src} className="w-full h-full" style={{ objectFit: fit }} />
          </div>
        );
      }
      if (asset.type === "video") {
        return (
          <div style={wrapStyle}>
            <video src={asset.src} muted playsInline className="w-full h-full" style={{ objectFit: fit }} />
          </div>
        );
      }
    }

    if (content.kind === "block") {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
          style={{ background: "linear-gradient(160deg, #1a0b2e 0%, #0f0720 60%, #1c1c28 100%)" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(124,92,252,0.2)",
            border: "1px solid rgba(124,92,252,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>⬡</div>
          <span className="text-[9px] font-bold text-[#a78fff] text-center px-1 leading-tight">
            {content.block?.type || "Block"}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    /* 9:16 ratio — width is whatever the container gives, height = width * (16/9) */
    <div className="relative w-full overflow-hidden rounded-[6px] bg-[#111118]"
      style={{ paddingTop: "120%" /* 16/9 = 1.7778 */ }}
    >
      <div className="absolute inset-0">
        {renderBackground()}
        {mode === "content" && renderContent()}
        {mode === "background" && renderBackground()}

        {/* Empty state */}
        {mode === "content" && !content.kind && !background.kind && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-[#55556a]">Empty</span>
          </div>
        )}
        {mode === "background" && !background.kind && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-[#55556a]">No bg</span>
          </div>
        )}
      </div>
    </div>
  );
}