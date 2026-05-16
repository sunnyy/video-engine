// Step keyframe for discrete (non-numeric) properties like objectFit.
// Returns the value of the last keyframe at or before `time`, null if none reached yet.
export function stepKeyframe(keyframes, time) {
  if (!keyframes || keyframes.length === 0) return null;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  let result = null;
  for (const kf of sorted) {
    if (kf.time <= time) result = kf.value;
    else break;
  }
  return result;
}

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

// Returns the fully resolved transform at the given timeline time,
// applying keyframe interpolation on top of the base transform.
export function resolveTransform(layer, currentTime) {
  const t = { ...layer.transform };
  const kf = layer.keyframes ?? {};
  for (const prop of ["x", "y", "width", "height", "scale", "rotation", "opacity", "blur"]) {
    if (kf[prop]?.length) {
      const v = interpolateKeyframes(kf[prop], currentTime - layer.start);
      if (v !== null) t[prop] = v;
    }
  }
  return t;
}
