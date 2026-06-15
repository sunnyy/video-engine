/**
 * easing.js
 * src/services/ai/aiVideo/easing.js
 *
 * The renderer interpolates between keyframes LINEARLY. To get real acceleration,
 * overshoot, and snap, we sample an easing curve into many keyframes — so the
 * piecewise-linear playback traces the eased curve. This is what makes motion feel
 * like momentum instead of a constant-speed CSS tween.
 */

export const easeOutCubic   = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic    = (t) => t * t * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo    = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo     = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));

// Overshoot ("back") — arrives past the target then settles. Reads as snap/weight.
export const easeOutBack = (t) => {
  const c1 = 2.2, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInBack = (t) => {
  const c1 = 2.2, c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

/**
 * track(t0, t1, from, to, ease, steps) → keyframe array
 * Samples an eased value from `from`→`to` over the time window [t0, t1].
 */
export function track(t0, t1, from, to, ease, steps = 12) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    out.push({
      time:  parseFloat((t0 + (t1 - t0) * p).toFixed(3)),
      value: parseFloat((from + (to - from) * ease(p)).toFixed(3)),
    });
  }
  return out;
}
