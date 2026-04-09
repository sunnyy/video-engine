/**
 * assetShineRegistry.jsx
 * src/core/assetShineRegistry.jsx
 *
 * One-shot overlay effects that play once when a beat starts (frame 0 → durationFrames),
 * then return null. No infinite loops — Remotion frame-accurate.
 *
 * Each entry:
 *   label          — display name
 *   durationFrames — how long the effect lasts at 25fps (speed multiplier applied externally)
 *   render(frame, dur, interpolate) → JSX overlay or null
 */

import React from "react";

const assetShineRegistry = {

  // 1 — Classic diagonal light sweep left → right
  shine: {
    label: "Shine",
    durationFrames: 30,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const x    = interpolate(frame, [0, dur], [-80, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fade = frame > dur * 0.8 ? interpolate(frame, [dur * 0.8, dur], [1, 0], { extrapolateRight: "clamp" }) : 1;
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5, opacity: fade }}>
          <div style={{
            position:   "absolute", top: 0,
            left:       `${x}%`,
            height:     "100%", width: "40%",
            background: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.38) 50%, rgba(255,255,255,0) 100%)",
            transform:  "skewX(-22deg)",
          }} />
        </div>
      );
    },
  },

  // 2 — Full-frame white flash that punches in and fades
  flash: {
    label: "Flash",
    durationFrames: 22,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const opacity = interpolate(frame, [0, 3, dur * 0.4, dur], [0, 0.85, 0.55, 0], { extrapolateRight: "clamp" });
      return (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5,
          background: "rgba(255,255,255,1)",
          opacity,
        }} />
      );
    },
  },

  // 3 — Horizontal scan line sweeping top → bottom
  scan: {
    label: "Scan",
    durationFrames: 32,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const y    = interpolate(frame, [0, dur], [-6, 106], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fade = frame > dur * 0.85 ? interpolate(frame, [dur * 0.85, dur], [1, 0], { extrapolateRight: "clamp" }) : 1;
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5, opacity: fade }}>
          <div style={{
            position:   "absolute",
            top:        `${y}%`, left: 0, right: 0,
            height:     "8%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
          }} />
        </div>
      );
    },
  },

  // 5 — Warm fiery sweep top → bottom (like a burning reveal)
  burn: {
    label: "Burn",
    durationFrames: 38,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const y    = interpolate(frame, [0, dur], [-15, 115], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fade = frame > dur * 0.8 ? interpolate(frame, [dur * 0.8, dur], [1, 0], { extrapolateRight: "clamp" }) : 1;
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5, opacity: fade }}>
          <div style={{
            position:   "absolute",
            top:        `${y}%`, left: 0, right: 0,
            height:     "20%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(255,140,0,0.35) 40%, rgba(255,60,0,0.5) 60%, transparent 100%)",
            filter:     "blur(3px)",
            mixBlendMode: "screen",
          }} />
        </div>
      );
    },
  },

  // 7 — Cool crystalline blue sweep from left
  frost: {
    label: "Frost",
    durationFrames: 34,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const x    = interpolate(frame, [0, dur], [-50, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fade = frame > dur * 0.78 ? interpolate(frame, [dur * 0.78, dur], [1, 0], { extrapolateRight: "clamp" }) : 1;
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5, opacity: fade }}>
          <div style={{
            position:   "absolute", top: 0,
            left:       `${x}%`,
            height:     "100%", width: "55%",
            background: "linear-gradient(to right, transparent 0%, rgba(150,220,255,0.25) 45%, rgba(220,245,255,0.45) 60%, rgba(150,220,255,0.1) 80%, transparent 100%)",
            transform:  "skewX(-15deg)",
            mixBlendMode: "screen",
          }} />
        </div>
      );
    },
  },

  // 8 — Radial bright pulse expanding from center
  pulse: {
    label: "Pulse",
    durationFrames: 30,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const scale   = interpolate(frame, [0, dur], [0.1, 2.2],  { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const opacity = interpolate(frame, [0, dur * 0.3, dur],    [0.8, 0.6, 0],  { extrapolateRight: "clamp" });
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }}>
          <div style={{
            position:     "absolute",
            top:          "50%", left: "50%",
            width:        "80%", height: "80%",
            transform:    `translate(-50%, -50%) scale(${scale})`,
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 60%, transparent 80%)",
            opacity,
          }} />
        </div>
      );
    },
  },

  // 9 — Three thin parallel diagonal streaks flying across
  streak: {
    label: "Streaks",
    durationFrames: 25,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const offsets = [0, 0.15, 0.3];
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }}>
          {offsets.map((offset, i) => {
            const start = offset * dur;
            const end   = start + dur * 0.7;
            if (frame < start || frame > end + 4) return null;
            const x     = interpolate(frame, [start, end], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const fade  = frame > end ? interpolate(frame, [end, end + 4], [1, 0], { extrapolateRight: "clamp" }) : 1;
            return (
              <div key={i} style={{
                position:   "absolute",
                top:        `${20 + i * 22}%`,
                left:       `${x}%`,
                width:      "25%", height: `${6 - i}px`,
                transform:  "skewX(-25deg)",
                background: "linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)",
                opacity:    fade,
              }} />
            );
          })}
        </div>
      );
    },
  },

  // 10 — Cinematic wide horizontal bar (anamorphic lens flare style)
  anamorphic: {
    label: "Anamorphic",
    durationFrames: 28,
    render(frame, dur, interpolate) {
      if (frame > dur) return null;
      const x    = interpolate(frame, [0, dur], [-100, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fade = frame > dur * 0.75 ? interpolate(frame, [dur * 0.75, dur], [1, 0], { extrapolateRight: "clamp" }) : 1;
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5, opacity: fade }}>
          {/* Main bar */}
          <div style={{
            position:   "absolute",
            top:        "48%", left: `${x}%`,
            width:      "80%", height: "4%",
            transform:  "translateY(-50%)",
            background: "linear-gradient(to right, transparent 0%, rgba(100,180,255,0.7) 40%, rgba(200,230,255,0.9) 50%, rgba(100,180,255,0.7) 60%, transparent 100%)",
            filter:     "blur(1px)",
          }} />
          {/* Thin bright line in center */}
          <div style={{
            position:   "absolute",
            top:        "49.5%", left: `${x}%`,
            width:      "80%", height: "1%",
            transform:  "translateY(-50%)",
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.95), transparent)",
          }} />
        </div>
      );
    },
  },

};

export default assetShineRegistry;

/** Ordered list for dropdowns */
export const ASSET_SHINE_OPTIONS = Object.entries(assetShineRegistry).map(([key, entry]) => ({
  value: key,
  label: entry.label,
}));

/** Subset for AI pipeline auto-assignment */
export const PIPELINE_SHINE_EFFECTS = ["shine", "flash", "scan", "streak", "anamorphic"];
