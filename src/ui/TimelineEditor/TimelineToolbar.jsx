import { useTimelineStore } from "../../store/useTimelineStore";
import { resolveTransform } from "./keyframeUtils";

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

const iconBtn = (active) => ({
  background: active ? "rgba(124,92,252,0.22)" : "rgba(255,255,255,0.04)",
  border: active ? "1px solid rgba(124,92,252,0.5)" : "1px solid rgba(255,255,255,0.08)",
  color: active ? "#a080ff" : "#c0c0d8",
  cursor: "pointer",
  borderRadius: 5,
  padding: "4px 9px",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 30,
  height: 30,
});

export default function TimelineToolbar() {
  const isPlaying        = useTimelineStore((s) => s.isPlaying);
  const currentTime      = useTimelineStore((s) => s.currentTime);
  const duration         = useTimelineStore((s) => s.duration);
  const project          = useTimelineStore((s) => s.project);
  const selectedLayerId  = useTimelineStore((s) => s.selectedLayerId);
  const snapEnabled      = useTimelineStore((s) => s.snapEnabled);
  const zoom             = useTimelineStore((s) => s.zoom);

  const setIsPlaying         = useTimelineStore((s) => s.setIsPlaying);
  const setZoom              = useTimelineStore((s) => s.setZoom);
  const setSnapEnabled       = useTimelineStore((s) => s.setSnapEnabled);
  const removeLayer          = useTimelineStore((s) => s.removeLayer);
  const duplicateLayer       = useTimelineStore((s) => s.duplicateLayer);
  const splitLayerAtPlayhead = useTimelineStore((s) => s.splitLayerAtPlayhead);
  const addKeyframe          = useTimelineStore((s) => s.addKeyframe);
  const bringForward         = useTimelineStore((s) => s.bringForward);
  const sendBack             = useTimelineStore((s) => s.sendBack);

  const hasSelection = !!selectedLayerId;
  const selectedLayer = project?.layers?.find((l) => l.id === selectedLayerId) ?? null;
  const layerIdx = project?.layers?.findIndex((l) => l.id === selectedLayerId) ?? -1;
  const totalLayers = project?.layers?.length ?? 0;
  const canBringForward = hasSelection && layerIdx < totalLayers - 1;
  const canSendBack = hasSelection && layerIdx > 0;

  const hasKeyframes = selectedLayer
    ? Object.values(selectedLayer.keyframes ?? {}).some((arr) => arr?.length > 0)
    : false;

  const stampKeyframes = () => {
    if (!selectedLayer) return;
    const localTime = Math.max(0, currentTime - selectedLayer.start);
    // Use the resolved (visually displayed) values, not just the base transform,
    // so stamping while keyframes are active captures the correct interpolated position.
    const tr = resolveTransform(selectedLayer, currentTime);
    for (const prop of ["x", "y", "width", "height", "scale", "rotation", "opacity", "blur"]) {
      addKeyframe(selectedLayer.id, prop, localTime, tr[prop] ?? 0);
    }
  };

  return (
    <div
      style={{
        height: 44,
        background: "#111118",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 5,
        flexShrink: 0,
      }}
    >
      {/* Play / Pause */}
      <button
        style={{
          ...iconBtn(false),
          color: "#e8e8f0",
          background: "#1e1e30",
          border: "1px solid rgba(255,255,255,0.12)",
          width: 36,
          height: 30,
          fontSize: 15,
        }}
        onClick={() => setIsPlaying(!isPlaying)}
        title="Play/Pause (Space)"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      {/* Time display */}
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          color: "#d0d0e8",
          padding: "0 10px",
          minWidth: 110,
        }}
      >
        {formatTime(currentTime)}
        <span style={{ color: "#44445a", margin: "0 4px" }}>/</span>
        {formatTime(duration)}
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 4px" }} />

      {/* Edit tools */}
      <button
        style={{ ...iconBtn(false), opacity: hasSelection ? 1 : 0.3 }}
        onClick={splitLayerAtPlayhead}
        disabled={!hasSelection}
        title="Split at playhead"
      >
        ✂
      </button>
      <button
        style={{
          ...iconBtn(hasKeyframes),
          opacity: hasSelection ? 1 : 0.3,
          color: hasKeyframes ? "#f5c518" : undefined,
          borderColor: hasKeyframes ? "rgba(245,197,24,0.4)" : undefined,
          background: hasKeyframes ? "rgba(245,197,24,0.12)" : undefined,
        }}
        onClick={stampKeyframes}
        disabled={!hasSelection}
        title="Add keyframe at current time"
      >
        ◆
      </button>
      <button
        style={{ ...iconBtn(false), opacity: hasSelection ? 1 : 0.3 }}
        onClick={() => hasSelection && duplicateLayer(selectedLayerId)}
        disabled={!hasSelection}
        title="Duplicate (Ctrl+D)"
      >
        ⧉
      </button>
      <button
        style={{ ...iconBtn(false), opacity: hasSelection ? 1 : 0.3 }}
        onClick={() => hasSelection && removeLayer(selectedLayerId)}
        disabled={!hasSelection}
        title="Delete (Del)"
      >
        🗑
      </button>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 4px" }} />

      {/* Z-order */}
      <button
        style={{ ...iconBtn(false), opacity: canBringForward ? 1 : 0.3 }}
        onClick={() => canBringForward && bringForward(selectedLayerId)}
        disabled={!canBringForward}
        title="Bring Forward (Ctrl+])"
      >
        ↑
      </button>
      <button
        style={{ ...iconBtn(false), opacity: canSendBack ? 1 : 0.3 }}
        onClick={() => canSendBack && sendBack(selectedLayerId)}
        disabled={!canSendBack}
        title="Send Back (Ctrl+[)"
      >
        ↓
      </button>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 4px" }} />

      {/* Snap */}
      <button
        style={iconBtn(snapEnabled)}
        onClick={() => setSnapEnabled(!snapEnabled)}
        title="Snap to grid"
      >
        🧲
      </button>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 4px" }} />

      {/* Zoom */}
      <button style={iconBtn(false)} onClick={() => setZoom(zoom / 1.4)} title="Zoom out">−</button>
      <div
        style={{
          fontSize: 12,
          color: "#9090b0",
          minWidth: 40,
          textAlign: "center",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {Math.round(zoom * 100)}%
      </div>
      <button style={iconBtn(false)} onClick={() => setZoom(zoom * 1.4)} title="Zoom in">+</button>
      <button
        style={iconBtn(false)}
        onClick={() => {
          const el = document.getElementById("timeline-scroll");
          const w = el ? el.clientWidth : 800;
          const newZoom = (w - 60) / (duration * 80);
          setZoom(Math.max(0.1, Math.min(newZoom, 5)));
        }}
        title="Zoom to fit entire project"
      >
        ⊡
      </button>
    </div>
  );
}
