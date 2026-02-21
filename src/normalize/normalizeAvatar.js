export function normalizeAvatar(raw, mode) {
  if (mode === "faceless") return null;

  return {
    src: raw?.src || null,
    duration_sec:
      typeof raw?.duration_sec === "number"
        ? raw.duration_sec
        : 0,
    speed:
      typeof raw?.speed === "number" && raw.speed > 0
        ? raw.speed
        : 1,
  };
}