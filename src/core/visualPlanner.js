/**
 * visualPlanner.js
 * src/core/visualPlanner.js
 *
 * Picks layouts by metadata matching (intent, energy, orientation, assetCount, textCount)
 * instead of hardcoded layout name pools.
 * Fills zones by type + order from the layout definition.
 */

import { findLayouts, getLayoutDef } from "./registries/layoutRegistry.js";
import { getBackgroundForIntent } from "./registries/backgroundPatternRegistry.js";
import { resolveColors } from "./colorContrastResolver.js";
import { resolveIconForZone } from "./resolveIconForZone.js";
import { getNicheColorFamily, getNicheAvoid } from "./registries/nichePaletteRegistry.js";
import { LOCAL_TO_PHOSPHOR } from "../services/assets/iconifyService.js";
import { resolvePresetColor } from "./resolveColor.js";

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
  high:   ["cinematicPush", "droneRise", "microZoom"],
  medium: ["pushSlow", "slowZoom", "microZoom"],
  low:    ["slowZoom", "microZoom", "pushSlow"],
};

// motionStyle (from DNA) overrides energy-based pool
const MOTIONS_BY_STYLE = {
  kinetic: ["droneRise", "cinematicPush", "microZoom"],
  smooth:  ["slowZoom", "microZoom", "pushSlow", "parallax"],
  static:  ["parallax", "microZoom"],
};

export function pickMotion(energy, index = 0, lastMotion = null, motionStyle = null) {
  const pool = motionStyle && MOTIONS_BY_STYLE[motionStyle]
    ? MOTIONS_BY_STYLE[motionStyle].filter(m => m !== lastMotion)
    : MOTIONS_BY_ENERGY[energyLevel(energy)].filter(m => m !== lastMotion);
  return pool[index % pool.length];
}

/* ─────────────────────────────────────────────────────────────
   STYLE PRESETS — asset zone visual variety
───────────────────────────────────────────────────────────── */
// Scale is intentionally always 1.0 — inset spacing is expressed via zone size/position
// or user-controlled padding, not by shrinking the image inside the zone.
const STYLE_PRESETS = [
  { scale: 1.0, borderRadius: 0,  shadowBlur: 0  },
  { scale: 1.0, borderRadius: 0,  shadowBlur: 0  },
  { scale: 1.0, borderRadius: 8,  shadowBlur: 0  },
  { scale: 1.0, borderRadius: 12, shadowBlur: 18 },
  { scale: 1.0, borderRadius: 16, shadowBlur: 24 },
  { scale: 1.0, borderRadius: 20, shadowBlur: 28 },
];

function pickStylePreset(energy) {
  // High energy → sharp full-bleed
  if (energy >= 0.8) return STYLE_PRESETS[Math.floor(Math.random() * 3)];
  // Low energy → rounded card with shadow
  if (energy <= 0.3) return STYLE_PRESETS[3 + Math.floor(Math.random() * 3)];
  // Mid → light variety
  return STYLE_PRESETS[Math.floor(Math.random() * 4)];
}

/* ─────────────────────────────────────────────────────────────
   LAYOUT PICKER
   Matches by beatType → intent → orientation.
   Excludes previously used layouts for variety.
───────────────────────────────────────────────────────────── */
function pickLayout({
  beatType         = null,
  intent           = "explanation",
  orientation      = "9:16",
  usedLayoutIds    = [],
  requireAssetZone = false,
  talkingHead      = undefined,
}) {
  // Primary: beatType + orientation
  let candidates = beatType
    ? findLayouts({ beatType, orientation, talkingHead })
    : [];

  // Fallback: intent + orientation
  if (!candidates.length) {
    candidates = findLayouts({ intent, orientation, talkingHead });
  }

  // Last resort: orientation only
  if (!candidates.length) {
    candidates = findLayouts({ orientation, talkingHead });
  }

  // Talking head: hard filter — only layouts with at least one asset zone (for avatar)
  if (requireAssetZone) {
    const withAsset = candidates.filter(l => (l.def?.assetCount ?? 0) >= 1);
    if (withAsset.length) candidates = withAsset;
    else {
      const allAsset = findLayouts({ talkingHead }).filter(l => (l.def?.assetCount ?? 0) >= 1);
      if (allAsset.length) candidates = allAsset;
    }
  }

  // Dedup: exclude all used; relax to last 2 if needed
  const usedSet = new Set(usedLayoutIds);
  const unused = candidates.filter(l => !usedSet.has(l.id));
  if (unused.length >= 1) {
    candidates = unused;
  } else {
    const recentTwo = new Set(usedLayoutIds.slice(-2));
    const recentFiltered = candidates.filter(l => !recentTwo.has(l.id));
    if (recentFiltered.length) candidates = recentFiltered;
  }

  // Never repeat the immediately preceding layout
  const lastLayoutId = usedLayoutIds.length ? usedLayoutIds[usedLayoutIds.length - 1] : null;
  if (lastLayoutId) {
    const withoutLast = candidates.filter(l => l.id !== lastLayoutId);
    if (withoutLast.length) {
      candidates = withoutLast;
    } else {
      const anyExceptLast = findLayouts({ orientation }).filter(l => l.id !== lastLayoutId);
      if (anyExceptLast.length) candidates = anyExceptLast;
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)]?.id || "DuoStackHook";
}

/* ─────────────────────────────────────────────────────────────
   BUILD ZONES
   Fills zone content slots from beat script data.
   Text zones filled by order, asset zones filled by order.
───────────────────────────────────────────────────────────── */
function buildZones({ layoutId, energy, lastMotion, beatIndex, motionStyle, intent, niche, brandColor, colorStory }) {
  const def = getLayoutDef(layoutId);
  if (!def) return {};

  const stylePreset = pickStylePreset(energy);
  const zones = {};


  def.zones.forEach((zone, i) => {
    if (zone.type === "asset" || zone.type === "avatar") {
      const motion = pickMotion(energy, beatIndex + i, lastMotion, motionStyle);
      zones[zone.id] = {
        content: {
          kind: "asset",
          asset: {
            src: null,
            type: "image",
            objectFit: zone.style?.objectFit || "cover",
            motion,
            enterTransition: "none",
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
      const dnaContext = { dna: colorStory ? { colorStory, niche } : null, brand: brandColor ? { color: brandColor } : null };
      const resolvedColor = resolvePresetColor(zone, dnaContext);
      zones[zone.id] = {
        content: { kind: "text", text: "" }, // AI fills this via generateZoneContent
        style: { ...zone.style, ...(resolvedColor ? { color: resolvedColor } : {}) },
      };
    }

    if (zone.type === "decorative") {
      // Decorative zones are skipped during auto-assignment — not rendered by the pipeline.
      // Layouts that define decorative zones (gradient overlays, dividers, etc.) render
      // them directly from the layout def style in LayoutRenderer without needing zone data.
    }

    if (zone.type === "icon") {
      // Phosphor icons set in the Layout Editor are stored at zone.content.iconify.
      // Legacy layouts may store them directly at zone.iconify. Check both.
      const bakedIconify = zone.iconify ?? zone.content?.iconify;

      if (bakedIconify?.set && bakedIconify?.icon) {
        // Honour the baked-in icon — apply DNA color override so it matches the video feel
        const fakeBeat = { intent, energy, layoutBackground: null };
        const dna = colorStory ? { colorStory, niche } : null;
        const { color } = resolveIconForZone(fakeBeat, zone, dna, brandColor);
        zones[zone.id] = {
          content: { ...zone.content, iconify: bakedIconify },
          style: { ...zone.style, ...(color ? { color } : {}), filled: true },
        };
      } else {
        const fakeBeat = { intent, energy, layoutBackground: null };
        const dna = colorStory ? { colorStory, niche } : null;
        const { iconId, color } = resolveIconForZone(fakeBeat, zone, dna, brandColor);
        // Map local icon to Phosphor equivalent if one exists
        const phosphorIcon = LOCAL_TO_PHOSPHOR[iconId];
        const content = phosphorIcon
          ? { iconify: { set: "ph", icon: phosphorIcon }, iconId }
          : { iconId };
        zones[zone.id] = {
          content,
          style: { ...zone.style, color, filled: true },
        };
      }
    }
  });

  return zones;
}

/* ─────────────────────────────────────────────────────────────
   COLOR FAMILY — maps DNA primary hex to a background family
───────────────────────────────────────────────────────────── */
function hexToHue(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0,2),16) / 255;
  const g = parseInt(h.slice(2,4),16) / 255;
  const b = parseInt(h.slice(4,6),16) / 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  if (d < 0.08) return null; // near-grey → no family
  let hue = 0;
  if (max === r) hue = ((g-b)/d % 6) * 60;
  else if (max === g) hue = ((b-r)/d + 2) * 60;
  else hue = ((r-g)/d + 4) * 60;
  if (hue < 0) hue += 360;
  return hue;
}

function getDNAColorFamily(primary) {
  const hue = primary ? hexToHue(primary) : null;
  if (hue === null) return null;
  if (hue >= 330 || hue < 40)  return "warm";     // red, orange, yellow-orange
  if (hue < 75)                return "neutral";   // yellow
  if (hue < 165)               return "cool";      // green, teal
  if (hue < 270)               return "cool";      // cyan, blue
  return "electric";                                // purple, magenta, pink
}

/* ─────────────────────────────────────────────────────────────
   LAYOUT BACKGROUND
   Uses backgroundPatternRegistry for per-beat visual variety.
   Text-only layouts get a rich DNA gradient.
   Asset layouts get an intent + energy matched pattern/color
   biased toward the video's DNA color family for coherence.
───────────────────────────────────────────────────────────── */

// Map AI intents to backgroundPatternRegistry intent tags
const INTENT_TO_BG_INTENT = {
  hook:        "shock",
  shock:       "shock",
  curiosity:   "curiosity",
  proof:       "proof",
  stat:        "proof",
  reveal:      "reveal",
  punchline:   "punchline",
  empathy:     "empathy",
  explanation: "explanation",
  contrast:    "contrast",
  urgency:     "urgency",
  irony:       "irony",
  cta:         "urgency",
  list:        "list",
  visual_rest: "empathy",
};

function buildLayoutBackground(intent, energy, colorStory = null, layoutId = null, niche = null) {
  const def = layoutId ? getLayoutDef(layoutId) : null;
  const hasAssetZone = def ? def.zones.some(z => z.type === "asset") : true;

  // Use niche color family from registry — much more accurate than deriving from primary hex
  const colorFamily = niche ? getNicheColorFamily(niche) : getDNAColorFamily(colorStory?.primary || null);
  const nicheAvoid  = niche ? getNicheAvoid(niche) : [];

  // When DNA bg is dark, never pick light-brightness backgrounds
  const colors   = colorStory ? resolveColors({ colorStory, energy }) : null;
  const bgIsDark = colors ? colors.bgIsDark : true;

  const bgIntent = INTENT_TO_BG_INTENT[intent] || "curiosity";

  // Text-only layouts: always dark so text stays readable; prefer neon/mesh/dark gradients
  // Asset layouts: high energy allows any brightness, low energy prefers dark
  const brightness = (!hasAssetZone || energy < 0.65) ? "dark" : null;

  const bg = getBackgroundForIntent(bgIntent, brightness, colorFamily, bgIsDark, niche, nicheAvoid);

  // Always return a registry key — LayoutBackgroundRenderer resolves the style,
  // and LayoutSelector can display/replace it from the Colors picker.
  return { type: "pattern", value: bg.key };
}

/* ─────────────────────────────────────────────────────────────
   CHOREOGRAPHY — kept for legacy compat, simplified
───────────────────────────────────────────────────────────── */
function buildChoreography(_energy) {
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
  mode:        _mode        = "faceless",
  intent                   = "explanation",
  energy                   = 0.5,
  orientation              = "9:16",
  usedLayoutIds            = [],
  lastMotion               = null,
  brandColor:  _brandColor  = null,
  beatIndex                = 0,
  requireAssetZone         = false,
  colorStory               = null,
  motionStyle              = null,
  niche                    = null,
  beatType                 = null,
}) {
  const talkingHead = _mode === "talking_head" ? true : false;
  const layout = pickLayout({
    beatType,
    intent,
    orientation,
    usedLayoutIds,
    requireAssetZone,
    talkingHead,
  });

  const zones = buildZones({
    layoutId: layout,
    energy,
    lastMotion,
    beatIndex,
    motionStyle,
    intent,
    niche,
    brandColor: _brandColor,
    colorStory,
  });

  return {
    layout,
    layoutPadding:    0,
    layoutBackground: buildLayoutBackground(intent, energy, colorStory, layout, niche),
    choreography:     buildChoreography(energy),
    zones,
    blocks:    [],
    blockType: null,
    blockZone: null,
  };
}