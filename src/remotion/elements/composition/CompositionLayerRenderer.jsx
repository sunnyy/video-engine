/**
 * CompositionLayerRenderer.jsx
 * src/remotion/elements/composition/CompositionLayerRenderer.jsx
 *
 * Dispatches each element in beat.composition to its renderer.
 * Works in both Remotion (with animation) and plain React (canvas preview).
 *
 * Usage:
 *   <CompositionLayerRenderer beat={beat} animated={true} />
 */
import React from "react";

import NoiseGradientRenderer  from "./NoiseGradientRenderer";
import GradientVignetteRenderer from "./GradientVignetteRenderer";
import StarBurstRenderer      from "./StarBurstRenderer";
import LabelBadgeRenderer     from "./LabelBadgeRenderer";
import HeroWordRenderer       from "./HeroWordRenderer";
import ColorTintRenderer      from "./ColorTintRenderer";
import DiagonalCutRenderer    from "./DiagonalCutRenderer";
import DotGridRenderer        from "./DotGridRenderer";
import TickerBarRenderer      from "./TickerBarRenderer";
import BlobShapeRenderer      from "./BlobShapeRenderer";

/* ── Renderer map ─────────────────────────────────────────────── */

const RENDERERS = {
  noise_gradient:    NoiseGradientRenderer,
  solid_color:       ({ el }) => (
    <div style={{ position: "absolute", inset: 0, background: el.color || "#0a0a0a", pointerEvents: "none" }} />
  ),
  diagonal_cut:      DiagonalCutRenderer,
  blob_shape:        BlobShapeRenderer,
  checker_pattern:   ({ el }) => {
    const sizeA  = el.size  ?? 50;
    const colorA = el.colorA ?? "#1a1a2e";
    const colorB = el.colorB ?? "#0a0a0a";
    const patternSvg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${sizeA*2}' height='${sizeA*2}'><rect width='${sizeA}' height='${sizeA}' fill='${colorA}'/><rect x='${sizeA}' y='${sizeA}' width='${sizeA}' height='${sizeA}' fill='${colorA}'/><rect x='${sizeA}' y='0' width='${sizeA}' height='${sizeA}' fill='${colorB}'/><rect x='0' y='${sizeA}' width='${sizeA}' height='${sizeA}' fill='${colorB}'/></svg>`
    );
    return (
      <div style={{
        position:        "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,${patternSvg}")`,
        backgroundSize:  `${sizeA * 2}px ${sizeA * 2}px`,
      }} />
    );
  },
  asset_fill:        null, // handled by existing layout zone system
  gradient_vignette: GradientVignetteRenderer,
  color_tint:        ColorTintRenderer,
  noise_texture:     ({ el }) => (
    <div style={{
      position:        "absolute",
      inset:           0,
      opacity:         el.opacity ?? 0.05,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize:  "200px 200px",
      mixBlendMode:    "overlay",
      pointerEvents:   "none",
    }} />
  ),
  polaroid_card:     null, // complex — skip for now
  inset_frame:       ({ el }) => {
    const color     = el.color     ?? "#ffffff";
    const inset     = el.inset     ?? 0.06;
    const thickness = el.thickness ?? 2;
    const pct       = Math.round(inset * 100);
    return (
      <div style={{
        position:  "absolute",
        top:       `${pct}%`, right: `${pct}%`, bottom: `${pct}%`, left: `${pct}%`,
        border:    `${thickness}px solid ${color}`,
        opacity:   0.6,
        pointerEvents: "none",
        boxSizing: "border-box",
      }} />
    );
  },
  ticker_bar:        TickerBarRenderer,
  torn_edge:         ({ el }) => {
    const color    = el.color    ?? "#0a0a0a";
    const position = el.position ?? "bottom";
    const clipPath = position === "bottom"
      ? "polygon(0 20%, 8% 0, 16% 18%, 24% 2%, 32% 20%, 40% 4%, 48% 22%, 56% 6%, 64% 24%, 72% 8%, 80% 26%, 88% 10%, 96% 28%, 100% 15%, 100% 100%, 0 100%)"
      : "polygon(0 0, 100% 0, 100% 85%, 96% 72%, 88% 90%, 80% 74%, 72% 92%, 64% 76%, 56% 94%, 48% 78%, 40% 96%, 32% 80%, 24% 98%, 16% 82%, 8% 100%, 0 84%)";
    return (
      <div style={{
        position: "absolute", inset: 0,
        background: color, clipPath, pointerEvents: "none",
      }} />
    );
  },
  hero_word:         HeroWordRenderer,
  label_badge:       LabelBadgeRenderer,
  script_accent:     ({ el, beat }) => {
    const color = el.color ?? "#7c5cfc";
    const font  = el.font  ?? "Caveat";
    const text  = beat?.spoken ? beat.spoken.split(/\s+/).slice(-3).join(" ") : "just saying";
    return (
      <div style={{
        position:      "absolute",
        inset:         0,
        display:       "flex",
        alignItems:    "center",
        justifyContent:"flex-start",
        padding:       "0 8%",
        pointerEvents: "none",
      }}>
        <span style={{
          fontFamily:    `'${font}', cursive`,
          fontSize:      "clamp(20px, 5vw, 42px)",
          color,
          opacity:       0.85,
          transform:     "rotate(-3deg)",
          display:       "inline-block",
        }}>
          {text}
        </span>
      </div>
    );
  },
  circle_badge:      ({ el }) => {
    const size  = el.size  ?? 80;
    const color = "#ffffff";
    return (
      <div style={{
        position:  "absolute",
        inset:     0,
        display:   "flex",
        alignItems:"center",
        justifyContent:"center",
        pointerEvents:"none",
      }}>
        <div style={{
          width:        size, height: size,
          borderRadius: "50%",
          border:       `2px solid ${color}`,
          opacity:      0.6,
          display:      "flex",
          alignItems:   "center",
          justifyContent:"center",
          fontSize:     "clamp(8px, 1.5vw, 12px)",
          fontWeight:   700,
          fontFamily:   "'Outfit', sans-serif",
          letterSpacing:"0.12em",
          textTransform:"uppercase",
          color,
        }}>
          FOLLOW
        </div>
      </div>
    );
  },
  outline_text:      ({ el, beat }) => {
    const color      = el.color      ?? "#7c5cfc";
    const opacity    = el.opacity    ?? 0.12;
    const word       = (beat?.spoken || "").trim().split(/\s+/)[0]?.toUpperCase() || "NOW";
    return (
      <div style={{
        position:      "absolute",
        inset:         0,
        display:       "flex",
        alignItems:    "center",
        justifyContent:"center",
        overflow:      "hidden",
        pointerEvents: "none",
      }}>
        <span style={{
          fontSize:         "clamp(90px, 32vw, 320px)",
          fontWeight:       900,
          fontFamily:       "'Bebas Neue', sans-serif",
          color:            "transparent",
          WebkitTextStroke: `2px ${color}`,
          textStroke:       `2px ${color}`,
          opacity,
          userSelect:       "none",
          whiteSpace:       "nowrap",
        }}>
          {word}
        </span>
      </div>
    );
  },
  star_burst:        StarBurstRenderer,
  arrow_swoosh:      ({ el }) => {
    const color     = el.color     ?? "#ffffff";
    const direction = el.direction ?? "right";
    const path      = direction === "down"
      ? "M12 5v14M5 12l7 7 7-7"
      : "M5 12h14M12 5l7 7-7 7";
    return (
      <div style={{
        position:      "absolute",
        inset:         0,
        display:       "flex",
        alignItems:    "center",
        justifyContent:"center",
        pointerEvents: "none",
      }}>
        <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
          <path d={path} />
        </svg>
      </div>
    );
  },
  dot_grid:          DotGridRenderer,
  line_accent:       ({ el }) => {
    const color       = el.color       ?? "#7c5cfc";
    const thickness   = el.thickness   ?? 2;
    const orientation = el.orientation ?? "horizontal";
    const opacity     = el.opacity     ?? 1;
    if (orientation === "vertical") {
      return (
        <div style={{
          position:   "absolute",
          inset:      0,
          background: color,
          width:      thickness,
          opacity,
          margin:     "auto 0",
          pointerEvents: "none",
        }} />
      );
    }
    if (orientation === "diagonal") {
      return (
        <div style={{
          position:  "absolute",
          inset:     0,
          background:`linear-gradient(${color}, ${color})`,
          height:    thickness,
          opacity,
          transform: "rotate(-15deg) scaleX(1.4)",
          transformOrigin:"center",
          pointerEvents:"none",
        }} />
      );
    }
    return (
      <div style={{
        position:   "absolute",
        inset:      0,
        background: color,
        height:     thickness,
        margin:     "auto 0",
        opacity,
        pointerEvents:"none",
      }} />
    );
  },
  sparkle:           ({ el }) => {
    const color = el.color ?? "#7c5cfc";
    const count = el.count ?? 5;
    const sparkles = Array.from({ length: count }, (_, i) => ({
      x:    10 + (i * 17) % 80,
      y:    5  + (i * 23) % 80,
      size: 8  + (i * 7)  % 12,
      delay: i * 0.3,
    }));
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {sparkles.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            left:     `${s.x}%`,
            top:      `${s.y}%`,
            width:    s.size,
            height:   s.size,
            color,
          }}>
            <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
              <path d="M12 2l1.8 5.5H19l-4.6 3.4 1.8 5.5L12 13l-4.2 3.4 1.8-5.5L5 7.5h5.2z" />
            </svg>
          </div>
        ))}
      </div>
    );
  },
  wave_shape:        ({ el }) => {
    const color    = el.color    ?? "#1a1a2e";
    const amplitude = el.amplitude ?? 20;
    const isBottom  = (el.position ?? "bottom") === "bottom";
    const d = isBottom
      ? `M0,${amplitude} Q25,0 50,${amplitude} T100,${amplitude} L100,100 L0,100 Z`
      : `M0,0 L100,0 L100,${amplitude} Q75,${amplitude * 2} 50,${amplitude} T0,${amplitude} Z`;
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
          <path d={d} fill={color} opacity={0.8} />
        </svg>
      </div>
    );
  },
  corner_accent:     ({ el }) => {
    const color  = el.color  ?? "#7c5cfc";
    const size   = el.size   ?? 40;
    const corner = el.corner ?? "top-left";
    const isTop  = corner.includes("top");
    const isLeft = corner.includes("left");
    return (
      <div style={{
        position:      "absolute",
        inset:         0,
        pointerEvents: "none",
      }}>
        <div style={{
          position:     "absolute",
          width:        size,
          height:       size,
          [isTop  ? "top"    : "bottom"]: 12,
          [isLeft ? "left"   : "right" ]: 12,
          borderTop:    isTop  ? `3px solid ${color}` : "none",
          borderBottom: !isTop ? `3px solid ${color}` : "none",
          borderLeft:   isLeft ? `3px solid ${color}` : "none",
          borderRight:  !isLeft? `3px solid ${color}` : "none",
          opacity:      0.7,
        }} />
      </div>
    );
  },
};

/* ── Z-index by layer ─────────────────────────────────────────── */
// Layer 0 (background): behind everything
// Layer 1 (overlay):    above asset zones (z-1) but below text zones (z-3)
// Layer 2 (frame):      above all zone content
// Layer 3 (typography): hero_word behind everything; badges/labels above content
// Layer 4 (decorative): above all zone content (in corners so no text conflict)

function zIndexForElement(el) {
  if (el.layer === 0) return 0;           // backgrounds — behind zones
  if (el.layer === 1) return 2;           // overlays — above asset (z-1), below text (z-3)
  if (el.layer === 3 && el.type === "hero_word")   return 0;  // ghost bg text
  if (el.layer === 3 && el.type === "outline_text") return 0; // ghost bg text
  if (el.layer === 2) return 15;          // frames — above zone content
  if (el.layer === 3) return 15;          // badges — above zone content
  if (el.layer === 4) return 15;          // decoratives — above zone content
  return 0;
}

/* ── Main component ───────────────────────────────────────────── */

export default function CompositionLayerRenderer({ beat, layerFilter = null }) {
  const composition = beat?.composition;
  if (!composition?.length) return null;

  const elements = layerFilter !== null
    ? composition.filter(el => el.layer === layerFilter || (Array.isArray(layerFilter) && layerFilter.includes(el.layer)))
    : composition;

  return (
    <>
      {elements.map((el, i) => {
        const Renderer = RENDERERS[el.type];
        if (!Renderer) return null;

        const zIndex = zIndexForElement(el);

        return (
          <div
            key={`comp_${el.type}_${i}`}
            style={{
              position: "absolute",
              left:     `${el.x      ?? 0}%`,
              top:      `${el.y      ?? 0}%`,
              width:    `${el.width  ?? 100}%`,
              height:   `${el.height ?? 100}%`,
              zIndex,
              overflow: el.layer >= 2 ? "visible" : "hidden",
              pointerEvents: "none",
            }}
          >
            <Renderer el={el} beat={beat} />
          </div>
        );
      })}
    </>
  );
}
