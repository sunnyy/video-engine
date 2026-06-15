/**
 * motion.js
 * src/services/ai/aiVideo/motion.js
 *
 * The LOCKED motion vocabulary + the expander.
 *
 * GPT-5.4 (per element) and GPT-4.1 (per transition) author motion as INTENT —
 * a named type from this closed palette plus light params (direction, intensity,
 * anchor, stagger). They never emit keyframes. This module is the only place that
 * turns an intent + the element's measured geometry into smooth, eased, in-bounds
 * keyframes. New animation words can't break a scene: an unknown type falls back to
 * a sane generic move.
 *
 * Palette (every entry decomposes into the 5 renderer primitives —
 * translate / scale / rotate / opacity / blur):
 *   ENTER (10):  none · fade-in · fly-in · pop-in · zoom-in · rise-in · spin-in ·
 *                blur-in · bounce-in · drift-in
 *   EXIT (9):    none · fade-out · fly-out · pop-out · punch-through · spin-out ·
 *                blur-out · fall-out · drift-out
 *   EMPHASIS (7): pulse · shake · wobble · float · breathe · flicker · spin
 *   TRANSITIONS (7, applied at the relationship level → set participant intents):
 *                cut · dissolve · zoom-through · morph · explode · merge · push
 *
 * Params: direction (left|right|top|bottom|up|down), intensity (0..1-ish multiplier),
 * anchor ({cx,cy} — a point to fly from / converge to, used by transforms),
 * stagger (handled by the compiler).
 */

import { easeOutCubic, easeInCubic, easeInExpo, easeOutBack, track as T } from "./easing.js";

const STEPS = 5, FINE = 3;
export const ENTER_DIRS = ["bottom", "left", "right", "top"];
export const EXIT_DIRS  = ["top", "right", "left", "bottom"];

const clampWin    = (mw, dur) => Math.max(0.2, Math.min(mw ?? 0.6, dur * 0.6));
const boxAtCenter = (cx, cy, w, h) => ({ x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) });

function offCanvas(box, canvas, dir) {
  const W = canvas?.width ?? 1080, H = canvas?.height ?? 1920;
  switch (dir) {
    case "left":        return { x: -box.width - 220, y: box.y, rot: -12 };
    case "right":       return { x: W + 220,          y: box.y, rot:  12 };
    case "top": case "up":   return { x: box.x, y: -box.height - 220, rot: 8 };
    case "bottom": case "down": default: return { x: box.x, y: H + 220, rot: -8 };
  }
}

// Oscillation that starts AND ends at `base` (so it merges cleanly between an
// element's entrance and exit without a jump). Used by emphasis types.
function osc(t0, t1, base, peak, cycles) {
  const n = Math.max(4, Math.round(cycles * 4));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    const v = base + (peak - base) * (0.5 - 0.5 * Math.cos(p * cycles * 2 * Math.PI));
    out.push({ time: parseFloat((t0 + (t1 - t0) * p).toFixed(3)), value: parseFloat(v.toFixed(3)) });
  }
  return out;
}

// ── ENTER builders — window [0, mw], from hidden/off → settled ──────────────────
const ENTER = {
  "none": () => ({}),
  "fade-in": ({ mw }) => ({ opacity: T(0, mw, 0, 1, easeOutCubic, FINE) }),
  "fly-in": ({ box, canvas, mw, dir, anchor }) => {
    const s = anchor ? boxAtCenter(anchor.cx, anchor.cy, box.width, box.height) : offCanvas(box, canvas, dir);
    const p = {
      opacity: T(0, mw * 0.3, 0, 1, easeOutCubic, FINE),
      x:       T(0, mw, s.x, box.x, easeOutBack, STEPS),
      y:       T(0, mw, s.y, box.y, easeOutBack, STEPS),
      blur:    T(0, mw * 0.55, 14, 0, easeOutCubic, FINE),
    };
    if (anchor) p.scale = T(0, mw, 0.6, 1, easeOutBack, STEPS);
    else        p.rotation = T(0, mw, s.rot, 0, easeOutCubic, FINE);
    return p;
  },
  "pop-in":   ({ mw }) => ({ opacity: T(0, mw * 0.5, 0, 1, easeOutCubic, FINE), scale: T(0, mw, 0.4, 1, easeOutBack, STEPS) }),
  "zoom-in":  ({ mw }) => ({ opacity: T(0, mw * 0.5, 0, 1, easeOutCubic, FINE), scale: T(0, mw, 1.8, 1, easeOutCubic, STEPS), blur: T(0, mw * 0.6, 16, 0, easeOutCubic, FINE) }),
  "rise-in":  ({ box, mw, dir }) => { const dy = (dir === "down") ? -90 : 90; return { opacity: T(0, mw * 0.6, 0, 1, easeOutCubic, FINE), y: T(0, mw, box.y + dy, box.y, easeOutCubic, STEPS) }; },
  "spin-in":  ({ mw }) => ({ opacity: T(0, mw * 0.5, 0, 1, easeOutCubic, FINE), rotation: T(0, mw, -28, 0, easeOutBack, STEPS), scale: T(0, mw, 0.6, 1, easeOutBack, STEPS) }),
  "blur-in":  ({ mw }) => ({ opacity: T(0, mw * 0.5, 0, 1, easeOutCubic, FINE), blur: T(0, mw, 24, 0, easeOutCubic, FINE) }),
  "bounce-in":({ box, mw }) => ({ opacity: T(0, mw * 0.4, 0, 1, easeOutCubic, FINE), scale: T(0, mw, 0.5, 1, easeOutBack, STEPS), y: T(0, mw, box.y - 70, box.y, easeOutBack, STEPS) }),
  "drift-in": ({ box, mw }) => ({ opacity: T(0, mw, 0, 1, easeOutCubic, FINE), x: T(0, mw, box.x - 50, box.x, easeOutCubic, STEPS) }),
};

// ── EXIT builders — window [dur-mw, dur], from settled → gone ────────────────────
const EXIT = {
  "none": () => ({}),
  "fade-out": ({ dur, mw }) => ({ opacity: T(dur - mw, dur, 1, 0, easeInCubic, FINE) }),
  "fly-out": ({ box, canvas, dur, mw, dir, anchor }) => {
    const t0 = dur - mw;
    const e = anchor ? boxAtCenter(anchor.cx, anchor.cy, box.width, box.height) : offCanvas(box, canvas, dir);
    const p = {
      opacity: T(t0 + mw * 0.45, dur, 1, 0, easeInCubic, FINE),
      x:       T(t0, dur, box.x, e.x, easeInCubic, STEPS),
      y:       T(t0, dur, box.y, e.y, easeInCubic, STEPS),
      blur:    T(t0, dur, 0, 16, easeInCubic, FINE),
    };
    if (anchor) p.scale = T(t0, dur, 1, 0.12, easeInCubic, STEPS);
    else        p.rotation = T(t0, dur, 0, e.rot, easeInCubic, FINE);
    return p;
  },
  "pop-out":      ({ dur, mw }) => ({ opacity: T(dur - mw, dur, 1, 0, easeInCubic, FINE), scale: T(dur - mw, dur, 1, 0.4, easeInCubic, STEPS) }),
  "punch-through":({ dur, mw }) => { const t0 = dur - clampWin(mw * 1.15, dur); return { scale: T(t0, dur, 1, 8, easeInExpo, STEPS), blur: T(t0, dur, 0, 38, easeInCubic, FINE), opacity: T(t0 + (dur - t0) * 0.4, dur, 1, 0, easeInCubic, FINE) }; },
  "spin-out":     ({ dur, mw }) => ({ opacity: T(dur - mw, dur, 1, 0, easeInCubic, FINE), rotation: T(dur - mw, dur, 0, 28, easeInCubic, STEPS), scale: T(dur - mw, dur, 1, 0.6, easeInCubic, STEPS) }),
  "blur-out":     ({ dur, mw }) => ({ opacity: T(dur - mw, dur, 1, 0, easeInCubic, FINE), blur: T(dur - mw, dur, 0, 24, easeInCubic, FINE) }),
  "fall-out":     ({ box, canvas, dur, mw }) => { const H = canvas?.height ?? 1920; return { opacity: T(dur - mw * 0.5, dur, 1, 0, easeInCubic, FINE), y: T(dur - mw, dur, box.y, H + 200, easeInExpo, STEPS), rotation: T(dur - mw, dur, 0, 12, easeInCubic, FINE) }; },
  "drift-out":    ({ box, dur, mw }) => ({ opacity: T(dur - mw, dur, 1, 0, easeInCubic, FINE), x: T(dur - mw, dur, box.x, box.x + 50, easeInCubic, STEPS) }),
};

// ── EMPHASIS builders — window [holdStart, holdEnd], return to base ──────────────
const EMPHASIS = {
  "pulse":   ({ box, holdStart, holdEnd }) => ({ scale: osc(holdStart, holdEnd, 1, 1.06, Math.max(2, Math.round((holdEnd - holdStart) / 0.9))) }),
  "breathe": ({ holdStart, holdEnd }) => ({ scale: osc(holdStart, holdEnd, 1, 1.03, Math.max(2, Math.round((holdEnd - holdStart) / 1.6))) }),
  "shake":   ({ box, holdStart, holdEnd }) => ({ x: osc(holdStart, holdEnd, box.x, box.x + 14, Math.max(4, Math.round((holdEnd - holdStart) / 0.18))) }),
  "wobble":  ({ holdStart, holdEnd }) => ({ rotation: osc(holdStart, holdEnd, 0, 4, Math.max(3, Math.round((holdEnd - holdStart) / 0.5))) }),
  "float":   ({ box, holdStart, holdEnd }) => ({ y: osc(holdStart, holdEnd, box.y, box.y - 20, Math.max(2, Math.round((holdEnd - holdStart) / 1.8))) }),
  "flicker": ({ holdStart, holdEnd }) => ({ opacity: osc(holdStart, holdEnd, 1, 0.6, Math.max(3, Math.round((holdEnd - holdStart) / 0.4))) }),
  "spin":    ({ holdStart, holdEnd }) => ({ rotation: T(holdStart, holdEnd, 0, 360, (t) => t, STEPS * 2) }),
};

// ── Expanders ───────────────────────────────────────────────────────────────────
export function expandEnter(intent, ctx) {
  if (!intent || intent.type === "none") return {};
  const mw = clampWin(intent.win ?? ctx.mw ?? 0.65, ctx.dur);
  const build = ENTER[intent.type] || ENTER["fly-in"]; // graceful fallback
  return build({ ...ctx, mw, dir: intent.direction, anchor: intent.anchor, intensity: intent.intensity });
}
export function expandExit(intent, ctx) {
  if (!intent || intent.type === "none") return {};
  const mw = clampWin(intent.win ?? ctx.mw ?? 0.6, ctx.dur);
  const build = EXIT[intent.type] || EXIT["fly-out"]; // graceful fallback
  return build({ ...ctx, mw, dir: intent.direction, anchor: intent.anchor, intensity: intent.intensity });
}
export function expandEmphasis(intent, ctx) {
  if (!intent || intent.type === "none") return {};
  const build = EMPHASIS[intent.type];
  if (!build) return {}; // unknown emphasis = nothing (safe)
  const holdStart = ctx.holdStart ?? 0;
  const holdEnd   = ctx.holdEnd ?? ctx.dur;
  if (holdEnd - holdStart < 0.3) return {}; // no room to oscillate
  return build({ ...ctx, holdStart, holdEnd });
}

export const ENTER_TYPES    = Object.keys(ENTER);
export const EXIT_TYPES     = Object.keys(EXIT);
export const EMPHASIS_TYPES = Object.keys(EMPHASIS);
export const TRANSITION_TYPES = ["cut", "dissolve", "zoom-through", "morph", "explode", "merge", "push"];
