/**
 * ZoneCanvas.jsx
 * src/ui/Editor/canvas/ZoneCanvas.jsx
 */
import { memo, useCallback, useRef } from "react";
import { useProjectStore } from "../../../src/store/useProjectStore";
import { getLayoutDef } from "../../../src/core/layoutRegistry";
import { elementsRegistry } from "../../../src/core/elementsRegistry";
import CompositionLayerRenderer from "../../../src/remotion/elements/composition/CompositionLayerRenderer";
import ZoneHandle from "./ZoneHandle";

// ZoneContentLayer only renders empty-zone indicators.
// Actual content (text, images, blocks) is rendered by the Thumbnail behind ZoneCanvas.
const ZoneContentLayer = memo(({ zone }) => {
  const content  = zone.content || {};

  const isEmpty = (zone.type === "asset" && !content.asset?.src && content.kind !== "avatar" && content.kind !== "block")
               || (zone.type === "text"  && !content.text && content.kind !== "block");

  if (!isEmpty) return null;

  const hint     = zone.asset_hint;
  const keywords = hint?.keywords?.length ? hint.keywords : null;

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-[5%] box-border gap-2 ${zone.type === "text" ? "bg-[rgba(124,92,252,0.05)]" : "bg-[rgba(255,255,255,0.02)]"}`}>
      {zone.type === "asset" && keywords ? (
        <>
          <div className="text-[11px] font-mono text-white/50 mb-0.5 tracking-[0.08em]">
            Add Image/Video Related to:
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {keywords.map((kw, i) => (
              <span
                key={i}
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(kw); }}
                className="text-[13px] font-mono text-white bg-white/10 border border-white/20 rounded px-2 py-0.5 whitespace-nowrap cursor-copy pointer-events-auto hover:bg-white/20 transition-colors"
              >
                {kw}
              </span>
            ))}
          </div>
        </>
      ) : (
        <span className="text-[11px] font-mono text-white/20">
          {zone.type === "text" ? "T" : "⬡"}
        </span>
      )}
    </div>
  );
}, (prev, next) =>
  JSON.stringify(prev.zone.content)    === JSON.stringify(next.zone.content)    &&
  JSON.stringify(prev.zone.asset_hint) === JSON.stringify(next.zone.asset_hint)
);

export default function ZoneCanvas({
  beat, selectedZoneIds, onSelectZone,
  canvasW, canvasH, canvasScale,
  videoOverlays, onUpdateVideoOverlay,
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

  const defZones = (layoutDef?.zones || []).flatMap(d => {
    const o = beatZones[d.id] || {};
    if (o.hidden) return [];
    return [{
      ...d,
      x: o.x ?? d.x, y: o.y ?? d.y,
      width: o.width ?? d.width, height: o.height ?? d.height,
      zIndex: o.zIndex ?? d.zIndex, start: o.start ?? d.start ?? 0,
      content: o.content || {}, style: { ...d.style, ...(o.style || {}) }, background: o.background || {},
    }];
  });

  const extraZones = Object.entries(beatZones)
    .filter(([id]) => !defZoneIds.has(id))
    .map(([id, z]) => ({
      id, type: z.type || "asset",
      x: z.x ?? 0, y: z.y ?? 0, width: z.width ?? 50, height: z.height ?? 20,
      zIndex: z.zIndex ?? 10, start: z.start ?? 0,
      content: z.content || {}, style: z.style || {}, background: z.background || {},
    }));

  const voZones = (videoOverlays || [])
    .filter(ov => ov.type === "ImageOverlay" || ov.type === "VideoOverlay")
    .map(ov => ({
      id:      `_vo_${ov.id}`,
      _voId:   ov.id,
      type:    "asset",
      x:       ov.x      ?? 10,
      y:       ov.y      ?? 20,
      width:   ov.width  ?? 80,
      height:  ov.height ?? 50,
      zIndex:  ov.zIndex ?? 20,
      start:   0,
      content: { kind: "asset", asset: { src: ov.src, type: ov.type === "VideoOverlay" ? "video" : "image" } },
      style:   { objectFit: ov.objectFit || "contain" },
      background: {},
      _isVideoOverlay: true,
    }));

  const allZones = [...defZones, ...extraZones, ...voZones];

  // Attach beat's asset_hint to the first empty asset zone
  const beatAssetHint = beat?.asset_hint || null;
  if (beatAssetHint) {
    let attached = false;
    allZones.forEach(z => {
      if (!attached && z.type === "asset" && !z.content?.asset?.src && !z._isVideoOverlay) {
        z.asset_hint = beatAssetHint;
        attached = true;
      }
    });
  }

  const handleUpdate = useCallback((zoneId, updates) => {
    if (zoneId.startsWith("_vo_") && onUpdateVideoOverlay) {
      onUpdateVideoOverlay(zoneId.slice(4), updates);
      return;
    }
    const bz = beatZonesRef.current;
    updateBeatSilent(beatIdRef.current, { zones: { ...bz, [zoneId]: { ...(bz[zoneId] || {}), ...updates } } });
  }, [updateBeatSilent, onUpdateVideoOverlay]);

  const handleUpdateMulti = useCallback((patchMap) => {
    const bz = beatZonesRef.current;
    const newZones = { ...bz };
    for (const [id, patch] of Object.entries(patchMap)) {
      if (id.startsWith("_vo_") && onUpdateVideoOverlay) {
        onUpdateVideoOverlay(id.slice(4), patch);
      } else {
        newZones[id] = { ...(bz[id] || {}), ...patch };
      }
    }
    updateBeatSilent(beatIdRef.current, { zones: newZones });
  }, [updateBeatSilent, onUpdateVideoOverlay]);

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

  return (
    <div
      data-canvas
      onClick={handleCanvasClick}
      className="relative overflow-hidden rounded-[8px] shrink-0 cursor-default select-none"
      style={{
        width: canvasW, height: canvasH,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}
    >
      {/* Composition background + overlay layers (beneath zone content) */}
      <CompositionLayerRenderer beat={beat} layerFilter={[0, 1, 3]} />

      {/* layoutPadding inset — mirrors LayoutRenderer behaviour */}
      <div style={{ position: "absolute", inset: (beat?.layoutPadding || 0) * canvasScale, overflow: "hidden" }}>
        {allZones.map(zone => {
          if (zone.type === "element") {
            const entry = elementsRegistry[zone.content?.elementId];
            if (!entry) return null;
            const props = { ...entry.defaultProps, ...(zone.content?.props || {}) };
            return (
              <div key={`content_${zone.id}`} className="absolute" style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%`, zIndex: zone.zIndex ?? 5, pointerEvents: "none" }}>
                {entry.render(props)}
              </div>
            );
          }
          const content = zone.content || {};
          const isText  = zone.type === "text";
          const isEmpty = (zone.type === "asset" && !content.asset?.src && content.kind !== "avatar" && content.kind !== "block")
                       || (isText && !content.text && content.kind !== "block");
          return (
            <div key={`content_${zone.id}`} className="absolute"
              style={{
                left:          `${zone.x}%`,
                top:           `${zone.y}%`,
                width:         `${zone.width}%`,
                height:        `${zone.height}%`,
                zIndex:        zone.zIndex ?? 1,
                borderRadius:  zone.style?.borderRadius || 0,
                overflow:      isText ? "visible" : "hidden",
                opacity:       zone.style?.opacity ?? 1,
                display:       isText ? "flex"   : undefined,
                alignItems:    isText ? "center" : undefined,
                flexDirection: isText ? "column" : undefined,
              }}>
              <ZoneContentLayer zone={zone} />
              {isEmpty && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ border: "1.5px dashed rgba(255,255,255,0.35)", borderRadius: zone.style?.borderRadius || 0, zIndex: 99 }}
                />
              )}
            </div>
          );
        })}

        {/* Composition frame + decorative layers */}
        <CompositionLayerRenderer beat={beat} layerFilter={[2, 4]} />

        {allZones
          .filter(zone => zone.type !== "element" && zone.id !== "_bg_img")
          .map(zone => (
            <ZoneHandle key={`handle_${zone.id}`} zone={zone}
              isSelected={selectedZoneIds instanceof Set ? selectedZoneIds.has(zone.id) : selectedZoneId === zone.id}
              canvasWidth={canvasW - (beat?.layoutPadding || 0) * canvasScale * 2}
              canvasHeight={canvasH - (beat?.layoutPadding || 0) * canvasScale * 2}
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
          <div key={`delay_${zone.id}`}
            className="absolute text-[8px] font-mono text-[rgba(255,200,0,0.7)] bg-black/50 px-[3px] py-[1px] rounded-[3px] pointer-events-none leading-[12px]"
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, zIndex: 999 }}
          >
            +{zone.start}s
          </div>
        ))}
      </div>{/* end layoutPadding inset */}

      {beat?.caption && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono bg-black/60 px-[6px] py-[2px] rounded-[3px] pointer-events-none whitespace-nowrap"
          style={{
            fontSize: Math.max(7, 9 * canvasScale),
            color: beat.caption.show ? "rgba(124,92,252,0.9)" : "rgba(255,255,255,0.2)",
            zIndex: 998,
          }}
        >
          {beat.caption.show ? `CC · ${beat.caption.style}` : "CC off"}
        </div>
      )}
    </div>
  );
}
