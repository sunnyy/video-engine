/**
 * sfxRegistry.js
 * src/core/registries/sfxRegistry.js
 *
 * Full metadata on every SFX so the director picks by intent + energy + niche.
 * Tracks marked file: null are placeholders — source audio and drop into /public/sfx/
 *
 * Sources:
 *   freesound.org
 *   pixabay.com/sound-effects
 *   zapsplat.com
 */

export const SFX_LIBRARY = {

  // ── EXISTING SFX ─────────────────────────────────────────

  cash_register: {
    label:    "Cash Register",
    file:     "cash-register.mp3",
    duration: 1.2,
    energy:   "medium",
    mood:     "positive",
    niche:    ["finance", "business", "entertainment"],
    intent:   ["proof", "reveal", "stat"],
  },
  cinematic_boom: {
    label:    "Cinematic Boom",
    file:     "cinematic_boom.mp3",
    duration: 2.0,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["entertainment", "news", "motivational", "sports"],
    intent:   ["hook", "shock", "reveal", "urgency"],
  },
  cinematic_impact: {
    label:    "Cinematic Impact",
    file:     "cinematic_impact.mp3",
    duration: 1.5,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["entertainment", "sports", "gaming", "news"],
    intent:   ["hook", "shock", "urgency", "contrast"],
  },
  classic_ding: {
    label:    "Classic Ding",
    file:     "classic_ding.mp3",
    duration: 0.8,
    energy:   "low",
    mood:     "positive",
    niche:    ["education", "lifestyle", "health", "food"],
    intent:   ["proof", "reveal", "empathy"],
  },
  click: {
    label:    "Click",
    file:     "click.mp3",
    duration: 0.2,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "education", "finance", "business"],
    intent:   ["explanation", "proof", "stat"],
  },
  countdown_beep: {
    label:    "Countdown Beep",
    file:     "countdown_beep.mp3",
    duration: 0.5,
    energy:   "medium",
    mood:     "tense",
    niche:    ["gaming", "sports", "entertainment", "news"],
    intent:   ["urgency", "escalate", "contrast"],
  },
  crowd_cheer: {
    label:    "Crowd Cheer",
    file:     "crowd_cheer_short.mp3",
    duration: 1.5,
    energy:   "high",
    mood:     "positive",
    niche:    ["sports", "entertainment", "gaming"],
    intent:   ["proof", "reveal", "escalate"],
  },
  error_buzz: {
    label:    "Error Buzz",
    file:     "error_buzz.mp3",
    duration: 0.6,
    energy:   "medium",
    mood:     "negative",
    niche:    ["tech", "education", "comedy", "entertainment"],
    intent:   ["contrast", "shock", "irony"],
  },
  glitch_long: {
    label:    "Glitch Long",
    file:     "glitch_long.mp3",
    duration: 1.2,
    energy:   "high",
    mood:     "chaotic",
    niche:    ["gaming", "tech", "entertainment"],
    intent:   ["hook", "shock", "contrast"],
  },
  glitch_short: {
    label:    "Glitch Short",
    file:     "glitch_short.mp3",
    duration: 0.4,
    energy:   "medium",
    mood:     "chaotic",
    niche:    ["gaming", "tech", "entertainment", "comedy"],
    intent:   ["contrast", "irony", "hook"],
  },
  great_success: {
    label:    "Great Success",
    file:     "great_success.mp3",
    duration: 2.0,
    energy:   "high",
    mood:     "positive",
    niche:    ["motivational", "sports", "business", "entertainment"],
    intent:   ["proof", "reveal", "cta"],
  },
  ground_impact: {
    label:    "Ground Impact",
    file:     "ground_impact.mp3",
    duration: 1.0,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["sports", "entertainment", "gaming", "motivational"],
    intent:   ["hook", "shock", "urgency", "escalate"],
  },
  impact: {
    label:    "Impact",
    file:     "impact.mp3",
    duration: 0.8,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["entertainment", "sports", "gaming", "news"],
    intent:   ["hook", "shock", "urgency"],
  },
  notification: {
    label:    "Notification",
    file:     "notification_ding.mp3",
    duration: 0.6,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "lifestyle", "education", "business"],
    intent:   ["hook", "explanation", "proof"],
  },
  pop_hard: {
    label:    "Pop Hard",
    file:     "pop_hard.mp3",
    duration: 0.3,
    energy:   "medium",
    mood:     "playful",
    niche:    ["entertainment", "comedy", "lifestyle", "food"],
    intent:   ["hook", "escalate", "irony"],
  },
  pop_soft: {
    label:    "Pop Soft",
    file:     "pop_soft.mp3",
    duration: 0.3,
    energy:   "low",
    mood:     "playful",
    niche:    ["lifestyle", "food", "health", "skincare"],
    intent:   ["empathy", "explanation", "visual_rest"],
  },
  soft_hit: {
    label:    "Soft Hit",
    file:     "soft_hit.mp3",
    duration: 0.5,
    energy:   "low",
    mood:     "neutral",
    niche:    ["education", "health", "lifestyle", "finance"],
    intent:   ["empathy", "proof", "explanation"],
  },
  tick_clock: {
    label:    "Tick Clock",
    file:     "tick_clock.mp3",
    duration: 0.2,
    energy:   "low",
    mood:     "tense",
    niche:    ["finance", "news", "education", "sports"],
    intent:   ["urgency", "escalate", "contrast"],
  },
  tick_digital: {
    label:    "Tick Digital",
    file:     "tick_digital.mp3",
    duration: 0.2,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "finance", "education"],
    intent:   ["explanation", "proof", "stat"],
  },
  whoosh: {
    label:    "Whoosh",
    file:     "whoosh.mp3",
    duration: 0.7,
    energy:   "medium",
    mood:     "kinetic",
    niche:    ["entertainment", "gaming", "sports", "travel"],
    intent:   ["hook", "reveal", "escalate"],
  },

  // ── NEW SFX PLACEHOLDERS ──────────────────────────────────
  // Source these from freesound.org or pixabay.com/sound-effects
  // Drop files into /public/sfx/ with matching filename

  // ── Spiritual / Devotional ────────────────────────────────
  bell_temple: {
    label:    "Temple Bell",
    file:     null, // source: freesound.org — search "temple bell"
    duration: 2.5,
    energy:   "low",
    mood:     "peaceful",
    niche:    ["spiritual"],
    intent:   ["visual_rest", "empathy", "reveal"],
  },
  om_bell: {
    label:    "Om Bell",
    file:     null, // source: freesound.org — search "singing bowl"
    duration: 3.0,
    energy:   "low",
    mood:     "transcendent",
    niche:    ["spiritual", "health"],
    intent:   ["visual_rest", "testimonial", "empathy"],
  },
  chime_soft: {
    label:    "Soft Chime",
    file:     null, // source: pixabay.com/sound-effects — search "soft chime"
    duration: 1.0,
    energy:   "low",
    mood:     "peaceful",
    niche:    ["spiritual", "lifestyle", "health"],
    intent:   ["visual_rest", "empathy", "proof"],
  },

  // ── Finance / Business ────────────────────────────────────
  stock_up: {
    label:    "Stock Up",
    file:     null, // source: freesound.org — search "stock market up"
    duration: 0.8,
    energy:   "medium",
    mood:     "positive",
    niche:    ["finance", "business"],
    intent:   ["stat", "proof", "reveal"],
  },
  coin_drop: {
    label:    "Coin Drop",
    file:     null, // source: freesound.org — search "coin drop"
    duration: 0.6,
    energy:   "low",
    mood:     "positive",
    niche:    ["finance", "business", "entertainment"],
    intent:   ["stat", "proof", "hook"],
  },
  keyboard_type: {
    label:    "Keyboard Type",
    file:     null, // source: freesound.org — search "keyboard typing"
    duration: 0.4,
    energy:   "low",
    mood:     "neutral",
    niche:    ["tech", "finance", "education", "business"],
    intent:   ["explanation", "proof", "stat"],
  },

  // ── Gaming ────────────────────────────────────────────────
  game_win: {
    label:    "Game Win",
    file:     null, // source: freesound.org — search "game win jingle"
    duration: 1.5,
    energy:   "high",
    mood:     "triumphant",
    niche:    ["gaming", "sports", "entertainment"],
    intent:   ["proof", "reveal", "cta"],
  },
  game_over: {
    label:    "Game Over",
    file:     null, // source: freesound.org — search "game over"
    duration: 1.2,
    energy:   "medium",
    mood:     "negative",
    niche:    ["gaming", "comedy", "entertainment"],
    intent:   ["contrast", "irony", "shock"],
  },
  power_up: {
    label:    "Power Up",
    file:     null, // source: pixabay.com/sound-effects — search "power up"
    duration: 0.8,
    energy:   "high",
    mood:     "positive",
    niche:    ["gaming", "sports", "motivational"],
    intent:   ["hook", "escalate", "reveal"],
  },
  laser: {
    label:    "Laser",
    file:     null, // source: freesound.org — search "laser zap"
    duration: 0.3,
    energy:   "medium",
    mood:     "futuristic",
    niche:    ["gaming", "tech", "entertainment"],
    intent:   ["hook", "contrast", "shock"],
  },

  // ── Food / Lifestyle ──────────────────────────────────────
  sizzle: {
    label:    "Sizzle",
    file:     null, // source: freesound.org — search "cooking sizzle"
    duration: 1.5,
    energy:   "medium",
    mood:     "appetizing",
    niche:    ["food"],
    intent:   ["hook", "visual_rest", "empathy"],
  },
  bite_crunch: {
    label:    "Bite Crunch",
    file:     null, // source: freesound.org — search "food crunch"
    duration: 0.4,
    energy:   "medium",
    mood:     "playful",
    niche:    ["food", "comedy"],
    intent:   ["hook", "escalate", "irony"],
  },
  cork_pop: {
    label:    "Cork Pop",
    file:     null, // source: freesound.org — search "cork pop"
    duration: 0.5,
    energy:   "medium",
    mood:     "celebratory",
    niche:    ["food", "lifestyle", "entertainment"],
    intent:   ["reveal", "proof", "cta"],
  },

  // ── Motivational / Sports ─────────────────────────────────
  crowd_roar: {
    label:    "Crowd Roar",
    file:     null, // source: freesound.org — search "crowd roar stadium"
    duration: 2.0,
    energy:   "high",
    mood:     "triumphant",
    niche:    ["sports", "motivational", "entertainment"],
    intent:   ["proof", "escalate", "reveal"],
  },
  whistle_start: {
    label:    "Whistle Start",
    file:     null, // source: freesound.org — search "sports whistle"
    duration: 0.6,
    energy:   "high",
    mood:     "energetic",
    niche:    ["sports", "gaming"],
    intent:   ["hook", "urgency", "escalate"],
  },
  heartbeat: {
    label:    "Heartbeat",
    file:     null, // source: freesound.org — search "heartbeat tense"
    duration: 1.0,
    energy:   "medium",
    mood:     "tense",
    niche:    ["health", "motivational", "news"],
    intent:   ["urgency", "escalate", "hook"],
  },

  // ── Comedy ────────────────────────────────────────────────
  sad_trombone: {
    label:    "Sad Trombone",
    file:     null, // source: freesound.org — search "sad trombone"
    duration: 1.5,
    energy:   "low",
    mood:     "comedic",
    niche:    ["comedy", "entertainment"],
    intent:   ["irony", "contrast", "hook"],
  },
  boing: {
    label:    "Boing",
    file:     null, // source: freesound.org — search "cartoon boing"
    duration: 0.5,
    energy:   "medium",
    mood:     "silly",
    niche:    ["comedy", "entertainment"],
    intent:   ["irony", "hook", "escalate"],
  },
  rimshot: {
    label:    "Rimshot",
    file:     null, // source: freesound.org — search "rimshot drum"
    duration: 0.8,
    energy:   "medium",
    mood:     "comedic",
    niche:    ["comedy", "entertainment"],
    intent:   ["irony", "hook", "contrast"],
  },

  // ── News / Drama ──────────────────────────────────────────
  news_sting: {
    label:    "News Sting",
    file:     null, // source: freesound.org — search "news sting"
    duration: 1.5,
    energy:   "high",
    mood:     "urgent",
    niche:    ["news", "finance", "education"],
    intent:   ["hook", "urgency", "shock"],
  },
  tension_riser: {
    label:    "Tension Riser",
    file:     null, // source: freesound.org — search "tension riser"
    duration: 2.0,
    energy:   "high",
    mood:     "tense",
    niche:    ["news", "entertainment", "sports"],
    intent:   ["escalate", "urgency", "hook"],
  },
  dramatic_sting: {
    label:    "Dramatic Sting",
    file:     null, // source: pixabay.com/sound-effects — search "dramatic sting"
    duration: 1.2,
    energy:   "high",
    mood:     "dramatic",
    niche:    ["news", "entertainment", "motivational"],
    intent:   ["shock", "reveal", "hook"],
  },

  // ── Tech / Futuristic ─────────────────────────────────────
  digital_blip: {
    label:    "Digital Blip",
    file:     null, // source: freesound.org — search "digital blip"
    duration: 0.3,
    energy:   "low",
    mood:     "futuristic",
    niche:    ["tech", "gaming", "finance"],
    intent:   ["explanation", "stat", "proof"],
  },
  scan_beep: {
    label:    "Scan Beep",
    file:     null, // source: freesound.org — search "scan beep"
    duration: 0.4,
    energy:   "low",
    mood:     "futuristic",
    niche:    ["tech", "health", "finance"],
    intent:   ["stat", "proof", "explanation"],
  },
  data_swoosh: {
    label:    "Data Swoosh",
    file:     null, // source: freesound.org — search "data swoosh"
    duration: 0.6,
    energy:   "medium",
    mood:     "futuristic",
    niche:    ["tech", "finance", "education"],
    intent:   ["reveal", "hook", "stat"],
  },

};

export const SFX_KEYS = Object.keys(SFX_LIBRARY).filter(k => SFX_LIBRARY[k].file !== null);
export const ALL_SFX_KEYS = Object.keys(SFX_LIBRARY);

/* ── Preview URL resolver ── */
const FILENAME_OVERRIDES = {
  cash_register: "cash-register.mp3",
  crowd_cheer:   "crowd_cheer_short.mp3",
  notification:  "notification_ding.mp3",
};

export function getSFXPreviewUrl(key) {
  const entry = SFX_LIBRARY[key];
  if (!entry?.file) return null;
  const filename = FILENAME_OVERRIDES[key] || entry.file;
  return `/sfx/${filename}`;
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
  const available = SFX_KEYS; // only tracks with actual files

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