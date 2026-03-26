import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Audio,
  Video
} from "remotion";

import BeatRenderer from "./BeatRenderer";
import Caption from "./elements/Caption";
import AudioCueRenderer from "./elements/AudioCueRenderer";
import OverlayRenderer from "./elements/OverlayRenderer";
import { beatTransitionRegistry } from "../core/beatTransitionRegistry";

export default function VideoComposition({ project }) {

  if (!project) return null;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { beats, meta, audio, avatar, overlays } = project;

  const videoOverlays = overlays || [];

  const currentBeat = beats.find((beat) => {

    const start = Math.floor(beat.start_sec * fps);
    const end = Math.floor(beat.end_sec * fps);

    return frame >= start && frame < end;

  });

  let musicVolume = audio?.music?.volume ?? 0.8;

  if (currentBeat?.audio_cues?.length) {

    musicVolume = interpolate(
      frame,
      [
        Math.floor(currentBeat.start_sec * fps),
        Math.floor(currentBeat.start_sec * fps) + 8
      ],
      [musicVolume * 0.3, musicVolume],
      {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic)
      }
    );

  }

  return (

    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        width: meta.width,
        height: meta.height
      }}
    >

      {meta.mode === "talking_head" && avatar?.src && (

        <AbsoluteFill style={{ zIndex: 1 }}>

          <Video
            src={avatar.src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain"
            }}
          />

        </AbsoluteFill>

      )}

      {beats.map((beat, index) => {

        const baseStart = Math.floor(beat.start_sec * fps);

        const baseDuration = Math.floor(
          (beat.end_sec - beat.start_sec) * fps
        );

        const transitionKey = beat.transition?.type || "cut";

        const transition =
          beatTransitionRegistry[transitionKey]?.() ||
          beatTransitionRegistry.cut();

        const overlap = transition.duration || 0;

        const startFrame =
          index === 0
            ? baseStart
            : baseStart - overlap;

        const durationFrames =
          baseDuration + overlap;

        const localFrame = frame - startFrame;

        let style = {};

        if (index !== 0 && overlap > 0) {

          const progress = interpolate(
            localFrame,
            [0, overlap],
            [0, 1],
            {
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic)
            }
          );

          switch (transition.type) {

            case "fade":
              style.opacity = progress;
              break;

            case "slideLeft":
              style.transform = `translateX(${interpolate(
                progress,
                [0, 1],
                [meta.width, 0]
              )}px)`;
              break;

            case "slideRight":
              style.transform = `translateX(${interpolate(
                progress,
                [0, 1],
                [-meta.width, 0]
              )}px)`;
              break;

            case "slideUp":
              style.transform = `translateY(${interpolate(
                progress,
                [0, 1],
                [meta.height, 0]
              )}px)`;
              break;

            case "slideDown":
              style.transform = `translateY(${interpolate(
                progress,
                [0, 1],
                [-meta.height, 0]
              )}px)`;
              break;

            case "scale":
              style.transform = `scale(${interpolate(
                progress,
                [0, 1],
                [0.8, 1]
              )})`;
              break;

            case "blurFade":
              style.filter = `blur(${interpolate(
                progress,
                [0, 1],
                [30, 0]
              )}px)`;
              style.opacity = progress;
              break;

          }

        }

        return (

          <Sequence
            key={beat.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >

            <AbsoluteFill style={{ ...style, zIndex: 2 }}>

              <BeatRenderer beat={beat} project={project} />

              <AudioCueRenderer beat={beat} />

            </AbsoluteFill>

          </Sequence>

        );

      })}

      {/* VIDEO LEVEL OVERLAYS */}

      {videoOverlays.length > 0 && (
        <AbsoluteFill style={{ zIndex: 110 }}>
          <OverlayRenderer overlays={videoOverlays} />
        </AbsoluteFill>
      )}

      {currentBeat?.caption && (
        <Caption
          caption={currentBeat.caption}
          beat={currentBeat}
        />
      )}

      {audio?.tts?.src && (
        <Audio
          key={audio.tts.src}
          src={audio.tts.src}
          volume={audio.tts.volume ?? 1}
        />
      )}

      {audio?.music?.src && (
        <Audio
          key={audio.music.src}
          src={audio.music.src}
          volume={musicVolume}
        />
      )}

    </AbsoluteFill>

  );

}