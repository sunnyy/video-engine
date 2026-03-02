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

  const currentBeat = beats.find((beat) => {
    const start = Math.floor(beat.start_sec * fps);
    const end = Math.floor(beat.end_sec * fps);
    return frame >= start && frame < end;
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        width: meta.width,
        height: meta.height,
      }}
    >
      {/* BEATS */}
      {beats.map((beat, index) => {
        const baseStart = Math.floor(beat.start_sec * fps);
        const baseDuration = Math.floor(
          (beat.end_sec - beat.start_sec) * fps
        );

        const transitionKey = beat.transition?.type || "none";
        const transition =
          beatTransitionRegistry[transitionKey]?.() ||
          beatTransitionRegistry.none();

        const overlap = transition.duration || 0;

        const startFrame =
          index === 0 ? baseStart : baseStart - overlap;

        const durationFrames = baseDuration + overlap;

        const localFrame = frame - startFrame;

        let style = {};

        if (index !== 0 && overlap > 0) {
          const progress = interpolate(localFrame, [0, overlap], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          switch (transition.type) {
            case "fade":
              style.opacity = progress;
              break;

            case "slideX":
              style.transform = `translateX(${interpolate(
                progress,
                [0, 1],
                [transition.from > 0 ? meta.width : -meta.width, 0]
              )}px)`;
              break;

            case "scale":
              style.transform = `scale(${interpolate(
                progress,
                [0, 1],
                [transition.from, 1]
              )})`;
              break;

            case "blur":
              style.filter = `blur(${interpolate(
                progress,
                [0, 1],
                [transition.from, 0]
              )}px)`;
              style.opacity = progress;
              break;

            default:
              break;
          }
        }

        return (
          <Sequence
            key={beat.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <AbsoluteFill style={style}>
              <BeatRenderer beat={beat} project={project} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* AVATAR GLOBAL */}
      {meta.mode === "talking_head" && avatar?.src && (
        <Sequence from={0} durationInFrames={totalDurationFrames}>
          <AvatarLayer avatar={avatar} project={project} />
        </Sequence>
      )}

      {/* CAPTION */}
      {currentBeat?.caption?.show && (
        <Caption beat={currentBeat} project={project} />
      )}

      {/* COMPONENTS */}
      {currentBeat?.components?.length > 0 && (
        <ComponentsRenderer components={currentBeat.components} />
      )}

      {/* MUSIC */}
      {music?.src && (
        <Audio
          key={music.src}
          src={music.src}
          volume={music.volume ?? 0.8}
        />
      )}
    </AbsoluteFill>
  );
}