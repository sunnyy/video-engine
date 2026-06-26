/**
 * @vidquence/render — timeModel.js
 *
 * The deterministic backbone of the engine. Everything the renderer draws is a pure
 * function of an integer FRAME index — never wall-clock time and never requestAnimationFrame.
 * That is the single most important property of a video renderer: frame N must look
 * byte-identical on every machine, every run, so parallel frame-chunking and retries
 * produce one consistent video.
 *
 * seconds = frame / fps   (the only bridge between frames and the timeline's seconds-based
 * layer.start / layer.end fields).
 *
 * INTERNAL MODULE — not a public package API. Consumed only by composer/frameDriver.
 */

/** Total frame count for a project (ceil so the last partial frame is still rendered). */
export function durationToFrames(durationSeconds, fps) {
  return Math.max(1, Math.round((Number(durationSeconds) || 0) * fps));
}

/** Frame index → timeline time in seconds. */
export function frameToSeconds(frame, fps) {
  return frame / fps;
}

/**
 * Easing functions — ported from the existing TimelineComposition so motion matches the
 * Remotion output exactly during the shadow-diff. Pure, deterministic, no dependencies.
 */
export const easing = {
  outQuart:   (t) => 1 - Math.pow(1 - t, 4),
  inQuart:    (t) => t * t * t * t,
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
};

/** Clamp helper used throughout the transition math. */
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
