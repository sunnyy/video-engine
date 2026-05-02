/**
 * ZoneCanvas.jsx
 * src/ui/Editor/canvas/ZoneCanvas.jsx
 */
import { memo, useCallback, useRef, useEffect, useState } from "react";
import { useProjectStore } from "../../../src/store/useProjectStore";
import { getLayoutDef } from "../../../src/core/registries/layoutRegistry";
import { elementsRegistry } from "../../../src/core/elementsRegistry";
import { getClipPathCSS } from "../../../src/core/registries/decorativeShapeRegistry.js";
import CompositionLayerRenderer from "../../../src/remotion/elements/composition/CompositionLayerRenderer";
import ZoneHandle from "./ZoneHandle";
import { getTypographyForRole } from "../../../src/core/videoDNA.js";

/**
 * Hidden measurement div — renders text with the same styles as LayoutRenderer
 * and uses ResizeObserver to keep zone.height in sync with actual text height.
 */
function TextAutoHeight({ zone, canvasW, canvasH, canvasScale, onUpdate, typographySystem }) {
  const ref            = useRef(null);
  const onUpdateRef    = useRef(onUpdate);
  onUpdateRef.current  = onUpdate;
  const lastPct        = useRef(null);
  const zoneHeightRef  = useRef(zone.height);
  zoneHeightRef.current = zone.height;

  const st      = zone.style        || {};
  const rawText = zone.content?.text || "";
  const text    = rawText || "\u200B"; // zero-width space keeps 1-line height

  // Mirror LayoutRenderer's font auto-scaling so measurement matches actual render
  const maxChars    = zone.maxChars || 40;
  const scaleFactor = rawText.length > maxChars * 0.8 ? 0.85 : 1;

  const dnaTypo = (!st._userFontFamily && typographySystem && zone.role)
    ? getTypographyForRole(typographySystem, zone.role)
    : null;

  // Mirror LayoutRenderer: contentPadding wins over padding when set
  const padding = st.contentPadding > 0 ? `${st.contentPadding * canvasScale}px` : (st.padding || "0 8px");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      const h = el.offsetHeight;
      if (h <= 0) return;
      const pct = Math.round((h / canvasH) * 1000) / 10;
      if (zoneHeightRef.current != null && Math.abs(pct - zoneHeightRef.current) < 0.3) return;
      if (lastPct.current !== null && Math.abs(pct - lastPct.current) < 0.3) return;
      lastPct.current = pct;
      onUpdateRef.current({ height: pct });
    };
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    sync();
    // Re-measure after fonts load — custom fonts cause wrong initial measurement
    document.fonts?.ready?.then(sync);
    return () => ro.disconnect();
  }, [canvasH]);

  return (
    <div ref={ref} style={{
      position:      "absolute",
      visibility:    "hidden",
      pointerEvents: "none",
      top: 0, left: 0,
      width:         `${(zone.width / 100) * canvasW}px`,
      padding,
      fontSize:      (st.fontSize || 32) * canvasScale * scaleFactor,
      fontWeight:    dnaTypo?.fontWeight ?? st.fontWeight ?? 700,
      fontFamily:    dnaTypo?.fontFamily ?? st.fontFamily ?? "inherit",
      lineHeight:    st.lineHeight   || 1.15,
      letterSpacing: st.letterSpacing || "normal",
      whiteSpace:    "normal",
      overflowWrap:  "break-word",
      wordBreak:     "break-word",
      boxSizing:     "border-box",
    }}>
      {text}
    </div>
  );
}

/**
 * Inline text editor — overlays a contenteditable div exactly over a text zone.
 * Styles mirror LayoutRenderer as closely as possible at the current canvas scale.
 */
function InlineTextEditor({ zone, canvasScale, typographySystem, onCommit, onCancel }) {
  const ref       = useRef(null);
  const cancelled = useRef(false);

  const st      = zone.style || {};
  const dnaTypo = (!st._userFontFamily && typographySystem && zone.role)
    ? getTypographyForRole(typographySystem, zone.role)
    : null;

  // Set initial text and focus cursor at end on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerText = zone.content?.text || "";
    el.focus();
    try {
      const range = document.createRange();
      const sel   = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false); // collapse to end
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // don't let canvas Escape handler deselect the zone
      cancelled.current = true;
      onCancel();
    }
    // Prevent contenteditable from inserting <div>/<br> on Enter — insert \n instead
    if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertText", false, "\n");
    }
  };

  const handleBlur = () => {
    if (cancelled.current) return;
    onCommit(ref.current?.innerText ?? "");
  };

  // Scale a "0 8px"-style padding string by canvasScale
  const scaledPadding = (() => {
    const raw = st.padding || "0 8px";
    return raw.replace(/(\d+(\.\d+)?)px/g, (_, n) => `${parseFloat(n) * canvasScale}px`);
  })();

  return (
    <div
      ref={ref}
      data-inline-editor="true"
      contentEditable
      suppressContentEditableWarning
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position:      "absolute",
        left:          `${zone.x}%`,
        top:           `${zone.y}%`,
        width:         `${zone.width}%`,
        minHeight:     `${zone.height}%`,
        zIndex:        (zone.zIndex ?? 10) + 200,
        // Mirror LayoutRenderer text styles
        fontSize:      `${(st.fontSize || 32) * canvasScale}px`,
        fontWeight:    dnaTypo?.fontWeight ?? st.fontWeight ?? 700,
        fontFamily:    dnaTypo?.fontFamily ?? st.fontFamily ?? "inherit",
        color:         st.color || "#fff",
        textAlign:     st.textAlign || "left",
        lineHeight:    st.lineHeight || 1.15,
        letterSpacing: st.letterSpacing || "normal",
        padding:       scaledPadding,
        boxSizing:     "border-box",
        wordBreak:     "break-word",
        whiteSpace:    "pre-wrap",
        overflowWrap:  "break-word",
        // Edit-mode chrome
        outline:       "none",
        caretColor:    "#7c5cfc",
        background:    "rgba(13,13,20,0.72)",
        border:        "1.5px solid rgba(124,92,252,0.8)",
        borderRadius:  3,
        cursor:        "text",
        userSelect:    "text",
        backdropFilter:"blur(2px)",
      }}
    />
  );
}

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
  showTimings = true,
}) {
  const updateBeatSilent   = useProjectStore((s) => s.updateBeatSilent);
  const _pushHistory       = useProjectStore((s) => s._pushHistory);
  const typographySystem   = useProjectStore((s) => s.project?.dna?.typographySystem ?? s.project?.meta?.dna?.typographySystem);
  const inlineLayoutDef    = useProjectStore((s) => s.project?.meta?.inlineLayoutDef);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const layoutDef        = getLayoutDef(beat?.layout) ?? inlineLayoutDef;
  const beatZones        = beat?.zones || {};

  const selectedZoneId = selectedZoneIds instanceof Set
    ? (selectedZoneIds.size === 1 ? [...selectedZoneIds][0] : null)
    : selectedZoneIds;

  const beatZonesRef   = useRef(beatZones);
  const beatIdRef      = useRef(beat?.id);
  beatZonesRef.current = beatZones;
  beatIdRef.current    = beat?.id;

  const defZoneIds = new Set((layoutDef?.zones || []).map(z => z.id));

  const deletedZones = new Set(beat?.deletedZones || []);

  const _seenDefIds = new Set();
  const defZones = (layoutDef?.zones || []).flatMap(d => {
    if (!d.id) return [];                       // skip legacy zones saved without an id
    if (_seenDefIds.has(d.id)) return [];       // deduplicate — bad saves may store same id twice
    _seenDefIds.add(d.id);
    if (deletedZones.has(d.id)) return [];
    const o = beatZones[d.id] || {};
    if (o.hidden) return [];
    return [{
      ...d,
      x: o.x ?? d.x, y: o.y ?? d.y,
      width: o.width ?? d.width, height: o.height ?? d.height,
      zIndex: o.zIndex ?? d.zIndex, start: o.start ?? d.start ?? 0,
      content: { ...(d.content || {}), ...(o.content || {}) }, style: { ...d.style, ...(o.style || {}) }, background: o.background || {},
    }];
  });

  const extraZones = Object.entries(beatZones)
    .filter(([id]) => !defZoneIds.has(id))
    .filter(([, z]) => !z.hidden)
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

  const allZones = [...defZones, ...extraZones, ...voZones].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));

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
    const existing = bz[zoneId] || {};
    // Deep-merge style so callers can pass partial style patches (e.g. { style: { rotation: 45 } })
    // without wiping other style keys
    const merged = { ...existing, ...updates };
    if (updates.style) merged.style = { ...(existing.style || {}), ...updates.style };
    updateBeatSilent(beatIdRef.current, { zones: { ...bz, [zoneId]: merged } });
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
      className="relative rounded-[8px] shrink-0 cursor-default select-none"
      style={{
        width: canvasW, height: canvasH,
        overflow: "visible",
      }}
    >
      {/* Composition background + overlay layers (beneath zone content) */}
      <CompositionLayerRenderer beat={beat} layerFilter={[0, 1, 3]} />

      {/* layoutPadding inset — mirrors LayoutRenderer behaviour */}
      <div style={{ position: "absolute", inset: (beat?.layoutPadding || 0) * canvasScale, overflow: "visible" }}>
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

          if (zone.type === "decorative") {
            // Decorative zones are background overlays — the Thumbnail renders them correctly.
            return null;
          }

          if (zone.type === "icon") {
            // The icon SVG is rendered by the Remotion Thumbnail at the correct z-order.
            // We still need a canvas-overlay div so resize feedback is immediate: the div's
            // percentage-based dimensions update every time the store changes during a drag.
            // pointer-events:none keeps interactivity with ZoneHandle (rendered separately).
            return (
              <div
                key={`content_${zone.id}`}
                className="absolute"
                style={{
                  left: `${zone.x}%`, top: `${zone.y}%`,
                  width: `${zone.width}%`, height: `${zone.height}%`,
                  zIndex: zone.zIndex ?? 1,
                  pointerEvents: "none",
                  boxSizing: "border-box",
                  border: "1px dashed rgba(255,255,255,0.15)",
                }}
              />
            );
          }

          const content  = zone.content || {};
          const isText   = zone.type === "text";
          const clipShape = zone.style?.clipShape;
          const clipPath  = clipShape ? getClipPathCSS(clipShape) : null;
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
                overflow:      isText || zone.style?.transform ? "visible" : "hidden",
                opacity:       zone.style?.opacity ?? 1,
                transform:     zone.style?.transform || undefined,
                transformOrigin: "center center",
                display:       isText ? "flex"   : undefined,
                alignItems:    isText ? "center" : undefined,
                flexDirection: isText ? "column" : undefined,
                clipPath:      clipPath || undefined,
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
          .filter(zone => zone.type !== "element")
          .map(zone => (
            <ZoneHandle key={`handle_${zone.id}`} zone={zone}
              isSelected={selectedZoneIds instanceof Set ? selectedZoneIds.has(zone.id) : selectedZoneId === zone.id}
              isEditing={editingZoneId === zone.id}
              canvasWidth={canvasW - (beat?.layoutPadding || 0) * canvasScale * 2}
              canvasHeight={canvasH - (beat?.layoutPadding || 0) * canvasScale * 2}
              onSelect={onSelectZone}
              onUpdate={handleUpdate}
              onUpdateMulti={handleUpdateMulti}
              onPushHistory={handlePushHistory}
              onSave={handleSave}
              onEditText={(id) => { onSelectZone(id); setEditingZoneId(id); }}
              selectedZoneIds={selectedZoneIds instanceof Set ? selectedZoneIds : null}
              allZones={allZones}
            />
          ))}

        {/* Inline text editor — shown on double-click of a text zone */}
        {editingZoneId && (() => {
          const zone = allZones.find(z => z.id === editingZoneId);
          if (!zone || zone.type !== "text") return null;
          return (
            <InlineTextEditor
              key={editingZoneId}
              zone={zone}
              canvasScale={canvasScale}
              typographySystem={typographySystem}
              onCommit={(text) => {
                handleUpdate(zone.id, { content: { ...(zone.content || {}), kind: "text", text } });
                handleSave();
                setEditingZoneId(null);
              }}
              onCancel={() => setEditingZoneId(null)}
            />
          );
        })()}

        {showTimings && allZones.filter(z => (z.start || 0) > 0).map(zone => (
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
