/**
 * sfxRegistry.js
 * src/core/sfxRegistry.js
 *
 * Full metadata on every SFX so the director picks by intent + energy.
 */

export const SFX_LIBRARY = {
  cash_register: {
    label:    "Cash Register",
    duration: 1.2,
    energy:   "medium",
    mood:     "positive",
    intent:   ["proof", "punchline", "reveal"],
  },
  cinematic_boom: {
    label:    "Cinematic Boom",
    duration: 2.0,
    energy:   "high",
    mood:     "dramatic",
    intent:   ["shock", "reveal", "urgency"],
  },
  cinematic_impact: {
    label:    "Cinematic Impact",
    duration: 1.5,
    energy:   "high",
    mood:     "dramatic",
    intent:   ["shock", "urgency", "contrast"],
  },
  classic_ding: {
    label:    "Classic Ding",
    duration: 0.8,
    energy:   "low",
    mood:     "positive",
    intent:   ["proof", "reveal", "empathy"],
  },
  click: {
    label:    "Click",
    duration: 0.2,
    energy:   "low",
    mood:     "neutral",
    intent:   ["explanation", "list", "proof"],
  },
  countdown_beep: {
    label:    "Countdown Beep",
    duration: 0.5,
    energy:   "medium",
    mood:     "tense",
    intent:   ["urgency", "list", "contrast"],
  },
  crowd_cheer: {
    label:    "Crowd Cheer",
    duration: 1.5,
    energy:   "high",
    mood:     "positive",
    intent:   ["punchline", "proof", "reveal"],
  },
  error_buzz: {
    label:    "Error Buzz",
    duration: 0.6,
    energy:   "medium",
    mood:     "negative",
    intent:   ["irony", "contrast", "shock"],
  },
  glitch_long: {
    label:    "Glitch Long",
    duration: 1.2,
    energy:   "high",
    mood:     "chaotic",
    intent:   ["shock", "curiosity", "irony"],
  },
  glitch_short: {
    label:    "Glitch Short",
    duration: 0.4,
    energy:   "medium",
    mood:     "chaotic",
    intent:   ["curiosity", "contrast", "irony"],
  },
  great_success: {
    label:    "Great Success",
    duration: 2.0,
    energy:   "high",
    mood:     "positive",
    intent:   ["punchline", "proof", "reveal"],
  },
  ground_impact: {
    label:    "Ground Impact",
    duration: 1.0,
    energy:   "high",
    mood:     "dramatic",
    intent:   ["shock", "urgency", "reveal"],
  },
  impact: {
    label:    "Impact",
    duration: 0.8,
    energy:   "high",
    mood:     "dramatic",
    intent:   ["shock", "urgency", "contrast"],
  },
  notification: {
    label:    "Notification",
    duration: 0.6,
    energy:   "low",
    mood:     "neutral",
    intent:   ["curiosity", "explanation", "proof"],
  },
  pop_hard: {
    label:    "Pop Hard",
    duration: 0.3,
    energy:   "medium",
    mood:     "playful",
    intent:   ["punchline", "curiosity", "irony"],
  },
  pop_soft: {
    label:    "Pop Soft",
    duration: 0.3,
    energy:   "low",
    mood:     "playful",
    intent:   ["empathy", "explanation", "punchline"],
  },
  soft_hit: {
    label:    "Soft Hit",
    duration: 0.5,
    energy:   "low",
    mood:     "neutral",
    intent:   ["empathy", "proof", "explanation"],
  },
  tick_clock: {
    label:    "Tick Clock",
    duration: 0.2,
    energy:   "low",
    mood:     "tense",
    intent:   ["urgency", "list", "contrast"],
  },
  tick_digital: {
    label:    "Tick Digital",
    duration: 0.2,
    energy:   "low",
    mood:     "neutral",
    intent:   ["list", "explanation", "proof"],
  },
  whoosh: {
    label:    "Whoosh",
    duration: 0.7,
    energy:   "medium",
    mood:     "kinetic",
    intent:   ["curiosity", "reveal", "contrast"],
  },
};

export const SFX_KEYS = Object.keys(SFX_LIBRARY);

/* Preview URLs for browser playback only */
const FILENAME_MAP = {
  cash_register: "cash-register.mp3",
  crowd_cheer:   "crowd_cheer_short.mp3",
  notification:  "notification_ding.mp3",
};

export function getSFXPreviewUrl(key) {
  return `/sfx/${FILENAME_MAP[key] || key + ".mp3"}`;
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

/* ── Smart picker — matches intent + energy ── */
export function pickBeatSFX(intent, energy = 0.5, volume = 1.0) {
  const energyLevel = energy >= 0.75 ? "high" : energy >= 0.4 ? "medium" : "low";

  // Find candidates matching intent, prefer matching energy
  const byIntent = SFX_KEYS.filter(k => SFX_LIBRARY[k].intent.includes(intent));
  const byBoth   = byIntent.filter(k => SFX_LIBRARY[k].energy === energyLevel);

  const pool = byBoth.length ? byBoth : byIntent.length ? byIntent : SFX_KEYS;
  const key  = pool[Math.floor(Math.random() * pool.length)];

  return {
    id:       `sfx_${Date.now()}`,
    key,
    label:    SFX_LIBRARY[key].label,
    volume,
    position: 0,
    source:   "beat",
  };
}