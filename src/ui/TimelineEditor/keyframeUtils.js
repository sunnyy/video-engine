export function interpolateKeyframes(keyframes, time) {
  if (!keyframes || keyframes.length === 0) return null;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
  const afterIdx = sorted.findIndex((kf) => kf.time > time);
  const before = sorted[afterIdx - 1];
  const after = sorted[afterIdx];
  const t = (time - before.time) / (after.time - before.time);
  return before.value + t * (after.value - before.value);
}
