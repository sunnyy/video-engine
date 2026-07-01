/**
 * music.js
 * src/services/ai/shared/music.js
 *
 * Shared background-music injection for the headless-measure services. Queries the
 * active music library, picks a track for the given mood, and pushes one global
 * `music_global` layer.
 *
 * Mood matching is the important part: services request moods from several different
 * vocabularies (pickAutoMood → playful/dramatic/calm/energetic; AI Video → upbeat/
 * inspiring/chill/cinematic/ambient; etc.). We reconcile them here so a request never
 * silently falls through to a RANDOM track (which is how a tense war video ended up
 * with happy music). Resolution order: alias → exact mood → nearest neighbour → any.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";

// Canonical library moods (what fetchMusic.js tags and what the admin offers):
//   energetic, upbeat, calm, chill, dramatic, cinematic, playful, inspiring, tense, luxury

// Map every mood word the services (or old library rows) might use onto a canonical mood.
const MOOD_ALIAS = {
  ambient: "chill", relaxing: "calm", peaceful: "calm", soft: "calm", gentle: "calm",
  happy: "playful", cheerful: "playful", fun: "playful", quirky: "playful", silly: "playful",
  epic: "dramatic", intense: "dramatic", dark: "tense", aggressive: "tense",
  suspense: "tense", suspenseful: "tense", ominous: "tense", tension: "tense",
  corporate: "inspiring", motivational: "inspiring", hopeful: "inspiring", driven: "inspiring",
  uplifting: "upbeat", positive: "upbeat", bold: "energetic", kinetic: "energetic",
  elegant: "luxury", sophisticated: "luxury", premium: "luxury", warm: "luxury",
  emotional: "cinematic", transcendent: "cinematic", futuristic: "cinematic",
};

// If the exact mood has no tracks, try these related moods (in order) before giving up.
const MOOD_NEIGHBORS = {
  energetic: ["upbeat", "playful", "inspiring"],
  upbeat:    ["energetic", "playful", "inspiring"],
  playful:   ["upbeat", "energetic", "cheerful"],
  inspiring: ["upbeat", "cinematic", "calm"],
  calm:      ["chill", "luxury", "inspiring"],
  chill:     ["calm", "luxury", "inspiring"],
  luxury:    ["cinematic", "calm", "chill"],
  cinematic: ["dramatic", "luxury", "inspiring"],
  dramatic:  ["cinematic", "tense", "energetic"],
  tense:     ["dramatic", "cinematic", "energetic"],
};

function pickTrack(tracks, mood) {
  const want = MOOD_ALIAS[mood] || mood || "energetic";
  const inMood = (m) => tracks.filter(t => t.mood === m);

  let pool = inMood(want);
  if (!pool.length) {
    for (const n of (MOOD_NEIGHBORS[want] || [])) {
      pool = inMood(n);
      if (pool.length) break;
    }
  }
  if (!pool.length) pool = tracks; // last resort — library has nothing close
  return { track: pool[Math.floor(Math.random() * pool.length)], want };
}

export async function injectMusic(timeline, { mood, volume = 0.2, fadeIn = 1, fadeOut = 1, label = "music" } = {}) {
  try {
    const { data: tracks } = await supabaseAdmin
      .from("music_tracks").select("public_url, title, mood").eq("is_active", true);
    if (!tracks?.length) return null;

    const { track, want } = pickTrack(tracks, mood);
    const dur = timeline.format.duration;

    timeline.layers.push({
      id: "music_global", trackId: "track_music",
      type: "audio", audioType: "music", src: track.public_url,
      start: 0, end: dur, zIndex: 0,
      visible: true, locked: false, trimStart: 0, trimEnd: dur,
      volume, muted: false, fadeIn, fadeOut,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
    const exact = track.mood === want;
    console.log(`[${label}] music: "${track.title}" (${track.mood}${exact ? "" : ` ← requested ${mood}`})`);
    return track;
  } catch (e) {
    console.warn(`[${label}] music skipped:`, e.message);
    return null;
  }
}
