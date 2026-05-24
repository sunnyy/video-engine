import { useRef, useState, useEffect } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import WaveformCanvas from "./WaveformCanvas";

function useVideoThumbnail(src, type) {
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    if (type !== "video" || !src) return;
    const video = document.createElement("video");
    video.src = src;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    const grab = () => {
      video.currentTime = 0.1;
    };
    const draw = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 45;
        canvas.getContext("2d").drawImage(video, 0, 0, 80, 45);
        setThumb(canvas.toDataURL("image/jpeg", 0.7));
      } catch {}
    };
    video.addEventListener("loadedmetadata", grab);
    video.addEventListener("seeked", draw);
    video.load();
    return () => { video.src = ""; };
  }, [src, type]);
  return thumb;
}

// Called once at mousedown to capture snap targets from the live store state.
// Returns { edge(val), body(rawStart, clipDur) } snapping functions.
function buildSnap(layerId, pps, snapEnabled) {
  if (!snapEnabled) return { edge: (v) => v, body: (s) => s };
  const { currentTime, duration, project } = useTimelineStore.getState();
  const threshold = 10 / pps;
  const targets = [
    currentTime,
    0,
    duration,
    ...(project?.layers ?? [])
      .filter((l) => l.id !== layerId)
      .flatMap((l) => [l.start, l.end]),
  ];

  // Snap a single edge value to the nearest target, fall back to 0.5s grid.
  const edge = (val) => {
    for (const t of targets) {
      if (Math.abs(val - t) < threshold) return t;
    }
    return Math.round(val * 2) / 2;
  };

  // Snap a clip body: checks both the start edge and the end edge against targets,
  // picks whichever gives the smaller distance, falls back to 0.5s grid.
  const body = (rawStart, clipDur) => {
    let best = { dist: Infinity, start: null };
    for (const t of targets) {
      const ds = Math.abs(rawStart - t);
      if (ds < threshold && ds < best.dist) best = { dist: ds, start: t };
      const de = Math.abs(rawStart + clipDur - t);
      if (de < threshold && de < best.dist) best = { dist: de, start: t - clipDur };
    }
    return best.start !== null ? best.start : Math.round(rawStart * 2) / 2;
  };

  return { edge, body };
}

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
  const commitDrag = useTimelineStore((s) => s.commitDrag);
  const snapEnabled = useTimelineStore((s) => s.snapEnabled);
  const duration = useTimelineStore((s) => s.duration);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const videoThumb = useVideoThumbnail(layer.src, layer.type);
  const thumbSrc = layer.type === "video" ? videoThumb
    : (layer.type === "image" || layer.type === "sticker") ? layer.src
    : null;

  const toggleLayerSelection = useTimelineStore((s) => s.toggleLayerSelection);
  const selectedLayerIds = useTimelineStore((s) => s.selectedLayerIds);
  const removeKeyframesAtTime = useTimelineStore((s) => s.removeKeyframesAtTime);

  const isSelected = layer.id === selectedLayerId || selectedLayerIds.includes(layer.id);
  const color = LAYER_COLORS[layer.type] ?? "#7c5cfc";
  const dragRef = useRef(null);
  const [hoveredKfTime, setHoveredKfTime] = useState(null);

  // ── Body drag (move) ─────────────────────────────────────────────────────���
  const onBodyMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) { toggleLayerSelection(layer.id); return; }
    selectLayer(layer.id);
    // Seek playhead into the clip so the layer becomes visible on canvas
    const { currentTime } = useTimelineStore.getState();
    if (currentTime < layer.start || currentTime >= layer.end) {
      setCurrentTime(layer.start);
    }
    if (layer.locked) return;

    const preDragProject = JSON.parse(JSON.stringify(useTimelineStore.getState().project));
    const { body: snapBody } = buildSnap(layer.id, pps, snapEnabled);
    const startX = e.clientX;
    const startY = e.clientY;
    const origStart = layer.start;
    const clipDur = layer.end - layer.start;
    dragRef.current = true;
    let crossMode = false;

    const calc = (clientX) => {
      let newStart = snapBody(Math.max(0, origStart + (clientX - startX) / pps), clipDur);
      let newEnd = newStart + clipDur;
      if (newEnd > duration) { newEnd = duration; newStart = newEnd - clipDur; }
      return { start: newStart, end: newEnd };
    };

    const onMove = (me) => {
      if (!crossMode && Math.abs(me.clientY - startY) > 20) crossMode = true;
      if (crossMode) onCrossTrackMove?.(layer.id, me.clientY);
      updateLayerSilent(layer.id, calc(me.clientX));
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragRef.current = false;
      if (crossMode) onCrossTrackDrop?.(layer.id, me.clientY);
      commitDrag(layer.id, calc(me.clientX), preDragProject);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Left edge (trim start) ────────────────────────────────────────────────
  const onLeftMouseDown = (e) => {
    if (e.button !== 0 || layer.locked) return;
    e.stopPropagation();
    selectLayer(layer.id);

    const preDragProject = JSON.parse(JSON.stringify(useTimelineStore.getState().project));
    const { edge: snapEdge } = buildSnap(layer.id, pps, snapEnabled);
    const startX = e.clientX;
    const origStart = layer.start;
    const origEnd = layer.end;

    const calc = (clientX) =>
      Math.max(0, Math.min(origEnd - 0.1, snapEdge(origStart + (clientX - startX) / pps)));

    const onMove = (me) => updateLayerSilent(layer.id, { start: calc(me.clientX) });
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      commitDrag(layer.id, { start: calc(me.clientX) }, preDragProject);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Right edge (trim end) ─────────────────────────────────────────────────
  const onRightMouseDown = (e) => {
    if (e.button !== 0 || layer.locked) return;
    e.stopPropagation();
    selectLayer(layer.id);

    const preDragProject = JSON.parse(JSON.stringify(useTimelineStore.getState().project));
    const { edge: snapEdge } = buildSnap(layer.id, pps, snapEnabled);
    const startX = e.clientX;
    const origEnd = layer.end;
    const origStart = layer.start;

    const calc = (clientX) =>
      Math.max(origStart + 0.1, snapEdge(origEnd + (clientX - startX) / pps));

    const onMove = (me) => updateLayerSilent(layer.id, { end: calc(me.clientX) });
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      commitDrag(layer.id, { end: calc(me.clientX) }, preDragProject);
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
      className="timeline-clip"
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
        cursor: layer.locked ? "default" : "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        opacity: isCrossTracking ? 0.45 : layer.locked ? 0.65 : 1,
        transition: "opacity 0.1s",
      }}
      onMouseDown={onBodyMouseDown}
    >
      {/* Thumbnail — fixed at left edge, natural aspect ratio */}
      {thumbSrc && (
        <img
          src={thumbSrc}
          style={{
            position: "absolute", left: 0, top: 0, height: "100%", width: "auto",
            opacity: 0.7, pointerEvents: "none", zIndex: 0,
            borderRadius: "4px 0 0 4px",
          }}
          draggable={false}
        />
      )}

      {/* Left trim handle */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: HANDLE_W, height: "100%",
          cursor: layer.locked ? "default" : "ew-resize",
          background: isSelected && !layer.locked ? `${color}cc` : "transparent",
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
          color: thumbSrc ? "#ffffff" : color,
          textShadow: thumbSrc ? "0 1px 3px rgba(0,0,0,0.8)" : undefined,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        {layer.name}
      </div>

      {/* Lock toggle */}
      {width > 36 && (
        <div
          title={layer.locked ? "Unlock layer" : "Lock layer"}
          onMouseDown={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
          style={{
            backgroundColor: "transparent",
            position: "absolute", right: HANDLE_W + 2, top: "50%", transform: "translateY(-50%)",
            width: 16, height: 16, zIndex: 6, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: layer.locked ? 1 : 0,
            transition: "opacity 0.15s",
            color: layer.locked ? color : `${color}99`,
            fontSize: 11,
          }}
          className="clip-lock-btn"
        >
          {layer.locked ? "🔒" : "🔓"}
        </div>
      )}

      {/* Right trim handle */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, width: HANDLE_W, height: "100%",
          cursor: layer.locked ? "default" : "ew-resize",
          background: isSelected && !layer.locked ? `${color}cc` : "transparent",
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
          style={{
            position: "absolute",
            left: time * pps,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 16,
            height: 16,
            zIndex: 5,
            cursor: "pointer",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={() => setHoveredKfTime(time)}
          onMouseLeave={() => setHoveredKfTime(null)}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentTime(layer.start + time);
          }}
        >
          {/* Diamond shape */}
          <div
            title={`Keyframe at ${(layer.start + time).toFixed(2)}s`}
            style={{
              width: 7,
              height: 7,
              background: hoveredKfTime === time ? "#ff6b6b" : "#f5c518",
              border: "1px solid rgba(0,0,0,0.5)",
              transform: "rotate(45deg)",
              transition: "background 0.1s",
            }}
          />
          {/* Delete button on hover */}
          {hoveredKfTime === time && (
            <div
              title="Delete keyframe"
              style={{
                position: "absolute",
                top: -8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 14,
                height: 14,
                background: "#ff4444",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: "#fff",
                fontWeight: 700,
                lineHeight: 1,
                cursor: "pointer",
                zIndex: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                removeKeyframesAtTime(layer.id, time);
                setHoveredKfTime(null);
              }}
            >
              ×
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
