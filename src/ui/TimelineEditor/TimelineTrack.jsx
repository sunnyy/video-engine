import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTimelineStore } from "../../store/useTimelineStore";
import TimelineClip from "./TimelineClip";

const LABEL_W = 60;
export const TRACK_H = 44;

const LAYER_ICONS = {
  video: "▶",
  image: "🖼",
  text: "T",
  audio: "♪",
  captions: "CC",
  sticker: "★",
};

const LAYER_COLORS = {
  video: "#4a9eff",
  image: "#4adf86",
  text: "#f5c518",
  audio: "#ff7eb3",
  captions: "#c87dff",
  sticker: "#ff9f40",
};

const TRANSITION_TYPES = [
  { value: "none",        label: "None" },
  { value: "crossfade",   label: "Fade" },
  { value: "dissolve",    label: "Dissolve" },
  { value: "slide-left",  label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up",    label: "Slide Up" },
  { value: "slide-down",  label: "Slide Down" },
  { value: "zoom-in",     label: "Zoom In" },
];

function TransitionMarker({ prevLayer, nextLayer, pps }) {
  const [open, setOpen] = useState(false);
  const [popPos, setPopPos] = useState({ x: 0, y: 0 });
  const markerRef = useRef(null);
  const updateLayer = useTimelineStore((s) => s.updateLayer);

  const x = prevLayer.end * pps;

  const outCfg  = prevLayer.transition?.out ?? null;
  const inCfg   = nextLayer.transition?.in  ?? null;
  const outType = outCfg?.type ?? "none";
  const outDur  = outCfg?.duration ?? 0.5;
  const inType  = inCfg?.type ?? "none";
  const inDur   = inCfg?.duration ?? 0.5;

  const hasTransition = outType !== "none" || inType !== "none";

  const toggleOpen = (e) => {
    e.stopPropagation();
    const rect = markerRef.current?.getBoundingClientRect();
    if (rect) setPopPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setOpen((o) => !o);
  };

  const setOut = (type) => {
    const out = type === "none" ? undefined : { type, duration: outDur };
    updateLayer(prevLayer.id, { transition: { ...(prevLayer.transition || {}), out } });
  };

  const setIn = (type) => {
    const inT = type === "none" ? undefined : { type, duration: inDur };
    updateLayer(nextLayer.id, { transition: { ...(nextLayer.transition || {}), in: inT } });
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!e.target.closest("[data-tr-pop]") && !e.target.closest("[data-tr-marker]")) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const sel = {
    width: "100%",
    background: "#111118",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#fff",
    fontSize: 12,
    padding: "4px 6px",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <>
      <div
        ref={markerRef}
        data-tr-marker
        onClick={toggleOpen}
        style={{
          position: "absolute",
          left: x,
          top: "50%",
          transform: "translate(-50%, -50%) rotate(45deg)",
          width: 10,
          height: 10,
          background: hasTransition ? "#7c5cfc" : "#2a2a3a",
          border: `2px solid ${hasTransition ? "#a78bfa" : "#444"}`,
          cursor: "pointer",
          zIndex: 10,
          borderRadius: 2,
        }}
      />
      {open && createPortal(
        <div
          data-tr-pop
          style={{
            position: "fixed",
            left: popPos.x,
            top: popPos.y,
            transform: "translateX(-50%)",
            background: "#1c1c28",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: 12,
            zIndex: 9999,
            minWidth: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Transition
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Exit</div>
            <select value={outType} onChange={(e) => setOut(e.target.value)} style={sel}>
              {TRANSITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Enter</div>
            <select value={inType} onChange={(e) => setIn(e.target.value)} style={sel}>
              {TRANSITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function TimelineTrack({
  layers, pps,
  isDragOver, onLabelDragStart, onLabelDragOver, onLabelDrop, onLabelDragEnd,
  isClipDragTarget, crossDragLayerId, onCrossTrackMove, onCrossTrackDrop,
}) {
  const selectedLayerId = useTimelineStore((s) => s.selectedLayerId);
  const selectLayer = useTimelineStore((s) => s.selectLayer);

  // Sort clips left-to-right so label reflects the first (leftmost) clip
  const sorted = [...layers].sort((a, b) => a.start - b.start);
  const primary = sorted[0];
  const isSelected = layers.some((l) => l.id === selectedLayerId);
  const color = LAYER_COLORS[primary.type] ?? "#888";

  return (
    <div
      style={{
        display: "flex",
        height: TRACK_H,
        borderTop: isDragOver ? "2px solid #7c5cfc" : "2px solid transparent",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Sticky label */}
      <div
        draggable
        style={{
          width: LABEL_W,
          flexShrink: 0,
          position: "sticky",
          left: 0,
          zIndex: 5,
          background: isSelected ? "#16102a" : "#111118",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "0 8px",
          cursor: "grab",
          userSelect: "none",
        }}
        onClick={() => selectLayer(primary.id)}
        onDragStart={onLabelDragStart}
        onDragOver={onLabelDragOver}
        onDrop={onLabelDrop}
        onDragEnd={onLabelDragEnd}
      >
        <span style={{ fontSize: 12, color, flexShrink: 0, lineHeight: 1 }}>
          {LAYER_ICONS[primary.type] ?? "?"}
        </span>
        <span
          style={{
            fontSize: 11,
            color: isSelected ? "#d0d0f0" : "#7878a0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {primary.name}
        </span>
      </div>

      {/* Clip area — all clips in this track share the same row */}
      <div
        style={{
          flex: 1,
          position: "relative",
          background: isClipDragTarget
            ? "rgba(124,92,252,0.15)"
            : isSelected ? "rgba(124,92,252,0.05)" : "transparent",
          transition: "background 0.1s",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) selectLayer(null); }}
      >
        {sorted.map((layer, i) => {
          const next = sorted[i + 1];
          const isAdjacent = next && Math.abs(layer.end - next.start) < 0.05;
          return (
            <div key={layer.id} style={{ display: "contents" }}>
              <TimelineClip
                layer={layer}
                pps={pps}
                isCrossTracking={crossDragLayerId === layer.id}
                onCrossTrackMove={onCrossTrackMove}
                onCrossTrackDrop={onCrossTrackDrop}
              />
              {isAdjacent && (
                <TransitionMarker prevLayer={layer} nextLayer={next} pps={pps} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
