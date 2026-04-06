/**
 * overlayPlacementEngine.js
 * src/core/overlayPlacementEngine.js
 *
 * Determines which anchor slots are safe for overlay placement,
 * considering:
 *   1. Layout zone structure (existing LAYOUT_SAFE_ANCHORS)
 *   2. Caption position (exclude same region as caption)
 *   3. Already-placed overlays (no two in same region)
 *   4. Max 2 overlays per beat (one top, one bottom)
 */

import { LAYOUT_SAFE_ANCHORS, ANCHOR_POSITIONS, OVERLAY_TYPES, INTENT_OVERLAYS, createOverlay } from "./overlayRegistry";

/* ─────────────────────────────────────────────────────────────
   REGION MAP
   Each anchor belongs to a screen region.
   Only one overlay allowed per region.
───────────────────────────────────────────────────────────── */
const ANCHOR_REGION = {
  "top-left":      "top",
  "top-center":    "top",
  "top-right":     "top",
  "mid-left":      "mid",
  "mid-right":     "mid",
  "center":        "mid",
  "bottom-left":   "bottom",
  "bottom-center": "bottom",
  "bottom-right":  "bottom",
};

/* ─────────────────────────────────────────────────────────────
   CAPTION REGION EXCLUSION
   If caption is at bottom, exclude all bottom anchors.
   If caption is at top, exclude all top anchors.
───────────────────────────────────────────────────────────── */
function getCaptionExcludedRegion(captionPosition) {
  // Handle numeric % values (0-100 from top)
  if (typeof captionPosition === "number") {
    if (captionPosition <= 25) return "top";
    if (captionPosition >= 65) return "bottom";
    return "mid";
  }
  // Legacy string fallback
  if (captionPosition === "bottom") return "bottom";
  if (captionPosition === "top")    return "top";
  if (captionPosition === "middle") return "mid";
  return null;
}

/* ─────────────────────────────────────────────────────────────
   MAIN: Get safe anchors for a new overlay
───────────────────────────────────────────────────────────── */

/**
 * @param {object} options
 * @param {string} options.layout          — current beat layout key
 * @param {string} options.overlayType     — type of overlay being placed
 * @param {string} options.captionPosition — "top"|"middle"|"bottom"
 * @param {Array}  options.existingOverlays — already placed overlays on this beat
 * @returns {string[]} array of safe anchor keys, empty if none available
 */
export function getSafePlacementAnchors({
  layout,
  overlayType,
  captionPosition = "bottom",
  existingOverlays = [],
}) {
  /* 1. Start with layout-allowed anchors */
  const layoutAnchors = LAYOUT_SAFE_ANCHORS[layout] || Object.keys(ANCHOR_POSITIONS);

  /* 2. Filter to overlay type's allowed anchors */
  const typeAnchors = OVERLAY_TYPES[overlayType]?.allowedAnchors || Object.keys(ANCHOR_POSITIONS);

  /* 3. Get already-used regions */
  const usedRegions = new Set(
    existingOverlays.map(o => ANCHOR_REGION[o.anchor]).filter(Boolean)
  );

  /* 4. Get caption's excluded region */
  const captionRegion = getCaptionExcludedRegion(captionPosition);

  /* 5. Max 2 overlays total */
  if (existingOverlays.length >= 2) return [];

  return layoutAnchors
    .filter(a => typeAnchors.includes(a))
    .filter(a => {
      const region = ANCHOR_REGION[a];
      /* Exclude caption region */
      if (captionRegion && region === captionRegion) return false;
      /* Exclude already-used regions */
      if (usedRegions.has(region)) return false;
      return true;
    });
}

/**
 * Auto-assign up to 2 overlays for a beat.
 * Returns array of overlay objects ready to add to beat.overlays.
 *
 * @param {object} options
 * @param {string} options.intent
 * @param {number} options.energy
 * @param {string} options.layout
 * @param {string} options.captionPosition
 * @param {string} options.brandColor       — hex color for overlay accent
 */
export function autoAssignOverlays({
  intent,
  energy,
  layout,
  captionPosition = "bottom",
  brandColor      = null,
}) {
  const candidates = INTENT_OVERLAYS[intent] || [];
  if (!candidates.length) return [];

  const placed = [];

  for (const typeOrBadge of candidates) {
    if (placed.length >= 2) break;

    /* Parse "Badge:LIVE" format */
    let type = typeOrBadge;
    let badgeText = null;
    if (typeOrBadge.includes(":")) {
      [type, badgeText] = typeOrBadge.split(":");
    }

    const safeAnchors = getSafePlacementAnchors({
      layout,
      overlayType:     type,
      captionPosition,
      existingOverlays: placed,
    });

    if (!safeAnchors.length) continue;

    const overlay = createOverlay(type);
    if (!overlay) continue;

    overlay.anchor = safeAnchors[0];

    /* Apply badge text override */
    if (badgeText) overlay.text = badgeText;

    /* Apply brand color if provided */
    if (brandColor) overlay.color = brandColor;

    /* Stagger delays so overlays don't all appear at once */
    overlay.delay = placed.length * 0.2;

    placed.push(overlay);
  }

  return placed;
}

/**
 * Check if adding an overlay at a given anchor would conflict.
 */
export function wouldConflict(anchor, captionPosition, existingOverlays) {
  const region        = ANCHOR_REGION[anchor];
  const captionRegion = getCaptionExcludedRegion(captionPosition);

  if (captionRegion && region === captionRegion) return true;

  const usedRegions = existingOverlays.map(o => ANCHOR_REGION[o.anchor]);
  return usedRegions.includes(region);
}