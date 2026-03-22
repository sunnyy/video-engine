import { normalizeBeat } from "./normalizeBeat";

export function normalizeBeats(rawBeats = [], meta = {}) {

  if (!Array.isArray(rawBeats) || rawBeats.length === 0) {
    rawBeats = [{}];
  }

  return rawBeats.map((beat, index) => {
    return normalizeBeat(beat, index, meta);
  });

}