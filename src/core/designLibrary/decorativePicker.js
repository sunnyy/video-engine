/**
 * decorativePicker.js
 * src/core/designLibrary/decorativePicker.js
 *
 * Picks decoratives for a beat based on context.
 * Returns array of resolved decorative placements.
 * Pure deterministic JS — no AI calls.
 */

import { decorativeRegistry } from "./decorativeRegistry";

/* ── Intent → category/subtype preferences ─────────────────── */
const INTENT_PREFS = {
  hook:        { categories: ["accent", "structural"], subtypes: ["corner", "sparkle", "shape"] },
  cta:         { categories: ["accent", "structural"], subtypes: ["corner", "arrow", "shape"] },
  curiosity:   { categories: ["accent", "atmospheric"], subtypes: ["sparkle", "shape", "pattern"] },
  shock:       { categories: ["accent"],               subtypes: ["shape", "sparkle", "badge"] },
  proof:       { categories: ["structural", "atmospheric"], subtypes: ["border", "corner", "pattern"] },
  explanation: { categories: ["structural", "atmospheric"], subtypes: ["border", "corner", "divider"] },
  reveal:      { categories: ["accent", "atmospheric"], subtypes: ["sparkle", "shape", "pattern"] },
  punchline:   { categories: ["accent"],               subtypes: ["shape", "sparkle", "arrow"] },
  empathy:     { categories: ["atmospheric"],           subtypes: ["pattern", "shape"] },
  urgency:     { categories: ["accent"],               subtypes: ["arrow", "shape", "badge"] },
  stat:        { categories: ["accent", "structural"], subtypes: ["badge", "corner", "shape"] },
  contrast:    { categories: ["structural", "accent"], subtypes: ["border", "divider", "shape"] },
  visual_rest: { categories: ["atmospheric"],           subtypes: ["pattern"] },
  irony:       { categories: ["accent"],               subtypes: ["shape", "badge"] },
  list:        { categories: ["structural"],            subtypes: ["border", "divider"] },
};

/* ── Max decoratives per intent ─────────────────────────────── */
function maxDecorativesForBeat(intent, energy) {
  if (intent === "visual_rest") return 1;
  if (intent === "explanation" || intent === "proof") return 2;
  if (energy >= 0.8 && (intent === "hook" || intent === "cta")) return 2;
  if (energy >= 0.6) return 2;
  return 1;
}

/* ── All corner tokens ──────────────────────────────────────── */
const ALL_CORNERS = ["TL", "TR", "BL", "BR"];

/* ── Seeded pseudo-random (deterministic per beat id) ──────── */
function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* ── Size in pixels for each scale tag ─────────────────────── */
const SCALE_PX = { sm: 48, md: 72, lg: 96 };

/* ── Choose size based on energy ─────────────────────────────  */
function pickScale(entry, energy) {
  if (energy >= 0.75 && entry.scale.includes("lg")) return "lg";
  if (energy >= 0.45 && entry.scale.includes("md")) return "md";
  return entry.scale[0];
}

/* ── Resolve position value ─────────────────────────────────── */
function resolvePosition(entry, usedCorners, rand) {
  // Prefer any corner not yet used in this beat
  const availCorners = entry.positions.filter(p => ALL_CORNERS.includes(p) && !usedCorners.has(p));

  if (availCorners.length) {
    const idx = Math.floor(rand() * availCorners.length);
    return availCorners[idx];
  }
  if (entry.positions.includes("floating")) return "floating";
  if (entry.positions.includes("top"))      return "top";
  if (entry.positions.includes("bottom"))   return "bottom";
  if (entry.positions.includes("background")) return "background";
  return ALL_CORNERS[Math.floor(rand() * ALL_CORNERS.length)];
}

/* ── Convert position token → { x, y, anchor } ─────────────── */
// Corners now sample from a wide quadrant instead of a fixed point,
// so consecutive beats feel distinct even when using the same corner token.
function positionToCoords(pos, rand) {
  switch (pos) {
    case "TL": return {
      x: 0.02 + rand() * 0.18,
      y: 0.02 + rand() * 0.18,
      anchor: "top-left",
    };
    case "TR": return {
      x: 0.80 + rand() * 0.18,
      y: 0.02 + rand() * 0.18,
      anchor: "top-right",
    };
    case "BL": return {
      x: 0.02 + rand() * 0.18,
      y: 0.80 + rand() * 0.18,
      anchor: "bottom-left",
    };
    case "BR": return {
      x: 0.80 + rand() * 0.18,
      y: 0.80 + rand() * 0.18,
      anchor: "bottom-right",
    };
    case "top":    return { x: 0.3 + rand() * 0.4, y: 0.02 + rand() * 0.06, anchor: "top-center" };
    case "bottom": return { x: 0.3 + rand() * 0.4, y: 0.92 + rand() * 0.06, anchor: "bottom-center" };
    case "background": return { x: 0.3 + rand() * 0.4, y: 0.3 + rand() * 0.4, anchor: "center" };
    case "floating":
    default:
      // Divide the frame into 6 zones and pick one to spread items out
      return {
        x: 0.08 + rand() * 0.84,
        y: 0.08 + rand() * 0.84,
        anchor: "center",
      };
  }
}

/* ── Resolve color from videoDNA ─────────────────────────────── */
function resolveColor(entry, videoDNA, opacity) {
  const cs = videoDNA?.colorStory || {};
  const primary = cs.primary || "#7c5cfc";
  const accent  = cs.accent  || primary;
  const surface = cs.surface || cs.bg || "#111118";

  // Parse hex to rgba helper
  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  if (entry.category === "structural") {
    return opacity < 1 ? hexToRgba(primary, opacity) : primary;
  }
  if (entry.category === "accent") {
    return opacity < 1 ? hexToRgba(accent, opacity) : accent;
  }
  // atmospheric
  return hexToRgba(surface, 0.4 * opacity);
}

/* ── Main picker ─────────────────────────────────────────────── */
/**
 * Picks decoratives for a beat.
 *
 * @param {object} beat          - Beat object with intent, energy fields
 * @param {object} videoDNA      - Video DNA with colorStory
 * @param {string[]} usedDecorativeIds - Already used decorative IDs (anti-repeat)
 * @returns {Array} placements
 */
export function pickDecoratives(beat, videoDNA, usedDecorativeIds = []) {
  const intent = beat.intent || "hook";
  const energy = beat.energy ?? 0.5;

  // visual_rest → atmospheric only, max 1
  if (intent === "visual_rest" && energy <= 0.4) {
    return []; // very calm — skip entirely
  }

  const prefs = INTENT_PREFS[intent] || INTENT_PREFS.hook;
  const maxCount = maxDecorativesForBeat(intent, energy);

  const rand = seededRandom(beat.id || `${intent}_${energy}`);

  // Filter registry by rules
  let pool = decorativeRegistry.filter(entry => {
    // Energy range
    if (energy < entry.energy_range[0] || energy > entry.energy_range[1]) return false;
    // StarBurst only when energy >= 0.6
    if (entry.id.startsWith("star_burst") && energy < 0.6) return false;
    // Atmospheric only when energy <= 0.65
    if (entry.category === "atmospheric" && energy > 0.65) return false;
    // visual_rest → atmospheric only
    if (intent === "visual_rest" && entry.category !== "atmospheric") return false;
    // Category preference
    if (!prefs.categories.includes(entry.category)) return false;
    // Subtype preference
    if (!prefs.subtypes.includes(entry.subtype)) return false;
    // Exclude recently used
    if (usedDecorativeIds.includes(entry.id)) return false;
    return true;
  });

  // Fallback: relax subtype filter if pool is too small
  if (pool.length < 2) {
    pool = decorativeRegistry.filter(entry => {
      if (energy < entry.energy_range[0] || energy > entry.energy_range[1]) return false;
      if (entry.id.startsWith("star_burst") && energy < 0.6) return false;
      if (entry.category === "atmospheric" && energy > 0.65) return false;
      if (intent === "visual_rest" && entry.category !== "atmospheric") return false;
      if (!prefs.categories.includes(entry.category)) return false;
      if (usedDecorativeIds.includes(entry.id)) return false;
      return true;
    });
  }

  if (!pool.length) return [];

  // Shuffle pool deterministically
  const shuffled = [...pool].sort(() => rand() - 0.5);

  const placements = [];
  const usedCorners = new Set();
  const usedIds = new Set();

  for (const entry of shuffled) {
    if (placements.length >= maxCount) break;
    if (usedIds.has(entry.id)) continue;

    // Anti-repeat: avoid same decorative in the last 5 beats
    if (usedDecorativeIds.slice(-5).includes(entry.id)) continue;

    // Resolve position — any unused corner is valid
    const pos = resolvePosition(entry, usedCorners, rand);
    if (ALL_CORNERS.includes(pos)) {
      usedCorners.add(pos);
    }

    const scaleName = pickScale(entry, energy);
    const sizePx    = SCALE_PX[scaleName] || 72;
    const opacity   = entry.category === "atmospheric" ? 0.55 : (energy >= 0.7 ? 0.95 : 0.88);
    const color     = resolveColor(entry, videoDNA, opacity);
    const coords    = positionToCoords(pos, rand);
    const rotation  = entry.category === "accent" ? Math.round((rand() - 0.5) * 24) : 0;

    placements.push({
      decorativeId: entry.id,
      color,
      position:  { x: coords.x, y: coords.y, anchor: coords.anchor },
      size:      { w: sizePx, h: sizePx },
      rotation,
      opacity,
      zIndex: entry.category === "atmospheric" ? 1 : (entry.category === "structural" ? 3 : 4),
      _pos: pos, // internal — used for collision tracking
    });

    usedIds.add(entry.id);
  }

  return placements;
}
