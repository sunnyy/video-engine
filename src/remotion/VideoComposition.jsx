import React, { useEffect } from "react";
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
import OverlayRenderer from "./elements/OverlayRenderer";
import { transitionsRegistry } from "../core/transitionsRegistry";
import { buildVisualIdentity } from "../core/visualIdentityEngine";

/* FONT LOADER */

function loadCaptionFonts() {

  const fonts = [
    "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
    "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap",
    "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&display=swap"
  ];

  fonts.forEach((url) => {

    if (document.querySelector(`link[href="${url}"]`)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);

  });

}

export default function VideoComposition({ project }) {

  if (!project) return null;

  useEffect(() => {
    loadCaptionFonts();
  }, []);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { beats, meta, audio, avatar, overlays } = project;

  const visualIdentity = buildVisualIdentity(project);

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
        backgroundColor: visualIdentity.colorStory.dominant,
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
        const baseDuration = Math.floor((beat.end_sec - beat.start_sec) * fps);

        const transitionKey = beat.transition?.type || "cut";

        const transition =
          transitionsRegistry.beat[transitionKey]?.() ||
          transitionsRegistry.beat.cut();

        const overlap = transition.duration || 0;

        const startFrame = index === 0 ? baseStart : baseStart - overlap;
        const durationFrames = baseDuration + overlap;

        const localFrame = frame - startFrame;

        let style = {};
        let transformParts = [];

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
            case "dissolve":
              style.opacity = progress;
              break;

            case "slideLeft":
              transformParts.push(
                `translateX(${interpolate(progress,[0,1],[meta.width,0])}px)`
              );
              break;

            case "slideRight":
              transformParts.push(
                `translateX(${interpolate(progress,[0,1],[-meta.width,0])}px)`
              );
              break;

            case "slideUp":
              transformParts.push(
                `translateY(${interpolate(progress,[0,1],[meta.height,0])}px)`
              );
              break;

            case "slideDown":
              transformParts.push(
                `translateY(${interpolate(progress,[0,1],[-meta.height,0])}px)`
              );
              break;

            case "scale":
            case "zoom":
              transformParts.push(
                `scale(${interpolate(progress,[0,1],[1.2,1])})`
              );
              break;

            default:
              break;

          }

        }

        if (transformParts.length) {
          style.transform = transformParts.join(" ");
        }

        return (
          <Sequence
            key={beat.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <AbsoluteFill style={{ ...style, zIndex: 2 }}>
              <BeatRenderer beat={beat} project={project} />
            </AbsoluteFill>
          </Sequence>
        );

      })}

      {videoOverlays.length > 0 && (
        <AbsoluteFill style={{ zIndex: 110 }}>
          <OverlayRenderer overlays={videoOverlays} />
        </AbsoluteFill>
      )}

      {currentBeat?.caption && (
        <Caption caption={currentBeat.caption} beat={currentBeat} project={project} />
      )}

      {audio?.tts?.src && (
        <Audio
          key={`tts-${audio.tts.src}`}
          src={audio.tts.src}
          volume={audio.tts.volume ?? 1}
        />
      )}

      {audio?.music?.src && (
        <Audio
          key={audio.music.src}
          src={audio.music.src}
          volume={() => musicVolume}
        />
      )}

    </AbsoluteFill>
  );

}