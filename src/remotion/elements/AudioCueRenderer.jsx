import React from "react";
import { Audio, Sequence, useVideoConfig } from "remotion";

const SOUND_LIBRARY = {
  impact: "/sfx/impact.mp3",
  whoosh: "/sfx/whoosh.mp3",
  tick: "/sfx/tick.mp3",
  click: "/sfx/click.mp3",
  soft_hit: "/sfx/soft_hit.mp3"
};

export default function AudioCueRenderer({ beat }) {

  const { fps } = useVideoConfig();

  if (!beat?.audio_cues?.length) return null;

  return (
    <>
      {beat.audio_cues.map((cue, i) => {

        const src = SOUND_LIBRARY[cue.type];
        if (!src) return null;

        const offset = Math.floor((cue.position || 0) * fps);

        return (
          <Sequence
            key={i}
            from={offset}
            durationInFrames={fps * 2}
          >
            <Audio
              src={src}
              volume={cue.volume ?? 1}
            />
          </Sequence>
        );

      })}
    </>
  );
}