import React, { useEffect, useRef } from "react";
import { Player } from "@remotion/player";
import { useProjectStore } from "../../store/useProjectStore";
import VideoComposition from "../../remotion/VideoComposition";

export default function Preview() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);
  const setActiveBeat = useProjectStore((s) => s.setActiveBeat);

  const playerRef = useRef(null);
  const isSeekingRef = useRef(false);

  if (!project) return null;

  if (!project.workflow?.beats_initialized) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">Complete previous steps to preview</div>
    );
  }

  const fps = project.meta.fps;
  const durationFrames = Math.max(1, Math.floor(project.duration_sec * fps));

  // Seek only when user explicitly selects beat
  useEffect(() => {
    if (!isSeekingRef.current) return;
    if (!playerRef.current) return;

    const beat = project.beats.find((b) => b.id === activeBeatId);
    if (!beat) return;

    const frame = Math.floor(beat.start_sec * fps);
    playerRef.current.seekTo(frame);

    isSeekingRef.current = false;
  }, [activeBeatId]);

  // Sync highlight while playing (no seek)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current) return;

      const frame = playerRef.current.getCurrentFrame();

      const currentBeat = project.beats.find((beat) => {
        const start = Math.floor(beat.start_sec * fps);
        const end = Math.floor(beat.end_sec * fps);
        return frame >= start && frame < end;
      });

      if (currentBeat && currentBeat.id !== activeBeatId) {
        setActiveBeat(currentBeat.id);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [project, fps, activeBeatId]);

  useEffect(() => {
    useProjectStore.setState({
      seekToBeat: (beatId) => {
        if (!playerRef.current) return;

        const beat = project.beats.find((b) => b.id === beatId);
        if (!beat) return;

        const frame = Math.floor(beat.start_sec * fps);

        playerRef.current.pause();
        playerRef.current.seekTo(frame);
      },
    });
  }, [project, fps]);

  return (
    <div className="bg-white p-4 rounded-xl w-[40%] flex justify-center items-start">
      <Player
        ref={playerRef}
        component={VideoComposition}
        inputProps={{ project }}
        durationInFrames={durationFrames}
        compositionWidth={project.meta.width}
        compositionHeight={project.meta.height}
        fps={fps}
        controls
        style={{ maxHeight: 700 }}
      />
    </div>
  );
}
