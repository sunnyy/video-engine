import { useRef, useCallback } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import TimelineTrack from "./TimelineTrack";

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

  const scrollRef = useRef(null);
  const isDraggingPlayhead = useRef(false);

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
    setIsPlaying(false);
    const onMove = (me) => setCurrentTime(clientXToTime(me.clientX));
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      isDraggingPlayhead.current = false;
      setCurrentTime(clientXToTime(me.clientX));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onRulerMouseDown = (e) => {
    setIsPlaying(false);
    setCurrentTime(clientXToTime(e.clientX));
  };

  const interval = tickInterval(pps);
  const ticks = [];
  for (let t = 0; t <= duration; t += interval) ticks.push(t);

  const playheadX = LABEL_W + currentTime * pps;

  return (
    <div
      style={{
        height: TIMELINE_H,
        background: "#0d0d18",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
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
            trackGroups.map((trackLayers) => (
              <TimelineTrack
                key={trackLayers[0].trackId ?? trackLayers[0].id}
                layers={trackLayers}
                pps={pps}
              />
            ))
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
          </div>
        </div>
      </div>
    </div>
  );
}
