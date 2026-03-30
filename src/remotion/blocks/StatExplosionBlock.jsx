/**
 * StatExplosionBlock.jsx
 * Place at: src/remotion/blocks/StatExplosionBlock.jsx
 *
 * block.props keys:
 *   prefix      string   "$"
 *   value       string   "2.4"
 *   suffix      string   "B"
 *   label       string   "Revenue generated"
 *   description string   "In Q4 2024 alone"
 *   badge       string   "↑ 38% YoY growth"
 *   accent      string   "#f0e040"
 *
 * block.variant:
 *   "bigNumber" | "neonGlow" | "editorial" | "brutalist" | "glassmorphic"
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { deriveColors, BLOCK_FONTS, makeGlow } from "../../core/colorUtils";

/* ── Defaults ─────────────────────────────────────────────── */
export const STAT_EXPLOSION_DEFAULTS = {
  prefix:      "$",
  value:       "2.4",
  suffix:      "B",
  label:       "Revenue generated",
  description: "In Q4 2024 alone",
  badge:       "↑ 38% YoY growth",
  accent:      "#f0e040",
};

/* ── Variant presets ──────────────────────────────────────── */
const PRESETS = {
  bigNumber: {
    label:"Big Number", treatment:"dark",
    numFont:"bebas", labelFont:"mono",
    align:"center", motion:"countUp", shimmer:true, stroke:false,
  },
  neonGlow: {
    label:"Neon Glow", treatment:"neon",
    numFont:"syne", labelFont:"dm",
    align:"center", motion:"stamp", shimmer:false, stroke:false,
  },
  editorial: {
    label:"Editorial", treatment:"light",
    numFont:"playfair", labelFont:"dm",
    align:"left", motion:"fadeUp", shimmer:false, stroke:false,
  },
  brutalist: {
    label:"Brutalist", treatment:"dark",
    numFont:"barlow", labelFont:"mono",
    align:"center", motion:"slam", shimmer:false, stroke:true,
  },
  glassmorphic: {
    label:"Glassmorphic", treatment:"glass",
    numFont:"syne", labelFont:"outfit",
    align:"center", motion:"cascade", shimmer:false, stroke:false,
  },
};

/* ── Animated count-up number ─────────────────────────────── */
function CountingNumber({ value, frame, fps, motion, colors, numFont, stroke }) {
  const parsed   = parseFloat(String(value).replace(/[^0-9.]/g,"")) || 0;
  const isFloat  = String(value).includes(".");
  const decimals = isFloat ? (String(value).split(".")[1]?.length || 1) : 0;

  const cfg =
    motion === "countUp" ? { damping:18, stiffness:55, mass:1.4 } :
    motion === "stamp"   ? { damping:8,  stiffness:260, mass:0.7 } :
    motion === "slam"    ? { damping:5,  stiffness:420, mass:0.5 } :
                           { damping:16, stiffness:120 };

  const p     = spring({ frame: Math.max(frame,0), fps, config:cfg });
  const shown = motion === "countUp"
    ? (p * parsed).toFixed(decimals)
    : value;
  const scale = (motion==="stamp"||motion==="slam")
    ? interpolate(p,[0,1],[2.2,1])
    : 1;
  const blur  = motion==="slam"
    ? interpolate(Math.min(frame,10),[0,10],[14,0])
    : 0;

  return (
    <span style={{
      display:"inline-block",
      fontFamily: BLOCK_FONTS[numFont] || BLOCK_FONTS.bebas,
      fontSize: 188,
      fontWeight: 900,
      lineHeight: 0.88,
      letterSpacing: numFont==="barlow" ? "-4px" : numFont==="bebas" ? "-2px" : "-1px",
      color: stroke ? "transparent" : colors.text,
      WebkitTextStroke: stroke ? `4px ${colors.accent}` : "none",
      textShadow: stroke ? "none" : makeGlow(colors.accent, 2),
      transform: `scale(${scale})`,
      filter: blur > 0 ? `blur(${blur}px)` : "none",
    }}>
      {shown}
    </span>
  );
}

/* ── Main renderer ────────────────────────────────────────── */
export default function StatExplosionBlock({ block }) {
  const props   = { ...STAT_EXPLOSION_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "bigNumber";
  const preset  = PRESETS[variant] || PRESETS.bigNumber;
  const colors  = deriveColors(props.accent, preset.treatment);
  const isLeft  = preset.align === "left";
  const isGlass = preset.treatment === "glass";

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* stagger delays per element */
  const isCascade = preset.motion === "cascade";
  const D = { label:isCascade?0:4, num:isCascade?10:0, desc:isCascade?20:10, badge:isCascade?30:18, line:2 };

  const sp = (delay, cfg={}) => spring({
    frame: Math.max(frame-delay,0), fps,
    config: { damping:18, stiffness:130, ...cfg },
  });

  const labelP = sp(D.label);
  const descP  = sp(D.desc);
  const badgeP = sp(D.badge, { damping:9, stiffness:200 });
  const lineP  = sp(D.line, { damping:22, stiffness:100 });
  const lineW  = interpolate(lineP,[0,1],[0,100]);

  const fadeY  = (p) => ({ opacity: interpolate(p,[0,0.3],[0,1],{extrapolateRight:"clamp"}), transform:`translateY(${interpolate(p,[0,1],[18,0])}px)` });

  return (
    <AbsoluteFill style={{
      justifyContent:"center",
      alignItems: isLeft ? "flex-start" : "center",
      padding: isLeft ? "0 80px" : "0 48px",
      textAlign: isLeft ? "left" : "center",
    }}>

      {/* Glass card */}
      {isGlass && (
        <div style={{
          position:"absolute", inset:"50px 36px",
          background: colors.bg,
          border: `1px solid ${colors.border2}`,
          borderRadius: 32,
          backdropFilter: `blur(${colors.blur}px)`,
        }} />
      )}

      <div style={{
        position:"relative", zIndex:1,
        display:"flex", flexDirection:"column",
        alignItems: isLeft ? "flex-start" : "center",
        gap: 0,
      }}>

        {/* Label */}
        <div style={{
          fontFamily: BLOCK_FONTS[preset.labelFont],
          fontSize: 20, fontWeight:500,
          letterSpacing:"0.16em", textTransform:"uppercase",
          color: colors.textDim, marginBottom: 18,
          ...fadeY(labelP),
        }}>
          {props.label}
        </div>

        {/* Accent line */}
        <div style={{
          height:3, borderRadius:2, marginBottom:18,
          width:`${lineW}%`, maxWidth: isLeft ? 140 : 200,
          background:`linear-gradient(90deg,${colors.accent},${colors.analogous},transparent)`,
        }} />

        {/* Number row */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, lineHeight:0.88 }}>
          {props.prefix && (
            <span style={{
              fontFamily: BLOCK_FONTS[preset.numFont],
              fontSize:84, fontWeight:900,
              color: colors.accent, marginTop:18, letterSpacing:-1,
            }}>
              {props.prefix}
            </span>
          )}

          <CountingNumber
            value={props.value} frame={Math.max(frame-D.num,0)}
            fps={fps} motion={preset.motion}
            colors={colors} numFont={preset.numFont} stroke={preset.stroke}
          />

          {props.suffix && (
            <span style={{
              fontFamily: BLOCK_FONTS[preset.numFont],
              fontSize:84, fontWeight:900,
              color: colors.accent, marginTop:18, letterSpacing:-1,
            }}>
              {props.suffix}
            </span>
          )}
        </div>

        {/* Description */}
        {props.description && (
          <div style={{
            fontFamily: BLOCK_FONTS.dm, fontSize:24,
            color: colors.textDim, marginTop:22, letterSpacing:"0.02em",
            ...fadeY(descP),
          }}>
            {props.description}
          </div>
        )}

        {/* Badge */}
        {props.badge && (
          <div style={{
            display:"inline-flex", alignItems:"center",
            marginTop:26, padding:"10px 24px", borderRadius:100,
            background: colors.dim,
            border:`1px solid ${colors.glow60}`,
            fontFamily: BLOCK_FONTS.dm, fontSize:20, fontWeight:600,
            color: colors.accent,
            boxShadow: makeGlow(colors.accent,1),
            opacity: interpolate(badgeP,[0,0.4],[0,1],{extrapolateRight:"clamp"}),
            transform:`scale(${interpolate(badgeP,[0,1],[0.7,1])})`,
          }}>
            {props.badge}
          </div>
        )}

      </div>
    </AbsoluteFill>
  );
}