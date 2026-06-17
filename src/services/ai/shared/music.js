/**
 * music.js
 * src/services/ai/shared/music.js
 *
 * Shared background-music injection for the headless-measure services. Queries the
 * active music library, picks a track for the given mood (exact-mood pool, falling
 * back to all), and pushes one global `music_global` layer. Volume/fades are config
 * so each service keeps its own feel; mood is resolved by the caller (services use
 * their own mood mapping — pickAutoMood etc.) and passed in.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";

export async function injectMusic(timeline, { mood, volume = 0.2, fadeIn = 1, fadeOut = 1, label = "music" } = {}) {
  try {
    const { data: tracks } = await supabaseAdmin
      .from("music_tracks").select("public_url, title, mood").eq("is_active", true);
    if (!tracks?.length) return null;

    const matched = tracks.filter(t => t.mood === mood);
    const pool    = matched.length ? matched : tracks;
    const track   = pool[Math.floor(Math.random() * pool.length)];
    const dur     = timeline.format.duration;

    timeline.layers.push({
      id: "music_global", trackId: "track_music",
      type: "audio", audioType: "music", src: track.public_url,
      start: 0, end: dur, zIndex: 0,
      visible: true, locked: false, trimStart: 0, trimEnd: dur,
      volume, muted: false, fadeIn, fadeOut,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
    console.log(`[${label}] music: "${track.title}" (${mood})`);
    return track;
  } catch (e) {
    console.warn(`[${label}] music skipped:`, e.message);
    return null;
  }
}
