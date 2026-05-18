/**
 * visualVocabulary.js
 * src/core/registries/visualVocabulary.js
 *
 * AI-facing schema that aggregates all visual primitives.
 * Used to inject context into AI prompts so the director can reference
 * every available shape, icon, motion, transition, music track, and SFX by ID.
 */

import { shapeRegistry } from "./shapeRegistry.js";
import { decorativeRegistry } from "./decorativeRegistry.js";
import cinematicRegistry from "./cinematicRegistry.js";
import iconRegistry from "./iconRegistry.js";
import { motionsRegistry } from "./motionsRegistry.js";
import { transitionsRegistry } from "./transitionsRegistry.js";
import { MUSIC_LIBRARY } from "./musicRegistry.js";
import { SFX_LIBRARY } from "./sfxRegistry.js";
import { textStylePresets } from "./textStylePresets.js";

const shapes = Object.entries(shapeRegistry).map(([id, s]) => ({
  id,
  intent: s.intent,
  niche_tags: s.niche_tags,
  energy_range: s.energy_range,
}));

const decoratives = decorativeRegistry.map((d) => ({
  id: d.id,
  category: d.category,
  subtype: d.subtype,
}));

const cinematicElements = cinematicRegistry.map((e) => ({
  id: e.id,
  label: e.label,
  category: e.category,
  subtype: e.subtype,
  colorMode: e.colorMode,
  positions: e.positions,
  style_tags: e.style_tags,
  niche_tags: e.niche_tags,
  energy_range: e.energy_range,
}));

const icons = Object.entries(iconRegistry).map(([id, ic]) => ({
  id,
  label: ic.label,
  intent: ic.intent,
  niche: ic.niche,
  energy: ic.energy,
}));

const motions = Object.keys(motionsRegistry).map((id) => ({ id }));

const transitions = {
  enter: Object.keys(transitionsRegistry.enter ?? {}),
  exit: Object.keys(transitionsRegistry.exit ?? {}),
};

const music = Object.entries(MUSIC_LIBRARY).map(([id, t]) => ({
  id,
  mood: t.mood,
  energy: t.energy,
  bpm: t.bpm,
  niche: t.niche,
}));

const sfx = Object.entries(SFX_LIBRARY).map(([id, s]) => ({
  id,
  label: s.label,
  intent: s.intent,
  energy: s.energy,
  duration: s.duration,
}));

const textStyles = textStylePresets.map((p) => ({
  id: p.id,
  label: p.label,
  roles: p.roles,
  niche: Array.isArray(p.niche) ? p.niche : [],
  intent: Array.isArray(p.intent) ? p.intent : [p.intent].filter(Boolean),
  energy: Array.isArray(p.energy) ? p.energy : [p.energy].filter(Boolean),
}));

export const visualVocabulary = {
  shapes,
  decoratives,
  cinematicElements,
  icons,
  motions,
  transitions,
  music,
  sfx,
  textStyles,
};

export function getVocabularyForPrompt() {
  return JSON.stringify(visualVocabulary, null, 0);
}

export default visualVocabulary;
