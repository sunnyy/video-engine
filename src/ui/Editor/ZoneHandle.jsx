/**
 * ZoneHandle.jsx
 * src/ui/Editor/canvas/ZoneHandle.jsx
 *
 * Single select: move + resize + rotate
 * Multi select:  move only (drag moves all selected together)
 */
import React, { useRef, useState, useCallback } from "react";

const HANDLE_SIZE = 8;

const HANDLES = [
  { id: "nw", cursor: "nw-resize", x: 0,   y: 0   },
  { id: "n",  cursor: "n-resize",  x: 0.5, y: 0   },
  { id: "ne", cursor: "ne-resize", x: 1,   y: 0   },
  { id: "e",  cursor: "e-resize",  x: 1,   y: 0.5 },
  { id: "se", cursor: "se-resize", x: 1,   y: 1   },
  { id: "s",  cursor: "s-resize",  x: 0.5, y: 1   },
  { id: "sw", cursor: "sw-resize", x: 0,   y: 1   },
  { id: "w",  cursor: "w-resize",  x: 0,   y: 0.5 },
];

export default function ZoneHandle({
  zone,
  isSelected,
  canvasWidth,
  canvasHeight,
  onSelect,
  onUpdate,
  onUpdateMulti,
  onPushHistory,
  onSave,
  selectedZoneIds,
  allZones,
}) {
  const dragMoved   = useRef(false);
  const dragStart   = useRef(null);
  const resizeStart = useRef(null);
  const [hovered, setHovered] = useState(false);

  const pxX      = (zone.x      / 100) * canvasWidth;
  const pxY      = (zone.y      / 100) * canvasHeight;
  const pxW      = (zone.width  / 100) * canvasWidth;
  const pxH      = (zone.height / 100) * canvasHeight;
  const rotation = zone.style?.rotation ?? 0;

  const isMulti = selectedZoneIds && selectedZoneIds.size > 1 && selectedZoneIds.has(zone.id);

  /* ── Move ── */
  const onMouseDown = useCallback((e) => {
    if (e.target.dataset.handle) return;
    if (e.target.dataset.rotate) return;
    e.stopPropagation();
    e.preventDefault();

    dragMoved.current = false;

    // Capture original positions of all selected zones for multi-drag
    const origPositions = {};
    if (isMulti && allZones) {
      for (const z of allZones) {
        if (selectedZoneIds.has(z.id)) {
          origPositions[z.id] = { x: z.x, y: z.y, width: z.width, height: z.height };
        }
      }
    }

    dragStart.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      origX: zone.x, origY: zone.y,
      origPositions,
      historyPushed: false,
    };

    const onMove = (me) => {
      if (!dragStart.current) return;
      const dx = me.clientX - dragStart.current.mouseX;
      const dy = me.clientY - dragStart.current.mouseY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;
      if (!dragMoved.current) return;

      if (!dragStart.current.historyPushed) {
        onPushHistory();
        dragStart.current.historyPushed = true;
      }

      const dxPct = (dx / canvasWidth)  * 100;
      const dyPct = (dy / canvasHeight) * 100;

      if (isMulti && onUpdateMulti) {
        const updates = {};
        for (const [id, orig] of Object.entries(dragStart.current.origPositions)) {
          updates[id] = {
            x: Math.round((orig.x + dxPct) * 10) / 10,
            y: Math.round((orig.y + dyPct) * 10) / 10,
          };
        }
        onUpdateMulti(updates);
      } else {
        onUpdate(zone.id, {
          x: Math.round((dragStart.current.origX + dxPct) * 10) / 10,
          y: Math.round((dragStart.current.origY + dyPct) * 10) / 10,
        });
      }
    };

    const onUp = (ue) => {
      ue.stopPropagation();
      if (!dragMoved.current) {
        onSelect(zone.id, ue.shiftKey || ue.metaKey || ue.ctrlKey);
      } else {
        onSave(zone.id);
      }
      dragStart.current = null;
      dragMoved.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp, true);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, true);
  }, [zone, canvasWidth, canvasHeight, isMulti, selectedZoneIds, allZones, onSelect, onUpdate, onUpdateMulti, onPushHistory, onSave]);

  /* ── Resize (single only) ── */
  const onResizeDown = useCallback((e, handleId) => {
    e.stopPropagation();
    e.preventDefault();
    onPushHistory();
    const origFontSize = zone.type === "text" ? parseFloat(zone.style?.fontSize ?? 0) : 0;
    resizeStart.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      origX: zone.x, origY: zone.y, origW: zone.width, origH: zone.height,
      origFontSize,
      handle: handleId,
    };

    const onMove = (me) => {
      if (!resizeStart.current) return;
      const { mouseX, mouseY, origX, origY, origW, origH, origFontSize, handle } = resizeStart.current;

      const dx = ((me.clientX - mouseX) / canvasWidth)  * 100;
      const dy = ((me.clientY - mouseY) / canvasHeight) * 100;

      let x = origX, y = origY, w = origW, h = origH;

      const isCorner  = handle.length === 2; // "nw","ne","se","sw"
      const lockRatio = me.shiftKey && isCorner;
      const aspectRatio = origW / origH;

      if (handle.includes("e")) w = Math.max(2, origW + dx);
      if (handle.includes("s")) h = Math.max(2, origH + dy);
      if (handle.includes("w")) { x = origX + dx; w = Math.max(2, origW - dx); }
      if (handle.includes("n")) { y = origY + dy; h = Math.max(2, origH - dy); }

      // Shift on a corner handle: lock aspect ratio by using whichever axis moved more
      if (lockRatio) {
        const absDx = Math.abs(localDxPx);
        const absDy = Math.abs(localDyPx);
        if (absDx >= absDy) {
          h = w / aspectRatio;
          if (handle.includes("n")) y = origY + (origH - h);
        } else {
          w = h * aspectRatio;
          if (handle.includes("w")) x = origX + (origW - w);
        }
      }

      const update = {
        x: Math.round(x*10)/10, y: Math.round(y*10)/10,
        width: Math.round(w*10)/10, height: Math.round(h*10)/10,
      };
      // Scale font size proportionally when height changes
      if (zone.type === "text" && origFontSize > 0 && (handle.includes("n") || handle.includes("s"))) {
        const newFontSize = Math.max(8, Math.round(origFontSize * (h / origH)));
        update.style = { ...(zone.style || {}), fontSize: newFontSize };
      }
      onUpdate(zone.id, update);
    };

    const onUp = () => {
      resizeStart.current = null;
      onSave(zone.id);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [zone, canvasWidth, canvasHeight, onUpdate, onPushHistory, onSave]);

  /* ── Rotate (single only) ── */
  const onRotateDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onPushHistory();

    const centerX  = pxX + pxW / 2;
    const centerY  = pxY + pxH / 2;
    const canvasEl = e.currentTarget.closest("[data-canvas]");
    const rect     = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
    const getAngle = (cx, cy) =>
      Math.atan2(cy - (rect.top + centerY), cx - (rect.left + centerX)) * (180 / Math.PI);

    const startAngle   = getAngle(e.clientX, e.clientY);
    const origRotation = rotation;

    const onMove = (me) => {
      const angle = getAngle(me.clientX, me.clientY);
      let newRot  = Math.round(origRotation + (angle - startAngle));
      const snaps = [0, 90, 180, 270, -90, -180, -270, 360, -360];
      for (const s of snaps) { if (Math.abs(newRot - s) < 5) { newRot = s; break; } }
      onUpdate(zone.id, { style: { ...(zone.style || {}), rotation: newRot } });
    };

    const onUp = () => {
      onSave(zone.id);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [zone, pxX, pxY, pxW, pxH, rotation, onUpdate, onPushHistory, onSave]);

  const getLabel = () => {
    const content = zone.content || {};
    if (zone.type === "text" && content.text) return content.text.slice(0, 14) + (content.text.length > 14 ? "…" : "");
    if (content.asset?.src) return zone.id;
    return zone.id;
  };

  const isVideoOverlay = zone._isVideoOverlay ?? false;
  const outlineColor = isSelected
    ? (isVideoOverlay ? "#00d4c8" : isMulti ? "#2dd4bf" : "#7c5cfc")
    : hovered ? (isVideoOverlay ? "rgba(0,212,200,0.6)" : zone.type === "text" ? "rgba(167,143,255,0.6)" : "rgba(255,255,255,0.5)")
    : "transparent";

  const isVisible = isSelected || hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:      "absolute",
        left: pxX, top: pxY, width: pxW, height: pxH,
        zIndex:        (zone.zIndex ?? 1) + (isSelected ? 2 : 0),
        boxSizing:     "border-box",
        overflow:      "visible",
        pointerEvents: "none", // pass clicks through — only children with explicit pointerEvents capture
      }}
    >
      {/* Visual outline — no pointer events, purely decorative */}
      <div style={{
        position:        "absolute", inset: 0,
        transform:       rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
        outline:         `1.5px solid ${outlineColor}`,
        outlineOffset:   "-1px",
        borderRadius:    2,
        background:      isSelected ? (isMulti ? "rgba(45,212,191,0.04)" : "rgba(124,92,252,0.04)") : "transparent",
        pointerEvents:   "none",
      }} />

      {/* Hit area:
          - Unselected: full zone is clickable (to select it)
          - Selected: only the 10px border strip is interactive (interior clicks pass through to zones below) */}
      {!isSelected ? (
        <div onMouseDown={onMouseDown} style={{ position: "absolute", inset: 0, pointerEvents: "auto", cursor: "grab" }} />
      ) : (
        <>
          <div onMouseDown={onMouseDown} style={{ position: "absolute", top: 0,    left: 0, right: 0,  height: 10, pointerEvents: "auto", cursor: "grab" }} />
          <div onMouseDown={onMouseDown} style={{ position: "absolute", bottom: 0, left: 0, right: 0,  height: 10, pointerEvents: "auto", cursor: "grab" }} />
          <div onMouseDown={onMouseDown} style={{ position: "absolute", top: 0,    left: 0, bottom: 0, width:  10, pointerEvents: "auto", cursor: "grab" }} />
          <div onMouseDown={onMouseDown} style={{ position: "absolute", top: 0,    right: 0,bottom: 0, width:  10, pointerEvents: "auto", cursor: "grab" }} />
        </>
      )}

      {/* Label */}
      {isVisible && (
        <div style={{
          position: "absolute", top: -18, left: 0,
          fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
          color: isSelected ? (isMulti ? "#2dd4bf" : "#a78fff") : "rgba(255,255,255,0.5)",
          background: "rgba(0,0,0,0.65)",
          padding: "1px 4px", borderRadius: 3,
          whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none", lineHeight: "14px",
        }}>
          {getLabel()}
          {rotation !== 0 && !isMulti && ` · ${rotation}°`}
        </div>
      )}

      {/* Resize handles — single select only */}
      {isSelected && !isMulti && HANDLES.map(h => (
        <div key={h.id} data-handle={h.id} onMouseDown={e => onResizeDown(e, h.id)}
          style={{
            position: "absolute",
            width: HANDLE_SIZE, height: HANDLE_SIZE,
            left: `calc(${h.x * 100}% - ${HANDLE_SIZE / 2}px)`,
            top:  `calc(${h.y * 100}% - ${HANDLE_SIZE / 2}px)`,
            background: "#7c5cfc", border: "1.5px solid #fff",
            borderRadius: 2, cursor: h.cursor, zIndex: 9999,
          }}
        />
      ))}

      {/* Rotation handle — single select only */}
      {isSelected && !isMulti && (
        <div
          data-rotate="true"
          onMouseDown={onRotateDown}
          title="Drag to rotate"
          style={{
            position: "absolute", right: -18, bottom: -18,
            width: 20, height: 20, borderRadius: "50%",
            background: "#1a1a2e", border: "1.5px solid #7c5cfc",
            cursor: "crosshair", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            userSelect: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M9 2.5A4.5 4.5 0 1 0 9.5 7" stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M9.5 2L9 4.5L7 2.5" stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}