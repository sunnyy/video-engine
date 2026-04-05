/**
 * ZoneCanvas.jsx
 * src/ui/Editor/canvas/ZoneCanvas.jsx
 */
import React, { memo, useCallback, useRef } from "react";
import { useProjectStore } from "../../../src/store/useProjectStore";
import { getLayoutDef } from "../../../src/core/layoutRegistry";
import ZoneHandle from "./ZoneHandle";

const ZoneContentLayer = memo(({ zone, canvasScale }) => {
  const content  = zone.content || {};
  const st       = zone.style   || {};
  
  const rotation = st.rotation ?? 0;
  const scale_   = st.scale ?? 1;
  const insetPct = scale_ < 1 ? `${((1 - scale_) / 2) * 100}%` : "0%";
  const rotStyle = rotation ? { transform: `rotate(${rotation}deg)`, transformOrigin: "center center" } : {};

  if (zone.type === "text" && content.text) {
    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center",
        justifyContent: st.textAlign === "left" ? "flex-start" : st.textAlign === "right" ? "flex-end" : "center",
        padding: "0 4px", boxSizing: "border-box",
        fontSize:   Math.max(6, (st.fontSize || 32) * canvasScale),
        fontWeight: st.fontWeight || 700,
        fontFamily: st.fontFamily || "inherit",
        color:      st.color      || "#ffffff",
        textAlign:  st.textAlign  || "center",
        opacity:    st.opacity ?? 1,
        background: st.background || "transparent",
        lineHeight: 1.2,
        pointerEvents: "none", userSelect: "none", overflow: "hidden",
        ...rotStyle,
      }}>
        {content.text}
      </div>
    );
  }

  if (zone.type === "asset" && content.asset?.src) {
    const asset     = content.asset;
    const objectFit = asset.objectFit || st.objectFit || "cover";
    const wrapperStyle = {
      position: "absolute",
      top: insetPct, right: insetPct, bottom: insetPct, left: insetPct,
      overflow: "hidden",
      borderRadius: st.borderRadius || 0,
      
      ...rotStyle,
    };
    const mediaStyle = { width: "100%", height: "100%", objectFit, display: "block" };
    if (asset.type === "video") {
      return <div style={wrapperStyle}><video src={asset.src} muted loop autoPlay playsInline style={mediaStyle} /></div>;
    }
    return <div style={wrapperStyle}><img src={asset.src} style={mediaStyle} /></div>;
  }

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: zone.type === "text" ? "rgba(124,92,252,0.05)" : "rgba(255,255,255,0.02)",
      pointerEvents: "none",
    }}>
      <span style={{ fontSize: Math.max(8, 11 * canvasScale), color: "rgba(255,255,255,0.12)", fontFamily: "'JetBrains Mono', monospace" }}>
        {zone.type === "text" ? "T" : "⬡"}
      </span>
    </div>
  );
}, (prev, next) =>
  JSON.stringify(prev.zone.content) === JSON.stringify(next.zone.content) &&
  JSON.stringify(prev.zone.style)   === JSON.stringify(next.zone.style)   &&
  prev.zone.start  === next.zone.start &&
  prev.canvasScale === next.canvasScale
);

export default function ZoneCanvas({
  beat, selectedZoneIds, onSelectZone,
  canvasW, canvasH, canvasScale,
}) {
  const updateBeatSilent = useProjectStore((s) => s.updateBeatSilent);
  const _pushHistory     = useProjectStore((s) => s._pushHistory);
  const layoutDef        = getLayoutDef(beat?.layout);
  const beatZones        = beat?.zones || {};

  const selectedZoneId = selectedZoneIds instanceof Set
    ? (selectedZoneIds.size === 1 ? [...selectedZoneIds][0] : null)
    : selectedZoneIds;

  const beatZonesRef   = useRef(beatZones);
  const beatIdRef      = useRef(beat?.id);
  beatZonesRef.current = beatZones;
  beatIdRef.current    = beat?.id;

  const defZoneIds = new Set((layoutDef?.zones || []).map(z => z.id));

  const defZones = (layoutDef?.zones || []).map(d => {
    const o = beatZones[d.id] || {};
    return {
      ...d,
      x: o.x ?? d.x, y: o.y ?? d.y,
      width: o.width ?? d.width, height: o.height ?? d.height,
      zIndex: o.zIndex ?? d.zIndex, start: o.start ?? d.start ?? 0,
      content: o.content || {}, style: { ...d.style, ...(o.style || {}) }, background: o.background || {},
    };
  });

  const extraZones = Object.entries(beatZones)
    .filter(([id]) => !defZoneIds.has(id))
    .map(([id, z]) => ({
      id, type: z.type || "asset",
      x: z.x ?? 0, y: z.y ?? 0, width: z.width ?? 50, height: z.height ?? 20,
      zIndex: z.zIndex ?? 10, start: z.start ?? 0,
      content: z.content || {}, style: z.style || {}, background: z.background || {},
    }));

  const allZones = [...defZones, ...extraZones];

  const handleUpdate = useCallback((zoneId, updates) => {
    const bz = beatZonesRef.current;
    updateBeatSilent(beatIdRef.current, { zones: { ...bz, [zoneId]: { ...(bz[zoneId] || {}), ...updates } } });
  }, [updateBeatSilent]);

  const handleUpdateMulti = useCallback((patchMap) => {
    const bz = beatZonesRef.current;
    const newZones = { ...bz };
    for (const [id, patch] of Object.entries(patchMap)) {
      newZones[id] = { ...(bz[id] || {}), ...patch };
    }
    updateBeatSilent(beatIdRef.current, { zones: newZones });
  }, [updateBeatSilent]);

  const handlePushHistory = useCallback(() => _pushHistory(), [_pushHistory]);

  const handleSave = useCallback(async () => {
    const { updateProject } = await import("../../../src/services/projects/projectService");
    const proj = useProjectStore.getState().project;
    const dbId = useProjectStore.getState().databaseId;
    if (proj && dbId) updateProject(dbId, proj);
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (e.target === e.currentTarget) onSelectZone(null);
  }, [onSelectZone]);

  const bg = beat?.layoutBackground;
  const renderBg = () => {
    if (!bg) return <div style={{ position:"absolute", inset:0, background:"#0b0b10" }} />;
    if (bg.type === "color") return <div style={{ position:"absolute", inset:0, background: bg.value }} />;
    if (bg.type === "image") return <img src={bg.value} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />;
    if (bg.type === "video") return <video src={bg.value} muted loop autoPlay style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />;
    return <div style={{ position:"absolute", inset:0, background:"#0b0b10" }} />;
  };

  return (
    <div data-canvas onClick={handleCanvasClick}
      style={{
        position: "relative",
        width:    canvasW,
        height:   canvasH,
        overflow: "hidden",
        borderRadius: 8,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        flexShrink: 0,
        cursor: "default",
      }}
    >
      {renderBg()}
      {allZones.map(zone => {
        const content = zone.content || {};
        const isEmpty = (zone.type === "asset" && !content.asset?.src && content.kind !== "avatar")
                     || (zone.type === "text"  && !content.text);
        return (
          <div key={`content_${zone.id}`} style={{
            position: "absolute", left: `${zone.x}%`, top: `${zone.y}%`,
            width: `${zone.width}%`, height: `${zone.height}%`,
            zIndex: zone.zIndex ?? 1, overflow: "hidden",
            borderRadius: zone.style?.borderRadius || 0,
          }}>
            {zone.background?.kind === "color" && (
              <div style={{ position:"absolute", inset:0, background: zone.background.color }} />
            )}
            <ZoneContentLayer zone={zone} canvasScale={canvasScale} />
            {/* Zone border — rendered as inset div so overflow:hidden doesn't clip it */}
            {isEmpty && (
              <div style={{
                position: "absolute", inset: 0,
                border: "1.5px dashed rgba(255,255,255,0.35)",
                borderRadius: zone.style?.borderRadius || 0,
                pointerEvents: "none",
                zIndex: 99,
              }} />
            )}
          </div>
        );
      })}
      {allZones.map(zone => (
        <ZoneHandle key={`handle_${zone.id}`} zone={zone}
          isSelected={selectedZoneIds instanceof Set
            ? selectedZoneIds.has(zone.id)
            : selectedZoneId === zone.id}
          canvasWidth={canvasW} canvasHeight={canvasH}
          onSelect={onSelectZone}
          onUpdate={handleUpdate}
          onUpdateMulti={handleUpdateMulti}
          onPushHistory={handlePushHistory}
          onSave={handleSave}
          selectedZoneIds={selectedZoneIds instanceof Set ? selectedZoneIds : null}
          allZones={allZones}
        />
      ))}
      {allZones.filter(z => (z.start || 0) > 0).map(zone => (
        <div key={`delay_${zone.id}`} style={{
          position: "absolute", left: `${zone.x}%`, top: `${zone.y}%`,
          fontSize: 8, color: "rgba(255,200,0,0.7)", background: "rgba(0,0,0,0.5)",
          padding: "1px 3px", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace",
          pointerEvents: "none", zIndex: 999, lineHeight: "12px",
        }}>+{zone.start}s</div>
      ))}

      {/* Caption preview — static render when caption is on */}
      {beat?.caption?.show && beat?.caption?.text && (() => {
        const cap      = beat.caption;
        const words    = cap.text.trim().split(/\s+/).filter(Boolean).slice(0, 6);
        const pos      = cap.position || "bottom";
        const fs       = Math.max(12, Math.round(72 * canvasScale));
        const posStyle = pos === "top"
          ? { top: "10%"  }
          : pos === "middle"
          ? { top: "50%", transform: "translateX(-50%) translateY(-50%)" }
          : { bottom: "12%" };

        return (
          <div style={{
            position: "absolute",
            left: "50%",
            transform: pos === "middle" ? "translateX(-50%) translateY(-50%)" : "translateX(-50%)",
            width: "88%",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 200,
            lineHeight: 1.1,
            ...posStyle,
          }}>
            {words.map((word, i) => (
              <span key={i} style={{
                display:       "inline-block",
                margin:        `0 ${Math.max(2, 4 * canvasScale)}px`,
                fontFamily:    "Impact, 'Arial Black', sans-serif",
                fontSize:      fs,
                fontWeight:    900,
                color:         i === 0 ? "#7c5cfc" : "#ffffff",
                textShadow:    `0 0 ${Math.round(12 * canvasScale)}px rgba(0,0,0,1), 0 0 ${Math.round(4 * canvasScale)}px rgba(0,0,0,1)`,
                WebkitTextStroke: `${Math.max(1, Math.round(2 * canvasScale))}px rgba(0,0,0,0.8)`,
              }}>
                {word}
              </span>
            ))}
          </div>
        );
      })()}

      {/* CC badge */}
      {beat?.caption && (
        <div style={{
          position: "absolute", bottom: 4, right: 6,
          fontSize: Math.max(6, 8 * canvasScale),
          fontFamily: "monospace",
          color: beat.caption.show ? "rgba(124,92,252,1)" : "rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.7)",
          padding: "1px 4px", borderRadius: 3,
          pointerEvents: "none", zIndex: 999,
        }}>
          {beat.caption.show ? "CC" : "CC off"}
        </div>
      )}
    </div>
  );
}