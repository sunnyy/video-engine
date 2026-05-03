/**
 * sfxRegistry.js
 * src/core/registries/sfxRegistry.js
 *
 * Full metadata on every SFX so the director picks by intent + energy + niche.
 * Audio files are stored in Supabase Storage (media/sfx/) and managed via /admin/sfx.
 *
 * Sources:
 *   freesound.org
 *   pixabay.com/sound-effects
 *   zapsplat.com
 */
import { supabase } from "../../lib/supabase";

export const SFX_LIBRARY = {

  // ── EXISTING SFX ─────────────────────────────────────────

  cash_register: {
    label:    "Cash Register",
    duration: 1.2,
    energy:   "medium",
    mood:     "positive",
    niche:    ["finance", "business", "entertainment"],
    intent:   ["proof", "reveal", "stat"],
  },
  cinematic_boom: {
    label:    "Cinematic Boom",
    duration: 2.0,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["entertainment", "news", "motivational", "sports"],
    intent:   ["hook", "shock", "reveal", "urgency"],
  },
  cinematic_impact: {
    label:    "Cinematic Impact",
    duration: 1.5,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["entertainment", "sports", "gaming", "news"],
    intent:   ["hook", "shock", "urgency", "contrast"],
  },
  classic_ding: {
    label:    "Classic Ding",
    duration: 0.8,
    energy:   "low",
    mood:     "positive",
    niche:    ["education", "lifestyle", "health", "food"],
    intent:   ["proof", "reveal", "empathy"],
  },
  click: {
    label:    "Click",
    duration: 0.2,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "education", "finance", "business"],
    intent:   ["explanation", "proof", "stat"],
  },
  countdown_beep: {
    label:    "Countdown Beep",
    duration: 0.5,
    energy:   "medium",
    mood:     "tense",
    niche:    ["gaming", "sports", "entertainment", "news"],
    intent:   ["urgency", "escalate", "contrast"],
  },
  crowd_cheer: {
    label:    "Crowd Cheer",
    duration: 1.5,
    energy:   "high",
    mood:     "positive",
    niche:    ["sports", "entertainment", "gaming"],
    intent:   ["proof", "reveal", "escalate"],
  },
  error_buzz: {
    label:    "Error Buzz",
    duration: 0.6,
    energy:   "medium",
    mood:     "negative",
    niche:    ["tech", "education", "comedy", "entertainment"],
    intent:   ["contrast", "shock", "irony"],
  },
  glitch_long: {
    label:    "Glitch Long",
    duration: 1.2,
    energy:   "high",
    mood:     "chaotic",
    niche:    ["gaming", "tech", "entertainment"],
    intent:   ["hook", "shock", "contrast"],
  },
  glitch_short: {
    label:    "Glitch Short",
    duration: 0.4,
    energy:   "medium",
    mood:     "chaotic",
    niche:    ["gaming", "tech", "entertainment", "comedy"],
    intent:   ["contrast", "irony", "hook"],
  },
  great_success: {
    label:    "Great Success",
    duration: 2.0,
    energy:   "high",
    mood:     "positive",
    niche:    ["motivational", "sports", "business", "entertainment"],
    intent:   ["proof", "reveal", "cta"],
  },
  ground_impact: {
    label:    "Ground Impact",
    duration: 1.0,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["sports", "entertainment", "gaming", "motivational"],
    intent:   ["hook", "shock", "urgency", "escalate"],
  },
  impact: {
    label:    "Impact",
    duration: 0.8,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["entertainment", "sports", "gaming", "news"],
    intent:   ["hook", "shock", "urgency"],
  },
  notification: {
    label:    "Notification",
    duration: 0.6,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "lifestyle", "education", "business"],
    intent:   ["hook", "explanation", "proof"],
  },
  pop_hard: {
    label:    "Pop Hard",
    duration: 0.3,
    energy:   "medium",
    mood:     "playful",
    niche:    ["entertainment", "comedy", "lifestyle", "food"],
    intent:   ["hook", "escalate", "irony"],
  },
  pop_soft: {
    label:    "Pop Soft",
    duration: 0.3,
    energy:   "low",
    mood:     "playful",
    niche:    ["lifestyle", "food", "health", "skincare"],
    intent:   ["empathy", "explanation", "visual_rest"],
  },
  soft_hit: {
    label:    "Soft Hit",
    duration: 0.5,
    energy:   "low",
    mood:     "neutral",
    niche:    ["education", "health", "lifestyle", "finance"],
    intent:   ["empathy", "proof", "explanation"],
  },
  tick_clock: {
    label:    "Tick Clock",
    duration: 0.2,
    energy:   "low",
    mood:     "tense",
    niche:    ["finance", "news", "education", "sports"],
    intent:   ["urgency", "escalate", "contrast"],
  },
  tick_digital: {
    label:    "Tick Digital",
    duration: 0.2,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "finance", "education"],
    intent:   ["explanation", "proof", "stat"],
  },
  whoosh: {
    label:    "Whoosh",
    duration: 0.7,
    energy:   "medium",
    mood:     "kinetic",
    niche:    ["entertainment", "gaming", "sports", "travel"],
    intent:   ["hook", "reveal", "escalate"],
  },

  // ── SPIRITUAL / DEVOTIONAL ────────────────────────────────

  bell_temple: {
    label:    "Temple Bell",
    duration: 2.5,
    energy:   "low",
    mood:     "peaceful",
    niche:    ["spiritual"],
    intent:   ["visual_rest", "empathy", "reveal"],
  },
  om_bell: {
    label:    "Om Bell",
    duration: 3.0,
    energy:   "low",
    mood:     "transcendent",
    niche:    ["spiritual", "health"],
    intent:   ["visual_rest", "testimonial", "empathy"],
  },
  chime_soft: {
    label:    "Soft Chime",
    duration: 1.0,
    energy:   "low",
    mood:     "peaceful",
    niche:    ["spiritual", "lifestyle", "health"],
    intent:   ["visual_rest", "empathy", "proof"],
  },

  // ── FINANCE / BUSINESS ────────────────────────────────────

  stock_up: {
    label:    "Stock Up",
    duration: 0.8,
    energy:   "medium",
    mood:     "positive",
    niche:    ["finance", "business"],
    intent:   ["stat", "proof", "reveal"],
  },
  coin_drop: {
    label:    "Coin Drop",
    duration: 0.6,
    energy:   "low",
    mood:     "positive",
    niche:    ["finance", "business", "entertainment"],
    intent:   ["stat", "proof", "hook"],
  },
  keyboard_type: {
    label:    "Keyboard Type",
    duration: 0.4,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "finance", "education", "business"],
    intent:   ["explanation", "proof", "stat"],
  },

  // ── GAMING ────────────────────────────────────────────────

  game_win: {
    label:    "Game Win",
    duration: 1.5,
    energy:   "high",
    mood:     "triumphant",
    niche:    ["gaming", "sports", "entertainment"],
    intent:   ["proof", "reveal", "cta"],
  },
  game_over: {
    label:    "Game Over",
    duration: 1.2,
    energy:   "medium",
    mood:     "negative",
    niche:    ["gaming", "comedy", "entertainment"],
    intent:   ["contrast", "irony", "shock"],
  },
  power_up: {
    label:    "Power Up",
    duration: 0.8,
    energy:   "high",
    mood:     "positive",
    niche:    ["gaming", "sports", "motivational"],
    intent:   ["hook", "escalate", "reveal"],
  },
  laser: {
    label:    "Laser",
    duration: 0.3,
    energy:   "medium",
    mood:     "futuristic",
    niche:    ["gaming", "tech", "entertainment"],
    intent:   ["hook", "contrast", "shock"],
  },

  // ── FOOD / LIFESTYLE ──────────────────────────────────────

  sizzle: {
    label:    "Sizzle",
    duration: 1.5,
    energy:   "medium",
    mood:     "appetizing",
    niche:    ["food"],
    intent:   ["hook", "visual_rest", "empathy"],
  },
  bite_crunch: {
    label:    "Bite Crunch",
    duration: 0.4,
    energy:   "medium",
    mood:     "playful",
    niche:    ["food", "comedy"],
    intent:   ["hook", "escalate", "irony"],
  },
  cork_pop: {
    label:    "Cork Pop",
    duration: 0.5,
    energy:   "medium",
    mood:     "celebratory",
    niche:    ["food", "lifestyle", "entertainment"],
    intent:   ["reveal", "proof", "cta"],
  },

  // ── MOTIVATIONAL / SPORTS ─────────────────────────────────

  crowd_roar: {
    label:    "Crowd Roar",
    duration: 2.0,
    energy:   "high",
    mood:     "triumphant",
    niche:    ["sports", "motivational", "entertainment"],
    intent:   ["proof", "escalate", "reveal"],
  },
  whistle_start: {
    label:    "Whistle Start",
    duration: 0.6,
    energy:   "high",
    mood:     "energetic",
    niche:    ["sports", "gaming"],
    intent:   ["hook", "urgency", "escalate"],
  },
  heartbeat: {
    label:    "Heartbeat",
    duration: 1.0,
    energy:   "medium",
    mood:     "tense",
    niche:    ["health", "motivational", "news"],
    intent:   ["urgency", "escalate", "hook"],
  },

  // ── COMEDY ────────────────────────────────────────────────

  sad_trombone: {
    label:    "Sad Trombone",
    duration: 1.5,
    energy:   "low",
    mood:     "comedic",
    niche:    ["comedy", "entertainment"],
    intent:   ["irony", "contrast", "hook"],
  },
  boing: {
    label:    "Boing",
    duration: 0.5,
    energy:   "medium",
    mood:     "silly",
    niche:    ["comedy", "entertainment"],
    intent:   ["irony", "hook", "escalate"],
  },
  rimshot: {
    label:    "Rimshot",
    duration: 0.8,
    energy:   "medium",
    mood:     "comedic",
    niche:    ["comedy", "entertainment"],
    intent:   ["irony", "hook", "contrast"],
  },

  // ── NEWS / DRAMA ──────────────────────────────────────────

  news_sting: {
    label:    "News Sting",
    duration: 1.5,
    energy:   "high",
    mood:     "urgent",
    niche:    ["news", "finance", "education"],
    intent:   ["hook", "urgency", "shock"],
  },
  tension_riser: {
    label:    "Tension Riser",
    duration: 2.0,
    energy:   "high",
    mood:     "tense",
    niche:    ["news", "entertainment", "sports"],
    intent:   ["escalate", "urgency", "hook"],
  },
  dramatic_sting: {
    label:    "Dramatic Sting",
    duration: 1.2,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["news", "entertainment", "motivational"],
    intent:   ["shock", "reveal", "hook"],
  },

  // ── TECH / FUTURISTIC ─────────────────────────────────────

  digital_blip: {
    label:    "Digital Blip",
    duration: 0.3,
    energy:   "low",
    mood:     "futuristic",
    niche:    ["tech", "gaming", "finance"],
    intent:   ["explanation", "stat", "proof"],
  },
  scan_beep: {
    label:    "Scan Beep",
    duration: 0.4,
    energy:   "low",
    mood:     "futuristic",
    niche:    ["tech", "health", "finance"],
    intent:   ["stat", "proof", "explanation"],
  },
  data_swoosh: {
    label:    "Data Swoosh",
    duration: 0.6,
    energy:   "medium",
    mood:     "futuristic",
    niche:    ["tech", "finance", "education"],
    intent:   ["reveal", "hook", "stat"],
  },

};

export const SFX_KEYS     = Object.keys(SFX_LIBRARY);
export const ALL_SFX_KEYS = Object.keys(SFX_LIBRARY);

/* ── Module-level URL cache populated by loadSFXLibrary() ── */
let _sfxUrlCache = {};

/**
 * Load all active SFX tracks from Supabase, returns a map keyed by track key.
 * Also populates the module-level cache used by getSFXPreviewUrl().
 * Returns {} if DB is unavailable or empty.
 */
export async function loadSFXLibrary() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from("sfx_tracks")
      .select("*")
      .eq("is_active", true);
    if (error || !data?.length) return {};
    const map = Object.fromEntries(data.map(t => [t.key, t]));
    _sfxUrlCache = map;
    return map;
  } catch {
    return {};
  }
}

/**
 * Async lookup of a single track's public_url from sfx_tracks.
 * Returns null if not found or DB is unavailable.
 */
export async function getSFXUrl(key) {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("sfx_tracks")
      .select("public_url")
      .eq("key", key)
      .eq("is_active", true)
      .maybeSingle();
    return data?.public_url || null;
  } catch {
    return null;
  }
}

/* ── Local filename overrides for keys whose filename differs from the key ── */
const LOCAL_FILENAME = {
  cash_register: "cash-register.mp3",
  crowd_cheer:   "crowd_cheer_short.mp3",
  notification:  "notification_ding.mp3",
};

/* ── Preview URL resolver — Supabase cache first, then local static fallback ── */
export function getSFXPreviewUrl(key) {
  if (_sfxUrlCache[key]?.public_url) return _sfxUrlCache[key].public_url;
  return `/sfx/${LOCAL_FILENAME[key] || `${key}.mp3`}`;
}

/* ── Overlay default SFX ── */
export const OVERLAY_SFX_DEFAULTS = {
  HeadlineText:  "whoosh",
  Badge:         "pop_hard",
  StatCallout:   "classic_ding",
  HighlightBox:  "soft_hit",
  LiveDot:       "notification",
  EmojiFloat:    "pop_soft",
  ArrowPointer:  "click",
};

/* ── Smart picker — matches intent + energy + niche ── */
export function pickBeatSFX(intent, energy = 0.5, niche = null, volume = 1.0) {
  const energyLevel = energy >= 0.75 ? "high" : energy >= 0.4 ? "medium" : "low";
  const available = ALL_SFX_KEYS;

  // Most specific — niche + intent + energy
  const byAll = niche
    ? available.filter(k =>
        SFX_LIBRARY[k].intent.includes(intent) &&
        SFX_LIBRARY[k].niche?.includes(niche) &&
        SFX_LIBRARY[k].energy === energyLevel
      )
    : [];

  // niche + intent
  const byNicheIntent = niche
    ? available.filter(k =>
        SFX_LIBRARY[k].intent.includes(intent) &&
        SFX_LIBRARY[k].niche?.includes(niche)
      )
    : [];

  // intent + energy
  const byIntentEnergy = available.filter(k =>
    SFX_LIBRARY[k].intent.includes(intent) &&
    SFX_LIBRARY[k].energy === energyLevel
  );

  // intent only
  const byIntent = available.filter(k =>
    SFX_LIBRARY[k].intent.includes(intent)
  );

  const pool = byAll.length        ? byAll
    : byNicheIntent.length         ? byNicheIntent
    : byIntentEnergy.length        ? byIntentEnergy
    : byIntent.length              ? byIntent
    : available;

  const key = pool[Math.floor(Math.random() * pool.length)];

  return {
    id:       `sfx_${Date.now()}`,
    key,
    label:    SFX_LIBRARY[key]?.label || key,
    volume,
    position: 0,
    source:   "beat",
  };
}
