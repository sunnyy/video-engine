import React, { useEffect } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Audio,
  OffthreadVideo,
} from "remotion";

import BeatRenderer from "./BeatRenderer";
import Caption from "./elements/Caption";
import OverlayRenderer from "./elements/OverlayRenderer";
import { transitionsRegistry } from "../core/transitionsRegistry";
import { buildVisualIdentity } from "../core/visualIdentityEngine";
import { getLayoutDef } from "../core/layoutRegistry.js";

/* FONT LOADER */

function loadCaptionFonts() {

  const fonts = [
    "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
    "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap",
    "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400;1,600&display=swap",
    "https://fonts.googleapis.com/css2?family=Oswald:wght@600;700;900&display=swap",
    "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap",
    "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap"
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
    const end = Math.floor(beat.end_sec * fps);
    return frame >= start && frame < end;
  });

  // ── Global avatar positioning ──────────────────────────────────────────────
  // Single OffthreadVideo rendered outside all Sequences so it never remounts
  // (remounting would restart playback). Position follows currentBeat's avatarZone.
  const avatar    = project.avatar;
  const talkMode  = meta?.mode === "talking_head";
  let avatarBoxStyle = null;
  let avatarObjectFit = "cover";

  // Resolve which zone id carries the avatar this beat.
  // null   = user explicitly chose "Asset" tab — do NOT show avatar
  // string = user explicitly chose a zone — show there
  // undefined = never set — auto-detect from zones with type "avatar"
  const resolveAvatarZoneId = (beat) => {
    if (beat?.avatarZone === null)      return null;   // explicit opt-out
    if (beat?.avatarZone)               return beat.avatarZone; // explicit zone
    // undefined: auto-detect from pipeline-generated zone types
    if (beat?.zones) {
      const found = Object.entries(beat.zones).find(([, z]) => z.type === "avatar");
      if (found) return found[0];
    }
    return null;
  };

  // Enter/exit durations mirror LayoutRenderer
  const AVATAR_ENTER_DUR = { fadeIn:18, slideUpIn:16, slideDownIn:16, slideLeftIn:16, slideRightIn:16, popIn:14, scaleIn:18, none:0 };
  const AVATAR_EXIT_DUR  = { fadeOut:14, slideUpOut:14, slideDownOut:14, scaleOut:14, none:0 };

  const resolveAvatarEnterStyle = (anim, p, W, H) => {
    switch (anim) {
      case "fadeIn":      return { opacity: interpolate(p,[0,1],[0,1],{extrapolateRight:"clamp"}) };
      case "slideUpIn":   return { opacity: interpolate(p,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(p,[0,1],[H*0.08,0],{extrapolateRight:"clamp"})}px)` };
      case "slideDownIn": return { opacity: interpolate(p,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(p,[0,1],[-H*0.08,0],{extrapolateRight:"clamp"})}px)` };
      case "slideLeftIn": return { opacity: interpolate(p,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateX(${interpolate(p,[0,1],[W*0.1,0],{extrapolateRight:"clamp"})}px)` };
      case "slideRightIn":return { opacity: interpolate(p,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateX(${interpolate(p,[0,1],[-W*0.1,0],{extrapolateRight:"clamp"})}px)` };
      case "popIn":       return { opacity: interpolate(p,[0,0.3],[0,1],{extrapolateRight:"clamp"}), transform:`scale(${interpolate(p,[0,0.6,0.8,1],[0.7,1.05,0.97,1],{extrapolateRight:"clamp"})})` };
      case "scaleIn":     return { opacity: interpolate(p,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`scale(${interpolate(p,[0,1],[1.15,1],{extrapolateRight:"clamp"})})` };
      default:            return {};
    }
  };
  const resolveAvatarExitStyle = (anim, p, H) => {
    switch (anim) {
      case "fadeOut":     return { opacity: interpolate(p,[0,1],[1,0],{extrapolateRight:"clamp"}) };
      case "slideUpOut":  return { opacity: interpolate(p,[0.6,1],[1,0],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(p,[0,1],[0,-H*0.1],{extrapolateRight:"clamp"})}px)` };
      case "slideDownOut":return { opacity: interpolate(p,[0.6,1],[1,0],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(p,[0,1],[0,H*0.1],{extrapolateRight:"clamp"})}px)` };
      case "scaleOut":    return { opacity: interpolate(p,[0.5,1],[1,0],{extrapolateRight:"clamp"}), transform:`scale(${interpolate(p,[0,1],[1,0.85],{extrapolateRight:"clamp"})})` };
      default:            return {};
    }
  };

  if (talkMode && avatar?.src && currentBeat) {
    const zoneId = resolveAvatarZoneId(currentBeat);
    if (zoneId) {
      const layoutDef = getLayoutDef(currentBeat.layout);
      const zoneDef   = layoutDef?.zones?.find(z => z.id === zoneId) || {};
      const beatZone  = currentBeat.zones?.[zoneId] || {};
      const resolved  = { ...zoneDef, ...beatZone };

      const pad    = currentBeat.layoutPadding || 0;
      const innerW = meta.width  - pad * 2;
      const innerH = meta.height - pad * 2;
      const x      = resolved.x      ?? 0;
      const y      = resolved.y      ?? 0;
      const w      = resolved.width  ?? 100;
      const h      = resolved.height ?? 100;

      // ── Animation ───────────────────────────────────────────────────────────
      const beatStartFrame = Math.round(currentBeat.start_sec * fps);
      const zoneStart      = Math.round((resolved.start ?? 0) * fps);
      const zoneEnd        = resolved.end != null
        ? Math.round(resolved.end * fps)
        : Math.round((currentBeat.end_sec - currentBeat.start_sec) * fps);
      const local    = frame - beatStartFrame - zoneStart;
      const totalDur = zoneEnd - zoneStart;

      const enterAnim = resolved.enterAnimation ?? "none";
      const exitAnim  = resolved.exitAnimation  ?? "none";
      const enterDur  = AVATAR_ENTER_DUR[enterAnim] || 0;
      const exitDur   = AVATAR_EXIT_DUR[exitAnim]   || 0;

      const enterProg = enterDur > 0
        ? interpolate(local, [0, enterDur], [0, 1], { extrapolateLeft:"clamp", extrapolateRight:"clamp", easing: Easing.out(Easing.cubic) })
        : 1;
      const exitStart = totalDur - exitDur;
      const exitProg  = exitDur > 0 && local >= exitStart
        ? interpolate(local, [exitStart, totalDur], [0, 1], { extrapolateLeft:"clamp", extrapolateRight:"clamp", easing: Easing.out(Easing.cubic) })
        : 0;

      const zoneW = (w / 100) * innerW;
      const zoneH = (h / 100) * innerH;
      const enterSt = resolveAvatarEnterStyle(enterAnim, enterProg, zoneW, zoneH);
      const exitSt  = exitProg > 0 ? resolveAvatarExitStyle(exitAnim, exitProg, zoneH) : {};
      const animSt  = exitProg > 0 ? { ...enterSt, ...exitSt } : enterSt;

      avatarObjectFit = resolved.style?.objectFit ?? "cover";
      avatarBoxStyle = {
        position:        "absolute",
        left:            pad + (x / 100) * innerW,
        top:             pad + (y / 100) * innerH,
        width:           zoneW,
        height:          zoneH,
        zIndex:          3,
        overflow:        "hidden",
        borderRadius:    resolved.style?.borderRadius || 0,
        opacity:         animSt.opacity,
        transform:       animSt.transform,
        transformOrigin: "center center",
      };
    }
  }

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

      {/* Avatar video is rendered per-zone inside LayoutRenderer — not as a global layer */}

      {beats.map((beat, index) => {

        const baseStart    = Math.floor(beat.start_sec * fps);
        const baseDuration = Math.floor((beat.end_sec - beat.start_sec) * fps);

        // This beat's own incoming transition
        const transitionKey = beat.transition?.type || "cut";
        const transition    = transitionsRegistry.beat[transitionKey]?.() || transitionsRegistry.beat.cut();
        const inOverlap     = transition.duration || 0;

        // Next beat's incoming transition — used to extend THIS beat so it stays rendered during the crossfade
        const nextBeat       = beats[index + 1];
        const nextTransKey   = nextBeat?.transition?.type || "cut";
        const nextTransition = nextBeat ? (transitionsRegistry.beat[nextTransKey]?.() || transitionsRegistry.beat.cut()) : null;
        const outOverlap     = nextTransition?.duration || 0;

        // Start earlier if this beat has an incoming overlap; stay longer if next beat crossfades over us
        const startFrame     = index === 0 ? baseStart : baseStart - inOverlap;
        const durationFrames = baseDuration + (index === 0 ? 0 : inOverlap) + outOverlap;

        const localFrame = frame - startFrame;

        // ── INCOMING transition style (applied to this beat as it enters) ──
        let inStyle = {};
        let inTransformParts = [];

        if (inOverlap > 0) {
          const progress = interpolate(localFrame, [0, inOverlap], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          switch (transition.type) {
            case "fade":
            case "dissolve":
              inStyle.opacity = progress;
              break;
            case "slideLeft":
              inTransformParts.push(`translateX(${interpolate(progress,[0,1],[meta.width,0])}px)`);
              break;
            case "slideRight":
              inTransformParts.push(`translateX(${interpolate(progress,[0,1],[-meta.width,0])}px)`);
              break;
            case "slideUp":
              inTransformParts.push(`translateY(${interpolate(progress,[0,1],[meta.height,0])}px)`);
              break;
            case "slideDown":
              inTransformParts.push(`translateY(${interpolate(progress,[0,1],[-meta.height,0])}px)`);
              break;
            case "zoom":
              inTransformParts.push(`scale(${interpolate(progress,[0,1],[1.2,1])})`);
              inStyle.opacity = progress;
              break;
            case "dipBlack":
            case "dipWhite":
              inStyle.opacity = progress;
              break;
            case "whipPan":
              inTransformParts.push(`translateX(${interpolate(progress,[0,1],[meta.width * 0.4, 0])}px)`);
              inStyle.opacity = interpolate(progress,[0,0.3,1],[0,1,1],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "spin":
              inTransformParts.push(`rotate(${interpolate(progress,[0,1],[180,0])}deg)`);
              inStyle.opacity = progress;
              break;
            case "glitch":
              inTransformParts.push(`scale(${interpolate(progress,[0,0.5,1],[1.08,1.02,1])})`);
              inStyle.opacity = interpolate(progress,[0,0.2,0.4,0.6,0.8,1],[0,1,0.6,1,0.8,1],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "flash":
              inStyle.opacity = interpolate(progress,[0,0.15,1],[0,1,1],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            default:
              break;
          }
        }

        if (inTransformParts.length) inStyle.transform = inTransformParts.join(" ");

        // ── OUTGOING transition style (applied to this beat as the next one enters over it) ──
        let outStyle = {};
        let dipOverlay = null;
        const outStart = durationFrames - outOverlap; // local frame when outgoing starts

        if (outOverlap > 0 && nextTransition) {
          const outProgress = interpolate(localFrame, [outStart, durationFrames], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          switch (nextTransition.type) {
            case "fade":
            case "dissolve":
              outStyle.opacity = interpolate(outProgress,[0,1],[1,0]);
              break;
            case "zoom":
              outStyle.opacity = interpolate(outProgress,[0,1],[1,0]);
              break;
            case "dipBlack":
              dipOverlay = `rgba(0,0,0,${outProgress})`;
              break;
            case "dipWhite":
              dipOverlay = `rgba(255,255,255,${outProgress})`;
              break;
            case "whipPan":
              outStyle.opacity = interpolate(outProgress,[0.7,1],[1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "spin":
              outStyle.opacity = interpolate(outProgress,[0,1],[1,0]);
              break;
            case "glitch":
              outStyle.opacity = interpolate(outProgress,[0,0.2,0.4,0.6,0.8,1],[1,0.6,1,0.6,0.8,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "flash":
              dipOverlay = `rgba(255,255,255,${interpolate(outProgress,[0,0.3,1],[0,1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" })})`;
              break;
            default:
              break;
          }
        }

        // Merge in+out styles — outgoing overrides incoming once out phase starts
        const isInOutgoing = localFrame >= outStart && outOverlap > 0;
        const finalStyle = isInOutgoing
          ? { ...inStyle, ...outStyle, zIndex: 2 }
          : { ...inStyle, zIndex: 2 };

        return (
          <Sequence key={beat.id} from={startFrame} durationInFrames={durationFrames}>
            <AbsoluteFill style={finalStyle}>
              <BeatRenderer beat={beat} project={project} previewMode={previewMode} />
              {dipOverlay && (
                <AbsoluteFill style={{ background: dipOverlay, pointerEvents: "none", zIndex: 99 }} />
              )}
            </AbsoluteFill>
          </Sequence>
        );

      })}

      {/* Single persistent avatar — never remounts across beat changes */}
      {talkMode && avatar?.src && avatarBoxStyle && (
        <div style={avatarBoxStyle}>
          <OffthreadVideo
            src={avatar.src}
            style={{ width: "100%", height: "100%", objectFit: avatarObjectFit }}
          />
        </div>
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