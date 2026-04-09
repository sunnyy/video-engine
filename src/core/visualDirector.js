/**
 * visualDirector.js
 * src/core/visualDirector.js
 */

import { findLayouts, getLayoutDef } from "./layoutRegistry.js";

function energyLevel(energy) {
  if (energy >= 0.72) return "high";
  if (energy >= 0.4)  return "medium";
  return "low";
}

const INTENT_ENERGY_FALLBACK = {
  shock: 0.9, curiosity: 0.6, proof: 0.55, reveal: 0.75,
  urgency: 0.85, empathy: 0.35, explanation: 0.45, contrast: 0.6,
  punchline: 0.7, irony: 0.6, hook: 0.85, stat: 0.55,
  quote: 0.3, list: 0.5, question: 0.6, comparison: 0.6,
};

const MOTION_BY_ENERGY = {
  high:   ["cinematicPush", "pushSlow", "zoomIn"],
  medium: ["slowZoom",      "pushSlow", "microZoom"],
  low:    ["slowZoom",      "pullSlow", "microZoom"],
};

function resolveLayout({ intent, energy, orientation, lastLayout, previousLayout }) {
  const level = energyLevel(energy);

  let candidates = findLayouts({ intent, energy: level, orientation });
  if (!candidates.length) candidates = findLayouts({ intent, orientation });
  if (!candidates.length) candidates = findLayouts({ orientation });
  if (!candidates.length) candidates = findLayouts({});

  const excluded = [lastLayout, previousLayout].filter(Boolean);
  const filtered = candidates.filter(l => !excluded.includes(l.id));
  const pool = filtered.length ? filtered : candidates;

  return pool[Math.floor(Math.random() * pool.length)]?.id || "FullBleed";
}

export function applyVisualDirection(beats = [], options = {}) {
  const orientation = options.orientation || "9:16";

  let lastLayout     = null;
  let previousLayout = null;

  return beats.map((beat, index) => {
    const energy = typeof beat.energy === "number"
      ? beat.energy
      : (INTENT_ENERGY_FALLBACK[beat.intent] || 0.5);

    const level      = energyLevel(energy);
    const motionPool = MOTION_BY_ENERGY[level];

    // Validate layout exists in new registry — replace if not
    let layout = beat.layout;
    if (!getLayoutDef(layout)) {
      layout = resolveLayout({ intent: beat.intent, energy, orientation, lastLayout, previousLayout });
    } else if (layout === lastLayout) {
      layout = resolveLayout({ intent: beat.intent, energy, orientation, lastLayout, previousLayout });
    }

    previousLayout = lastLayout;
    lastLayout     = layout;

    const zones = { ...(beat.zones || {}) };
    Object.keys(zones).forEach((z, zi) => {
      const zone = zones[z];
      if (!zone.content?.asset) return;
      zones[z] = {
        ...zone,
        content: {
          ...zone.content,
          asset: { ...zone.content.asset, motion: motionPool[(index + zi) % motionPool.length] },
        },
      };
    });

    let transition = beat.transition;
    if (index === 0) transition = { type: "cut", duration: 0.25 };
    const isLast = index === beats.length - 1;
    if (isLast && beat.intent !== "urgency") transition = { type: "blurFade", duration: 0.4 };

    return { ...beat, layout, zones, energy, transition };
  });
}