/**
 * visualPlanner.js
 * src/core/visualPlanner.js
 *
 * Picks layouts by metadata matching (intent, energy, orientation, assetCount, textCount)
 * instead of hardcoded layout name pools.
 * Fills zones by type + order from the layout definition.
 */

import { findLayouts, getLayoutDef } from "./layoutRegistry.js";
import { getBackgroundForIntent } from "./backgroundPatternRegistry.js";

/* ─────────────────────────────────────────────────────────────
   ENERGY LEVEL
───────────────────────────────────────────────────────────── */
function energyLevel(energy) {
  if (energy >= 0.72) return "high";
  if (energy >= 0.4)  return "medium";
  return "low";
}

/* ─────────────────────────────────────────────────────────────
   MOTION POOL
───────────────────────────────────────────────────────────── */
const MOTIONS_BY_ENERGY = {
  high:   ["kenburns", "cinematicPush", "droneRise", "microZoom"],
  medium: ["kenburns", "pushSlow", "slowZoom", "parallax"],
  low:    ["slowZoom", "microZoom", "pushSlow", "parallax"],
};

function pickMotion(energy, index = 0, lastMotion = null) {
  const level = energyLevel(energy);
  const pool  = MOTIONS_BY_ENERGY[level].filter(m => m !== lastMotion);
  return pool[(index) % pool.length];
}

/* ─────────────────────────────────────────────────────────────
   STYLE PRESETS — asset zone visual variety
───────────────────────────────────────────────────────────── */
const STYLE_PRESETS = [
  { scale: 1.0,  borderRadius: 0,  shadowBlur: 0  },
  { scale: 1.0,  borderRadius: 0,  shadowBlur: 0  },
  { scale: 0.92, borderRadius: 12, shadowBlur: 20 },
  { scale: 0.88, borderRadius: 16, shadowBlur: 24 },
  { scale: 0.82, borderRadius: 20, shadowBlur: 28 },
  { scale: 0.78, borderRadius: 24, shadowBlur: 30 },
];

function pickStylePreset(energy) {
  if (energy >= 0.8) return STYLE_PRESETS[Math.floor(Math.random() * 2)];
  if (energy <= 0.3) return STYLE_PRESETS[3 + Math.floor(Math.random() * 3)];
  return STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)];
}

/* ─────────────────────────────────────────────────────────────
   LAYOUT PICKER
   Matches by intent + energy + orientation.
   Excludes previously used layouts for variety.
───────────────────────────────────────────────────────────── */
function pickLayout({
  intent,
  energy,
  orientation,
  previousLayout,
  previousPreviousLayout,
}) {
  const level = energyLevel(energy);

  // Try exact match first
  let candidates = findLayouts({ intent, energy: level, orientation });

  // Relax energy if no match
  if (!candidates.length) {
    candidates = findLayouts({ intent, orientation });
  }

  // Relax intent if still no match
  if (!candidates.length) {
    candidates = findLayouts({ orientation });
  }

  // Last resort — any layout
  if (!candidates.length) {
    candidates = findLayouts({});
  }

  // Exclude recent layouts for variety
  const excluded = [previousLayout, previousPreviousLayout].filter(Boolean);
  const filtered = candidates.filter(l => !excluded.includes(l.id));
  if (filtered.length) candidates = filtered;

  return candidates[Math.floor(Math.random() * candidates.length)]?.id || "FullBleed";
}

/* ─────────────────────────────────────────────────────────────
   BUILD ZONES
   Fills zone content slots from beat script data.
   Text zones filled by order, asset zones filled by order.
───────────────────────────────────────────────────────────── */
function buildZones({ layoutId, energy, lastMotion, beatIndex }) {
  const def = getLayoutDef(layoutId);
  if (!def) return {};

  const stylePreset = pickStylePreset(energy);
  const zones = {};

  // Sort zones by type + order for fill priority
  const textZones  = def.zones.filter(z => z.type === "text").sort((a, b) => a.order - b.order);
  const assetZones = def.zones.filter(z => z.type === "asset").sort((a, b) => a.order - b.order);

  def.zones.forEach((zone, i) => {
    if (zone.type === "asset") {
      const motion = pickMotion(energy, beatIndex + i, lastMotion);
      zones[zone.id] = {
        content: {
          kind: "asset",
          asset: {
            src: null,
            type: "image",
            objectFit: zone.style?.objectFit || "cover",
            motion,
            enterTransition: "none", // LayoutRenderer handles timing
            exitTransition: "none",
          },
        },
        style: {
          scale:        stylePreset.scale,
          borderRadius: zone.style?.borderRadius ?? stylePreset.borderRadius,
          shadowBlur:   stylePreset.shadowBlur,
        },
      };
    }

    if (zone.type === "text") {
      zones[zone.id] = {
        content: {
          kind: "text",
          text: "", // AI fills this via script
        },
        style: { ...zone.style },
      };
    }
  });

  return zones;
}

/* ─────────────────────────────────────────────────────────────
   LAYOUT BACKGROUND
───────────────────────────────────────────────────────────── */
function buildLayoutBackground(intent, energy) {
  const bg = getBackgroundForIntent(intent, "dark");
  return {
    type:  "color",
    value: bg.style.background,
  };
}

/* ─────────────────────────────────────────────────────────────
   CHOREOGRAPHY — kept for legacy compat, simplified
───────────────────────────────────────────────────────────── */
function buildChoreography(energy) {
  return {
    mode:        "simultaneous",
    stagger_ms:  0,
    anchor_zone: "z1",
  };
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */
export function planBeatVisual({
  mode                   = "faceless",
  intent                 = "explanation",
  energy                 = 0.5,
  orientation            = "9:16",
  previousLayout         = null,
  previousPreviousLayout = null,
  lastMotion             = null,
  brandColor             = null,
  beatIndex              = 0,
}) {
  const layout = pickLayout({
    intent,
    energy,
    orientation,
    previousLayout,
    previousPreviousLayout,
  });

  const zones = buildZones({
    layoutId: layout,
    energy,
    lastMotion,
    beatIndex,
  });

  return {
    layout,
    layoutPadding:    0,
    layoutBackground: buildLayoutBackground(intent, energy),
    choreography:     buildChoreography(energy),
    zones,
    blocks:    [],
    blockType: null,
    blockZone: null,
  };
}