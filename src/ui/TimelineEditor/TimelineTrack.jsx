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

export default function TimelineTrack({ layers, pps }) {
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
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
      }}
    >
      {/* Sticky label */}
      <div
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
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => selectLayer(primary.id)}
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
          background: isSelected ? "rgba(124,92,252,0.05)" : "transparent",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) selectLayer(null); }}
      >
        {sorted.map((layer) => (
          <TimelineClip key={layer.id} layer={layer} pps={pps} />
        ))}
      </div>
    </div>
  );
}
