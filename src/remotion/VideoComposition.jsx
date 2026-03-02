import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Audio,
} from "remotion";
import BeatRenderer from "./BeatRenderer";
import AvatarLayer from "./elements/AvatarLayer";
import Caption from "./elements/Caption";
import ComponentsRenderer from "./elements/ComponentsRenderer";
import { beatTransitionRegistry } from "../core/beatTransitionRegistry";

export default function VideoComposition({ project }) {
  if (!project) return null;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { beats, meta, avatar, music } = project;
  const totalDurationFrames = Math.floor(project.duration_sec * fps);

  const getBeatFrames = (beat, index) => {
    const baseStart = Math.floor(beat.start_sec * fps);
    const baseEnd = Math.floor(beat.end_sec * fps);

    const transitionKey = beat.transition?.type || "none";
    const transition =
      beatTransitionRegistry[transitionKey]?.() ||
      beatTransitionRegistry.none();

    const overlap = transition.duration || 0;

    const startFrame =
      index === 0 ? baseStart : baseStart - overlap;

    const endFrame = baseEnd;

    return { startFrame, endFrame, overlap, transition };
  };

  const currentBeat = beats.find((beat, index) => {
    const { startFrame, endFrame } =
      getBeatFrames(beat, index);

    return frame >= startFrame && frame < endFrame;
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        width: meta.width,
        height: meta.height,
      }}
    >
      {/* Beats */}
      {beats.map((beat, index) => {
        const { startFrame, overlap, transition } =
          getBeatFrames(beat, index);

        const baseDuration = Math.max(
          1,
          Math.floor(
            (beat.end_sec - beat.start_sec) * fps
          )
        );

        const durationFrames = baseDuration + overlap;
        const localFrame = frame - startFrame;

        let style = {};

        if (
          transition.type === "fade" &&
          overlap > 0
        ) {
          const progress = interpolate(
            localFrame,
            [0, overlap],
            [0, 1],
            {
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }
          );

          style.opacity = progress;
        }

        return (
          <Sequence
            key={beat.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <AbsoluteFill style={style}>
              <BeatRenderer
                beat={beat}
                project={project}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Avatar */}
      {meta.mode === "talking_head" &&
        avatar?.src && (
          <Sequence
            from={0}
            durationInFrames={
              totalDurationFrames
            }
          >
            <AvatarLayer
              avatar={avatar}
              project={project}
            />
          </Sequence>
        )}

      {/* Global Caption */}
      {currentBeat?.caption?.show && (
        <Caption
          beat={currentBeat}
        />
      )}

      {/* Global Components */}
      {currentBeat?.components?.length >
        0 && (
        <ComponentsRenderer
          components={
            currentBeat.components
          }
        />
      )}

      {music?.src && (
        <Audio
          key={music.src}
          src={music.src}
          volume={
            music.volume ?? 0.8
          }
        />
      )}
    </AbsoluteFill>
  );
}