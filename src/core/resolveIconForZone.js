/**
 * resolveIconForZone.js
 * src/core/resolveIconForZone.js
 *
 * Picks the best icon and color for a layout zone of type "icon".
 *
 * Selection — 3-step relaxing filter:
 *   1. intent + niche + energy  (strictest)
 *   2. intent + niche
 *   3. intent only
 *   4. full pool (fallback)
 *
 * Color priority:
 *   Semantic icon colors (gold, green, red — carry meaning) → kept fixed
 *   Generic white icons → brand color → DNA primary → #ffffff
 */

import iconRegistry from "./registries/iconRegistry.js";
import { backgroundPatternRegistry } from "./registries/backgroundPatternRegistry.js";

const ENTRIES = Object.entries(iconRegistry);

/* ── Energy bucket ───────────────────────────────────────────── */
function energyBucket(energy) {
  if (energy >= 0.72) return "high";
  if (energy >= 0.38) return "medium";
  return "low";
}

/* ── Is this a generic neutral icon color? ───────────────────── */
// Semantic icons carry meaning via color (gold crown, green arrow_up, red heart, etc.)
// Generic white icons should follow brand/DNA primary instead.
function isGenericColor(hex) {
  if (!hex) return true;
  const norm = hex.toLowerCase().trim();
  return norm === "#ffffff" || norm === "white" || norm === "#fff";
}

/* ── Main resolver ───────────────────────────────────────────── */
/**
 * @param {{ intent, energy, layoutBackground }} beat
 * @param {{ id }} zone
 * @param {object|null} dna          — videoDNA { colorStory, niche }
 * @param {string|null} brandColor   — user brand hex
 * @returns {{ iconId: string, color: string }}
 */
export function resolveIconForZone(beat, zone, dna = null, brandColor = null) {
  const intent  = beat.intent  || "hook";
  const energy  = beat.energy  ?? 0.5;
  const niche   = dna?.niche   || null;
  const bucket  = energyBucket(energy);

  /* ── Step 1: intent + niche + energy ── */
  let pool = ENTRIES.filter(([, ic]) =>
    ic.intent?.includes(intent) &&
    ic.energy?.includes(bucket) &&
    (!niche || !ic.niche?.length || ic.niche.includes(niche))
  );

  /* ── Step 2: relax energy ── */
  if (!pool.length) {
    pool = ENTRIES.filter(([, ic]) =>
      ic.intent?.includes(intent) &&
      (!niche || !ic.niche?.length || ic.niche.includes(niche))
    );
  }

  /* ── Step 3: relax niche ── */
  if (!pool.length) {
    pool = ENTRIES.filter(([, ic]) => ic.intent?.includes(intent));
  }

  /* ── Step 4: full pool fallback ── */
  if (!pool.length) pool = ENTRIES;

  /* ── Deterministic pick within pool ── */
  const seed = (intent.charCodeAt(0) || 0)
    + ((zone.id || "").charCodeAt(0) || 0)
    + Math.round(energy * 17);
  const [iconId, iconDef] = pool[seed % pool.length];

  /* ── Color resolution ── */
  const defaultColor = iconDef?.defaults?.color || "#ffffff";

  let color;
  if (isGenericColor(defaultColor)) {
    // Generic white → upgrade to brand/DNA primary
    color = brandColor || dna?.colorStory?.primary || "#7c5cfc";
  } else {
    // Semantic color — check background brightness for legibility
    // If the beat's background is explicitly light, the semantic color still wins
    // (semantic icons are always on-brand: gold crown, green arrow, red heart)
    color = defaultColor;
  }

  // Background brightness safety: if background is light and icon would be white, force dark
  const bgKey    = beat.layoutBackground?.value;
  const bgEntry  = bgKey ? backgroundPatternRegistry[bgKey] : null;
  const bgIsLight = bgEntry?.brightness === "light";

  if (bgIsLight && (color === "#ffffff" || color === "white")) {
    color = dna?.colorStory?.primary || brandColor || "#1a1a2e";
  }

  return { iconId, color };
}
