/**
 * layoutResolver.js
 * src/core/layoutResolver.js
 *
 * Resolves a layout for a beat using metadata matching.
 * Uses findLayouts() from layoutRegistry instead of hardcoded name pools.
 */

import { findLayouts } from "./layoutRegistry.js";

function randomPick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function energyLevel(energy) {
  if (energy >= 0.72) return "high";
  if (energy >= 0.4)  return "medium";
  return "low";
}

export function resolveLayout({
  intent         = null,
  energy         = 0.5,
  orientation    = "9:16",
  previousLayout = null,
  project        = null,
} = {}) {
  const level = energyLevel(energy);

  // Try exact match: intent + energy + orientation
  let candidates = findLayouts({ intent, energy: level, orientation });

  // Relax energy
  if (!candidates.length) {
    candidates = findLayouts({ intent, orientation });
  }

  // Relax intent
  if (!candidates.length) {
    candidates = findLayouts({ orientation });
  }

  // Any layout
  if (!candidates.length) {
    candidates = findLayouts({});
  }

  // Exclude previous for variety
  const ids = candidates.map(l => l.id);
  const filtered = ids.filter(id => id !== previousLayout);

  return randomPick(filtered.length ? filtered : ids) || "FullBleed";
}