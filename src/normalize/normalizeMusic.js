export function normalizeMusic(raw) {
  if (!raw?.src) return null;

  return {
    src: raw.src,
    volume:
      typeof raw.volume === "number" ? raw.volume : 1,
  };
}