import { normalizeBeat } from "./normalizeBeat";

export function normalizeBeats(rawBeats = [], meta = {}) {

  if (!Array.isArray(rawBeats) || rawBeats.length === 0) {
    rawBeats = [{}];
  }

  let normalized = rawBeats.map((beat, index) => {
    return normalizeBeat(beat, index, meta);
  });

  let currentStart = 0;

  normalized = normalized.map((beat) => {

    const duration = beat.duration_sec;

    const start = currentStart;
    const end = start + duration;

    currentStart = end;

    return {
      ...beat,
      start_sec: start,
      end_sec: end
    };

  });

  return normalized;

}