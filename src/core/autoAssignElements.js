/**
 * autoAssignElements.js
 * src/core/autoAssignElements.js
 *
 * Assigns decorative/icon/emoji element zones to beats.
 * Returns an array of extra zone objects with type:"element".
 *
 * FORMULA (bottom to top):
 *  1. Vignette          — ALWAYS on asset beats, almost always on no-asset
 *  2. Gradient fade     — ALWAYS on text-heavy layouts (readability)
 *  3. Glow spot         — ALWAYS on high-energy beats
 *  4. Noise overlay     — most no-asset beats (texture/depth)
 *  5. Accent line       — editorial/magazine layouts
 *  6. Corner accent     — editorial layouts (framing)
 *  7. Icon              — relevant intent icons on no-asset beats
 *  8. Emoji             — hook/cta high-energy beats
 */
import { findElementsByTags } from "./elementsRegistry";

/* ── Helpers ────────────────────────────────────────────────── */
function uid() { return `el_${Math.random().toString(36).slice(2, 8)}`; }

function chance(p) { return Math.random() < p; }

function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function elementZone(elementId, overrides = {}) {
  return {
    id:      uid(),
    type:    "element",
    zIndex:  overrides.zIndex ?? 5,
    start:   overrides.start  ?? 0,
    end:     overrides.end    ?? null,
    x:       overrides.x      ?? 0,
    y:       overrides.y      ?? 0,
    width:   overrides.width  ?? 100,
    height:  overrides.height ?? 100,
    content: { elementId, props: overrides.props || {} },
    style:   {},
    background: {},
  };
}

/* ── Intent → icon tags ──────────────────────────────────────── */
const INTENT_ICON_TAGS = {
  stat:        ["chart-bar", "trend-up", "coin"],
  proof:       ["check-circle", "shield", "trophy"],
  curiosity:   ["eye", "brain", "lock"],
  shock:       ["bolt", "zap", "fire"],
  urgency:     ["clock", "arrow-up", "bolt"],
  empathy:     ["heart", "eyes"],
  explanation: ["bulb", "brain", "globe"],
  reveal:      ["lock", "star", "rocket"],
  contrast:    ["chart-bar", "arrow-up"],
  punchline:   ["fire", "star", "trophy"],
  hook:        ["bolt", "fire", "eye"],
  list:        ["check-circle", "target"],
  cta:         ["rocket", "arrow-up", "target"],
};

const INTENT_EMOJI_TAGS = {
  stat:        ["chart", "hundred"],
  proof:       ["check", "trophy"],
  curiosity:   ["eyes", "lock"],
  shock:       ["bolt", "fire"],
  urgency:     ["clock", "target"],
  empathy:     ["heart", "bulb"],
  explanation: ["bulb", "chart"],
  reveal:      ["lock", "star"],
  punchline:   ["fire", "hundred"],
  contrast:    ["chart", "target"],
  hook:        ["fire", "eyes", "rocket"],
  cta:         ["rocket", "target", "hundred"],
};

/* ── Layout categories ───────────────────────────────────────── */
const EDITORIAL_LAYOUTS = [
  "Magazine",
];

/* ── Main export ─────────────────────────────────────────────── */
/**
 * Returns an array of element zone objects for a beat.
 * Maximum 5 elements per beat (depth + content layers).
 */
export function autoAssignElements({ intent, energy, role, layout, hasAsset, dna, brandColor, brandColor2 }) {
  const elements = [];
  const accentColor  = brandColor  || dna?.colorStory?.primary || "#7c5cfc";
  const accentColor2 = brandColor2 || accentColor;
  const isEditorial  = EDITORIAL_LAYOUTS.includes(layout);

  // ── 3. GLOW SPOT — high-energy beats, always ────────────────────
  // Adds vibrancy and "life" to the frame.
  if (energy >= 0.65) {
    const glowX = Math.round(20 + Math.random() * 60);
    const glowY = Math.round(10 + Math.random() * 50);
    elements.push(elementZone("glow-spot", {
      zIndex: 2,
      props: {
        color:   accentColor,
        opacity: energy >= 0.8 ? 0.45 : 0.30,
        x: glowX, y: glowY,
      },
    }));
  } else if (chance(0.50)) {
    // Lower energy — softer glow
    elements.push(elementZone("glow-spot", {
      zIndex: 2,
      props:  { color: accentColor, opacity: 0.20, x: 50, y: 30 },
    }));
  }

  // ── 4. NOISE OVERLAY — all no-asset beats (film grain texture) ──
  if (!hasAsset && elements.length < 4) {
    elements.push(elementZone("noise-overlay", {
      zIndex: 2,
      props:  { opacity: 0.05 },
    }));
  }

  // ── 5. ACCENT LINE — editorial and split layouts ─────────────────
  if (isEditorial && elements.length < 5 && chance(0.70)) {
    elements.push(elementZone("accent-line", {
      zIndex: 8, x: 5, y: 65, width: 20, height: 1,
      props:  { color: accentColor, thickness: 3 },
    }));
  }

  // ── 6. CORNER ACCENT — editorial/magazine beats ──────────────────
  if (isEditorial && elements.length < 5 && chance(0.50)) {
    elements.push(elementZone("corner-accent", {
      zIndex: 8,
      props:  { color: accentColor2, size: 22, position: "bl" },
    }));
  }

  // ── 7. ICON — intent-matching, no-asset beats ────────────────────
  const iconTags = INTENT_ICON_TAGS[intent];
  if (iconTags && !hasAsset && elements.length < 5 && chance(0.45)) {
    const candidates = findElementsByTags(iconTags.map(t => `icon-${t}`));
    const iconId     = pickFrom(candidates.length ? candidates : [`icon-${iconTags[0]}`]);
    if (iconId) {
      elements.push(elementZone(iconId, {
        zIndex: 10, x: 78, y: 6, width: 14, height: 24,
        props:  { color: accentColor, opacity: 0.90 },
      }));
    }
  }

  // ── 8. EMOJI — hook/cta high-energy ─────────────────────────────
  const emojiTags = INTENT_EMOJI_TAGS[intent];
  if (emojiTags && energy >= 0.72 && (role === "hook" || role === "cta") && elements.length < 5 && chance(0.50)) {
    const candidates = findElementsByTags(emojiTags);
    const emojiId    = pickFrom(candidates.length ? candidates : ["emoji-fire"]);
    if (emojiId) {
      elements.push(elementZone(emojiId, {
        zIndex: 11, x: 80, y: 4, width: 14, height: 24,
        props:  { opacity: 0.95 },
      }));
    }
  }

  return elements;
}
