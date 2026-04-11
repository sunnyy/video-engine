import React, { useEffect, useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Audio,
  Html5Video,
  useRemotionEnvironment,
} from "remotion";

import BeatRenderer from "./BeatRenderer";
import Caption from "./elements/Caption";
import OverlayRenderer from "./elements/OverlayRenderer";
import { transitionsRegistry } from "../core/registries/transitionsRegistry";
import { buildVisualIdentity } from "../core/visualIdentityEngine";
import { getLayoutDef } from "../core/registries/layoutRegistry.js";

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
  const { isRendering } = useRemotionEnvironment();

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


  // ── Avatar visual positioning ──────────────────────────────────────────────
  // Resolve which zone in the current beat is the avatar zone, and compute its
  // absolute pixel geometry so the global Html5Video can sit there.
  const avatarInfo = useMemo(() => {
    if (!talkMode || !avatar?.src || !currentBeat) return null;

    let zoneId = currentBeat.avatarZone;
    if (zoneId === null) return null;  // user explicitly switched to Asset mode

    const layoutDef = getLayoutDef(currentBeat.layout);

    if (!zoneId) {
      // auto-detect: first zone the layout marks as "avatar" type
      zoneId = layoutDef?.zones?.find(z => z.type === "avatar")?.id ?? null;
    }
    if (!zoneId) return null;

    const defZone  = layoutDef?.zones?.find(z => z.id === zoneId) || {};
    const beatZone = (currentBeat.zones || {})[zoneId] || {};
    const pad      = currentBeat.layoutPadding || 0;

    const x    = beatZone.x      ?? defZone.x      ?? 0;
    const y    = beatZone.y      ?? defZone.y      ?? 0;
    const w    = beatZone.width  ?? defZone.width  ?? 100;
    const h    = beatZone.height ?? defZone.height ?? 100;
    const zIdx = beatZone.zIndex ?? defZone.zIndex ?? 2;

    return {
      style: {
        position:     "absolute",
        left:         pad > 0 ? `calc(${x}% + ${pad}px)` : `${x}%`,
        top:          pad > 0 ? `calc(${y}% + ${pad}px)` : `${y}%`,
        width:        pad > 0 ? `calc(${w}% - ${pad * 2}px)` : `${w}%`,
        height:       pad > 0 ? `calc(${h}% - ${pad * 2}px)` : `${h}%`,
        zIndex:       zIdx,
        overflow:     "hidden",
        borderRadius: beatZone.style?.borderRadius ?? defZone.style?.borderRadius ?? 0,
      },
      objectFit: beatZone.style?.objectFit ?? defZone.style?.objectFit ?? "cover",
    };
  }, [talkMode, avatar, currentBeat]);

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
              inTransformParts.push(`scale(${interpolate(progress,[0,1],[1.55,1])})`);
              inStyle.opacity = interpolate(progress,[0,0.4,1],[0,1,1],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
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

        // ── INTRO transition (first beat only — how the video opens) ──
        if (index === 0) {
          const introKey = beat.introTransition || "none";
          const INTRO_FRAMES = Math.round(fps * 0.5); // 0.5s opening
          if (introKey !== "none" && introKey !== "cut" && localFrame < INTRO_FRAMES) {
            const introProgress = interpolate(localFrame, [0, INTRO_FRAMES], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            const introParts = [];
            switch (introKey) {
              case "fadeIn":
                inStyle.opacity = introProgress;
                break;
              case "zoomIn":
                introParts.push(`scale(${interpolate(introProgress, [0, 1], [1.45, 1])})`);
                inStyle.opacity = interpolate(introProgress,[0,0.4,1],[0,1,1],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
                break;
              case "slideUp":
                introParts.push(`translateY(${interpolate(introProgress, [0, 1], [meta.height * 0.06, 0])}px)`);
                inStyle.opacity = introProgress;
                break;
              case "slideDown":
                introParts.push(`translateY(${interpolate(introProgress, [0, 1], [-meta.height * 0.06, 0])}px)`);
                inStyle.opacity = introProgress;
                break;
              case "flash":
                inStyle.opacity = interpolate(introProgress, [0, 0.15, 1], [0, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                break;
              default:
                break;
            }
            if (introParts.length) {
              inStyle.transform = introParts.join(" ") + (inStyle.transform ? ` ${inStyle.transform}` : "");
            }
          }
        }

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
              // Stay fully opaque — incoming beat fades in on top.
              // Fading both simultaneously causes a black flash (combined opacity < 1).
              break;
            case "zoom":
              // Shrink back as incoming punches in
              outStyle.transform = `scale(${interpolate(outProgress,[0,1],[1,0.82])})`;
              outStyle.opacity   = interpolate(outProgress,[0.5,1],[1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "dipBlack":
              dipOverlay = `rgba(0,0,0,${outProgress})`;
              break;
            case "dipWhite":
              dipOverlay = `rgba(255,255,255,${outProgress})`;
              break;
            case "slideLeft":
            case "slideRight":
            case "slideUp":
            case "slideDown":
              // Stay fully opaque — incoming slides in on top, no gap needed
              break;
            case "whipPan":
              outStyle.opacity = interpolate(outProgress,[0.7,1],[1,0],{ extrapolateLeft:"clamp", extrapolateRight:"clamp" });
              break;
            case "spin":
              // Stay opaque — incoming spins in on top
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

        // No zIndex on the beat wrapper — this is intentional.
        // Without an explicit zIndex, the beat AbsoluteFill creates no stacking context
        // during normal (cut) transitions, so zone zIndexes (assets z=1-2, text z=3-4)
        // float up and compete directly with the global avatar video (z = avatarZone.zIndex).
        // During animated transitions (fade/slide), opacity/transform naturally create a
        // stacking context but with z-order "auto" (≈ 0), so the global avatar (explicit z)
        // remains visible above the transitioning beat — the person keeps talking through cuts.
        const isInOutgoing = localFrame >= outStart && outOverlap > 0;
        const finalStyle = isInOutgoing
          ? { ...inStyle, ...outStyle }
          : { ...inStyle };

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

      {/* ── Global avatar visual ────────────────────────────────────────────
          Single Html5Video (muted) positioned at the current beat's avatar zone.
          Never remounts across beat transitions → the nativeAudioRef audio element
          plays uninterrupted alongside it.
          Hidden (0×0) when no beat has an avatar zone active. */}
      {/* Global avatar — always mounted so the video element never remounts and audio
          plays continuously. Positioned at the avatar zone when active; 0×0 hidden
          otherwise so the audio track keeps running without any visual presence. */}
      {talkMode && avatar?.src && (
        <div style={avatarInfo?.style ?? {
          position: "absolute", width: 0, height: 0,
          overflow: "hidden", pointerEvents: "none",
        }}>
          <Html5Video
            src={avatar.src}
            muted={isRendering}
            style={{ width: "100%", height: "100%", objectFit: avatarInfo?.objectFit ?? "cover" }}
          />
        </div>
      )}

      {/* Render-mode audio — Remotion extracts the avatar audio track here.
          Not rendered in preview (nativeAudioRef handles that instead). */}
      {isRendering && talkMode && avatar?.src && (
        <Audio key={`avatar-render-${avatar.src}`} src={avatar.src} volume={1} />
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
