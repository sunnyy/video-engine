/**
 * musicInjector.js
 * src/services/ai/productVideo/musicInjector.js
 *
 * Finds the music audio layer (audioType: "music", src: null) in the layers array
 * and fills its src using the music_tracks table via loadMusicLibrary + pickMusicByMood.
 * Falls back to a random track if the target mood has no results.
 */
import { loadMusicLibrary, pickMusicByMood, pickAutoMood } from "../../../core/registries/musicRegistry";

export async function injectMusic({ layers, direction }) {
  const mood = direction?.musicMood
    ? direction.musicMood
    : pickAutoMood(
        direction?.videoType || "viral",
        direction?.tone      || "bold",
        direction?.energy    || "medium"
      );

  const library = await loadMusicLibrary();
  const track   = pickMusicByMood(mood, library);

  if (!track?.src) return layers; // no tracks in DB — return as-is

  return layers.map((l) => {
    if (l.type === "audio" && l.audioType === "music" && !l.src) {
      return { ...l, src: track.src, name: track.label || "Background Music" };
    }
    return l;
  });
}
