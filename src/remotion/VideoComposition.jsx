import { useEffect, useRef } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Audio,
} from "remotion";

import { preloadVideo, preloadImage } from "@remotion/preload";
import BeatRenderer from "./BeatRenderer";
import Caption from "./elements/Caption";
import OverlayRenderer from "./elements/OverlayRenderer";
import { transitionsRegistry } from "../core/registries/transitionsRegistry";
import { buildVisualIdentity } from "../core/visualIdentityEngine";
import { syncAvatarVideoFrame } from "./avatarVideoSingleton.js";

/* FONT LOADER */

function loadCaptionFonts() {

  const fonts = [
    // ── Core layout fonts ──
    "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
    "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap",
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap",
    "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap",
    "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&display=swap",
    "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,300;1,400&display=swap",
    // ── videoDNA typography systems ──
    "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,300;1,400&display=swap",
    "https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&display=swap",
    "https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
    "https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap",
    "https://fonts.googleapis.com/css2?family=Pacifico&display=swap",
  ];

  fonts.forEach((url) => {

    if (document.querySelector(`link[href="${url}"]`)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);

  });

}

export default function VideoComposition({ project, previewMode = false }) {

  if (!project) return null;

  useEffect(() => {
    loadCaptionFonts();
  }, []);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { beats, meta, audio, overlays } = project;

  const visualIdentity = buildVisualIdentity(project);

  const videoOverlays = overlays || [];

  const currentBeat = beats.find((beat) => {
    const start = Math.floor(beat.start_sec * fps);
    const end   = Math.floor(beat.end_sec   * fps);
    return frame >= start && frame < end;
  });

  const avatar   = project.avatar;
  const talkMode = meta?.mode === "talking_head";

  // Keep the singleton avatar video in sync with the Remotion timeline.
  // Track whether frames are advancing to distinguish play vs pause.
  const prevFrameRef = useRef(null);
  useEffect(() => {
    if (!talkMode || !avatar?.src) return;
    const isPlaying = prevFrameRef.current !== null && frame !== prevFrameRef.current;
    prevFrameRef.current = frame;
    syncAvatarVideoFrame(frame, fps, isPlaying);
  }, [frame, fps, talkMode, avatar?.src]);

  // Preload all video assets up-front so the browser has them decoded before
  // any beat Sequence tries to display them — eliminates the black-frame gap
  // at beat transitions during preview playback.
  // preloadVideo() returns a cleanup function; we collect and call them on unmount.
  useEffect(() => {
    const cleanups = [];

    // Avatar video (talking head mode)
    if (talkMode && avatar?.src) {
      cleanups.push(preloadVideo(avatar.src));
    }

    // All unique assets across every beat
    const seen = new Set();
    beats.forEach(beat => {
      Object.values(beat.zones || {}).forEach(zone => {
        const src = zone.content?.asset?.src;
        if (!src || seen.has(src)) return;
        seen.add(src);
        if (/\.(mp4|webm|mov)$/i.test(src)) {
          cleanups.push(preloadVideo(src));
        } else if (/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(src)) {
          cleanups.push(preloadImage(src));
        }
      });
    });

    return () => cleanups.forEach(fn => { try { fn(); } catch {} });
  }, []);

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
        height: meta.height,
        overflow: "hidden",
      }}
    >

      {beats.map((beat, index) => {

        const baseStart    = Math.floor(beat.start_sec * fps);
        const baseEnd      = Math.floor(beat.end_sec   * fps);
        const baseDuration = baseEnd - baseStart; // avoids float subtraction rounding gaps

        const transitionKey = beat.transition?.type || "cut";
        const transition    = transitionsRegistry.beat[transitionKey]?.() || transitionsRegistry.beat.cut();
        const intensity     = Math.min(5.0, Math.max(0.3, beat.transition?.intensity ?? 1.0));
        const speed         = Math.min(5.0, Math.max(0.2, beat.transition?.speed     ?? 1.0));
        // Minimum 5-frame overlap on every non-first beat: old beat stays visible while
        // new beat mounts, preventing any black flash from React/asset first-paint delay.
        const inOverlap     = index === 0 ? 0 : Math.max(5, Math.round((transition.duration || 0) * intensity / speed));

        const nextBeat       = beats[index + 1];
        const nextTransKey   = nextBeat?.transition?.type || "cut";
        const nextTransition = nextBeat ? (transitionsRegistry.beat[nextTransKey]?.() || transitionsRegistry.beat.cut()) : null;
        const nextIntensity  = Math.min(5.0, Math.max(0.3, nextBeat?.transition?.intensity ?? 1.0));
        const nextSpeed      = Math.min(3.0, Math.max(0.2, nextBeat?.transition?.speed     ?? 1.0));
        const outOverlap     = nextBeat ? Math.round((nextTransition?.duration || 0) * nextIntensity / nextSpeed) : 0;

        const startFrame     = index === 0 ? baseStart : baseStart - inOverlap;
        const durationFrames = baseDuration + (index === 0 ? 0 : inOverlap) + outOverlap;
        const localFrame     = frame - startFrame;

        let inStyle = {};
        let inTransformParts = [];
        let inDipOverlay = null;

        if (inOverlap > 0) {
          const progress = interpolate(localFrame, [0, inOverlap], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          switch (transition.type) {
            case "fade": case "dissolve": inStyle.opacity = progress; break;
            case "slideLeft":  inTransformParts.push(`translateX(${interpolate(progress,[0,1],[meta.width,0])}px)`); break;
            case "slideRight": inTransformParts.push(`translateX(${interpolate(progress,[0,1],[-meta.width,0])}px)`); break;
            case "slideUp":    inTransformParts.push(`translateY(${interpolate(progress,[0,1],[meta.height,0])}px)`); break;
            case "slideDown":  inTransformParts.push(`translateY(${interpolate(progress,[0,1],[-meta.height,0])}px)`); break;
            case "zoom":
              // No opacity — full visibility so the scale animation is seen from frame 0 (like slides)
              inTransformParts.push(`scale(${1 + (1 - progress) * 0.9 * intensity})`);
              break;
            case "dipBlack": inDipOverlay = `rgba(0,0,0,${interpolate(progress,[0,1],[1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" })})`; break;
            case "dipWhite": inDipOverlay = `rgba(255,255,255,${interpolate(progress,[0,1],[1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" })})`; break;
            case "whipPan":
              inTransformParts.push(`translateX(${interpolate(progress,[0,1],[meta.width * 0.4 * intensity, 0])}px)`);
              inStyle.opacity = interpolate(progress,[0,0.3,1],[0,1,1],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "spin":
              inTransformParts.push(`rotate(${interpolate(progress,[0,1],[180 * intensity, 0])}deg)`);
              inStyle.opacity = progress;
              break;
            case "glitch":
              inTransformParts.push(`scale(${interpolate(progress,[0,0.5,1],[1.08,1.02,1])})`);
              inStyle.opacity = interpolate(progress,[0,0.2,0.4,0.6,0.8,1],[0,1,0.6,1,0.8,1],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "flash": inDipOverlay = `rgba(255,255,255,${interpolate(progress,[0,0.55,1],[1,0,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" })})`; break;
            default: inStyle.opacity = progress; break; // crossfade for cut/unknown: new beat fades in so old beat shows through
          }
        }
        if (inTransformParts.length) inStyle.transform = inTransformParts.join(" ");

        let outStyle = {};
        let dipOverlay = null;
        const outStart = durationFrames - outOverlap;

        if (outOverlap > 0 && nextTransition) {
          const outProgress = interpolate(localFrame, [outStart, durationFrames], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          switch (nextTransition.type) {
            case "fade": case "dissolve": break;
            case "zoom":
              // Old beat shrinks away; no opacity so the shrink is clearly visible
              outStyle.transform = `scale(${1 - outProgress * 0.4})`;
              break;
            case "dipBlack": dipOverlay = `rgba(0,0,0,${outProgress})`; break;
            case "dipWhite": dipOverlay = `rgba(255,255,255,${outProgress})`; break;
            case "slideLeft": case "slideRight": case "slideUp": case "slideDown": break;
            case "whipPan": outStyle.opacity = interpolate(outProgress,[0.7,1],[1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" }); break;
            case "spin": break;
            case "glitch": outStyle.opacity = interpolate(outProgress,[0,0.2,0.4,0.6,0.8,1],[1,0.6,1,0.6,0.8,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" }); break;
            case "flash": dipOverlay = `rgba(255,255,255,${interpolate(outProgress,[0,0.3,1],[0,1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" })})`; break;
            default: break;
          }
        }

        const isInOutgoing = localFrame >= outStart && outOverlap > 0;
        const finalStyle = isInOutgoing ? { ...inStyle, ...outStyle } : { ...inStyle };

        const dipNode = dipOverlay && (
          <AbsoluteFill style={{ background: dipOverlay, pointerEvents: "none", zIndex: 99 }} />
        );
        const inDipNode = inDipOverlay && (
          <AbsoluteFill style={{ background: inDipOverlay, pointerEvents: "none", zIndex: 99 }} />
        );

        return (
          <Sequence key={beat.id} from={startFrame} durationInFrames={durationFrames} premountFor={fps}>
            <AbsoluteFill style={{ ...finalStyle, zIndex: index + 1 }}>
              <BeatRenderer beat={beat} project={project} previewMode={previewMode} sequenceStartFrame={startFrame} />
              {dipNode}
              {inDipNode}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Avatar audio — single persistent Audio element so audio never restarts on beat change. */}
      {talkMode && avatar?.src && (
        <Audio key={`avatar-audio-${avatar.src}`} src={avatar.src} volume={1} />
      )}

      {videoOverlays.length > 0 && (
        <AbsoluteFill style={{ zIndex: 110 }}>
          <OverlayRenderer overlays={videoOverlays} />
        </AbsoluteFill>
      )}

      {currentBeat?.caption && (
        <Caption caption={currentBeat.caption} beat={currentBeat} project={project} />
      )}

      {audio?.tts?.src && !talkMode && (
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
