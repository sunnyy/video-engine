export function normalizeMusic(raw) {

  if (!raw) return null;

  return {

    tts: raw.tts?.src
      ? {
          src: raw.tts.src,
          volume:
            typeof raw.tts.volume === "number"
              ? raw.tts.volume
              : 1,
        }
      : null,

    music: raw.music?.src
      ? {
          src: raw.music.src,
          volume:
            typeof raw.music.volume === "number"
              ? raw.music.volume
              : 0.8,
        }
      : null,

  };

}