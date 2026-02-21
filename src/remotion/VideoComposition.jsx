import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import BeatRenderer from "./BeatRenderer";
import AvatarLayer from "./elements/AvatarLayer";

export default function VideoComposition({ project }) {
  if (!project) return null;

  const { beats, meta, avatar } = project;
  const fps = meta.fps;
  const totalDurationFrames = Math.floor(project.duration_sec * fps);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        width: meta.width,
        height: meta.height,
      }}
    >
      {/* Layouts FIRST */}
      {beats.map((beat) => {
        const startFrame = Math.floor(beat.start_sec * fps);
        const rawDuration = (beat.end_sec - beat.start_sec) * fps;
        const durationFrames = Math.max(1, Math.floor(rawDuration));

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

      {/* Avatar ABOVE layout backgrounds but BELOW captions */}
      {meta.mode === "talking_head" && avatar?.src && (
        <Sequence from={0} durationInFrames={totalDurationFrames}>
          <AvatarLayer avatar={avatar} project={project} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}