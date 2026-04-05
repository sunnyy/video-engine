/**
 * LayoutRenderer.jsx
 * src/remotion/layouts/LayoutRenderer.jsx
 *
 * Zone container: absolute position only, no rotation (keeps layout correct).
 * Inner content div: rotation + scale applied here.
 * Scale implemented as inset padding so background fills full zone,
 * content is inset from edges.
 */

import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import AssetRenderer from "../elements/AssetRenderer";
import AvatarLayer from "../elements/AvatarLayer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";
import blockRegistry from "../../core/blockRegistry";

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

function resolveExitStyle(animation, progress, W, H) {
  switch (animation) {
    case "fadeOut":      return { opacity: interpolate(progress,[0,1],[1,0],{extrapolateRight:"clamp"}) };
    case "slideUpOut":   return { opacity: interpolate(progress,[0.6,1],[1,0],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(progress,[0,1],[0,-H*0.1],{extrapolateRight:"clamp"})}px)` };
    case "slideDownOut": return { opacity: interpolate(progress,[0.6,1],[1,0],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(progress,[0,1],[0,H*0.1],{extrapolateRight:"clamp"})}px)` };
    case "scaleOut":     return { opacity: interpolate(progress,[0.5,1],[1,0],{extrapolateRight:"clamp"}), transform:`scale(${interpolate(progress,[0,1],[1,0.85],{extrapolateRight:"clamp"})})` };
    default:             return {};
  }
}

const ENTER_DUR = { fadeIn:18, slideUpIn:16, slideDownIn:16, slideLeftIn:16, slideRightIn:16, popIn:14, scaleIn:18, none:0 };
const EXIT_DUR  = { fadeOut:14, slideUpOut:14, slideDownOut:14, scaleOut:14, none:0 };

function ZoneLayer({ zone, beat, project, W, H, beatDurationSec }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round((zone.start ?? 0) * fps);
  const endFrame   = zone.end != null ? Math.round(zone.end * fps) : Math.round(beatDurationSec * fps);

  if (frame < startFrame || frame >= endFrame) return null;

  const local    = frame - startFrame;
  const totalDur = endFrame - startFrame;

  const enterDur  = ENTER_DUR[zone.enterAnimation] || 0;
  const enterProg = enterDur > 0 ? interpolate(local,[0,enterDur],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}) : 1;
  const enterSt   = resolveEnterStyle(zone.enterAnimation, enterProg, W, H);

  const exitDur   = EXIT_DUR[zone.exitAnimation] || 0;
  const exitStart = totalDur - exitDur;
  const exitProg  = exitDur > 0 && local >= exitStart ? interpolate(local,[exitStart,totalDur],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}) : 0;
  const exitSt    = exitProg > 0 ? resolveExitStyle(zone.exitAnimation, exitProg, W, H) : {};

  const animStyle = exitProg > 0 ? { ...enterSt, ...exitSt } : enterSt;

  const content = zone.content    || {};
  const st      = zone.style      || {};
  const bg      = zone.background || {};

  const scale          = st.scale          ?? 1;
  const rotation       = st.rotation       ?? 0;
  const contentPadding = st.contentPadding ?? 0;

  // Scale as inset — shrinks content within zone, background fills full zone
  const scaleInset  = scale < 1 ? ((1 - scale) / 2) * 100 : 0;
  // contentPadding adds extra inset in px on top of scale inset
  const insetPct    = scaleInset > 0 ? `${scaleInset}%` : "0%";
  const insetPx     = contentPadding > 0 ? `${contentPadding}px` : null;
  // Combine: use calc() when both are present
  const makeInset = (pct, px) => {
    if (px && pct !== "0%") return `calc(${pct} + ${px})`;
    if (px) return px;
    return pct;
  };
  const finalInset = makeInset(insetPct, insetPx);

  const isEmpty = (zone.type === "asset" && !content.asset?.src && content.kind !== "avatar")
               || (zone.type === "text" && !content.text);

  // Zone container — position only, no rotation, no transform (enter/exit handled below)
  const zoneContainerStyle = {
    position: "absolute",
    left:     `${zone.x      ?? 0}%`,
    top:      `${zone.y      ?? 0}%`,
    width:    `${zone.width  ?? 100}%`,
    height:   `${zone.height ?? 100}%`,
    zIndex:    zone.zIndex   ?? 1,
    overflow: "hidden",
    // Enter/exit animation on container
    opacity:   animStyle.opacity ?? 1,
    transform: animStyle.transform || undefined,
  };

  // Content wrapper — rotation applied here, inside zone bounds
  const contentWrapperStyle = {
    position: "absolute",
    inset:    0,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: "center center",
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
      {bg.kind === "color" && (
        <div style={{ position:"absolute", inset:0, zIndex:0, background: bg.color, backgroundSize: bg.backgroundSize || "auto" }} />
      )}
      {bg.kind === "asset" && bg.asset?.src && (
        <div style={{ position:"absolute", inset:0, zIndex:0, opacity: bg.asset.opacity ?? 1, filter: bg.asset.blur > 0 ? `blur(${bg.asset.blur}px)` : undefined }}>
          <AssetRenderer zone={{ src: bg.asset.src, objectFit: bg.asset.objectFit || "cover", enterTransition:"none", exitTransition:"none", motion: bg.asset.motion || "none", type: bg.asset.type || "image" }} beat={beat} slot={`${zone.id}_bg`} />
        </div>
      )}

      {/* Content wrapper with rotation */}
      <div style={{ ...contentWrapperStyle, zIndex: 1 }}>

        {/* Asset — scale via inset */}
        {zone.type === "asset" && content.asset?.src && (
          <div style={insetBoxStyle}>
            <AssetRenderer
              zone={{
                src:             content.asset.src,
                objectFit:       content.asset.objectFit || st.objectFit || "cover",
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
          </div>
        )}

        {/* Asset placeholder — no src yet */}
        {zone.type === "asset" && !content.asset?.src && content.kind !== "avatar" && (
          <div style={{
            ...insetBoxStyle,
            background: "linear-gradient(135deg, rgba(40,40,70,0.9) 0%, rgba(20,20,50,0.9) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="15%" height="15%" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.2 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
              <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {zone.type === "asset" && content.kind === "avatar" && (
          <AvatarLayer beat={beat} project={project} />
        )}

        {/* Text */}
        {zone.type === "text" && (
          <div style={{
            position:"absolute",
            top:    finalInset, right:  finalInset,
            bottom: finalInset, left:   finalInset,
            display:"flex",
            alignItems:"center",
            justifyContent: st.textAlign === "left" ? "flex-start" : st.textAlign === "right" ? "flex-end" : "center",
            padding:        st.padding       || "0 8px",
            boxSizing:      "border-box",
            fontSize:       st.fontSize      || 32,
            fontWeight:     st.fontWeight    || 700,
            fontFamily:     st.fontFamily    || "inherit",
            color:          st.color         || "#ffffff",
            textAlign:      st.textAlign     || "center",
            textShadow:     st.textShadow    || "none",
            lineHeight:     st.lineHeight    || 1.15,
            letterSpacing:  st.letterSpacing || "normal",
            opacity:        st.opacity       ?? 1,
            background:     st.background    || "transparent",
            borderRadius:   st.borderRadius  || 0,
          }}>
            {content.text || ""}
          </div>
        )}

        {/* Block */}
        {zone.type === "block" && (() => {
          const block = content.block;
          if (!block?.type) return null;
          const entry = blockRegistry[block.type];
          if (!entry?.renderer) return null;
          const BR = entry.renderer;
          return (
            <div style={{ position:"absolute", inset:0 }}>
              <BR block={block} variant={block.variant || entry.variants?.[0] || "default"} zone={zone} beat={beat} project={project} />
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

export default function LayoutRenderer({ beat, project, layoutDef }) {
  const { width: W, height: H } = useVideoConfig();
  if (!layoutDef) return null;

  const beatDurationSec = (beat.end_sec || 0) - (beat.start_sec || 0);
  const beatZones       = beat.zones || {};
  const defZoneIds      = new Set(layoutDef.zones.map(z => z.id));

  const defZones = layoutDef.zones.map(d => {
    const o = beatZones[d.id] || {};
    return {
      ...d,
      x:              o.x              ?? d.x,
      y:              o.y              ?? d.y,
      width:          o.width          ?? d.width,
      height:         o.height         ?? d.height,
      zIndex:         o.zIndex         ?? d.zIndex,
      start:          o.start          ?? d.start,
      end:            o.end            !== undefined ? o.end : d.end,
      enterAnimation: o.enterAnimation ?? d.enterAnimation,
      exitAnimation:  o.exitAnimation  ?? d.exitAnimation,
      content:        o.content        || {},
      style:          { ...d.style, ...(o.style || {}) },
      background:     o.background     || {},
    };
  });

  const extraZones = Object.entries(beatZones)
    .filter(([id]) => !defZoneIds.has(id))
    .map(([id, z]) => ({
      id, type: z.type || "asset",
      x: z.x ?? 0, y: z.y ?? 0, width: z.width ?? 50, height: z.height ?? 50,
      zIndex: z.zIndex ?? 10, start: z.start ?? 0, end: z.end ?? null,
      enterAnimation: z.enterAnimation || "fadeIn", exitAnimation: z.exitAnimation || "none",
      content: z.content || {}, style: z.style || {}, background: z.background || {},
    }));

  return (
    <div style={{ position:"absolute", inset:0, width:"100%", height:"100%", overflow:"hidden" }}>
      <LayoutBackgroundRenderer background={beat?.layoutBackground} beat={beat} />
      {[...defZones, ...extraZones].map(zone => (
        <ZoneLayer key={zone.id} zone={zone} beat={beat} project={project} W={W} H={H} beatDurationSec={beatDurationSec} />
      ))}
    </div>
  );
}