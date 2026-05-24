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
  const updateLayer          = useTimelineStore((s) => s.updateLayer);
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
        userSelect: "none",
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
        }}
        onClick={() => setIsPlaying(!isPlaying)}
        title="Play/Pause (Space)"
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5 3 19 12 5 21"/>
          </svg>
        )}
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 2L22 12L12 22L2 12Z"/>
        </svg>
      </button>
      <button
        style={{ ...iconBtn(false), opacity: hasSelection ? 1 : 0.3 }}
        onClick={() => hasSelection && duplicateLayer(selectedLayerId)}
        disabled={!hasSelection}
        title="Duplicate (Ctrl+D)"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      </button>
      <button
        style={{ ...iconBtn(false), opacity: hasSelection ? 1 : 0.3 }}
        onClick={() => hasSelection && removeLayer(selectedLayerId)}
        disabled={!hasSelection}
        title="Delete (Del)"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
      <button
        style={{
          ...iconBtn(selectedLayer?.locked),
          opacity: hasSelection ? 1 : 0.3,
          ...(selectedLayer?.locked && {
            color: "#ffb432",
            borderColor: "rgba(255,180,50,0.45)",
            background: "rgba(255,180,50,0.15)",
          }),
        }}
        onClick={() => hasSelection && updateLayer(selectedLayerId, { locked: !selectedLayer?.locked })}
        disabled={!hasSelection}
        title={selectedLayer?.locked ? "Unlock layer" : "Lock layer"}
      >
        {selectedLayer?.locked ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 019.9-1"/>
          </svg>
        )}
      </button>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 4px" }} />

      {/* Z-order */}
      <button
        style={{ ...iconBtn(false), opacity: canBringForward ? 1 : 0.3 }}
        onClick={() => canBringForward && bringForward(selectedLayerId)}
        disabled={!canBringForward}
        title="Bring Forward (Ctrl+])"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
        </svg>
      </button>
      <button
        style={{ ...iconBtn(false), opacity: canSendBack ? 1 : 0.3 }}
        onClick={() => canSendBack && sendBack(selectedLayerId)}
        disabled={!canSendBack}
        title="Send Back (Ctrl+[)"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
        </svg>
      </button>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 4px" }} />

      {/* Snap */}
      <button
        style={iconBtn(snapEnabled)}
        onClick={() => setSnapEnabled(!snapEnabled)}
        title="Snap to grid"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v6a6 6 0 0012 0V4"/>
          <line x1="4" y1="4" x2="8" y2="4"/><line x1="16" y1="4" x2="20" y2="4"/>
        </svg>
      </button>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 4px" }} />

      {/* Zoom */}
      <button style={iconBtn(false)} onClick={() => setZoom(zoom / 1.4)} title="Zoom out">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
      <div style={{ fontSize: 12, color: "#9090b0", minWidth: 40, textAlign: "center", fontFamily: "ui-monospace, monospace" }}>
        {Math.round(zoom * 100)}%
      </div>
      <button style={iconBtn(false)} onClick={() => setZoom(zoom * 1.4)} title="Zoom in">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 00-2 2v3"/><path d="M21 8V5a2 2 0 00-2-2h-3"/>
          <path d="M3 16v3a2 2 0 002 2h3"/><path d="M16 21h3a2 2 0 002-2v-3"/>
        </svg>
      </button>
    </div>
  );
}
