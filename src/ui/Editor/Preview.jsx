import React, { useEffect, useRef } from "react";
import { Player } from "@remotion/player";
import VideoComposition from "../../remotion/VideoComposition";
import { useProjectStore } from "../../store/useProjectStore";

export default function Preview() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  const playerRef = useRef(null);

  if (!project) return null;

  const activeBeat = project.beats.find(
    (b) => b.id === activeBeatId
  );

  useEffect(() => {
    if (!activeBeat || !playerRef.current) return;

    const frame = Math.floor(
      activeBeat.start_sec * project.meta.fps
    );

    playerRef.current.seekTo(frame);
  }, [activeBeatId]);

  return (
    <div className="bg-white rounded-xl">
      <Player
        ref={playerRef}
        component={VideoComposition}
        durationInFrames={Math.floor(
          project.duration_sec * project.meta.fps
        )}
        fps={project.meta.fps}
        compositionWidth={project.meta.width}
        compositionHeight={project.meta.height}
        controls
         style={{
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          maxHeight: "600px"
        }}
      />
    </div>
  );
}