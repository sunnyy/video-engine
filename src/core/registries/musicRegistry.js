/**
 * musicRegistry.js
 * src/core/registries/musicRegistry.js
 *
 * Full metadata on every track so the director picks by niche + videoType + tone + energy.
 * Tracks marked with file: null are placeholders — source audio and drop into /public/music/
 *
 * Sources for free commercial music:
 *   pixabay.com/music
 *   mixkit.co/free-music
 *   uppbeat.io
 *   freesound.org
 */
import { staticFile } from "remotion";
import { supabase } from "../../lib/supabase";

export const MUSIC_LIBRARY = {

  // ── EXISTING TRACKS ───────────────────────────────────────

  eliveta_1: {
    label:     "Eliveta I",
    file:      staticFile("music/eliveta491190.mp3"),
    energy:    "high",
    mood:      "upbeat",
    bpm:       128,
    vibe:      ["energetic", "viral", "upbeat"],
    niche:     ["entertainment", "gaming", "sports"],
    videoType: ["viral", "entertainment"],
    tone:      ["bold", "funny"],
    intent:    ["hook", "escalate", "urgency"],
  },
  eliveta_2: {
    label:     "Eliveta II",
    file:      staticFile("music/eliveta491224.mp3"),
    energy:    "high",
    mood:      "upbeat",
    bpm:       124,
    vibe:      ["energetic", "viral", "upbeat"],
    niche:     ["entertainment", "gaming", "lifestyle"],
    videoType: ["viral", "entertainment"],
    tone:      ["bold", "funny", "conversational"],
    intent:    ["hook", "reveal", "escalate"],
  },
  loksii: {
    label:     "Loksii",
    file:      staticFile("music/loksii.mp3"),
    energy:    "medium",
    mood:      "chill",
    bpm:       98,
    vibe:      ["chill", "relaxed", "smooth"],
    niche:     ["lifestyle", "food", "travel", "health"],
    videoType: ["story", "explainer"],
    tone:      ["conversational", "emotional"],
    intent:    ["visual_rest", "empathy", "explanation"],
  },
  mood_mode: {
    label:     "Mood Mode",
    file:      staticFile("music/mood_mode.mp3"),
    energy:    "medium",
    mood:      "cinematic",
    bpm:       95,
    vibe:      ["moody", "cinematic", "dramatic"],
    niche:     ["news", "education", "finance", "motivational"],
    videoType: ["news", "opinion", "story"],
    tone:      ["bold", "emotional"],
    intent:    ["reveal", "contrast", "proof"],
  },
  nastelbom: {
    label:     "Nastelbom",
    file:      staticFile("music/nastelbom.mp3"),
    energy:    "medium",
    mood:      "playful",
    bpm:       110,
    vibe:      ["upbeat", "fun", "light"],
    niche:     ["entertainment", "comedy", "food", "lifestyle"],
    videoType: ["entertainment", "viral"],
    tone:      ["funny", "conversational"],
    intent:    ["hook", "escalate", "visual_rest"],
  },
  the_mountain: {
    label:     "The Mountain",
    file:      staticFile("music/the_mountain.mp3"),
    energy:    "medium",
    mood:      "epic",
    bpm:       90,
    vibe:      ["cinematic", "epic", "dramatic"],
    niche:     ["motivational", "sports", "travel", "spiritual"],
    videoType: ["story", "opinion", "news"],
    tone:      ["bold", "emotional"],
    intent:    ["reveal", "proof", "escalate"],
  },

  // ── GAMING / SPORTS ───────────────────────────────────────

  gaming_hype: {
    label:     "Gaming Hype",
    file:      null, // source: pixabay.com/music — search "gaming hype"
    energy:    "high",
    mood:      "aggressive",
    bpm:       140,
    vibe:      ["aggressive", "hype", "electronic"],
    niche:     ["gaming", "sports", "entertainment"],
    videoType: ["viral", "entertainment"],
    tone:      ["bold"],
    intent:    ["hook", "escalate", "urgency"],
  },
  trap_beat: {
    label:     "Trap Beat",
    file:      null, // source: pixabay.com/music — search "trap beat"
    energy:    "high",
    mood:      "dark",
    bpm:       145,
    vibe:      ["trap", "dark", "hype"],
    niche:     ["gaming", "entertainment", "music"],
    videoType: ["viral", "entertainment"],
    tone:      ["bold", "funny"],
    intent:    ["hook", "escalate", "contrast"],
  },
  sports_pump: {
    label:     "Sports Pump",
    file:      null, // source: mixkit.co/free-music — search "sports"
    energy:    "high",
    mood:      "energetic",
    bpm:       135,
    vibe:      ["energetic", "pump", "motivational"],
    niche:     ["sports", "fitness", "motivational"],
    videoType: ["viral", "entertainment"],
    tone:      ["bold"],
    intent:    ["hook", "escalate", "proof"],
  },

  // ── SPIRITUAL / DEVOTIONAL ────────────────────────────────

  spiritual_ambient: {
    label:     "Spiritual Ambient",
    file:      null, // source: pixabay.com/music — search "spiritual ambient india"
    energy:    "low",
    mood:      "peaceful",
    bpm:       60,
    vibe:      ["peaceful", "devotional", "ambient"],
    niche:     ["spiritual"],
    videoType: ["story", "explainer"],
    tone:      ["emotional", "conversational"],
    intent:    ["visual_rest", "empathy", "reveal"],
  },
  tabla_beats: {
    label:     "Tabla Beats",
    file:      null, // source: freesound.org — search "tabla loop"
    energy:    "medium",
    mood:      "devotional",
    bpm:       80,
    vibe:      ["devotional", "rhythmic", "indian"],
    niche:     ["spiritual"],
    videoType: ["viral", "story"],
    tone:      ["bold", "emotional"],
    intent:    ["hook", "escalate", "proof"],
  },
  om_chant_ambient: {
    label:     "Om Chant Ambient",
    file:      null, // source: pixabay.com/music — search "om chant"
    energy:    "low",
    mood:      "transcendent",
    bpm:       55,
    vibe:      ["transcendent", "peaceful", "spiritual"],
    niche:     ["spiritual", "health"],
    videoType: ["story", "explainer"],
    tone:      ["emotional"],
    intent:    ["visual_rest", "empathy", "testimonial"],
  },

  // ── FOOD / LIFESTYLE ──────────────────────────────────────

  warm_acoustic: {
    label:     "Warm Acoustic",
    file:      null, // source: mixkit.co/free-music — search "acoustic warm"
    energy:    "low",
    mood:      "warm",
    bpm:       85,
    vibe:      ["warm", "acoustic", "cozy"],
    niche:     ["food", "lifestyle", "health"],
    videoType: ["story", "explainer"],
    tone:      ["conversational", "emotional"],
    intent:    ["visual_rest", "empathy", "testimonial"],
  },
  upbeat_kitchen: {
    label:     "Upbeat Kitchen",
    file:      null, // source: pixabay.com/music — search "upbeat cooking"
    energy:    "medium",
    mood:      "cheerful",
    bpm:       115,
    vibe:      ["cheerful", "fun", "light"],
    niche:     ["food", "lifestyle", "comedy"],
    videoType: ["entertainment", "viral"],
    tone:      ["funny", "conversational"],
    intent:    ["hook", "visual_rest", "escalate"],
  },
  lofi_chill: {
    label:     "Lo-Fi Chill",
    file:      null, // source: pixabay.com/music — search "lofi chill"
    energy:    "low",
    mood:      "chill",
    bpm:       75,
    vibe:      ["chill", "lofi", "relaxed"],
    niche:     ["lifestyle", "education", "health", "skincare"],
    videoType: ["explainer", "story"],
    tone:      ["conversational", "emotional"],
    intent:    ["visual_rest", "explanation", "empathy"],
  },

  // ── FINANCE / TECH / BUSINESS ─────────────────────────────

  corporate_minimal: {
    label:     "Corporate Minimal",
    file:      null, // source: mixkit.co/free-music — search "corporate minimal"
    energy:    "low",
    mood:      "professional",
    bpm:       100,
    vibe:      ["professional", "minimal", "clean"],
    niche:     ["finance", "tech", "business", "education"],
    videoType: ["explainer", "news"],
    tone:      ["bold", "conversational"],
    intent:    ["explanation", "proof", "stat"],
  },
  tech_pulse: {
    label:     "Tech Pulse",
    file:      null, // source: pixabay.com/music — search "technology electronic"
    energy:    "medium",
    mood:      "futuristic",
    bpm:       120,
    vibe:      ["futuristic", "electronic", "modern"],
    niche:     ["tech", "gaming", "finance"],
    videoType: ["viral", "explainer"],
    tone:      ["bold", "educational"],
    intent:    ["hook", "reveal", "proof"],
  },
  confident_corporate: {
    label:     "Confident Corporate",
    file:      null, // source: uppbeat.io — search "corporate confident"
    energy:    "medium",
    mood:      "confident",
    bpm:       108,
    vibe:      ["confident", "corporate", "motivational"],
    niche:     ["finance", "business", "motivational"],
    videoType: ["opinion", "explainer"],
    tone:      ["bold", "conversational"],
    intent:    ["proof", "escalate", "cta"],
  },

  // ── TRAVEL / ADVENTURE ────────────────────────────────────

  adventure_epic: {
    label:     "Adventure Epic",
    file:      null, // source: mixkit.co/free-music — search "adventure epic"
    energy:    "high",
    mood:      "epic",
    bpm:       125,
    vibe:      ["epic", "adventure", "cinematic"],
    niche:     ["travel", "sports", "motivational"],
    videoType: ["viral", "story"],
    tone:      ["bold", "emotional"],
    intent:    ["hook", "escalate", "reveal"],
  },
  world_music_chill: {
    label:     "World Music Chill",
    file:      null, // source: freesound.org — search "world music ambient"
    energy:    "low",
    mood:      "wanderlust",
    bpm:       80,
    vibe:      ["wanderlust", "exotic", "peaceful"],
    niche:     ["travel", "food", "lifestyle"],
    videoType: ["story", "explainer"],
    tone:      ["conversational", "emotional"],
    intent:    ["visual_rest", "empathy", "testimonial"],
  },

  // ── EDUCATION ─────────────────────────────────────────────

  light_background: {
    label:     "Light Background",
    file:      null, // source: pixabay.com/music — search "light background education"
    energy:    "low",
    mood:      "neutral",
    bpm:       90,
    vibe:      ["neutral", "light", "non-distracting"],
    niche:     ["education", "health", "finance"],
    videoType: ["explainer"],
    tone:      ["educational", "conversational"],
    intent:    ["explanation", "proof", "stat"],
  },
  curious_upbeat: {
    label:     "Curious Upbeat",
    file:      null, // source: mixkit.co/free-music — search "curious upbeat"
    energy:    "medium",
    mood:      "curious",
    bpm:       105,
    vibe:      ["curious", "upbeat", "light"],
    niche:     ["education", "comedy", "entertainment"],
    videoType: ["viral", "explainer"],
    tone:      ["funny", "educational"],
    intent:    ["hook", "curiosity", "escalate"],
  },

  // ── COMEDY ────────────────────────────────────────────────

  quirky_fun: {
    label:     "Quirky Fun",
    file:      null, // source: pixabay.com/music — search "quirky fun comedy"
    energy:    "medium",
    mood:      "quirky",
    bpm:       118,
    vibe:      ["quirky", "playful", "silly"],
    niche:     ["comedy", "entertainment", "lifestyle"],
    videoType: ["entertainment", "viral"],
    tone:      ["funny"],
    intent:    ["hook", "escalate", "contrast"],
  },
  cartoon_bounce: {
    label:     "Cartoon Bounce",
    file:      null, // source: mixkit.co/free-music — search "cartoon bounce"
    energy:    "high",
    mood:      "silly",
    bpm:       130,
    vibe:      ["silly", "cartoon", "fun"],
    niche:     ["comedy", "entertainment"],
    videoType: ["entertainment", "viral"],
    tone:      ["funny"],
    intent:    ["hook", "escalate", "visual_rest"],
  },

  // ── MOTIVATIONAL ──────────────────────────────────────────

  rise_up: {
    label:     "Rise Up",
    file:      null, // source: pixabay.com/music — search "motivational rise"
    energy:    "high",
    mood:      "inspirational",
    bpm:       132,
    vibe:      ["inspirational", "powerful", "motivational"],
    niche:     ["motivational", "sports", "business"],
    videoType: ["viral", "opinion"],
    tone:      ["bold", "emotional"],
    intent:    ["hook", "escalate", "cta"],
  },
  hustle_beat: {
    label:     "Hustle Beat",
    file:      null, // source: pixabay.com/music — search "hustle hip hop"
    energy:    "high",
    mood:      "driven",
    bpm:       138,
    vibe:      ["driven", "hustle", "urban"],
    niche:     ["motivational", "business", "entertainment"],
    videoType: ["viral", "opinion"],
    tone:      ["bold"],
    intent:    ["hook", "escalate", "urgency"],
  },

  // ── SKINCARE / BEAUTY ─────────────────────────────────────

  elegant_soft: {
    label:     "Elegant Soft",
    file:      null, // source: uppbeat.io — search "elegant soft beauty"
    energy:    "low",
    mood:      "elegant",
    bpm:       70,
    vibe:      ["elegant", "soft", "feminine"],
    niche:     ["skincare", "lifestyle", "food"],
    videoType: ["story", "explainer"],
    tone:      ["emotional", "conversational"],
    intent:    ["visual_rest", "testimonial", "empathy"],
  },
  soft_pop: {
    label:     "Soft Pop",
    file:      null, // source: mixkit.co/free-music — search "soft pop"
    energy:    "medium",
    mood:      "fresh",
    bpm:       100,
    vibe:      ["fresh", "light", "feminine"],
    niche:     ["skincare", "lifestyle", "food"],
    videoType: ["viral", "entertainment"],
    tone:      ["conversational", "funny"],
    intent:    ["hook", "reveal", "visual_rest"],
  },

  // ── NEWS / DRAMA ──────────────────────────────────────────

  tense_news: {
    label:     "Tense News",
    file:      null, // source: pixabay.com/music — search "news tense"
    energy:    "medium",
    mood:      "tense",
    bpm:       95,
    vibe:      ["tense", "dramatic", "news"],
    niche:     ["news", "finance", "education"],
    videoType: ["news", "opinion"],
    tone:      ["bold"],
    intent:    ["hook", "urgency", "contrast"],
  },
  breaking_dramatic: {
    label:     "Breaking Dramatic",
    file:      null, // source: mixkit.co/free-music — search "dramatic news"
    energy:    "high",
    mood:      "dramatic",
    bpm:       110,
    vibe:      ["dramatic", "urgent", "intense"],
    niche:     ["news", "entertainment", "finance"],
    videoType: ["news", "viral"],
    tone:      ["bold"],
    intent:    ["hook", "shock", "urgency"],
  },

};

export const MUSIC_KEYS = Object.keys(MUSIC_LIBRARY).filter(k => MUSIC_LIBRARY[k].file !== null);
export const ALL_MUSIC_KEYS = Object.keys(MUSIC_LIBRARY);

export const MUSIC_PREVIEW_URLS = {
  eliveta_1:    "/music/eliveta491190.mp3",
  eliveta_2:    "/music/eliveta491224.mp3",
  loksii:       "/music/loksii.mp3",
  mood_mode:    "/music/mood_mode.mp3",
  nastelbom:    "/music/nastelbom.mp3",
  the_mountain: "/music/the_mountain.mp3",
};

/* ── DB-backed music library ── */

const MOOD_FALLBACK = {
  energetic: "eliveta_1",
  calm:      "the_mountain",
  luxury:    "nastelbom",
  playful:   "eliveta_2",
  dramatic:  "mood_mode",
};

/**
 * Load music tracks from Supabase, grouped by mood.
 * Returns {} if DB is unavailable or empty — callers should fall back to MUSIC_LIBRARY.
 */
export async function loadMusicLibrary() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from("music_tracks")
      .select("id, title, artist, mood, public_url, bpm, duration")
      .eq("is_active", true);
    if (error || !data?.length) return {};
    return data.reduce((acc, track) => {
      if (!acc[track.mood]) acc[track.mood] = [];
      acc[track.mood].push(track);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

/**
 * Pick a random track for the given mood from a library returned by loadMusicLibrary().
 * Falls back to a static MUSIC_LIBRARY track when the DB library is empty.
 * Returns { src, label }.
 */
export function pickMusicByMood(mood, library = {}) {
  const tracks = library[mood] || [];
  if (tracks.length) {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    return { src: track.public_url, label: track.title };
  }
  const key = MOOD_FALLBACK[mood] || "eliveta_2";
  return {
    src:   MUSIC_LIBRARY[key]?.file || MUSIC_LIBRARY["eliveta_2"].file,
    label: MUSIC_LIBRARY[key]?.label || "Music",
  };
}

/* ── Smart picker (used for non-product-ad video types) ── */
export function pickAutoMusic(videoType = "viral", tone = "bold", niche = null, energy = "medium") {
  const available = MUSIC_KEYS; // only tracks with actual files

  // Match niche + energy first (most specific)
  const byNicheEnergy = niche
    ? available.filter(k =>
        MUSIC_LIBRARY[k].niche?.includes(niche) &&
        MUSIC_LIBRARY[k].energy === energy
      )
    : [];

  // Match niche only
  const byNiche = niche
    ? available.filter(k => MUSIC_LIBRARY[k].niche?.includes(niche))
    : [];

  // Match videoType + tone
  const byBoth = available.filter(k =>
    MUSIC_LIBRARY[k].videoType.includes(videoType) &&
    MUSIC_LIBRARY[k].tone.includes(tone)
  );

  // Match videoType only
  const byType = available.filter(k =>
    MUSIC_LIBRARY[k].videoType.includes(videoType)
  );

  // Priority: niche+energy > niche > videoType+tone > videoType > all
  const pool = byNicheEnergy.length ? byNicheEnergy
    : byNiche.length ? byNiche
    : byBoth.length  ? byBoth
    : byType.length  ? byType
    : available;

  return pool[Math.floor(Math.random() * pool.length)];
}