/**
 * iconResolver.js
 * src/core/registries/iconResolver.js
 *
 * Resolution logic for icon zones — picks the best icon + color for a beat context,
 * and renders icon SVG output.
 *
 * Separated from iconRegistry.js so the registry stays import-free.
 */

import iconRegistry from "./iconRegistry.js";
import { backgroundPatternRegistry } from "./backgroundPatternRegistry.js";

/**
 * resolveIconForZone
 * Picks the best icon + color for a given beat context.
 *
 * @param {object} beat   — full beat object { intent, energy, layoutBackground, dna }
 * @param {object} dna    — videoDNA { colorStory: { bg, text, primary }, niche }
 * @param {string|null} brandColor — user brand color hex or null
 * @returns {{ iconId: string, color: string, filled: boolean }}
 */
export function resolveIconForZone(beat, dna, brandColor = null) {
  const intent  = beat.intent  ?? "hook";
  const niche   = dna?.niche   ?? "entertainment";
  const energy  = beat.energy >= 0.7 ? "high" : beat.energy >= 0.4 ? "medium" : "low";

  // Step 1 — filter by intent + niche + energy
  let candidates = Object.entries(iconRegistry).filter(([, icon]) => {
    const matchIntent = icon.intent.includes(intent);
    const matchNiche  = icon.niche.includes(niche);
    const matchEnergy = icon.energy.includes(energy);
    return matchIntent && matchNiche && matchEnergy;
  }).map(([id]) => id);

  // Step 2 — relax to intent + niche if pool too small
  if (candidates.length < 2) {
    candidates = Object.entries(iconRegistry).filter(([, icon]) =>
      icon.intent.includes(intent) && icon.niche.includes(niche)
    ).map(([id]) => id);
  }

  // Step 3 — relax to intent only
  if (candidates.length < 2) {
    candidates = Object.entries(iconRegistry).filter(([, icon]) =>
      icon.intent.includes(intent)
    ).map(([id]) => id);
  }

  // Step 4 — fallback to full pool
  if (!candidates.length) {
    candidates = Object.keys(iconRegistry);
  }

  const iconId = candidates[Math.floor(Math.random() * candidates.length)];
  const entry  = iconRegistry[iconId];

  // Resolve color from background brightness
  const bgKey        = beat.layoutBackground?.value;
  const bgEntry      = bgKey ? backgroundPatternRegistry[bgKey] : null;
  const bgBrightness = bgEntry?.brightness ?? "dark";

  let color;

  if (brandColor) {
    color = brandColor;
  } else if (entry.defaults.color !== "#ffffff" && entry.defaults.color !== "#000000") {
    color = entry.defaults.color;
  } else if (bgBrightness === "light") {
    color = dna?.colorStory?.primary ?? "#111111";
  } else {
    color = dna?.colorStory?.primary ?? "#ffffff";
  }

  return {
    iconId,
    color,
    filled: entry.defaultFilled,
  };
}

/**
 * renderIconSVG
 * @param {string} iconId
 * @param {object} style - { color, strokeWidth, filled, opacity }
 * @returns {{ viewBox: string, content: string } | null}
 */
export function renderIconSVG(iconId, style = {}) {
  const entry = iconRegistry[iconId];
  if (!entry) return null;

  const color  = style.color       ?? entry.defaults.color  ?? "#ffffff";
  const filled = style.filled      ?? entry.defaultFilled   ?? false;
  const sw     = style.strokeWidth ?? (filled ? 0 : 5);
  const fill   = filled ? color : "none";
  const stroke = filled ? "none" : color;

  const content = `<path d="${entry.path}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;

  return { viewBox: "0 0 100 100", content };
}
