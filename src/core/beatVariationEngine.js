/**
 * beatVariationEngine.js
 * src/core/beatVariationEngine.js
 *
 * Applies caption animation variation and duration variance.
 * No longer overrides layouts — layout selection is handled by
 * visualPlanner + visualDirector using the new registry.
 */

const captionAnimations = [
  "fade",
  "word_pop",
  "word_reveal",
  "pop",
  "wave",
  "slide"
];

export function applyBeatVariation(beats) {
  let currentStart = 0;

  return beats.map((beat, i) => {
    const animation = captionAnimations[i % captionAnimations.length];

    /* ── Duration variation ── */
    let duration = beat.duration_sec;
    const variance = (Math.random() * 0.8) - 0.4;
    duration = duration + variance;
    if (duration < 1.4) duration = 1.4;
    if (duration > 8.0) duration = 8.0;

    const start = currentStart;
    const end   = start + duration;
    currentStart = end;

    return {
      ...beat,
      duration_sec: Number(duration.toFixed(2)),
      start_sec:    start,
      end_sec:      end,
      caption: {
        ...beat.caption,
        animation,
      },
    };
  });
}