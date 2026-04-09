/**
 * CanvasPreview.jsx
 * src/ui/Editor/CanvasPreview.jsx
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { useProjectStore } from "../../store/useProjectStore";
import VideoComposition from "../../remotion/VideoComposition";
import ZoneCanvas from "./ZoneCanvas";
import { getLayoutDef } from "../../core/layoutRegistry";

export default function CanvasPreview({ selectedZoneIds, onSelectZone }) {
  const project           = useProjectStore((s) => s.project);
  const activeBeatId      = useProjectStore((s) => s.activeBeatId);
  const setActiveBeat     = useProjectStore((s) => s.setActiveBeat);
  const undo              = useProjectStore((s) => s.undo);
  const redo              = useProjectStore((s) => s.redo);
  const updateBeat        = useProjectStore((s) => s.updateBeat);
  const updateBeatSilent  = useProjectStore((s) => s.updateBeatSilent);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [showPlayer,  setShowPlayer]  = useState(false);
  const [pausedFrame, setPausedFrame] = useState(null);
  const hasPlayedOnce = useRef(false);
  const playerRef     = useRef(null);
  const containerRef  = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 700 });

  // Refs so keyboard handler always reads fresh values without stale closures
  const selectedZoneIdsRef = useRef(selectedZoneIds);
  const onSelectZoneRef    = useRef(onSelectZone);
  useEffect(() => { selectedZoneIdsRef.current = selectedZoneIds; }, [selectedZoneIds]);
  useEffect(() => { onSelectZoneRef.current = onSelectZone; }, [onSelectZone]);

  if (!project) return null;

  const fps            = project.meta.fps || 25;
  const videoW         = project.meta.width  || 1080;
  const videoH         = project.meta.height || 1920;
  const is169          = project.meta.orientation === "16:9";
  const durationFrames = Math.max(1, Math.floor((project.duration_sec || 1) * fps));
  const activeBeat     = project.beats.find(b => b.id === activeBeatId);

  // Compute canvas dimensions to fit container maintaining aspect ratio
  const availW    = containerSize.width  - 16;
  const availH    = containerSize.height - 16;
  const scale     = Math.min(availW / videoW, availH / videoH, 1);
  const canvasW   = Math.floor(videoW * scale);
  const canvasH   = Math.floor(videoH * scale);

  /* ── Measure container ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
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
      if (!hasPlayedOnce.current && activeBeat) {
        playerRef.current.seekTo(Math.floor(activeBeat.start_sec * fps));
      }
      hasPlayedOnce.current = true;
      playerRef.current.play();
    }, 60);
  }, [activeBeat, fps]);

  useEffect(() => { hasPlayedOnce.current = false; setPausedFrame(null); }, [activeBeatId]);

  const handleSelectZone = useCallback((id, modifierHeld = false) => {
    if (id !== null && isPlaying) handlePause();
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
      if (e.code === "Space" && !isTyping) { e.preventDefault(); togglePlayPause(); return; }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ" && !e.shiftKey && !isTyping) { e.preventDefault(); undo(); return; }
      if (!isTyping && ((e.metaKey || e.ctrlKey) && e.code === "KeyY")) { e.preventDefault(); redo(); return; }
      if (!isTyping && (e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyZ") { e.preventDefault(); redo(); return; }

      if (isTyping) return;

      // ESC — deselect zone, but not if a modal is open
      if (e.code === "Escape") {
        if (document.querySelector("[data-modal]")) return;
        onSelectZoneRef.current(null);
        return;
      }

      // Zone shortcuts — only when exactly one zone is selected
      const ids = selectedZoneIdsRef.current;
      const selectedZoneId = (ids instanceof Set && ids.size === 1) ? [...ids][0] : null;
      if (!selectedZoneId) return;

      // Read fresh beat directly from store — avoids stale closure completely
      const { project: liveProject, activeBeatId: liveBeatId } = useProjectStore.getState();
      const liveBeat = liveProject?.beats?.find(b => b.id === liveBeatId);
      if (!liveBeat) return;

      const bz       = liveBeat.zones || {};
      const override = bz[selectedZoneId] || {};
      const layoutDef = getLayoutDef(liveBeat.layout);
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
        const isLayoutZone = layoutDef?.zones?.some(z => z.id === selectedZoneId);
        if (isLayoutZone) {
          updateBeat(liveBeat.id, {
            zones: { ...bz, [selectedZoneId]: { ...override, hidden: true } },
          });
        } else {
          const { [selectedZoneId]: _removed, ...rest } = bz;
          updateBeat(liveBeat.id, { zones: rest });
        }
        onSelectZoneRef.current(null);
        return;
      }

      // Ctrl+D — duplicate zone
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyD") {
        e.preventDefault();
        const x = override.x ?? defZone.x ?? 0;
        const y = override.y ?? defZone.y ?? 0;
        const newId = `z_dup_${Date.now()}`;
        updateBeat(liveBeat.id, { zones: { ...bz, [newId]: { ...defZone, ...override, x: x + 2, y: y + 2 } } });
        onSelectZoneRef.current(newId);
        return;
      }

      // Arrow keys — nudge zone (plain arrow = 1%, Shift+arrow = 5%)
      // Works with or without Ctrl/Cmd — avoids OS-level interception of Ctrl+Arrow on Windows
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code)) {
        e.preventDefault();
        let x = override.x ?? defZone.x ?? 0;
        let y = override.y ?? defZone.y ?? 0;
        const step = e.shiftKey ? 5 : 1;
        if (e.code === "ArrowLeft")  x -= step;
        if (e.code === "ArrowRight") x += step;
        if (e.code === "ArrowUp")    y -= step;
        if (e.code === "ArrowDown")  y += step;
        updateBeatSilent(liveBeat.id, { zones: { ...bz, [selectedZoneId]: { ...override, x, y } } });
        return;
      }
    };
    // capture:true — fires before any child handler, nothing can stopPropagation before us
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [togglePlayPause, undo, redo, updateBeatSilent]);

  return (
    <div className="w-full bg-black border-l border-[rgba(255,255,255,0.06)] flex flex-col h-full">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-[6px] border-b border-[rgba(255,255,255,0.06)] shrink-0">
        {activeBeat && (
          <span className="text-[10px] font-mono text-[#55556a]">{activeBeat.layout}</span>
        )}
        {selectedZoneIds?.size > 1 && (
          <span className="text-[10px] font-mono text-[#7c5cfc]">{selectedZoneIds.size} selected</span>
        )}
        <div className="ml-auto flex items-center gap-1 text-[12px] text-[#777] font-mono">
          <span>Space ▶/⏸</span>
          <span className="mx-1 opacity-30">·</span>
          <span>⌘Z undo</span>
          <span className="mx-1 opacity-30">·</span>
          <span>⌘Y redo</span>
          <span className="mx-1 opacity-30">·</span>
          <span>⌘D dup</span>
          <span className="mx-1 opacity-30">·</span>
          <span>↑↓←→ move</span>
          <span className="mx-1 opacity-30">·</span>
          <span>Del remove</span>
          <span className="mx-1 opacity-30">·</span>
          <span>Esc deselect</span>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative flex items-start justify-center overflow-hidden p-2">

        {/* Static edit canvas — Thumbnail + ZoneCanvas + controls */}
        {activeBeat && !showPlayer && (
          <div
            className={`flex gap-3 ${is169 ? "flex-col items-center" : "flex-row items-start"}`}
          >
            {/* Canvas */}
            <div style={{ position: "relative", width: canvasW, height: canvasH }}>
              <Thumbnail
                key={`thumb-${videoW}x${videoH}`}
                acknowledgeRemotionLicense
                component={VideoComposition}
                inputProps={{ project, previewMode: true }}
                frameToDisplay={(() => {
                  // After pausing: show exactly where the player stopped
                  if (pausedFrame !== null) return pausedFrame;
                  // First load (never played): show beat in its "settled" state
                  const beatStart    = Math.floor((activeBeat.start_sec || 0) * fps);
                  const beatDuration = Math.floor(((activeBeat.end_sec || 0) - (activeBeat.start_sec || 0)) * fps);
                  const zones = Object.values(activeBeat.zones || {});
                  const maxZoneStartFrame = zones.reduce((max, z) => Math.max(max, Math.floor((z.start || 0) * fps)), 0);
                  const settled = maxZoneStartFrame + 30;
                  return beatStart + Math.min(settled, beatDuration - 1);
                })()}
                compositionWidth={videoW}
                compositionHeight={videoH}
                fps={fps}
                durationInFrames={durationFrames}
                style={{ width: canvasW, height: canvasH, borderRadius: 8, overflow: "hidden", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0 }}>
                <ZoneCanvas
                  beat={activeBeat}
                  selectedZoneIds={selectedZoneIds}
                  onSelectZone={handleSelectZone}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  canvasScale={scale}
                  videoOverlays={project.overlays || []}
                  onUpdateVideoOverlay={handleUpdateVideoOverlay}
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

        {/* Remotion Player — overlays when playing */}
        <div style={{
          display:  showPlayer ? "flex" : "none",
          position: "absolute", inset: 0,
          alignItems: "flex-start", justifyContent: "center",
          background: "#111118", zIndex: 50,
          padding: 8,
        }}>
          <div className={`flex gap-3 ${is169 ? "flex-col items-center" : "flex-row items-start"}`}>
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
              style={{ width: canvasW, height: canvasH, borderRadius: 8, overflow: "hidden" }}
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
        </div>

      </div>
    </div>
  );
}