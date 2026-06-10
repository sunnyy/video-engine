import { useState } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import TimelineClip from "./TimelineClip";
import TransitionModal from "./modals/TransitionModal";

const LABEL_W = 60;
export const TRACK_H = 44;

const LAYER_ICONS = {
  video: "▶",
  image: "🖼",
  text: "T",
  html_block: "T",
  audio: "♪",
  captions: "CC",
  sticker: "★",
  icon: "✦",
  gradient: "◈",
  shape: "◻",
};

const LAYER_COLORS = {
  video: "#4a9eff",
  image: "#4adf86",
  text: "#f5c518",
  audio: "#ff7eb3",
  captions: "#c87dff",
  sticker: "#ff9f40",
};

function TransitionMarker({ prevLayer, nextLayer, pps }) {
  const [open, setOpen] = useState(false);

  const hasTransition =
    (prevLayer.transition?.out?.type && prevLayer.transition.out.type !== "none") ||
    (nextLayer.transition?.in?.type  && nextLayer.transition.in.type  !== "none");

  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          position: "absolute",
          left: prevLayer.end * pps,
          top: "50%",
          transform: "translate(-50%, -50%) rotate(45deg)",
          width: 10, height: 10, borderRadius: 2,
          background: hasTransition ? "#7c5cfc" : "#2a2a3a",
          border: `2px solid ${hasTransition ? "#a78bfa" : "#444"}`,
          cursor: "pointer",
          zIndex: 10,
        }}
      />
      {open && (
        <TransitionModal
          time={prevLayer.end}
          layers={[prevLayer, nextLayer]}
          onClose={() => setOpen(false)}
        />
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
        <span style={{ fontSize: 16, color, flexShrink: 0, lineHeight: 1 }}>
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
