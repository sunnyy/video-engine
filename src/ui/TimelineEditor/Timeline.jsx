import { useRef, useCallback, useState, useEffect } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import TimelineTrack, { TRACK_H } from "./TimelineTrack";

const LABEL_W = 60;
const RULER_H = 28;
const TIMELINE_H = 230;

function tickInterval(pps) {
  if (pps >= 100) return 1;
  if (pps >= 40) return 2;
  if (pps >= 15) return 5;
  return 10;
}

function formatRulerTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}s`;
}

export default function Timeline() {
  const project = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const duration = useTimelineStore((s) => s.duration);
  const zoom = useTimelineStore((s) => s.zoom);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const reorderTrackGroups = useTimelineStore((s) => s.reorderTrackGroups);
  const selectedLayerId = useTimelineStore((s) => s.selectedLayerId);

  const scrollRef = useRef(null);
  const isDraggingPlayhead = useRef(false);
  const dragSrcIdx = useRef(null);
  const [dropIndicatorIdx, setDropIndicatorIdx] = useState(null);

  // Cross-track clip drag state
  const [crossDragLayerId, setCrossDragLayerId] = useState(null);
  const [crossDragTargetIdx, setCrossDragTargetIdx] = useState(null); // number | 'new' | null
  // Stable ref to latest trackGroups so callbacks don't go stale
  const trackGroupsRef = useRef([]);

  const pps = 80 * zoom;
  const totalWidth = Math.max(duration * pps + 80, 200);

  const rawLayers = project
    ? [...project.layers].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))
    : [];

  // Group layers by trackId so split clips share the same timeline row.
  // Preserve the order of first appearance (determined by zIndex sort above).
  const trackGroups = [];
  const trackMap = new Map();
  for (const layer of rawLayers) {
    const tid = layer.trackId ?? layer.id;
    if (!trackMap.has(tid)) {
      const group = [];
      trackMap.set(tid, group);
      trackGroups.push(group);
    }
    trackMap.get(tid).push(layer);
  }

  // Keep trackGroupsRef current so stable callbacks can read latest groups
  useEffect(() => { trackGroupsRef.current = trackGroups; });

  // Scroll horizontally + vertically to follow playhead and active layers during playback
  useEffect(() => {
    if (!isPlaying || !scrollRef.current || isDraggingPlayhead.current) return;
    const el = scrollRef.current;

    // Horizontal: keep playhead in view
    const headX = LABEL_W + currentTime * pps;
    const margin = 80;
    if (headX > el.scrollLeft + el.clientWidth - margin) {
      el.scrollLeft = headX - el.clientWidth / 2;
    } else if (headX < el.scrollLeft + LABEL_W) {
      el.scrollLeft = Math.max(0, headX - LABEL_W - margin);
    }

    // Vertical: keep the first active track row in view
    const tg = trackGroupsRef.current;
    const activeIdx = tg.findIndex((g) =>
      g.some((l) => currentTime >= l.start && currentTime < l.end)
    );
    if (activeIdx !== -1) {
      const trackTop = RULER_H + activeIdx * TRACK_H;
      const trackBottom = trackTop + TRACK_H;
      if (trackTop < el.scrollTop + RULER_H) {
        el.scrollTop = trackTop - RULER_H;
      } else if (trackBottom > el.scrollTop + el.clientHeight) {
        el.scrollTop = trackBottom - el.clientHeight;
      }
    }
  }, [currentTime, isPlaying, pps]);

  // Scroll selected layer's track row into view
  useEffect(() => {
    if (!selectedLayerId || !scrollRef.current) return;
    const idx = trackGroupsRef.current.findIndex((g) => g.some((l) => l.id === selectedLayerId));
    if (idx === -1) return;
    const trackTop = RULER_H + idx * TRACK_H;
    const trackBottom = trackTop + TRACK_H;
    const el = scrollRef.current;
    if (trackTop < el.scrollTop + RULER_H) {
      el.scrollTo({ top: trackTop - RULER_H, behavior: "smooth" });
    } else if (trackBottom > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: trackBottom - el.clientHeight, behavior: "smooth" });
    }
  }, [selectedLayerId]);

  // Stable helper — maps clientY to track group index using scroll-aware math
  const clientYToTrackIdx = useCallback((clientY) => {
    const el = scrollRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const relY = clientY - rect.top + el.scrollTop - RULER_H;
    if (relY < 0) return null;
    return Math.floor(relY / TRACK_H);
  }, []);

  // Stable cross-track callbacks — read fresh state via refs
  const onCrossTrackMove = useCallback((layerId, clientY) => {
    setCrossDragLayerId(layerId);
    const idx = clientYToTrackIdx(clientY);
    if (idx === null) { setCrossDragTargetIdx(null); return; }
    setCrossDragTargetIdx(idx >= trackGroupsRef.current.length ? "new" : idx);
  }, [clientYToTrackIdx]);

  const onCrossTrackDrop = useCallback((layerId, clientY) => {
    setCrossDragLayerId(null);
    setCrossDragTargetIdx(null);
    const idx = clientYToTrackIdx(clientY);
    if (idx === null) return;
    const tg = trackGroupsRef.current;
    const store = useTimelineStore.getState();
    const layer = store.project?.layers?.find((l) => l.id === layerId);
    if (!layer) return;
    const currentTrackId = layer.trackId ?? layer.id;
    if (idx >= tg.length) {
      // Drop on new-track zone — give clip its own unique row
      if (currentTrackId !== layerId) store.moveClipToTrack(layerId, layerId);
    } else {
      const targetTrackId = tg[idx][0].trackId ?? tg[idx][0].id;
      if (targetTrackId !== currentTrackId) store.moveClipToTrack(layerId, targetTrackId);
    }
  }, [clientYToTrackIdx]);

  const clientXToTime = useCallback(
    (clientX) => {
      const el = scrollRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft - LABEL_W;
      return Math.max(0, Math.min(duration, x / pps));
    },
    [pps, duration]
  );

  const onPlayheadMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    isDraggingPlayhead.current = true;
    const wasPlaying = useTimelineStore.getState().isPlaying;
    setIsPlaying(false);
    const onMove = (me) => setCurrentTime(clientXToTime(me.clientX));
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      isDraggingPlayhead.current = false;
      setCurrentTime(clientXToTime(me.clientX));
      if (wasPlaying) setIsPlaying(true);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onRulerMouseDown = (e) => {
    const wasPlaying = useTimelineStore.getState().isPlaying;
    setIsPlaying(false);
    setCurrentTime(clientXToTime(e.clientX));
    if (wasPlaying) setIsPlaying(true);
  };

  const interval = tickInterval(pps);
  const ticks = [];
  for (let t = 0; t <= duration; t += interval) ticks.push(t);

  const playheadX = LABEL_W + currentTime * pps;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        background: "#0d0d18",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        id="timeline-scroll"
        ref={scrollRef}
        className="dark-scroll"
        style={{ flex: 1, overflowX: "auto", overflowY: "auto", position: "relative" }}
      >
        <div style={{ width: LABEL_W + totalWidth, minHeight: "100%", position: "relative" }}>

          {/* ── Ruler ── */}
          <div
            style={{
              height: RULER_H,
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "#111118",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              cursor: "pointer",
              userSelect: "none",
            }}
            onMouseDown={onRulerMouseDown}
          >
            {/* Sticky label spacer */}
            <div
              style={{
                width: LABEL_W,
                flexShrink: 0,
                position: "sticky",
                left: 0,
                zIndex: 11,
                background: "#111118",
                borderRight: "1px solid rgba(255,255,255,0.08)",
              }}
            />

            {/* Ticks */}
            <div style={{ position: "relative", flex: 1 }}>
              {ticks.map((t) => (
                <div
                  key={t}
                  style={{
                    position: "absolute",
                    left: t * pps,
                    top: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ width: 1, height: 7, background: "rgba(255,255,255,0.2)", marginTop: "auto" }} />
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8888a8",
                      paddingLeft: 4,
                      lineHeight: 1,
                      marginTop: 2,
                    }}
                  >
                    {formatRulerTime(t)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tracks ── */}
          {trackGroups.length === 0 ? (
            <div style={{ padding: "18px 0 18px 72px", color: "#44445a", fontSize: 12, userSelect: "none" }}>
              Add a layer to see it on the timeline
            </div>
          ) : (
            trackGroups.map((trackLayers, idx) => (
              <TimelineTrack
                key={trackLayers[0].trackId ?? trackLayers[0].id}
                layers={trackLayers}
                pps={pps}
                isDragOver={dropIndicatorIdx === idx}
                onLabelDragStart={(e) => {
                  dragSrcIdx.current = idx;
                  e.dataTransfer.effectAllowed = "move";
                }}
                onLabelDragOver={(e) => {
                  e.preventDefault();
                  if (dragSrcIdx.current !== null && dragSrcIdx.current !== idx) {
                    setDropIndicatorIdx(idx);
                  }
                }}
                onLabelDrop={(e) => {
                  e.preventDefault();
                  const src = dragSrcIdx.current;
                  dragSrcIdx.current = null;
                  setDropIndicatorIdx(null);
                  if (src === null || src === idx) return;
                  const ids = trackGroups.map((g) => g[0].trackId ?? g[0].id);
                  const movedId = ids[src];
                  const filtered = ids.filter((_, i) => i !== src);
                  const insertAt = idx > src ? idx - 1 : idx;
                  filtered.splice(insertAt, 0, movedId);
                  reorderTrackGroups(filtered);
                }}
                onLabelDragEnd={() => {
                  dragSrcIdx.current = null;
                  setDropIndicatorIdx(null);
                }}
                isClipDragTarget={crossDragTargetIdx === idx}
                crossDragLayerId={crossDragLayerId}
                onCrossTrackMove={onCrossTrackMove}
                onCrossTrackDrop={onCrossTrackDrop}
              />
            ))
          )}

          {/* New-track drop zone — appears below all tracks while cross-track dragging */}
          {crossDragLayerId && (
            <div
              style={{
                height: TRACK_H,
                margin: "3px 0",
                borderRadius: 5,
                border: `1.5px dashed ${crossDragTargetIdx === "new" ? "#7c5cfc" : "rgba(124,92,252,0.3)"}`,
                background: crossDragTargetIdx === "new" ? "rgba(124,92,252,0.08)" : "transparent",
                display: "flex",
                alignItems: "center",
                paddingLeft: LABEL_W + 12,
                color: crossDragTargetIdx === "new" ? "#9070f0" : "#44445a",
                fontSize: 11,
                transition: "all 0.1s",
                userSelect: "none",
                pointerEvents: "none",
              }}
            >
              + New track
            </div>
          )}

          {/* ── Playhead ── */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: playheadX,
              width: 1,
              bottom: 0,
              background: "#ff4444",
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            {/* Triangle head */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: -6,
                width: 13,
                height: RULER_H,
                cursor: "ew-resize",
                pointerEvents: "all",
                display: "flex",
                justifyContent: "center",
              }}
              onMouseDown={onPlayheadMouseDown}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "9px solid #ff4444",
                  position: "absolute",
                  top: 0,
                }}
              />
            </div>
            {/* Full-height grab strip */}
            <div
              style={{
                position: "absolute",
                top: RULER_H,
                left: -5,
                width: 11,
                bottom: 0,
                cursor: "ew-resize",
                pointerEvents: "all",
              }}
              onMouseDown={onPlayheadMouseDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
