/**
 * sentenceSegments.js — split a caption clip into per-SENTENCE video segments so a transition
 * can play only when a full sentence finishes (sentence-ending punctuation or a real pause).
 * Returns contiguous [start, end] ranges covering [0, totalDuration].
 */
export function sentenceRanges(segments, totalDuration) {
  if (!segments?.length || !totalDuration) return [[0, totalDuration || 0]];
  const bounds = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const s = segments[i], next = segments[i + 1];
    const endsSentence = /[.!?]["')\]]?$/.test(String(s.text || "").trim());
    const pause = (next.start - s.end) > 0.6;
    if (endsSentence || pause) bounds.push(parseFloat(Number(next.start).toFixed(3)));
  }
  const cuts = [0, ...bounds.filter(t => t > 0.5 && t < totalDuration - 0.5), parseFloat(totalDuration.toFixed(3))];
  const uniq = [...new Set(cuts)].sort((a, b) => a - b);
  const ranges = [];
  for (let i = 0; i < uniq.length - 1; i++) ranges.push([uniq[i], uniq[i + 1]]);
  return ranges.length ? ranges : [[0, totalDuration]];
}

// Varied scene-enter transitions, cycled so consecutive sentences don't repeat. The "zoom" entries
// double as the hook/punch feel; slides come in from every direction.
const TRANSITION_POOL = [
  { type: "zoom",        duration: 0.32, intensity: 0.8 },
  { type: "slide-left",  duration: 0.34 },
  { type: "slide-up",    duration: 0.34 },
  { type: "zoom",        duration: 0.22, intensity: 1.0 }, // punch
  { type: "slide-right", duration: 0.34 },
  { type: "dissolve",    duration: 0.4  },
  { type: "slide-down",  duration: 0.34 },
  { type: "fade",        duration: 0.3  },
];

/** Build per-sentence base-video layers; segments after the first get a varied transition-in. */
export function sentenceVideoLayers(videoUrl, segments, totalDuration, { width, height }) {
  return sentenceRanges(segments, totalDuration).map(([rs, re], i) => ({
    id: `base_video_${i}`, trackId: `track_base_video_${i}`, name: i === 0 ? "Video" : `Video ${i + 1}`,
    type: "video", src: videoUrl, objectFit: "cover",
    start: rs, end: re, zIndex: 0,
    visible: true, locked: false, sfx: null, animation: null,
    volume: 1, muted: false, trimStart: rs, trimEnd: re, fadeIn: 0, fadeOut: 0,
    keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
    transition: { in: i === 0 ? { type: "none", duration: 0 } : TRANSITION_POOL[(i - 1) % TRANSITION_POOL.length], out: { type: "none", duration: 0 } },
    transform: { x: 0, y: 0, width, height, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  }));
}
