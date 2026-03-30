/**
 * visualDirector.js
 * src/core/visualDirector.js
 *
 * Post-processes assembled beats to:
 * - Prevent identical consecutive layouts
 * - Apply energy-driven asset motions
 * - Ensure avatar layouts used correctly in talking_head mode
 */

/* ─────────────────────────────────────────────────────────────
   LAYOUT VARIETY RULES
───────────────────────────────────────────────────────────── */

// When a layout repeats, rotate to the next candidate from this pool
const FACELESS_ROTATION = [
  "FullZone", "SplitZone", "ThreeZone",
  "TwoTopOneBottom", "OneTopTwoBottom", "PictureInPicture",
];

const TALKING_HEAD_ROTATION = [
  "SideAvatar", "CenterAvatar", "FloatingAvatar", "PictureInPicture",
];

/* ─────────────────────────────────────────────────────────────
   ENERGY → MOTION MAPPING
   Uses new intent system but stays compatible with legacy.
───────────────────────────────────────────────────────────── */
const MOTION_BY_ENERGY = {
  high:   ["cinematicPush", "pushSlow", "zoomIn"],
  medium: ["kenburns",      "slowZoom", "pushSlow"],
  low:    ["slowZoom",      "kenburns", "pullSlow"],
};

function energyLevel(energy) {
  if (energy >= 0.72) return "high";
  if (energy >= 0.4)  return "medium";
  return "low";
}

/* Intent → energy override for legacy beats without energy field */
const INTENT_ENERGY_FALLBACK = {
  shock:       0.9,
  curiosity:   0.6,
  proof:       0.55,
  reveal:      0.75,
  urgency:     0.85,
  empathy:     0.35,
  explanation: 0.45,
  contrast:    0.6,
  punchline:   0.7,
  irony:       0.6,
  // legacy
  hook:        0.85,
  stat:        0.55,
  quote:       0.3,
  list:        0.5,
  question:    0.6,
  comparison:  0.6,
};

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */
export function applyVisualDirection(beats = [], options = {}) {
  const mode           = options.mode || "faceless";
  const rotation       = mode === "talking_head"
    ? TALKING_HEAD_ROTATION
    : FACELESS_ROTATION;

  let lastLayout       = null;
  let rotationIndex    = 0;

  return beats.map((beat, index) => {
    /* ── Resolve energy ── */
    const energy = typeof beat.energy === "number"
      ? beat.energy
      : (INTENT_ENERGY_FALLBACK[beat.intent] || 0.5);

    const level  = energyLevel(energy);
    const motionPool = MOTION_BY_ENERGY[level];

    /* ── Prevent layout repetition ── */
    let layout = beat.layout;

    if (layout === lastLayout) {
      // Rotate to a different layout
      let attempts = 0;
      while (layout === lastLayout && attempts < rotation.length) {
        layout = rotation[rotationIndex % rotation.length];
        rotationIndex++;
        attempts++;
      }
    }

    lastLayout = layout;

    /* ── Apply energy-driven motion to asset zones ── */
    const zones = { ...beat.zones };

    Object.keys(zones).forEach((z, zi) => {
      const zone = zones[z];
      if (zone.role !== "asset")            return;
      if (!zone.content?.asset)             return;

      zones[z] = {
        ...zone,
        content: {
          ...zone.content,
          asset: {
            ...zone.content.asset,
            motion: motionPool[(index + zi) % motionPool.length],
          },
        },
      };
    });

    /* ── First beat: always energetic enter ── */
    let transition = beat.transition;
    if (index === 0) {
      transition = { type: "cut", duration: 0.25 };
    }

    /* ── Last beat: always slow exit ── */
    const isLast = index === beats.length - 1;
    if (isLast && beat.intent !== "urgency") {
      transition = { type: "blurFade", duration: 0.4 };
    }

    return {
      ...beat,
      layout,
      zones,
      energy,
      transition,
    };
  });
}