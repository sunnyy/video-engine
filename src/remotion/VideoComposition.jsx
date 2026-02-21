import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { useProjectStore } from "../store/useProjectStore";
import BeatRenderer from "./BeatRenderer";

export default function VideoComposition() {
  const project = useProjectStore((s) => s.project);

  if (!project) return null;

  const { beats, meta } = project;
  const fps = meta.fps;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        width: meta.width,
        height: meta.height,
      }}
    >
      {beats.map((beat) => {
        const startFrame = Math.floor(beat.start_sec * fps);
        const durationFrames = Math.floor(
          (beat.end_sec - beat.start_sec) * fps
        );

        return (
          <Sequence
            key={beat.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <BeatRenderer beat={beat} project={project} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}