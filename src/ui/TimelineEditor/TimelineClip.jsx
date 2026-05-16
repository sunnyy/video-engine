import { useRef } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import WaveformCanvas from "./WaveformCanvas";

const LAYER_COLORS = {
  video: "#4a9eff",
  image: "#4adf86",
  text: "#f5c518",
  audio: "#ff7eb3",
  captions: "#c87dff",
  sticker: "#ff9f40",
};

const HANDLE_W = 7;

export default function TimelineClip({ layer, pps, isCrossTracking, onCrossTrackMove, onCrossTrackDrop }) {
  const selectedLayerId = useTimelineStore((s) => s.selectedLayerId);
  const selectLayer = useTimelineStore((s) => s.selectLayer);
  const updateLayer = useTimelineStore((s) => s.updateLayer);
  const updateLayerSilent = useTimelineStore((s) => s.updateLayerSilent);
  const snapEnabled = useTimelineStore((s) => s.snapEnabled);
  const duration = useTimelineStore((s) => s.duration);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);

  const isSelected = layer.id === selectedLayerId;
  const color = LAYER_COLORS[layer.type] ?? "#7c5cfc";
  const dragRef = useRef(null);

  function snapVal(val) {
    return snapEnabled ? Math.round(val * 2) / 2 : val;
  }

  // ── Body drag (move) ──────────────────────────────────────────────────────
  const onBodyMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectLayer(layer.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const origStart = layer.start;
    const clipDur = layer.end - layer.start;
    dragRef.current = true;
    let crossMode = false;

    const onMove = (me) => {
      if (!crossMode && Math.abs(me.clientY - startY) > 20) {
        crossMode = true;
      }
      if (crossMode) {
        onCrossTrackMove?.(layer.id, me.clientY);
      }
      let newStart = snapVal(Math.max(0, origStart + (me.clientX - startX) / pps));
      let newEnd = newStart + clipDur;
      if (newEnd > duration) { newEnd = duration; newStart = newEnd - clipDur; }
      updateLayerSilent(layer.id, { start: newStart, end: newEnd });
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragRef.current = false;
      let newStart = snapVal(Math.max(0, origStart + (me.clientX - startX) / pps));
      let newEnd = newStart + clipDur;
      if (newEnd > duration) { newEnd = duration; newStart = newEnd - clipDur; }
      if (crossMode) {
        onCrossTrackDrop?.(layer.id, me.clientY);
      }
      updateLayer(layer.id, { start: newStart, end: newEnd });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Left edge (trim start) ────────────────────────────────────────────────
  const onLeftMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectLayer(layer.id);

    const startX = e.clientX;
    const origStart = layer.start;

    const onMove = (me) => {
      const newStart = snapVal(Math.max(0, Math.min(layer.end - 0.1, origStart + (me.clientX - startX) / pps)));
      updateLayerSilent(layer.id, { start: newStart });
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const newStart = snapVal(Math.max(0, Math.min(layer.end - 0.1, origStart + (me.clientX - startX) / pps)));
      updateLayer(layer.id, { start: newStart });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Right edge (trim end) ─────────────────────────────────────────────────
  const onRightMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectLayer(layer.id);

    const startX = e.clientX;
    const origEnd = layer.end;

    const onMove = (me) => {
      const newEnd = snapVal(Math.max(layer.start + 0.1, Math.min(duration, origEnd + (me.clientX - startX) / pps)));
      updateLayerSilent(layer.id, { end: newEnd });
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const newEnd = snapVal(Math.max(layer.start + 0.1, Math.min(duration, origEnd + (me.clientX - startX) / pps)));
      updateLayer(layer.id, { end: newEnd });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const left = layer.start * pps;
  const width = Math.max(6, (layer.end - layer.start) * pps);

  // Collect unique keyframe times (layer-local seconds) across all properties
  const kfTimes = [];
  Object.values(layer.keyframes ?? {}).forEach((arr) => {
    (arr ?? []).forEach((k) => {
      if (!kfTimes.includes(k.time)) kfTimes.push(k.time);
    });
  });

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 5,
        height: 34,
        width,
        borderRadius: 5,
        background: isSelected ? `${color}44` : `${color}28`,
        border: isSelected ? `1.5px solid ${color}` : `1px solid ${color}70`,
        boxSizing: "border-box",
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        opacity: isCrossTracking ? 0.45 : 1,
        transition: "opacity 0.1s",
      }}
      onMouseDown={onBodyMouseDown}
    >
      {/* Left trim handle */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: HANDLE_W, height: "100%",
          cursor: "ew-resize",
          background: isSelected ? `${color}cc` : "transparent",
          borderRadius: "4px 0 0 4px",
          zIndex: 2,
        }}
        onMouseDown={onLeftMouseDown}
      />

      {/* Audio waveform */}
      {layer.type === "audio" && width > 20 && (
        <WaveformCanvas
          src={layer.src}
          width={Math.round(width)}
          height={34}
          color="#ffffff"
          opacity={0.5}
        />
      )}

      {/* Label */}
      <div
        style={{
          flex: 1,
          padding: "0 10px",
          fontSize: 11,
          fontWeight: 600,
          color: color,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {layer.name}
      </div>

      {/* Right trim handle */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, width: HANDLE_W, height: "100%",
          cursor: "ew-resize",
          background: isSelected ? `${color}cc` : "transparent",
          borderRadius: "0 4px 4px 0",
          zIndex: 2,
        }}
        onMouseDown={onRightMouseDown}
      />

      {/* Transition-out indicator — gradient on right edge */}
      {(layer.transition?.type ?? "none") !== "none" && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: Math.min(Math.round(width * 0.35), 48),
            height: "100%",
            background: `linear-gradient(to right, transparent, ${color}bb)`,
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      )}

      {/* Keyframe diamonds */}
      {kfTimes.map((time) => (
        <div
          key={time}
          title={`Keyframe at ${(layer.start + time).toFixed(2)}s`}
          style={{
            position: "absolute",
            left: time * pps,
            top: "50%",
            transform: "translate(-50%, -50%) rotate(45deg)",
            width: 7,
            height: 7,
            background: "#f5c518",
            border: "1px solid rgba(0,0,0,0.5)",
            zIndex: 5,
            cursor: "pointer",
            pointerEvents: "auto",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentTime(layer.start + time);
          }}
        />
      ))}
    </div>
  );
}
