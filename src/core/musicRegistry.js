/**
 * musicRegistry.js
 * src/core/musicRegistry.js
 *
 * Full metadata on every track so the director picks by videoType + tone + energy.
 */
import { staticFile } from "remotion";

export const MUSIC_LIBRARY = {
  eliveta_1: {
    label:     "Eliveta I",
    file:      staticFile("music/eliveta491190.mp3"),
    energy:    "high",
    mood:      "upbeat",
    bpm:       128,
    vibe:      ["energetic", "viral", "upbeat"],
    videoType: ["viral", "entertainment"],
    tone:      ["bold", "funny"],
    intent:    ["shock", "urgency", "punchline"],
  },
  eliveta_2: {
    label:     "Eliveta II",
    file:      staticFile("music/eliveta491224.mp3"),
    energy:    "high",
    mood:      "upbeat",
    bpm:       124,
    vibe:      ["energetic", "viral", "upbeat"],
    videoType: ["viral", "entertainment"],
    tone:      ["bold", "funny", "conversational"],
    intent:    ["shock", "curiosity", "punchline"],
  },
  loksii: {
    label:     "Loksii",
    file:      staticFile("music/loksii.mp3"),
    energy:    "low",
    mood:      "chill",
    bpm:       85,
    vibe:      ["chill", "ambient", "calm"],
    videoType: ["explainer", "story", "opinion"],
    tone:      ["conversational", "emotional", "educational"],
    intent:    ["empathy", "explanation", "story"],
  },
  mood_mode: {
    label:     "Mood Mode",
    file:      staticFile("music/mood_mode.mp3"),
    energy:    "medium",
    mood:      "cinematic",
    bpm:       95,
    vibe:      ["moody", "cinematic", "dramatic"],
    videoType: ["news", "opinion", "story"],
    tone:      ["bold", "emotional"],
    intent:    ["reveal", "contrast", "curiosity"],
  },
  nastelbom: {
    label:     "Nastelbom",
    file:      staticFile("music/nastelbom.mp3"),
    energy:    "medium",
    mood:      "playful",
    bpm:       110,
    vibe:      ["upbeat", "fun", "light"],
    videoType: ["entertainment", "viral"],
    tone:      ["funny", "conversational"],
    intent:    ["punchline", "irony", "empathy"],
  },
  the_mountain: {
    label:     "The Mountain",
    file:      staticFile("music/the_mountain.mp3"),
    energy:    "medium",
    mood:      "epic",
    bpm:       90,
    vibe:      ["cinematic", "epic", "dramatic"],
    videoType: ["story", "opinion", "news"],
    tone:      ["bold", "emotional"],
    intent:    ["reveal", "proof", "shock"],
  },
};

export const MUSIC_KEYS = Object.keys(MUSIC_LIBRARY);

export const MUSIC_PREVIEW_URLS = {
  eliveta_1:    "/music/eliveta491190.mp3",
  eliveta_2:    "/music/eliveta491224.mp3",
  loksii:       "/music/loksii.mp3",
  mood_mode:    "/music/mood_mode.mp3",
  nastelbom:    "/music/nastelbom.mp3",
  the_mountain: "/music/the_mountain.mp3",
};

/* ── Smart picker ── */
export function pickAutoMusic(videoType = "viral", tone = "bold") {
  // Match by videoType first, then tone
  const byBoth = MUSIC_KEYS.filter(k =>
    MUSIC_LIBRARY[k].videoType.includes(videoType) &&
    MUSIC_LIBRARY[k].tone.includes(tone)
  );
  const byType = MUSIC_KEYS.filter(k =>
    MUSIC_LIBRARY[k].videoType.includes(videoType)
  );

  const pool = byBoth.length ? byBoth : byType.length ? byType : MUSIC_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}