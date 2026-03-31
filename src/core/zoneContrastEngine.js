/**
 * zoneContrastEngine.js
 * src/core/zoneContrastEngine.js
 *
 * Ensures zone backgrounds contrast with whatever is placed in the zone.
 * Called by visualPlanner before finalizing each zone's background.
 */

import {
  backgroundPatternRegistry,
  getBackgroundForIntent,
  getContrastingBackground,
} from "./backgroundPatternRegistry";

/* ─────────────────────────────────────────────────────────────
   BLOCK BRIGHTNESS MAP
   Each block type declares whether its dominant surface is
   light or dark — so we know what background to put behind it.
───────────────────────────────────────────────────────────── */
export const BLOCK_BRIGHTNESS = {
  StatExplosion:    "dark",   // dark bg with bright numbers
  HookImpact:       "dark",   // full dark frame with large text
  ListCountdown:    "dark",   // dark with light text items
  QuoteHighlight:   "light",  // light editorial card
  BeforeAfter:      "mixed",  // split — handled separately
  ChapterTitle:     "dark",   // cinematic dark frame
  MythVsFact:       "dark",
  ProcessSteps:     "dark",
  ProblemSolution:  "dark",
  CTAButton:        "dark",   // dark bg, light CTA pill
  KineticTypography:"dark",
  BadgePack:        "dark",
};

/* ─────────────────────────────────────────────────────────────
   OVERLAY BRIGHTNESS MAP
   Same concept for overlays floating above zones.
───────────────────────────────────────────────────────────── */
export const OVERLAY_BRIGHTNESS = {
  HeadlineText:  "dark",    // large white text — needs dark behind
  Badge:         "mixed",   // pill can be any color
  StatCallout:   "dark",    // dark frosted card
  HighlightBox:  "light",   // light editorial box
  LiveDot:       "dark",    // small element, minimal impact
  EmojiFloat:    "mixed",   // transparent, no real surface
  ArrowPointer:  "mixed",   // thin element
};

/* ─────────────────────────────────────────────────────────────
   CAPTION BRIGHTNESS MAP
   Caption styles and their dominant text color brightness.
───────────────────────────────────────────────────────────── */
export const CAPTION_BRIGHTNESS = {
  wordBlaze:      "light",   // white/bright text
  karaokeFill:    "light",
  stackReveal:    "light",
  markerPen:      "light",
  glitchStamp:    "light",
  editorialSerif: "dark",    // dark text on light bg
  neonTicker:     "light",
  pillDrop:       "light",
  brutalSlam:     "light",
  luxuryGold:     "light",
  tiktokClean:    "light",
  premiumBlock:   "light",
  wordHighlight:  "light",
};

/* ─────────────────────────────────────────────────────────────
   ASSET ZONE — no brightness constraint
   Assets are images/videos — they contain their own contrast.
   We still pick a background for the padding gap around them,
   so we use intent-based selection, not contrast-based.
───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   MAIN: Pick zone background with contrast awareness
───────────────────────────────────────────────────────────── */

/**
 * Pick a background style for a zone, aware of what's in it.
 *
 * @param {object} options
 * @param {string} options.contentKind  — "asset" | "block" | "color" | null
 * @param {string} options.blockType    — block type key if kind === "block"
 * @param {string} options.intent       — beat intent
 * @param {number} options.energy       — beat energy 0-1
 * @param {string} options.captionStyle — current caption style
 * @returns {{ key, style, brightness, mood }}
 */
export function pickZoneBackground({ contentKind, blockType, intent, energy, captionStyle }) {

  /* ── Block in zone → must contrast with block ── */
  if (contentKind === "block" && blockType) {
    const blockBrightness = BLOCK_BRIGHTNESS[blockType] || "dark";

    if (blockBrightness === "light") {
      // Light block → dark background
      return getContrastingBackground("light", intent);
    }
    if (blockBrightness === "dark") {
      // Dark block → can use any dark or mid background
      return getBackgroundForIntent(intent, "dark");
    }
    // Mixed → use intent only
    return getBackgroundForIntent(intent);
  }

  /* ── Asset in zone → intent-based, any brightness ── */
  if (contentKind === "asset") {
    // High energy → dark/dramatic backgrounds
    if (energy >= 0.75) {
      return getBackgroundForIntent(intent, "dark");
    }
    // Low energy → can use light or dark
    return getBackgroundForIntent(intent);
  }

  /* ── Empty/color → intent-based dark default ── */
  return getBackgroundForIntent(intent, "dark");
}

/**
 * Validate that a background key works with a given block type.
 * Returns true if contrast is acceptable, false if it would clash.
 */
export function backgroundContrastValid(backgroundKey, blockType) {
  const bg    = backgroundPatternRegistry[backgroundKey];
  const block = BLOCK_BRIGHTNESS[blockType];
  if (!bg || !block) return true; // unknown = assume ok

  if (block === "light" && bg.brightness === "light") return false; // both light = clash
  if (block === "dark"  && bg.brightness === "dark")  return true;  // both dark = ok (text shows)
  return true;
}