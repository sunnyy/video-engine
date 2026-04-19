/**
 * CanvasPreview.jsx
 * src/ui/Editor/CanvasPreview.jsx
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { useProjectStore } from "../../store/useProjectStore";
import VideoComposition from "../../remotion/VideoComposition";
import ZoneCanvas from "./ZoneCanvas";
import { getLayoutDef } from "../../core/registries/layoutRegistry";

function nextZoneId(layoutDef, beatZones) {
  const allIds = [
    ...(layoutDef?.zones || []).map(z => z.id),
    ...Object.keys(beatZones || {}),
  ];
  let max = 0;
  for (const id of allIds) {
    const m = id?.match(/^z(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `z${max + 1}`;
}

export default function CanvasPreview({ selectedZoneIds, onSelectZone }) {
  const project           = useProjectStore((s) => s.project);
  const activeBeatId      = useProjectStore((s) => s.activeBeatId);
  const setActiveBeat     = useProjectStore((s) => s.setActiveBeat);
  const undo              = useProjectStore((s) => s.undo);
  const redo              = useProjectStore((s) => s.redo);
  const updateBeat        = useProjectStore((s) => s.updateBeat);
  const updateBeatSilent  = useProjectStore((s) => s.updateBeatSilent);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const [isPlaying,      setIsPlaying]      = useState(false);
  const [showPlayer,     setShowPlayer]     = useState(false);
  const [pausedFrame,    setPausedFrame]    = useState(null);
  const [showShortcuts,  setShowShortcuts]  = useState(false);
  const [showTimings,    setShowTimings]    = useState(() => {
    try { return document.cookie.split("; ").find(r => r.startsWith("ve_showTimings="))?.split("=")[1] !== "0"; } catch { return true; }
  });
  const [userZoom,       setUserZoom]       = useState(1.0);
  const [isSpaceDown,    setIsSpaceDown]    = useState(false);
  const [isPanning,      setIsPanning]      = useState(false);
  const [panOffset,      setPanOffset]      = useState({ x: 0, y: 0 });
  const hasPlayedOnce  = useRef(false);
  const playerRef      = useRef(null);
  const containerRef   = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 700 });

  const MIN_ZOOM  = 0.25;
  const MAX_ZOOM  = 3.0;
  const ZOOM_STEP = 0.25;
  const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
  const userZoomRef    = useRef(userZoom);
  const isSpaceDownRef = useRef(false);
  const isPanningRef   = useRef(false);
  const panOffsetRef   = useRef({ x: 0, y: 0 });
  const panStartRef    = useRef({ x: 0, y: 0 });
  const hasPannedRef   = useRef(false);
  useEffect(() => { userZoomRef.current = userZoom; }, [userZoom]);

  // Refs so keyboard handler always reads fresh values without stale closures
  const selectedZoneIdsRef = useRef(selectedZoneIds);
  const onSelectZoneRef    = useRef(onSelectZone);
  const showPlayerRef      = useRef(showPlayer);
  const pausedFrameRef     = useRef(pausedFrame);
  useEffect(() => { selectedZoneIdsRef.current = selectedZoneIds; }, [selectedZoneIds]);
  useEffect(() => { onSelectZoneRef.current = onSelectZone; }, [onSelectZone]);
  useEffect(() => { showPlayerRef.current = showPlayer; }, [showPlayer]);
  useEffect(() => { pausedFrameRef.current = pausedFrame; }, [pausedFrame]);

  if (!project) return null;

  const fps            = project.meta.fps || 25;
  const videoW         = project.meta.width  || 1080;
  const videoH         = project.meta.height || 1920;
  const is169          = project.meta.orientation === "16:9";
  const durationFrames = Math.max(1, Math.floor((project.duration_sec || 1) * fps));
  const activeBeat     = project.beats.find(b => b.id === activeBeatId);

  // Compute canvas dimensions to fit container maintaining aspect ratio.
  // For 16:9 (landscape): scale to full available width — container scrolls vertically.
  // For 9:16 (portrait):  fit within both dimensions so it never overflows.
  const availW    = Math.max(0, containerSize.width  - 16);
  const availH    = Math.max(0, containerSize.height - 24);
  // For portrait: scale by width only — height constraint caused invisible canvas
  // when containerSize.height was measured incorrectly. Overflow clips the bottom.
  const scale     = is169
    ? Math.min(availW / videoW, 1)
    : Math.min(availW / videoW, availH > 0 ? availH / videoH : 1, 1);
  const canvasW   = Math.max(0, Math.floor(videoW * scale));
  const canvasH   = Math.max(0, Math.floor(videoH * scale));

  // User-controlled zoom applied on top of the fit scale
  const effectiveCanvasW = Math.max(0, Math.floor(canvasW * userZoom));
  const effectiveCanvasH = Math.max(0, Math.floor(canvasH * userZoom));
  const effectiveScale   = scale * userZoom;

  /* ── Measure container ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setContainerSize(prev => ({
        width:  w > 50 ? w : prev.width,
        height: h > 50 ? h : prev.height,
      }));
    };

    measure(); // immediate sync read (may be 0 if flex layout not yet resolved)
    // Double-rAF ensures we read after the browser has completed layout and paint
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(measure);
    });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  /* ── Sync active beat with player ── */
  useEffect(() => {
    if (!showPlayer) return;
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      const frame = playerRef.current.getCurrentFrame();
      const currentBeat = project.beats.find(beat => {
        const start = Math.floor(beat.start_sec * fps);
        const end   = Math.floor(beat.end_sec   * fps);
        return frame >= start && frame < end;
      });
      if (currentBeat && currentBeat.id !== activeBeatId) setActiveBeat(currentBeat.id);
    }, 150);
    return () => clearInterval(interval);
  }, [project, fps, activeBeatId, showPlayer]);

  /* ── seekToBeat ── */
  useEffect(() => {
    useProjectStore.setState({
      seekToBeat: (beatId) => {
        if (!playerRef.current) return;
        const beat = project.beats.find(b => b.id === beatId);
        if (!beat) return;
        playerRef.current.pause();
        playerRef.current.seekTo(Math.floor(beat.start_sec * fps));
        setIsPlaying(false);
        setShowPlayer(false);
        hasPlayedOnce.current = false;
      },
    });
  }, [project, fps]);

  const handlePause = useCallback(() => {
    if (playerRef.current) {
      setPausedFrame(playerRef.current.getCurrentFrame());
      playerRef.current.pause();
    }
    setIsPlaying(false);
    setShowPlayer(false);
  }, []);

  const handleRestart = useCallback(() => {
    setPausedFrame(null);
    setShowPlayer(true);
    setIsPlaying(true);
    hasPlayedOnce.current = true;
    setTimeout(() => {
      if (!playerRef.current) return;
      playerRef.current.seekTo(0);
      playerRef.current.play();
    }, 60);
  }, []);

  const handlePlay = useCallback(() => {
    setShowPlayer(true);
    setIsPlaying(true);
    setTimeout(() => {
      if (!playerRef.current) return;
      // Only seek to active beat start on very first play (player at frame 0 and never played)
      if (!hasPlayedOnce.current && activeBeat && playerRef.current.getCurrentFrame() === 0) {
        playerRef.current.seekTo(Math.floor(activeBeat.start_sec * fps));
      }
      hasPlayedOnce.current = true;
      playerRef.current.play();
    }, 60);
  }, [activeBeat, fps]);

  useEffect(() => { hasPlayedOnce.current = false; setPausedFrame(null); }, [activeBeatId]);

  const handleSelectZone = useCallback((id, modifierHeld = false) => {
    if (id !== null && isPlaying) handlePause();
    // Blur any focused input/textarea so keyboard shortcuts (Delete, arrows, etc.) work immediately
    // without the user having to click outside the panel first.
    if (id !== null) {
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT" || ae.isContentEditable)) {
        ae.blur();
      }
    }
    onSelectZone(id, modifierHeld);
  }, [isPlaying, handlePause, onSelectZone]);

  const handleUpdateVideoOverlay = useCallback((voId, updates) => {
    const lp = useProjectStore.getState().project;
    updateProjectMeta({
      overlays: (lp?.overlays || []).map(o => o.id === voId ? { ...o, ...updates } : o),
    });
  }, [updateProjectMeta]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) handlePause(); else handlePlay();
  }, [isPlaying, handlePlay, handlePause]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
        || e.target.isContentEditable;

      // Global shortcuts — always work
      // Space: enter pan-ready mode; play/pause fires on keyup only if no drag happened
      if (e.code === "Space" && !isTyping) {
        e.preventDefault();
        if (!isSpaceDownRef.current) {
          isSpaceDownRef.current = true;
          setIsSpaceDown(true);
          hasPannedRef.current = false;
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ" && !e.shiftKey && !isTyping) { e.preventDefault(); undo(); return; }
      if (!isTyping && ((e.metaKey || e.ctrlKey) && e.code === "KeyY")) { e.preventDefault(); redo(); return; }
      if (!isTyping && (e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyZ") { e.preventDefault(); redo(); return; }
      // Prevent browser defaults for shortcuts we handle (Ctrl+D = bookmark, etc.)
      if (!isTyping && (e.metaKey || e.ctrlKey) && e.code === "KeyD") { e.preventDefault(); }

      // Zoom shortcuts — Ctrl+= / Ctrl++ / Ctrl+- / Ctrl+0
      if (e.metaKey || e.ctrlKey) {
        if (e.code === "Equal" || e.code === "NumpadAdd") {
          e.preventDefault();
          setUserZoom(z => clampZoom(z + ZOOM_STEP));
          return;
        }
        if (e.code === "Minus" || e.code === "NumpadSubtract") {
          e.preventDefault();
          setUserZoom(z => clampZoom(z - ZOOM_STEP));
          return;
        }
        if (e.code === "Digit0" || e.code === "Numpad0") {
          e.preventDefault();
          setUserZoom(1.0);
          setPanOffset({ x: 0, y: 0 });
          panOffsetRef.current = { x: 0, y: 0 };
          return;
        }
      }

      // ESC — deselect zone unless a modal or inline text editor is open
      if (e.code === "Escape") {
        if (document.querySelector("[data-modal]")) return;
        if (document.querySelector("[data-inline-editor]")) return; // editor handles its own Escape
        onSelectZoneRef.current(null);
        return;
      }

      // T — toggle timing badges (works even while typing is false)
      if (e.code === "KeyT" && !isTyping) {
        e.preventDefault();
        setShowTimings(t => !t);
        return;
      }

      if (isTyping) return;

      // Zone shortcuts — single or multi-select
      const ids = selectedZoneIdsRef.current;
      const isMulti = ids instanceof Set && ids.size > 1;
      const selectedZoneId = (ids instanceof Set && ids.size === 1) ? [...ids][0] : null;

      // Read fresh beat directly from store — avoids stale closure completely
      const { project: liveProject, activeBeatId: liveBeatId } = useProjectStore.getState();
      const liveBeat = liveProject?.beats?.find(b => b.id === liveBeatId);
      if (!liveBeat) return;

      const bz        = liveBeat.zones || {};
      const layoutDef = getLayoutDef(liveBeat.layout)
        ?? useProjectStore.getState().project?.meta?.inlineLayoutDef;

      // Arrow keys with NO zone selected → seek ±1 second
      if ((e.code === "ArrowLeft" || e.code === "ArrowRight") && !selectedZoneId && !isMulti) {
        e.preventDefault();
        const { project: lp } = useProjectStore.getState();
        const liveFps      = lp?.meta?.fps || 25;
        const liveDuration = Math.max(1, Math.floor((lp?.duration_sec || 1) * liveFps));
        const currentFrame = showPlayerRef.current
          ? (playerRef.current?.getCurrentFrame() ?? 0)
          : (pausedFrameRef.current ?? 0);
        const delta    = e.code === "ArrowLeft" ? -liveFps : liveFps;
        const newFrame = Math.max(0, Math.min(liveDuration - 1, currentFrame + delta));
        if (playerRef.current) playerRef.current.seekTo(newFrame);
        if (!showPlayerRef.current) setPausedFrame(newFrame);
        return;
      }

      // Arrow keys — nudge (plain = 1%, Shift = 5%) — works for single AND multi-select
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code) && (selectedZoneId || isMulti)) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.2;
        const dx = e.code === "ArrowLeft" ? -step : e.code === "ArrowRight" ? step : 0;
        const dy = e.code === "ArrowUp"   ? -step : e.code === "ArrowDown"  ? step : 0;
        const selectedIds = isMulti ? [...ids] : [selectedZoneId];
        const newZones = { ...bz };
        for (const id of selectedIds) {
          const def = layoutDef?.zones?.find(z => z.id === id) || {};
          const oz  = bz[id] || {};
          newZones[id] = { ...oz, x: (oz.x ?? def.x ?? 0) + dx, y: (oz.y ?? def.y ?? 0) + dy };
        }
        updateBeatSilent(liveBeat.id, { zones: newZones });
        return;
      }

      // Single-zone-only shortcuts below
      if (!selectedZoneId) return;

      const override = bz[selectedZoneId] || {};
      const defZone  = layoutDef?.zones?.find(z => z.id === selectedZoneId) || {};

      // Delete / Backspace — remove zone or video overlay
      if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        // Video overlay
        if (selectedZoneId.startsWith("_vo_")) {
          const voId = selectedZoneId.slice(4);
          const { project: lp } = useProjectStore.getState();
          updateProjectMeta({ overlays: (lp.overlays || []).filter(o => o.id !== voId) });
          onSelectZoneRef.current(null);
          return;
        }
        // Always track in deletedZones (matches ZonesSection.deleteZone logic).
        // This prevents the auto-save race condition where a freshly-saved custom
        // zone becomes a layout zone but only got removed from beat.zones here.
        const prev = liveBeat.deletedZones || [];
        const newDeletedZones = prev.includes(selectedZoneId) ? prev : [...prev, selectedZoneId];
        const isLayoutZone = layoutDef?.zones?.some(z => z.id === selectedZoneId);
        if (isLayoutZone) {
          updateBeat(liveBeat.id, { deletedZones: newDeletedZones });
        } else {
          const { [selectedZoneId]: _removed, ...rest } = bz;
          updateBeat(liveBeat.id, { zones: rest, deletedZones: newDeletedZones });
        }
        onSelectZoneRef.current(null);
        return;
      }

      // Ctrl+D — duplicate zone
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyD") {
        e.preventDefault();
        const x = override.x ?? defZone.x ?? 0;
        const y = override.y ?? defZone.y ?? 0;
        const newId = nextZoneId(layoutDef, bz);
        // Omit `id` from the merged data — the dict key is the zone's identity
        const { id: _ignored, ...defRest } = defZone;
        updateBeat(liveBeat.id, { zones: { ...bz, [newId]: { ...defRest, ...override, x: x + 2, y: y + 2 } } });
        onSelectZoneRef.current(newId);
        return;
      }

      // Ctrl+] — bring forward (zIndex +1)
      // Ctrl+[ — send backward (zIndex -1)
      if ((e.metaKey || e.ctrlKey) && (e.code === "BracketRight" || e.code === "BracketLeft")) {
        e.preventDefault();
        const currentZ = override.zIndex ?? defZone.zIndex ?? 0;
        const newZ = e.code === "BracketRight" ? currentZ + 1 : currentZ - 1;
        updateBeatSilent(liveBeat.id, { zones: { ...bz, [selectedZoneId]: { ...override, zIndex: newZ } } });
        return;
      }

    };
    // capture:true — fires before any child handler, nothing can stopPropagation before us
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [togglePlayPause, undo, redo, updateBeatSilent]);

  /* ── Space keyup: exit pan mode; if no drag happened, toggle play/pause ── */
  useEffect(() => {
    const onKeyUp = (e) => {
      if (e.code !== "Space") return;
      const tag = e.target.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;
      if (isTyping) return;
      isSpaceDownRef.current = false;
      setIsSpaceDown(false);
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      } else if (!hasPannedRef.current) {
        togglePlayPause();
      }
      hasPannedRef.current = false;
    };
    window.addEventListener("keyup", onKeyUp, true);
    return () => window.removeEventListener("keyup", onKeyUp, true);
  }, [togglePlayPause]);

  return (
    <div className="w-full bg-black border-l border-[rgba(255,255,255,0.06)] flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center px-3 py-[6px] border-b border-[rgba(255,255,255,0.06)] shrink-0 gap-3">
        <div className="flex items-center gap-2 text-[12px] text-[#777] font-mono">
          <span>Space ▶/⏸ · hold+drag pan</span>
          <span className="opacity-30">·</span>
          <span>⌘Z undo</span>
          <span className="opacity-30">·</span>
          <span>⌘Y redo</span>
          <span className="opacity-30">·</span>
          <span>Esc deselect</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Timing badges toggle */}
          <button
            onClick={() => setShowTimings(t => {
              const next = !t;
              try { document.cookie = `ve_showTimings=${next ? "1" : "0"};path=/;max-age=${60 * 60 * 24 * 365}`; } catch {}
              return next;
            })}
            title={`${showTimings ? "Hide" : "Show"} zone timing (T)`}
            style={{
              fontSize: 11, fontFamily: "monospace", padding: "2px 7px", borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
              background: showTimings ? "rgba(255,200,0,0.12)" : "rgba(255,255,255,0.04)",
              color: showTimings ? "rgba(255,200,0,0.9)" : "#555",
            }}
          >
            +Ts
          </button>
          {/* Zoom controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button
              onClick={() => setUserZoom(z => clampZoom(z - ZOOM_STEP))}
              disabled={userZoom <= MIN_ZOOM}
              title="Zoom out (Ctrl+-)"
              style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                background: "rgba(255,255,255,0.05)", color: "#999", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: userZoom <= MIN_ZOOM ? 0.3 : 1 }}>
              −
            </button>
            <span className="text-[11px] font-mono font-bold" style={{ color: userZoom === 1.0 ? "#555" : "#a78bfa", minWidth: 30, textAlign: "center" }}>
              {Math.round(userZoom * 100)}%
            </span>
            <button
              onClick={() => setUserZoom(z => clampZoom(z + ZOOM_STEP))}
              disabled={userZoom >= MAX_ZOOM}
              title="Zoom in (Ctrl+=)"
              style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                background: "rgba(255,255,255,0.05)", color: "#999", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: userZoom >= MAX_ZOOM ? 0.3 : 1 }}>
              +
            </button>
            {userZoom !== 1.0 && (
              <button
                onClick={() => setUserZoom(1.0)}
                title="Reset zoom (Ctrl+0)"
                style={{ height: 22, padding: "0 7px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                  background: "rgba(255,255,255,0.05)", color: "#888",
                  fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                Fit
              </button>
            )}
          </div>
          <button
            onClick={() => setShowShortcuts(true)}
            className="text-[11px] text-[#555] hover:text-[#7c5cfc] transition-colors cursor-pointer bg-transparent border-none font-mono underline underline-offset-2"
          >
            All Shortcuts
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-[#16161f] border border-white/10 rounded-xl p-6 w-[420px] flex flex-col gap-1"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#e8e8f0] tracking-wide uppercase">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)}
                className="text-[#555] hover:text-white text-lg leading-none bg-transparent border-none cursor-pointer">✕</button>
            </div>

            {[
              { section: "Playback" },
              { key: "Space",        desc: "Play / Pause" },
              { key: "← →",          desc: "Seek ±1 second (no zone selected)" },
              { section: "History" },
              { key: "⌘Z",           desc: "Undo" },
              { key: "⌘Y  /  ⌘⇧Z",  desc: "Redo" },
              { section: "Zones" },
              { key: "↑ ↓ ← →",      desc: "Nudge zone 0.2%" },
              { key: "⇧ + arrows",   desc: "Nudge zone 1%" },
              { key: "⌘D",           desc: "Duplicate zone" },
              { key: "Del / ⌫",      desc: "Remove / hide zone" },
              { key: "⇧ + drag",     desc: "Lock aspect ratio while resizing" },
              { section: "Zoom" },
              { key: "⌘=  /  ⌘+",   desc: "Zoom in" },
              { key: "⌘-",           desc: "Zoom out" },
              { key: "⌘0",           desc: "Reset zoom + pan" },
              { key: "Ctrl + scroll", desc: "Zoom in / out" },
              { key: "Space + drag",  desc: "Pan canvas" },
              { key: "Double-click",  desc: "Reset zoom + pan" },
              { section: "Selection" },
              { key: "Click",        desc: "Select zone" },
              { key: "⌘ + click",    desc: "Multi-select zones" },
              { key: "Esc",          desc: "Deselect all" },
            ].map((row, i) =>
              row.section ? (
                <div key={i} className="text-[10px] font-bold text-[#555] uppercase tracking-widest mt-3 mb-1 first:mt-0">{row.section}</div>
              ) : (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <kbd className="text-[12px] font-mono text-[#7c5cfc] bg-[#7c5cfc]/10 px-2 py-0.5 rounded">{row.key}</kbd>
                  <span className="text-[13px] text-[#aaa]">{row.desc}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Canvas area */}
      <div ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: isPanning ? "grabbing" : isSpaceDown ? "grab" : "default" }}
        onClick={() => {
          if (hasPannedRef.current) { hasPannedRef.current = false; return; }
          onSelectZoneRef.current(null);
        }}
        onMouseDown={(e) => {
          if (!isSpaceDownRef.current) return;
          e.preventDefault();
          isPanningRef.current = true;
          setIsPanning(true);
          panStartRef.current = {
            x: e.clientX - panOffsetRef.current.x,
            y: e.clientY - panOffsetRef.current.y,
          };
        }}
        onMouseMove={(e) => {
          if (!isPanningRef.current) return;
          hasPannedRef.current = true;
          const newOffset = {
            x: e.clientX - panStartRef.current.x,
            y: e.clientY - panStartRef.current.y,
          };
          panOffsetRef.current = newOffset;
          setPanOffset(newOffset);
        }}
        onMouseUp={() => {
          if (isPanningRef.current) { isPanningRef.current = false; setIsPanning(false); }
        }}
        onMouseLeave={() => {
          if (isPanningRef.current) { isPanningRef.current = false; setIsPanning(false); }
        }}
        onDoubleClick={(e) => {
          // Double-click on canvas background (not a zone) → reset pan + zoom to fit
          if (e.target === e.currentTarget) {
            setUserZoom(1.0);
            setPanOffset({ x: 0, y: 0 });
            panOffsetRef.current = { x: 0, y: 0 };
          }
        }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          setUserZoom(z => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
        }}
      >
        {/* Pan overlay — sits above zones when space is held, lets pan mousedown bubble to container */}
        {isSpaceDown && (
          <div style={{ position: "absolute", inset: 0, zIndex: 100, cursor: isPanning ? "grabbing" : "grab" }} />
        )}
      {/* Inner wrapper — translated for panning */}
      <div className="flex items-start justify-center p-2"
        style={{
          width: "100%", height: "100%",
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          transition: isPanning ? "none" : "transform 0.08s ease",
          willChange: "transform",
        }}>

        {/* Static edit canvas — Thumbnail + ZoneCanvas + controls */}
        {activeBeat && !showPlayer && (
          <div
            className={`flex gap-3 ${is169 ? "flex-col items-center" : "flex-row items-start"}`}
          >
            {/* Canvas */}
            <div style={{ position: "relative", width: effectiveCanvasW, height: effectiveCanvasH, outline: "2px solid rgba(255,255,255,0.18)", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <Thumbnail
                key={`thumb-${videoW}x${videoH}`}
                acknowledgeRemotionLicense
                component={VideoComposition}
                inputProps={{ project, previewMode: true }}
                frameToDisplay={(() => {
                  const beatStart    = Math.floor((activeBeat.start_sec || 0) * fps);
                  const beatEnd      = Math.floor((activeBeat.end_sec   || 0) * fps) - 1;
                  // After pausing: clamp to active beat's range to avoid showing two beats at once
                  // when the player stopped exactly on a beat boundary frame.
                  if (pausedFrame !== null) return Math.max(beatStart, Math.min(beatEnd, pausedFrame));
                  // First load (never played): show beat in its "settled" state
                  const beatDuration = beatEnd - beatStart + 1;
                  const zones = Object.values(activeBeat.zones || {});
                  const maxZoneStartFrame = zones.reduce((max, z) => Math.max(max, Math.floor((z.start || 0) * fps)), 0);
                  const settled = maxZoneStartFrame + 30;
                  return beatStart + Math.min(settled, beatDuration - 1);
                })()}
                compositionWidth={videoW}
                compositionHeight={videoH}
                fps={fps}
                durationInFrames={durationFrames}
                style={{ width: effectiveCanvasW, height: effectiveCanvasH, borderRadius: 8, overflow: "hidden", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0 }}>
                <ZoneCanvas
                  beat={activeBeat}
                  selectedZoneIds={selectedZoneIds}
                  onSelectZone={handleSelectZone}
                  canvasW={effectiveCanvasW}
                  canvasH={effectiveCanvasH}
                  canvasScale={effectiveScale}
                  videoOverlays={project.overlays || []}
                  onUpdateVideoOverlay={handleUpdateVideoOverlay}
                  showTimings={showTimings}
                />
              </div>
            </div>

            {/* Controls — right side for 9:16, bottom for 16:9 */}
            <div className={`flex gap-2 ${is169 ? "flex-row" : "flex-col"}`}>
              <button onClick={handlePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white border-0 cursor-pointer transition-all hover:scale-110 text-[16px]"
                style={{ background: "rgba(124,92,252,0.85)", backdropFilter: "blur(8px)" }}
                title="Play">
                ▶
              </button>
              <button onClick={handleRestart}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white border-0 cursor-pointer transition-all hover:scale-110 text-[16px]"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
                title="Restart">
                ↺
              </button>
            </div>
          </div>
        )}

        {!activeBeat && !showPlayer && (
          <div className="text-[#55556a] text-[13px]">Select a beat to edit</div>
        )}

        {/* Remotion Player — same flow position as Thumbnail so alignment matches exactly */}
        {/* Always mounted (display toggle) so Player preserves its frame position on pause/play */}
        <div
          className={`flex gap-3 ${is169 ? "flex-col items-center" : "flex-row items-start"}`}
          style={{ display: showPlayer ? "flex" : "none" }}
        >
            <Player
              key={`player-${videoW}x${videoH}`}
              ref={playerRef}
              acknowledgeRemotionLicense
              component={VideoComposition}
              inputProps={{ project }}
              durationInFrames={durationFrames}
              compositionWidth={videoW}
              compositionHeight={videoH}
              fps={fps}
              controls={false}
              numberOfSharedAudioTags={16}
              style={{ width: effectiveCanvasW, height: effectiveCanvasH, borderRadius: 8, overflow: "hidden", outline: "2px solid rgba(255,255,255,0.18)", flexShrink: 0 }}
              onEnded={() => {
                setIsPlaying(false);
                setShowPlayer(false);
                setPausedFrame(null);
                hasPlayedOnce.current = false;
              }}
            />

            {/* Controls — right side for 9:16, bottom for 16:9 */}
            <div className={`flex gap-2 ${is169 ? "flex-row" : "flex-col"}`}>
              <button onClick={handlePause}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white border-0 cursor-pointer transition-all hover:scale-110 text-[16px]"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
                title="Pause">
                ⏸
              </button>
              <button onClick={handleRestart}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white border-0 cursor-pointer transition-all hover:scale-110 text-[16px]"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
                title="Restart">
                ↺
              </button>
            </div>
        </div>

      </div>{/* end pan-transform inner wrapper */}

      </div>{/* end canvas area outer */}
    </div>
  );
}