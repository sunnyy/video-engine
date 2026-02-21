import { normalizeBeat } from "./normalizeBeat";

export function normalizeBeats(rawBeats, projectMode) {
  if (!Array.isArray(rawBeats) || rawBeats.length === 0) {
    rawBeats = [{}];
  }

  return rawBeats.map((beat, index) =>
    normalizeBeat(beat, index, projectMode)
  );
}