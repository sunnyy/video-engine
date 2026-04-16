/**
 * LayoutRenderer.jsx
 * src/remotion/layouts/LayoutRenderer.jsx
 *
 * Zone container: absolute position only, no rotation (keeps layout correct).
 * Inner content div: rotation + scale applied here.
 * Scale implemented as inset padding so background fills full zone,
 * content is inset from edges.
 */

import React from "react"; // eslint-disable-line
import { useCurrentFrame, useVideoConfig, interpolate, Img, OffthreadVideo, useRemotionEnvironment } from "remotion";
import { getAvatarVideoSingleton } from "../avatarVideoSingleton.js";
import AssetRenderer from "../elements/AssetRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";
import ElementRenderer from "../elements/ElementRenderer";
import { backgroundPatternRegistry } from "../../core/registries/backgroundPatternRegistry";
import textEffectRegistry from "../../core/registries/textEffectRegistry.jsx";
import { getTypographyForRole } from "../../core/videoDNA.js";
import animatedBorderRegistry from "../../core/registries/animatedBorderRegistry.js";
import assetShineRegistry     from "../../core/registries/assetShineRegistry.jsx";
import { getClipPathCSS, getSVGClipContent } from "../../core/registries/decorativeShapeRegistry.js";
import { renderIconSVG } from "../../core/registries/iconRegistry.jsx";
import { IconifyZone }  from "../elements/IconifyZone.jsx";
import { decorativeById } from "../../core/registries/decorativeRegistry.js";

/* ── Shape border helpers ─────────────────────────────────────────────────────
   Convert clip-path geometry → SVG shape elements in PIXEL coordinate space
   (viewBox matches the actual element pixel dimensions), so strokeWidth is
   exact in pixels with no vectorEffect or preserveAspectRatio trickery needed.

   W, H = actual pixel dimensions of the SVG element (zone minus contentPadding)
─────────────────────────────────────────────────────────────────────────── */
function cssClipToSVGStroke(clipPath, W, H) {
  if (!clipPath) return null;

  // polygon(x1% y1%, x2% y2%, ...)
  const polyM = clipPath.match(/^polygon\((.+)\)$/);
  if (polyM) {
    const pts = polyM[1]
      .split(",")
      .map(pair => {
        const [x, y] = pair.trim().split(/\s+/).map(v => parseFloat(v));
        return `${(x * W / 100).toFixed(2)},${(y * H / 100).toFixed(2)}`;
      })
      .join(" ");
    return `<polygon points="${pts}"/>`;
  }

  // circle(r% at cx% cy%)  — CSS ref-length = sqrt((W²+H²)/2)
  const circM = clipPath.match(/^circle\(([\d.]+)%\s+at\s+([\d.]+)%\s+([\d.]+)%\)$/);
  if (circM) {
    const rPct = parseFloat(circM[1]);
    const cx   = parseFloat(circM[2]) * W / 100;
    const cy   = parseFloat(circM[3]) * H / 100;
    const ref  = Math.sqrt((W * W + H * H) / 2);
    const r    = rPct * ref / 100;
    return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}"/>`;
  }

  // ellipse(rx% ry% at cx% cy%)
  const ellM = clipPath.match(/^ellipse\(([\d.]+)%\s+([\d.]+)%\s+at\s+([\d.]+)%\s+([\d.]+)%\)$/);
  if (ellM) {
    const [, rxP, ryP, cxP, cyP] = ellM.map(Number);
    return `<ellipse cx="${(cxP*W/100).toFixed(2)}" cy="${(cyP*H/100).toFixed(2)}" rx="${(rxP*W/100).toFixed(2)}" ry="${(ryP*H/100).toFixed(2)}"/>`;
  }

  return null;
}

// SVG shapes for complex masks (ring, heart, etc.) in pixel coordinates
function getSVGStrokeContent(shapeId, W, H) {
  const px = (v) => (v * W).toFixed(2);
  const py = (v) => (v * H).toFixed(2);
  switch (shapeId) {
    case "heart":
      return `<path d="M ${px(0.5)},${py(0.8)} C ${px(0.2)},${py(0.65)} ${px(0.03)},${py(0.5)} ${px(0.03)},${py(0.33)} C ${px(0.03)},${py(0.14)} ${px(0.18)},${py(0.05)} ${px(0.35)},${py(0.1)} C ${px(0.41)},${py(0.12)} ${px(0.46)},${py(0.17)} ${px(0.5)},${py(0.23)} C ${px(0.54)},${py(0.17)} ${px(0.59)},${py(0.12)} ${px(0.65)},${py(0.1)} C ${px(0.82)},${py(0.05)} ${px(0.97)},${py(0.14)} ${px(0.97)},${py(0.33)} C ${px(0.97)},${py(0.5)} ${px(0.8)},${py(0.65)} ${px(0.5)},${py(0.8)} Z"/>`;
    case "ring":
      return `<ellipse cx="${px(0.5)}" cy="${py(0.5)}" rx="${px(0.46)}" ry="${py(0.46)}"/><ellipse cx="${px(0.5)}" cy="${py(0.5)}" rx="${px(0.24)}" ry="${py(0.24)}"/>`;
    case "crescent":
      return `<ellipse cx="${px(0.5)}" cy="${py(0.5)}" rx="${px(0.45)}" ry="${py(0.45)}"/>`;
    case "trefoil":
      return `<ellipse cx="${px(0.5)}" cy="${py(0.28)}" rx="${px(0.28)}" ry="${py(0.28)}"/><ellipse cx="${px(0.69)}" cy="${py(0.61)}" rx="${px(0.28)}" ry="${py(0.28)}"/><ellipse cx="${px(0.31)}" cy="${py(0.61)}" rx="${px(0.28)}" ry="${py(0.28)}"/>`;
    case "quatrefoil":
      return `<ellipse cx="${px(0.5)}" cy="${py(0.22)}" rx="${px(0.28)}" ry="${py(0.28)}"/><ellipse cx="${px(0.78)}" cy="${py(0.5)}" rx="${px(0.28)}" ry="${py(0.28)}"/><ellipse cx="${px(0.5)}" cy="${py(0.78)}" rx="${px(0.28)}" ry="${py(0.28)}"/><ellipse cx="${px(0.22)}" cy="${py(0.5)}" rx="${px(0.28)}" ry="${py(0.28)}"/>`;
    default:
      return null;
  }
}

function resolveEnterStyle(animation, progress, W, H) {
  switch (animation) {
    case "fadeIn":      return { opacity: interpolate(progress,[0,1],[0,1],{extrapolateRight:"clamp"}) };
    case "slideUpIn":   return { opacity: interpolate(progress,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(progress,[0,1],[H*0.08,0],{extrapolateRight:"clamp"})}px)` };
    case "slideDownIn": return { opacity: interpolate(progress,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(progress,[0,1],[-H*0.08,0],{extrapolateRight:"clamp"})}px)` };
    case "slideLeftIn": return { opacity: interpolate(progress,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateX(${interpolate(progress,[0,1],[W*0.1,0],{extrapolateRight:"clamp"})}px)` };
    case "slideRightIn":return { opacity: interpolate(progress,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`translateX(${interpolate(progress,[0,1],[-W*0.1,0],{extrapolateRight:"clamp"})}px)` };
    case "popIn":       return { opacity: interpolate(progress,[0,0.3],[0,1],{extrapolateRight:"clamp"}), transform:`scale(${interpolate(progress,[0,0.6,0.8,1],[0.7,1.05,0.97,1],{extrapolateRight:"clamp"})})` };
    case "scaleIn":     return { opacity: interpolate(progress,[0,0.4],[0,1],{extrapolateRight:"clamp"}), transform:`scale(${interpolate(progress,[0,1],[1.15,1],{extrapolateRight:"clamp"})})` };
    default:            return { opacity: 1 };
  }
}

function resolveExitStyle(animation, progress, _W, H) {
  switch (animation) {
    case "fadeOut":      return { opacity: interpolate(progress,[0,1],[1,0],{extrapolateRight:"clamp"}) };
    case "slideUpOut":   return { opacity: interpolate(progress,[0.6,1],[1,0],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(progress,[0,1],[0,-H*0.1],{extrapolateRight:"clamp"})}px)` };
    case "slideDownOut": return { opacity: interpolate(progress,[0.6,1],[1,0],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(progress,[0,1],[0,H*0.1],{extrapolateRight:"clamp"})}px)` };
    case "scaleOut":     return { opacity: interpolate(progress,[0.5,1],[1,0],{extrapolateRight:"clamp"}), transform:`scale(${interpolate(progress,[0,1],[1,0.85],{extrapolateRight:"clamp"})})` };
    default:             return {};
  }
}

/* ── Blurred asset background ─────────────────────────────── */
function BlurredAssetBackground({ src }) {
  const isVideo = /\.(mp4|webm)$/i.test(src);
  const mediaStyle = {
    position:  "absolute",
    top:       "-8%", left: "-8%",
    width:     "116%", height: "116%",
    objectFit: "cover",
    filter:    "blur(32px)",
    opacity:   0.6,
    zIndex:    0,
  };
  return (
    <>
      {isVideo
        ? <OffthreadVideo src={src} muted style={mediaStyle} onError={(e) => console.warn("[LayoutRenderer] bg video error", src, e)} />
        : <Img            src={src}        style={mediaStyle} onError={(e) => console.warn("[LayoutRenderer] bg image error", src, e)} />
      }
      {/* Dark scrim so text stays readable */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "rgba(0,0,0,0.38)",
      }} />
    </>
  );
}

/* ── Animated border frame ─────────────────────────────────── */
function AnimatedBorderFrame({ borderKey, borderRadius, frame, fps, overrideWidth, overrideSpeed, contentPadding, children }) {
  const def = animatedBorderRegistry[borderKey];
  if (!def) return <div style={{ position:"absolute", inset:0, overflow:"hidden", borderRadius: borderRadius||0 }}>{children}</div>;

  const borderWidth = overrideWidth ?? def.borderWidth;
  const speed       = overrideSpeed ?? def.speed;
  const br          = borderRadius || 0;
  const padding     = contentPadding ?? 0;

  // No CSS masks — they are unreliable in headless Chromium.
  // Technique: spinner fills the rounded outer container (overflow:hidden clips outer edge).
  // Content div sits on top (higher z-index) at borderWidth inset, filling its area completely.
  // The image naturally covers the spinner center; spinner only shows around the strip edges.
  // Padding is an additional inset inside the content div — the gap shows the spinner color
  // which blends naturally with the border (acts like a colored gutter matching the border).
  const contentInset = borderWidth + padding;
  const contentBr    = Math.max(0, br - contentInset);

  // ── Turbulence branch (e.g. Fire Glow) ─────────────────────
  if (def.type === "turbulence") {
    const t       = (frame / fps) * speed;
    const freq    = (0.012 + Math.sin(t * 2.3) * 0.004 + Math.cos(t * 1.7) * 0.003).toFixed(5);
    const seed    = Math.floor(t * 8) % 256;
    const flicker = 0.55 + Math.sin(t * 7.3) * 0.15 + Math.cos(t * 11.1) * 0.1;
    const { turbColor, turbColor2, turbScale, glowColor } = def;

    return (
      <div style={{ position:"absolute", inset:0, borderRadius:br, overflow:"visible" }}>

        <svg style={{ position:"absolute", width:0, height:0, overflow:"hidden" }}>
          <defs>
            <filter id="abf-fire-turb" x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence type="turbulence" baseFrequency={freq} numOctaves="3" seed={seed} result="turb" />
              <feDisplacementMap in="SourceGraphic" in2="turb" scale={turbScale ?? 5} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        {/* Wobbly border ring — CSS border so it's naturally just the strip */}
        <div style={{
          position:"absolute", inset:0, borderRadius:br,
          border:   `${borderWidth}px solid ${turbColor}`,
          filter:   "url(#abf-fire-turb)",
          boxSizing:"border-box", zIndex:1, pointerEvents:"none",
        }} />
        <div style={{
          position:"absolute", inset:0, borderRadius:br,
          border:   `${borderWidth + 2}px solid ${turbColor}`,
          opacity:  flicker * 0.6, filter:"blur(3px)",
          boxSizing:"border-box", zIndex:0, pointerEvents:"none",
        }} />
        <div style={{
          position:"absolute", inset:-4, borderRadius:br+4,
          border:   `${borderWidth + 8}px solid ${turbColor2 || "rgba(255,60,0,0.3)"}`,
          opacity:  flicker, filter:"blur(10px)",
          boxSizing:"border-box", zIndex:0, pointerEvents:"none",
        }} />
        <div style={{
          position:"absolute", inset:0, borderRadius:br,
          background:`linear-gradient(-30deg,${glowColor}22,transparent 35%,transparent 65%,${glowColor}22)`,
          mixBlendMode:"overlay", zIndex:2, pointerEvents:"none",
        }} />

        {/* Content — inset by borderWidth + padding, both independent */}
        <div style={{
          position:"absolute", inset:contentInset, borderRadius:contentBr,
          overflow:"hidden", zIndex:3,
        }}>
          {children}
        </div>
      </div>
    );
  }

  // ── Default: conic-gradient spinner ────────────────────────
  const { gradient, glowColor, blurAmount } = def;
  const deg = ((frame / fps) * speed * 360) % 360;

  return (
    <div style={{ position:"absolute", inset:0, borderRadius:br, overflow:"hidden" }}>

      {/* Spinner z:0 — fills the outer rounded container */}
      <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          width:"9999px", height:"9999px",
          backgroundRepeat:"no-repeat", backgroundPosition:"0 0",
          backgroundImage:gradient,
          transform:`translate(-50%,-50%) rotate(${deg}deg)`,
        }} />
      </div>

      {/* Content z:1 — sits on top, inset by borderWidth so spinner peeks around the edges */}
      <div style={{
        position:"absolute", inset:contentInset, borderRadius:contentBr,
        overflow:"hidden", zIndex:1,
      }}>
        {children}
      </div>

      {/* Glow z:2 — on top of both */}
      {blurAmount > 0 && (
        <div style={{
          position:"absolute", inset:0, borderRadius:br,
          boxShadow:`inset 0 0 ${blurAmount*2}px ${glowColor}99, 0 0 ${blurAmount*3}px ${glowColor}66`,
          zIndex:2, pointerEvents:"none",
        }} />
      )}
    </div>
  );
}

const ENTER_DUR = { fadeIn:18, slideUpIn:16, slideDownIn:16, slideLeftIn:16, slideRightIn:16, popIn:14, scaleIn:18, none:0 };
const EXIT_DUR  = { fadeOut:14, slideUpOut:14, slideDownOut:14, scaleOut:14, none:0 };

/* ── Avatar video zone ─────────────────────────────────────────────────────
   In render mode (headless Chromium): OffthreadVideo with delayRender so
   frame capture waits for the correct video frame.
   In preview mode: the module-level singleton <video> element is moved into
   this zone's container via appendChild. The singleton never unmounts between
   beats, so there is zero seeking and zero A/V sync break on beat change.
   VideoComposition drives the singleton's currentTime via syncAvatarVideoFrame. */
function AvatarVideoZone({ src, trimBefore, objectFit, isRendering, style }) {
  const { useLayoutEffect, useRef } = React;

  const containerRef = useRef(null);

  // Preview path: move the singleton <video> into this zone's container.
  // useLayoutEffect fires synchronously before the browser paints, so the video
  // is always inside a container before any frame is drawn — eliminating the
  // 1-frame blank that useEffect caused (it fires after paint).
  useLayoutEffect(() => {
    if (isRendering) return;
    const container = containerRef.current;
    if (!container) return;
    const video = getAvatarVideoSingleton(src);
    video.style.width     = "100%";
    video.style.height    = "100%";
    video.style.objectFit = objectFit || "cover";
    video.style.position  = "absolute";
    video.style.inset     = "0";
    container.appendChild(video);
    // No cleanup: the container div is removed by React when the Sequence unmounts,
    // which detaches the video from DOM. The JS object survives in the module singleton
    // and is re-attached to the next beat's zone via appendChild — no seek required.
  }, [isRendering, src, objectFit]);

  // Render path: OffthreadVideo handles its own frame-sync internally during
  // headless render — no external delayRender needed.
  if (isRendering) {
    return <OffthreadVideo src={src} muted trimBefore={trimBefore} style={style} onError={(e) => console.warn("[LayoutRenderer] zone video render error", src, e)} />;
  }
  return <div ref={containerRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }} />;
}

function ZoneLayer({ zone, beat, project, W, H, beatDurationSec, previewMode = false, sequenceStartFrame = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { isRendering } = useRemotionEnvironment();

  const startFrame = Math.round((zone.start ?? 0) * fps);
  const endFrame   = zone.end != null ? Math.round(zone.end * fps) : Math.round(beatDurationSec * fps);

  // Hidden zones are never rendered
  if (zone.hidden) return null;

  // In preview mode: always show every zone at full opacity with no animation
  if (!previewMode && (frame < startFrame || frame >= endFrame)) return null;

  const local    = previewMode ? endFrame - 1 : frame - startFrame;
  const totalDur = endFrame - startFrame;

  const enterDur  = ENTER_DUR[zone.enterAnimation] || 0;
  const enterProg = enterDur > 0 ? interpolate(local,[0,enterDur],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}) : 1;
  const enterSt   = resolveEnterStyle(zone.enterAnimation, enterProg, W, H);

  const exitDur   = EXIT_DUR[zone.exitAnimation] || 0;
  const exitStart = totalDur - exitDur;
  const exitProg  = exitDur > 0 && local >= exitStart ? interpolate(local,[exitStart,totalDur],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}) : 0;
  const exitSt    = exitProg > 0 ? resolveExitStyle(zone.exitAnimation, exitProg, W, H) : {};

  const animStyle = previewMode ? { opacity: 1 } : (exitProg > 0 ? { ...enterSt, ...exitSt } : enterSt);

  const content = zone.content    || {};
  const st      = zone.style      || {};
  const bg      = zone.background || {};

  const rotation       = st.rotation       ?? 0;
  const contentPadding = st.contentPadding ?? 0;
  const finalInset     = contentPadding > 0 ? `${contentPadding}px` : "0px";

  // Returns border-radius CSS props, supporting per-corner values (TL/TR/BR/BL)
  const brStyle = (extra = 0) => {
    const base   = st.borderRadius || 0;
    const hasPer = st.borderRadiusTL !== undefined || st.borderRadiusTR !== undefined ||
                   st.borderRadiusBR !== undefined || st.borderRadiusBL !== undefined;
    if (!hasPer) return { borderRadius: base + extra };
    return {
      borderTopLeftRadius:     (st.borderRadiusTL ?? base) + extra,
      borderTopRightRadius:    (st.borderRadiusTR ?? base) + extra,
      borderBottomRightRadius: (st.borderRadiusBR ?? base) + extra,
      borderBottomLeftRadius:  (st.borderRadiusBL ?? base) + extra,
    };
  };

  // Zones typed "avatar" by the pipeline are asset zones designated for the talking-head video.
  // Treat them as asset zones throughout.
  const effectiveType = zone.type === "avatar" ? "asset" : zone.type;

  const isAvatarZone = effectiveType === "asset" && zone.id === beat?.avatarZone
    && project?.meta?.mode === "talking_head" && !!project?.avatar?.src;
  const isEmpty = (effectiveType === "asset" && !content.asset?.src && !isAvatarZone && content.kind !== "block")
               || (effectiveType === "text" && !content.text && content.kind !== "block");

  // Zone container — rotation lives HERE so content is never clipped by the zone boundary.
  // Enter/exit animation transforms are combined with rotation on the same element.
  const isTextZone = effectiveType === "text";
  const isDecorativeZone = effectiveType === "decorative";

  const rotateStr        = rotation ? `rotate(${rotation}deg)` : "";
  const staticTransform  = st.transform || ""; // e.g. "skewY(-6deg)" from layout def
  const containerTransform = [animStyle.transform, rotateStr, staticTransform].filter(Boolean).join(" ") || undefined;
  const hasStaticTransform = !!staticTransform;

  const zoneContainerStyle = {
    position:        "absolute",
    left:            `${Number.isFinite(zone.x)      ? zone.x      : 0}%`,
    top:             `${Number.isFinite(zone.y)      ? zone.y      : 0}%`,
    width:           `${Number.isFinite(zone.width)  ? zone.width  : 100}%`,
    height:          isTextZone ? "auto" : `${Number.isFinite(zone.height) ? zone.height : 100}%`,
    zIndex:          zone.zIndex ?? 1,
    // overflow:visible lets rotated/skewed corners show outside the original bounding rect
    overflow:        rotation || hasStaticTransform || isTextZone || isDecorativeZone ? "visible" : "hidden",
    // Text zones are always fully opaque — layout-def opacity values are ignored for text.
    // Asset/decorative zones respect st.opacity for intended visual effects (overlays, rings, etc).
    opacity:         (animStyle.opacity ?? 1) * (isTextZone ? 1 : (st.opacity ?? 1)),
    transform:       containerTransform,
    transformOrigin: "center center",
    // Force GPU compositing on every zone so that <video> elements (which Chrome normally
    // promotes to a GPU overlay plane above everything) respect z-index ordering with siblings.
    willChange:      "transform",
    // Vertical centering for text zones
    display:         isTextZone ? "flex"   : undefined,
    flexDirection:   isTextZone ? "column" : undefined,
    justifyContent:  isTextZone ? "center" : undefined,
  };

  // Content wrapper — NO rotation here (container handles it)
  const contentWrapperStyle = isTextZone
    ? {
        position: "relative",
        width:    "100%",
      }
    : {
        position: "absolute",
        inset:    0,
      };

  // Inset box for scale + padding effect
  const insetBoxStyle = {
    position:     "absolute",
    top:          finalInset,
    right:        finalInset,
    bottom:       finalInset,
    left:         finalInset,
    overflow:     "hidden",
    ...brStyle(),
    boxShadow:    st.shadowBlur > 0
      ? `0 ${Math.round(st.shadowBlur * 0.4)}px ${st.shadowBlur}px ${st.shadowColor ?? "rgba(0,0,0,0.65)"}`
      : undefined,
  };

  return (
    <div style={zoneContainerStyle}>

      {/* Zone background — full zone, no rotation, no inset */}
      {(bg.kind === "color" || bg.kind === "pattern") && (() => {
        const bgStyle = bg.kind === "pattern"
          ? (backgroundPatternRegistry[bg.key]?.style || { background: "#111" })
          : { background: bg.color, backgroundSize: bg.backgroundSize || "auto" };
        return <div style={{ position:"absolute", inset:0, zIndex:0, ...bgStyle }} />;
      })()}
      {bg.kind === "asset" && bg.asset?.src && (
        <div style={{ position:"absolute", inset:0, zIndex:0, opacity: bg.asset.opacity ?? 1, filter: bg.asset.blur > 0 ? `blur(${bg.asset.blur}px)` : undefined }}>
          <AssetRenderer zone={{ src: bg.asset.src, objectFit: bg.asset.objectFit || "cover", enterTransition:"none", exitTransition:"none", motion: bg.asset.motion || "none", type: bg.asset.type || "image" }} beat={beat} slot={`${zone.id}_bg`} />
        </div>
      )}

      {/* Content wrapper with rotation */}
      <div style={{ ...contentWrapperStyle, zIndex: 1 }}>

        {/* Avatar zone — singleton <video> is appended to this container in preview
            mode; OffthreadVideo used for render. The singleton never remounts between
            beats so there is no seek and no A/V sync break on beat change. */}
        {isAvatarZone && project?.avatar?.src && (() => {
          // Auto-detect objectFit when the user hasn't explicitly set one.
          // Compares the zone's pixel aspect ratio to the avatar video's aspect ratio.
          // A portrait video (9:16) in a wide/short zone needs 'contain' to avoid
          // being cropped to a sliver; 'cover' is fine when ARs are similar.
          let resolvedObjectFit = zone._userObjectFit || null;
          let avatarBgColor = null;

          if (!resolvedObjectFit) {
            const zonePixW = ((zone.width  ?? 100) / 100) * W;
            const zonePixH = ((zone.height ?? 100) / 100) * H;
            const zoneAR   = zonePixW / Math.max(zonePixH, 1);

            // In preview read actual video dimensions; in render assume 9:16 (portrait TH)
            let vidAR = 9 / 16;
            if (!isRendering) {
              const vid = getAvatarVideoSingleton(project.avatar.src);
              if (vid && vid.videoWidth > 0) vidAR = vid.videoWidth / vid.videoHeight;
            }

            const ratio = vidAR / zoneAR;
            if (ratio < 0.65 || ratio > 1.55) {
              // Significant mismatch — contain so the full avatar is always visible
              resolvedObjectFit = "contain";
              avatarBgColor     = "#0d0d0d";
            } else {
              resolvedObjectFit = "cover";
            }
          }

          const avatarInsetStyle = avatarBgColor
            ? { ...insetBoxStyle, background: avatarBgColor }
            : insetBoxStyle;

          return (
            <div style={avatarInsetStyle}>
              <AvatarVideoZone
                src={project.avatar.src}
                trimBefore={sequenceStartFrame}
                objectFit={resolvedObjectFit}
                isRendering={isRendering}
                style={{ width: "100%", height: "100%", objectFit: resolvedObjectFit }}
              />
            </div>
          );
        })()}

        {/* Asset — with optional animated border + one-shot shine */}
        {effectiveType === "asset" && content.kind !== "block" && content.asset?.src && !isAvatarZone && (() => {
          const assetEl = (
            <AssetRenderer
              zone={{
                src:             content.asset.src,
                objectFit:       zone._userObjectFit || content.asset.objectFit || "cover",
                enterTransition: "none",
                exitTransition:  "none",
                motion:          content.asset.motion || "none",
                type:            content.asset.type   || "image",
                borderRadius:    0,
                scale:           1,
              }}
              beat={beat}
              slot={zone.id}
            />
          );

          // One-shot shine overlay — plays once at beat start, then disappears
          const shineEntry = st.shineEffect ? assetShineRegistry[st.shineEffect] : null;
          const shineSpeedMul = st.shineSpeed ?? 1.0;
          const shineDur  = shineEntry ? Math.round(shineEntry.durationFrames / shineSpeedMul) : 0;
          const shineEl   = shineEntry ? shineEntry.render(local, shineDur, interpolate) : null;

          const inner = (
            <>
              {assetEl}
              {shineEl}
            </>
          );

          // Clip-path masking — shape-masked asset
          if (st.clipShape) {
            const clipId   = `clip_${zone.id.replace(/[^a-z0-9]/gi, "_")}`;
            const cssClip  = getClipPathCSS(st.clipShape);
            const svgClip  = !cssClip ? getSVGClipContent(st.clipShape) : null;
            const clipStyle = cssClip
              ? { ...insetBoxStyle, clipPath: cssClip }
              : insetBoxStyle;
            return (
              <>
                {svgClip && (
                  <svg width="0" height="0" style={{ position: "absolute" }}>
                    <defs>
                      <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                        <g dangerouslySetInnerHTML={{ __html: svgClip }} />
                      </clipPath>
                    </defs>
                  </svg>
                )}
                <div style={{ ...clipStyle, clipPath: svgClip ? `url(#${clipId})` : clipStyle.clipPath }}>
                  {inner}
                </div>
              </>
            );
          }

          if (st.animatedBorder) {
            return (
              <AnimatedBorderFrame
                borderKey={st.animatedBorder}
                borderRadius={st.borderRadius || 0}
                frame={frame}
                fps={fps}
                overrideWidth={st.animatedBorderWidth ?? undefined}
                overrideSpeed={st.animatedBorderSpeed ?? undefined}
                contentPadding={contentPadding}
              >
                {inner}
              </AnimatedBorderFrame>
            );
          }
          return <div style={insetBoxStyle}>{inner}</div>;
        })()}

        {/* Static border overlay — shape-aware when clipShape is active */}
        {effectiveType === "asset" && (st.borderWidth ?? 0) > 0 && (() => {
          const bw          = st.borderWidth;
          const bAlign      = st.borderAlign ?? "inside";
          const borderColor = st.borderColor ?? "#ffffff";
          const borderStyle = st.borderStyle ?? "solid";

          // ── Shaped border: SVG stroke following the clip-path outline ──
          if (st.clipShape) {
            // Pixel dimensions of the inset box (matches what the clip-path is applied to)
            const zoneW = (zone.width  ?? 100) / 100 * W;
            const zoneH = (zone.height ?? 100) / 100 * H;
            const svgW  = Math.max(1, zoneW - 2 * contentPadding);
            const svgH  = Math.max(1, zoneH - 2 * contentPadding);

            const cssClip    = getClipPathCSS(st.clipShape);
            const svgContent = cssClip
              ? cssClipToSVGStroke(cssClip, svgW, svgH)
              : getSVGStrokeContent(st.clipShape, svgW, svgH);

            if (svgContent) {
              const dashArray = borderStyle === "dashed" ? `${bw * 3} ${bw * 2}`
                              : borderStyle === "dotted" ? `0 ${bw * 1.5}`
                              : undefined;
              return (
                <svg
                  style={{ position:"absolute", top:finalInset, right:finalInset, bottom:finalInset, left:finalInset,
                    overflow:"visible", pointerEvents:"none", zIndex:10 }}
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  width={svgW} height={svgH}
                >
                  <g
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={bw}
                    strokeDasharray={dashArray}
                    strokeLinecap={borderStyle === "dotted" ? "round" : "square"}
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                </svg>
              );
            }
          }

          // ── Normal rectangular border (no clip shape) ──
          const inset  = bAlign === "inside"  ? finalInset
                       : bAlign === "center"  ? `calc(${finalInset} - ${bw / 2}px)`
                       :                        `calc(${finalInset} - ${bw}px)`;
          const extraR = bAlign === "inside"  ? 0
                       : bAlign === "center"  ? bw / 2
                       :                        bw;
          return (
            <div style={{
              position:"absolute", top:inset, right:inset, bottom:inset, left:inset,
              border:`${bw}px ${borderStyle} ${borderColor}`,
              ...brStyle(extraR),
              pointerEvents:"none", zIndex:10, boxSizing:"border-box",
            }} />
          );
        })()}

        {/* Asset placeholder — no src yet and not an avatar zone */}
        {effectiveType === "asset" && !content.asset?.src && !isAvatarZone && content.kind !== "block" && (() => {
          const hint = beat?.asset_hint;
          const keywords = hint?.keywords?.length ? hint.keywords : null;
          return (
            <div style={{
              ...insetBoxStyle,
              background: "linear-gradient(135deg, rgba(40,40,70,0.9) 0%, rgba(20,20,50,0.9) 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: Math.max(4, W * 0.008),
            }}>
              <svg width="10%" height="10%" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {keywords && (
                <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap: Math.max(3, W * 0.006), padding: "0 8%" }}>
                  {keywords.map((kw, i) => (
                    <span key={i} style={{
                      fontSize:     Math.max(10, W * 0.014),
                      fontFamily:   "'JetBrains Mono', monospace",
                      color:        "rgba(124,92,252,0.85)",
                      background:   "rgba(124,92,252,0.18)",
                      borderRadius: 4,
                      padding:      `${Math.max(2, W * 0.003)}px ${Math.max(4, W * 0.008)}px`,
                      whiteSpace:   "nowrap",
                    }}>
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}


        {/* Text — with optional text effects (suppressed in previewMode) */}
        {effectiveType === "text" && (() => {
          const text        = content.text || "";
          const textEffect  = previewMode ? "none" : (st.textEffect || "none");
          const effectSpeed = st.textEffectSpeed ?? 1.0;

          // DNA typography override — applies fontFamily + fontWeight by zone role.
          // Only overrides when the zone style hasn't been manually edited by the user
          // (user edits set st._userFontFamily / st._userFontWeight flags).
          const typographySystem = project?.meta?.dna?.typographySystem;
          const dnaTypo = (!st._userFontFamily && typographySystem && zone.role)
            ? getTypographyForRole(typographySystem, zone.role)
            : null;

          const baseStyle = {
            position:        "relative",
            display:         "block",
            width:           "100%",
            padding:         st.contentPadding > 0 ? `${st.contentPadding}px` : (st.padding || "0 8px"),
            boxSizing:       "border-box",
            fontSize:        st.fontSize      || 32,
            fontWeight:      dnaTypo?.fontWeight ?? st.fontWeight ?? 700,
            fontFamily:      dnaTypo?.fontFamily ?? st.fontFamily ?? "inherit",
            fontStyle:       st.fontStyle     || "normal",
            textDecoration:  st.textDecoration || "none",
            color:           st.color         || "#ffffff",
            textAlign:       st.textAlign     || "center",
            textShadow:      st.textShadow    || "none",
            lineHeight:      st.lineHeight    || 1.15,
            letterSpacing:   st.letterSpacing || "normal",
            writingMode:     st.writingMode   || undefined,
            opacity:         1,
            background:      st.background    || "transparent",
            ...brStyle(),
            whiteSpace:      st.whiteSpace    || "normal",
            overflowWrap:    "break-word",
            wordBreak:       st.whiteSpace === "nowrap" ? "normal" : "break-word",
            WebkitTextStroke: st.textStrokeWidth > 0
              ? `${st.textStrokeWidth}px ${st.textStrokeColor || "#000000"}`
              : undefined,
          };

          // Curved text — SVG textPath (bypasses text effects)
          if (st.textCurve) {
            const angle  = Math.min(Math.abs(st.textCurve), 80) * Math.PI / 180;
            const Wp     = 1000;
            const r      = Wp / 2 / Math.sin(angle / 2);
            const sagitta = r * (1 - Math.cos(angle / 2));
            const isUp   = st.textCurve > 0;
            const baseY  = isUp ? (sagitta + 4) : 4;
            const d      = isUp
              ? `M 0,${baseY.toFixed(1)} A ${r.toFixed(1)},${r.toFixed(1)} 0 0,0 ${Wp},${baseY.toFixed(1)}`
              : `M 0,${baseY.toFixed(1)} A ${r.toFixed(1)},${r.toFixed(1)} 0 0,1 ${Wp},${baseY.toFixed(1)}`;
            const fs     = parseFloat(st.fontSize || 32);
            const viewH  = Math.ceil(sagitta + fs * 1.6 + 8);
            const pathId = `tc_${zone.id.replace(/[^a-z0-9]/gi, "_")}`;
            return (
              <svg viewBox={`0 0 ${Wp} ${viewH}`} width="100%" height="100%"
                style={{ overflow: "visible", opacity: baseStyle.opacity }}>
                <defs><path id={pathId} d={d} /></defs>
                <text
                  fontSize={baseStyle.fontSize}
                  fontFamily={baseStyle.fontFamily}
                  fontWeight={baseStyle.fontWeight}
                  fontStyle={baseStyle.fontStyle}
                  fill={baseStyle.color}
                  letterSpacing={st.letterSpacing || undefined}
                >
                  <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                    {text}
                  </textPath>
                </text>
              </svg>
            );
          }

          const effectEntry = textEffectRegistry[textEffect];
          if (effectEntry) {
            return effectEntry.render(text, local, totalDur, baseStyle, effectSpeed, interpolate);
          }
          return <div style={baseStyle}>{text}</div>;
        })()}

        {/* Decorative — two variants:
            1. User-placed (content.decorativeId) → render SVG from registry, color-injected
            2. Layout-level (style.background, no decorativeId) → CSS gradient/color overlay */}
        {effectiveType === "decorative" && (() => {
          const decId = zone.content?.decorativeId;
          if (decId) {
            const entry = decorativeById[decId];
            if (!entry) return null;
            const color = st.color || "#ffffff";

            // Flip transform
            const flipX = st.flipH ? -1 : 1;
            const flipY = st.flipV ? -1 : 1;
            const flipTransform = (flipX !== 1 || flipY !== 1) ? `scale(${flipX}, ${flipY})` : undefined;

            // CSS-only decoratives (lines, dividers, dashes)
            if (entry.render === "css_repeat" && entry.css) {
              const injectColor = (val) =>
                typeof val === "string" ? val.replace(/currentColor/g, color) : val;
              const cssStyle = Object.fromEntries(
                Object.entries(entry.css).map(([k, v]) => [k, injectColor(v)])
              );
              const hasRadius = (st.borderRadius || 0) > 0 || st.borderRadiusTL !== undefined;
              return (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                  ...(flipTransform ? { transform: flipTransform } : {}),
                  ...(hasRadius ? { ...brStyle(), overflow: "hidden" } : {}),
                }}>
                  <div style={{ width: "100%", ...cssStyle }} />
                </div>
              );
            }

            // SVG decoratives
            if (entry.svg) {
              const filled = st.filled ?? false;
              const gradType  = st.gradientType ?? "none";
              const gradAngle = st.gradientAngle ?? 90;
              const useGrad   = gradType !== "none";
              const gradId    = `dg_${String(zone.id).replace(/[^a-z0-9]/gi, "_")}`;

              // Resolve stops — new array model, falling back to legacy two-color fields
              const gradStops = st.gradientStops?.length >= 2
                ? st.gradientStops
                : [
                    { pos: 0,   color: st.gradientColor1 || color,      opacity: st.gradientOpacity1 ?? 100 },
                    { pos: 100, color: st.gradientColor2 || "#000000",   opacity: st.gradientOpacity2 ?? 100 },
                  ];
              const stopsSVG = [...gradStops]
                .sort((a, b) => a.pos - b.pos)
                .map(s => `<stop offset="${s.pos}%" stop-color="${s.color}" stop-opacity="${(s.opacity ?? 100) / 100}"/>`)
                .join("");

              // Build SVG <defs> with gradient when requested
              let gradDefs = "";
              if (useGrad) {
                if (gradType === "linear") {
                  const rad = (gradAngle * Math.PI) / 180;
                  const x1  = (0.5 - 0.5 * Math.sin(rad)).toFixed(4);
                  const y1  = (0.5 + 0.5 * Math.cos(rad)).toFixed(4);
                  const x2  = (0.5 + 0.5 * Math.sin(rad)).toFixed(4);
                  const y2  = (0.5 - 0.5 * Math.cos(rad)).toFixed(4);
                  gradDefs = `<defs><linearGradient id="${gradId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="objectBoundingBox">${stopsSVG}</linearGradient></defs>`;
                } else {
                  gradDefs = `<defs><radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">${stopsSVG}</radialGradient></defs>`;
                }
              }

              const paintRef = useGrad ? `url(#${gradId})` : color;

              let svgStr;
              if (filled) {
                svgStr = entry.svg
                  .replace(/fill="none"/g, `fill="${paintRef}"`)
                  .replace(/stroke="currentColor"/g, 'stroke="none"')
                  .replace(/currentColor/g, paintRef);
              } else {
                svgStr = entry.svg
                  .replace(/fill="currentColor"/g, 'fill="none"')
                  .replace(/currentColor/g, paintRef);
              }
              const sw = st.strokeWidth ?? 3;
              // Apply stroke-width to all stroke elements when in outline mode
              if (!filled) {
                svgStr = svgStr.replace(/stroke-width="[^"]*"/g, `stroke-width="${sw}"`);
                // If no stroke-width attribute exists, add it to the svg tag
                if (!svgStr.includes('stroke-width=')) {
                  svgStr = svgStr.replace(/<svg /, `<svg stroke-width="${sw}" `);
                }
              }
              const hasRadius = (st.borderRadius || 0) > 0 || st.borderRadiusTL !== undefined;
              return (
                <div style={{
                  position:     "absolute",
                  inset:        0,
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  overflow:     hasRadius ? "hidden" : "visible",
                  ...(hasRadius ? brStyle() : {}),
                  ...(flipTransform ? { transform: flipTransform } : {}),
                }}
                  dangerouslySetInnerHTML={{ __html: (() => {
                    // Rewrite the opening <svg> tag: keep all original attrs (especially viewBox)
                    // but force width/height/preserveAspectRatio so shape fills the zone freely.
                    let result = svgStr.replace(/<svg([^>]*)>/, (_, attrs) => {
                      const cleaned = attrs
                        .replace(/\s*width="[^"]*"/g, '')
                        .replace(/\s*height="[^"]*"/g, '')
                        .replace(/\s*preserveAspectRatio="[^"]*"/g, '');
                      return `<svg width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible"${cleaned}>`;
                    });
                    // Inject gradient defs right after the opening tag
                    result = result.replace(/(<svg[^>]*>)/, `$1${gradDefs}`);
                    return result;
                  })() }}
                />
              );
            }
            return null;
          }
          // Layout-level CSS overlay (gradient dividers, color bars baked into layouts)
          if (st.background) {
            return (
              <div style={{
                position:     "absolute",
                inset:        0,
                background:   st.background,
                opacity:      st.opacity ?? 1,
                ...brStyle(),
                pointerEvents:"none",
              }} />
            );
          }
          return null;
        })()}

        {/* Icon zones — Iconify (Phosphor) first, local registry fallback */}
        {effectiveType === "icon" && (() => {
          const iconifyDef      = zone.iconify;
          const contentIconify  = zone.content?.iconify;
          const resolvedIconify = contentIconify ?? iconifyDef;
          const iconColor       = st.color ?? "#ffffff";
          const iconSize        = st.iconSize ?? 100;

          // Wrapper: full zone when 100%, else centered box at iconSize%
          const iconWrap = iconSize === 100
            ? { position: "absolute", inset: 0, overflow: "visible" }
            : {
                position:  "absolute",
                width:     `${iconSize}%`,
                height:    `${iconSize}%`,
                top:       "50%",
                left:      "50%",
                transform: `translate(-50%, -50%)${st.rotation ? ` rotate(${st.rotation}deg)` : ""}`,
                overflow:  "visible",
              };

          if (resolvedIconify?.set && resolvedIconify?.icon) {
            return (
              <div style={iconWrap}>
                <IconifyZone
                  set={resolvedIconify.set}
                  icon={resolvedIconify.icon}
                  color={iconColor}
                  style={st}
                />
              </div>
            );
          }

          // Fallback — local iconRegistry
          const iconId = zone.content?.iconId;
          if (!iconId) return null;
          const svg = renderIconSVG(iconId, { ...st, color: iconColor });
          if (!svg) return null;
          return (
            <div style={iconWrap}>
              <svg
                viewBox={svg.viewBox}
                preserveAspectRatio="xMidYMid meet"
                width="100%" height="100%"
                style={{ display: "block", overflow: "visible", opacity: st.opacity ?? 1 }}
                dangerouslySetInnerHTML={{ __html: svg.content }}
              />
            </div>
          );
        })()}


      </div>

      {isEmpty && (
        <div style={{
          position: "absolute", inset: 0,
          border: "1.5px dashed rgba(255,255,255,0.3)",
          ...brStyle(),
          pointerEvents: "none",
          zIndex: 99,
        }} />
      )}

    </div>
  );
}

export default function LayoutRenderer({ beat, project, layoutDef, previewMode = false, sequenceStartFrame = 0 }) {
  const { width: W, height: H } = useVideoConfig();
  if (!layoutDef) return null;

  const beatDurationSec = (beat.end_sec || 0) - (beat.start_sec || 0);
  const beatZones       = beat.zones || {};
  const defZoneIds      = new Set(layoutDef.zones.map(z => z.id));

  const deletedZones = new Set(beat.deletedZones || []);

  const _seenLRDefIds = new Set();
  const defZones = layoutDef.zones.flatMap(d => {
    if (!d.id) return [];                          // skip legacy zones without an id
    if (_seenLRDefIds.has(d.id)) return [];        // deduplicate — bad saves may store same id twice
    _seenLRDefIds.add(d.id);
    if (deletedZones.has(d.id)) return [];
    const o = beatZones[d.id] || {};
    return [{
      ...d,
      type:            d.type,
      x:               o.x              ?? d.x,
      y:               o.y              ?? d.y,
      width:           o.width          ?? d.width,
      height:          o.height         ?? d.height,
      zIndex:          o.zIndex         ?? d.zIndex,
      start:           o.start          ?? d.start,
      end:             o.end            !== undefined ? o.end : d.end,
      enterAnimation:  o.enterAnimation ?? d.enterAnimation,
      exitAnimation:   o.exitAnimation  ?? d.exitAnimation,
      content:         (() => {
                         const merged = { ...(d.content || {}), ...(o.content || {}) };
                         // For asset zones: the def may store an admin preview/example image.
                         // That src must NEVER render in production — only the beat zone's src counts.
                         if (d.type === "asset") {
                           merged.asset = { ...(merged.asset || {}), src: o.content?.asset?.src ?? null };
                         }
                         return merged;
                       })(),
      style:           { ...d.style, ...(o.style || {}) },
      background:      o.background     || {},
      hidden:          o.hidden         || false,
      // Raw beat-zone objectFit — user's explicit override, not mixed with layout-def defaults.
      // Used for asset/avatar rendering so layout-def "cover" default never shadows user's choice.
      _userObjectFit:  o.style?.objectFit,
    }];
  });

  const extraZones = Object.entries(beatZones)
    .filter(([id]) => !defZoneIds.has(id))
    .map(([id, z]) => ({
      id, type: z.type || "asset",
      x: z.x ?? 0, y: z.y ?? 0, width: z.width ?? 50, height: z.height ?? 50,
      zIndex: z.zIndex ?? 10, start: z.start ?? 0, end: z.end ?? null,
      enterAnimation: z.enterAnimation || "fadeIn", exitAnimation: z.exitAnimation || "none",
      content: z.content || {}, style: z.style || {}, background: z.background || {},
      hidden: z.hidden || false,
      // For extra zones the style has no layout-def layer, so _userObjectFit = style.objectFit directly
      _userObjectFit: z.style?.objectFit,
    }));

  // Sort by zIndex so DOM order matches visual stacking — required because transform
  // (rotation, animations) creates stacking contexts that ignore CSS z-index across siblings.
  const allZones     = [...defZones, ...extraZones].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
  const contentZones = allZones.filter(z => z.type !== "element");
  const elementZones = allZones.filter(z => z.type === "element");

  // Background priority:
  //   1. beat.layoutBackground (set by the AI pipeline or user in editor)
  //   2. layoutDef.generation_meta.default_background (set during layout generation)
  //   3. Blur the first asset zone as an ambient background fallback
  const effectiveBackground = beat?.layoutBackground
    ?? layoutDef?.generation_meta?.default_background
    ?? null;
  const hasExplicitBg = !!effectiveBackground;
  const talkMode      = project?.meta?.mode === "talking_head";
  const avatarHasSrc  = !!project?.avatar?.src;
  // Resolve which zone id is the active avatar zone.
  // Priority: 1) explicit beat.avatarZone  2) layout-def zone typed "avatar"  3) beat zone typed "avatar"
  const activeAvatarZoneId = (talkMode && avatarHasSrc)
    ? (beat?.avatarZone !== undefined
        ? beat.avatarZone
        : (layoutDef.zones.find(z => z.type === "avatar")?.id
           ?? Object.entries(beatZones).find(([, z]) => z?.type === "avatar")?.[0]
           ?? null))
    : null;
  const blurSrc = !hasExplicitBg
    ? contentZones.find(z => z.type === "asset" && z.content?.asset?.src && z.id !== activeAvatarZoneId)?.content?.asset?.src ?? null
    : null;

  const pad = beat?.layoutPadding || 0;

  return (
    <div style={{ position:"absolute", inset:0, width:"100%", height:"100%", overflow:"hidden" }}>
      {blurSrc
        ? <BlurredAssetBackground src={blurSrc} />
        : <LayoutBackgroundRenderer background={effectiveBackground} beat={beat} />
      }
      {/* Zone content — inset by layoutPadding */}
      <div style={{ position:"absolute", inset: pad, overflow:"hidden" }}>
        {contentZones.map(zone => (
          <ZoneLayer key={zone.id} zone={zone} beat={beat} project={project} W={W - pad * 2} H={H - pad * 2} beatDurationSec={beatDurationSec} previewMode={previewMode} sequenceStartFrame={sequenceStartFrame} />
        ))}
      </div>
      {elementZones.map(zone => (
        <ElementRenderer key={zone.id} zone={zone} beatDurationSec={beatDurationSec} />
      ))}
    </div>
  );
}