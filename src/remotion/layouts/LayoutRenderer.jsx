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
import { useCurrentFrame, useVideoConfig, interpolate, Img, OffthreadVideo } from "remotion";
import AssetRenderer from "../elements/AssetRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";
import ElementRenderer from "../elements/ElementRenderer";
import { backgroundPatternRegistry } from "../../core/backgroundPatternRegistry";
import textEffectRegistry from "../../core/textEffectRegistry.jsx";
import { getTypographyForRole } from "../../core/videoDNA.js";
import animatedBorderRegistry from "../../core/animatedBorderRegistry.js";
import assetShineRegistry     from "../../core/assetShineRegistry.jsx";
import { getClipPathCSS, getSVGClipContent } from "../../core/decorativeShapeRegistry.js";
import { renderIconSVG } from "../../core/iconRegistry.jsx";
import { IconifyZone }  from "../elements/IconifyZone.jsx";
import { decorativeById } from "../../core/designLibrary/decorativeRegistry.js";

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
        ? <OffthreadVideo src={src} muted style={mediaStyle} />
        : <Img            src={src}        style={mediaStyle} />
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

function ZoneLayer({ zone, beat, project, W, H, beatDurationSec, previewMode = false }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
    left:            `${zone.x     ?? 0}%`,
    top:             `${zone.y     ?? 0}%`,
    width:           `${zone.width ?? 100}%`,
    height:          isTextZone ? "auto" : `${zone.height ?? 100}%`,
    zIndex:          zone.zIndex ?? 1,
    // overflow:visible lets rotated/skewed corners show outside the original bounding rect
    overflow:        rotation || hasStaticTransform || isTextZone || isDecorativeZone ? "visible" : "hidden",
    // Text zones are always fully opaque — layout-def opacity values are ignored for text.
    // Asset/decorative zones respect st.opacity for intended visual effects (overlays, rings, etc).
    opacity:         (animStyle.opacity ?? 1) * (isTextZone ? 1 : (st.opacity ?? 1)),
    transform:       containerTransform,
    transformOrigin: "center center",
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
    borderRadius: st.borderRadius || 0,
    boxShadow:    st.shadowBlur > 0
      ? `0 ${Math.round(st.shadowBlur * 0.4)}px ${st.shadowBlur}px rgba(0,0,0,0.65)`
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

        {/* Avatar zone — visual is handled by the single global Html5Video in VideoComposition.
            Nothing is rendered here; the global video is positioned over this zone's area. */}

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
            padding:         st.padding       || "0 8px",
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
            opacity:         1,
            background:      st.background    || "transparent",
            borderRadius:    st.borderRadius  || 0,
            whiteSpace:      "normal",
            overflowWrap:    "break-word",
            wordBreak:       "break-word",
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

            // CSS-only decoratives (lines, dividers, dashes)
            if (entry.render === "css_repeat" && entry.css) {
              const injectColor = (val) =>
                typeof val === "string" ? val.replace(/currentColor/g, color) : val;
              const cssStyle = Object.fromEntries(
                Object.entries(entry.css).map(([k, v]) => [k, injectColor(v)])
              );
              return (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <div style={{ width: "100%", ...cssStyle }} />
                </div>
              );
            }

            // SVG decoratives
            if (entry.svg) {
              const svgStr = entry.svg.replace(/currentColor/g, color);
              return (
                <div style={{
                  position:     "absolute",
                  inset:        0,
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  overflow:     "visible",
                }}
                  dangerouslySetInnerHTML={{ __html: svgStr.replace(
                    /<svg /,
                    '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="overflow:visible" '
                  ) }}
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
                borderRadius: st.borderRadius || 0,
                pointerEvents:"none",
              }} />
            );
          }
          return null;
        })()}

        {/* Icon zones — Iconify (Phosphor) first, local registry fallback */}
        {effectiveType === "icon" && (() => {
          const iconifyDef     = zone.iconify;           // baked into layout def
          const contentIconify = zone.content?.iconify;  // user-picked
          const resolvedIconify = contentIconify ?? iconifyDef;
          const iconColor = st.color ?? "#ffffff";

          if (resolvedIconify?.set && resolvedIconify?.icon) {
            return (
              <div style={{ position: "absolute", inset: 0 }}>
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
            <div style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <svg
                viewBox={svg.viewBox}
                preserveAspectRatio="none"
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
          borderRadius: st.borderRadius || 0,
          pointerEvents: "none",
          zIndex: 99,
        }} />
      )}

    </div>
  );
}

export default function LayoutRenderer({ beat, project, layoutDef, previewMode = false }) {
  const { width: W, height: H } = useVideoConfig();
  if (!layoutDef) return null;

  const beatDurationSec = (beat.end_sec || 0) - (beat.start_sec || 0);
  const beatZones       = beat.zones || {};
  const defZoneIds      = new Set(layoutDef.zones.map(z => z.id));

  const deletedZones = new Set(beat.deletedZones || []);

  const defZones = layoutDef.zones.flatMap(d => {
    if (deletedZones.has(d.id)) return [];
    const o = beatZones[d.id] || {};
    return [{
      ...d,
      type:            d.type,                    // layout def is authoritative; beat zone type is ignored for layout zones
      x:               o.x              ?? d.x,
      y:               o.y              ?? d.y,
      width:           o.width          ?? d.width,
      height:          o.height         ?? d.height,
      zIndex:          o.zIndex         ?? d.zIndex,
      start:           o.start          ?? d.start,
      end:             o.end            !== undefined ? o.end : d.end,
      enterAnimation:  o.enterAnimation ?? d.enterAnimation,
      exitAnimation:   o.exitAnimation  ?? d.exitAnimation,
      content:         o.content        || {},
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

  // Background: layoutBackground is always set by pipeline (pattern or image).
  // If no layoutBackground, blur the first non-avatar asset zone as an ambient background.
  const hasExplicitBg = !!beat?.layoutBackground;
  const talkMode      = project?.meta?.mode === "talking_head";
  const avatarHasSrc  = !!project?.avatar?.src;
  // Resolve which zone id is the active avatar zone (explicit beat override or layout-def default)
  const activeAvatarZoneId = (talkMode && avatarHasSrc)
    ? (beat?.avatarZone !== undefined ? beat.avatarZone : (layoutDef.zones.find(z => z.type === "avatar")?.id ?? null))
    : null;
  const blurSrc = !hasExplicitBg
    ? contentZones.find(z => z.type === "asset" && z.content?.asset?.src && z.id !== activeAvatarZoneId)?.content?.asset?.src ?? null
    : null;

  const pad = beat?.layoutPadding || 0;

  return (
    <div style={{ position:"absolute", inset:0, width:"100%", height:"100%", overflow:"hidden" }}>
      {blurSrc
        ? <BlurredAssetBackground src={blurSrc} />
        : <LayoutBackgroundRenderer background={beat?.layoutBackground} beat={beat} />
      }
      {/* Zone content — inset by layoutPadding */}
      <div style={{ position:"absolute", inset: pad, overflow:"hidden" }}>
        {contentZones.map(zone => (
          <ZoneLayer key={zone.id} zone={zone} beat={beat} project={project} W={W - pad * 2} H={H - pad * 2} beatDurationSec={beatDurationSec} previewMode={previewMode} />
        ))}
      </div>
      {elementZones.map(zone => (
        <ElementRenderer key={zone.id} zone={zone} beatDurationSec={beatDurationSec} />
      ))}
    </div>
  );
}