/**
 * CanvasPreview.jsx
 * src/ui/Editor/CanvasPreview.jsx
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Player } from "@remotion/player";
import { useProjectStore } from "../../store/useProjectStore";
import VideoComposition from "../../remotion/VideoComposition";
import ZoneCanvas from "./ZoneCanvas";

export default function CanvasPreview({ selectedZoneIds, onSelectZone }) {
  const project       = useProjectStore((s) => s.project);
  const activeBeatId  = useProjectStore((s) => s.activeBeatId);
  const setActiveBeat = useProjectStore((s) => s.setActiveBeat);
  const undo          = useProjectStore((s) => s.undo);
  const redo          = useProjectStore((s) => s.redo);

  const [isPlaying,  setIsPlaying]  = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const hasPlayedOnce = useRef(false);
  const playerRef     = useRef(null);
  const containerRef  = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 700 });

  if (!project) return null;

  const fps            = project.meta.fps || 25;
  const videoW         = project.meta.width  || 1080;
  const videoH         = project.meta.height || 1920;
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
    if (playerRef.current) playerRef.current.pause();
    setIsPlaying(false);
    setShowPlayer(false);
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

  useEffect(() => { hasPlayedOnce.current = false; }, [activeBeatId]);

  const handleSelectZone = useCallback((id, modifierHeld = false) => {
    if (id !== null && isPlaying) handlePause();
    onSelectZone(id, modifierHeld);
  }, [isPlaying, handlePause, onSelectZone]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) handlePause(); else handlePlay();
  }, [isPlaying, handlePlay, handlePause]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e) => {
      const isTyping = ["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName);
      if (e.code === "Space" && !isTyping) { e.preventDefault(); togglePlayPause(); return; }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ" && !e.shiftKey && !isTyping) { e.preventDefault(); undo(); return; }
      if (((e.metaKey || e.ctrlKey) && e.code === "KeyY") ||
          ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyZ")) {
        if (!isTyping) { e.preventDefault(); redo(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlayPause, undo, redo]);

  return (
    <div className="w-full bg-[#111118] border-l border-[rgba(255,255,255,0.06)] flex flex-col h-full">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-[6px] border-b border-[rgba(255,255,255,0.06)] shrink-0">
        {activeBeat && (
          <span className="text-[10px] font-mono text-[#55556a]">{activeBeat.layout}</span>
        )}
        {selectedZoneIds?.size > 1 && (
          <span className="text-[10px] font-mono text-[#7c5cfc]">{selectedZoneIds.size} selected</span>
        )}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-[#55556a] font-mono">
          <span>Space ▶/⏸</span>
          <span className="mx-1 opacity-30">·</span>
          <span>⌘Z undo</span>
          <span className="mx-1 opacity-30">·</span>
          <span>⌘Y redo</span>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden p-2">

        {/* ZoneCanvas — always mounted, hidden behind player when playing */}
        {activeBeat && (
          <div style={{ display: showPlayer ? "none" : "flex", alignItems: "center", justifyContent: "center" }}>
            <ZoneCanvas
              beat={activeBeat}
              selectedZoneIds={selectedZoneIds}
              onSelectZone={handleSelectZone}
              canvasW={canvasW}
              canvasH={canvasH}
              canvasScale={scale}
            />
          </div>
        )}

        {!activeBeat && !showPlayer && (
          <div className="text-[#55556a] text-[13px]">Select a beat to edit</div>
        )}

        {/* Remotion Player — overlays when playing */}
        <div style={{
          display:  showPlayer ? "flex" : "none",
          position: "absolute", inset: 0,
          alignItems: "center", justifyContent: "center",
          background: "#111118", zIndex: 50,
        }}>
          <Player
            ref={playerRef}
            acknowledgeRemotionLicense
            component={VideoComposition}
            inputProps={{ project }}
            durationInFrames={durationFrames}
            compositionWidth={videoW}
            compositionHeight={videoH}
            fps={fps}
            controls={false}
            style={{ width: canvasW, height: canvasH, borderRadius: 8, overflow: "hidden" }}
          />
        </div>

        {/* Play button */}
        {!showPlayer && (
          <button onClick={handlePlay}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-[7px] rounded-full text-[12px] font-bold text-white border-0 cursor-pointer transition-all hover:scale-105"
            style={{ background: "rgba(124,92,252,0.85)", backdropFilter: "blur(8px)", zIndex: 10 }}>
            ▶ Play
          </button>
        )}

        {/* Pause button */}
        {showPlayer && (
          <button onClick={handlePause}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-[7px] rounded-full text-[12px] font-bold text-white border-0 cursor-pointer transition-all hover:scale-105"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 60 }}>
            ⏸ Pause
          </button>
        )}

      </div>
    </div>
  );
}