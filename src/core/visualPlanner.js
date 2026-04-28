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
   ROLE → PREFERRED LAYOUTS
   Soft bias — only applied when ≥2 preferred candidates exist.
───────────────────────────────────────────────────────────── */
const ROLE_PREFERRED = {
  proof:    ["AssetWithList","SideBySide","FourCollage","DataRowsProof"],
  escalate: ["BuildingList","TitleThenAsset"],
  reveal:   ["ProductReveal"],
};

/* ─────────────────────────────────────────────────────────────
   AI INTENT → LAYOUT INTENT MAPPING
   AI uses emotional intents; layout defs use structural/content intents.
   Map so findLayouts() actually returns relevant candidates.
───────────────────────────────────────────────────────────── */
const AI_TO_LAYOUT_INTENT = {
  shock:       "hook",        // shock = high-energy hook, not CTA
  curiosity:   "hook",
  proof:       "proof",
  irony:       "contrast",
  reveal:      "reveal",
  empathy:     "testimonial", // empathy → testimonial pool
  urgency:     "escalate",   // urgency → escalate pool
  explanation: "explanation",
  contrast:    "contrast",
  punchline:   "cta",
  stat:        "stat",
  hook:        "hook",
  cta:         "cta",
  list:        "explanation", // list → explanation pool (has list layouts)
  visual_rest: "visual_rest",
};

/* ─────────────────────────────────────────────────────────────
   LAYOUT PICKER
   Matches by intent + energy + orientation.
   Excludes previously used layouts for variety.
───────────────────────────────────────────────────────────── */
function pickLayout({
  intent,
  energy,
  orientation,
  usedLayoutIds    = [],   // all layouts used so far in this video
  hasImageHint     = false,
  requireAssetZone = false, // hard requirement — talking head avatar must have an asset zone
  role             = null,
  niche            = null,
  spokenWordCount  = 0,    // word count of the beat's spoken text
  imageCountNeeded = null, // 0 = text-only beat, 1 = one image, 2 = two images
  textDensity      = null, // "simple" | "medium" | "rich"
  visualHint       = null, // "text_only" | "stat" | "comparison" | "list" | "faces" | "scene" | "product"
  beatType         = null, // hook|item|fact|stat|reveal|explanation|cta|contrast|tension
  lastBeatType     = null, // beatType of the immediately preceding beat
}) {
  console.log("[pickLayout] called with beatType:", beatType, "intent:", intent, "orientation:", orientation);

  const level = energyLevel(energy);
  let resolvedBeatType = beatType;

  // No two CTA layouts back-to-back — if the previous beat was also CTA,
  // downgrade this beat to an explanation/visual_rest layout pick.
  if (resolvedBeatType === "cta" && lastBeatType === "cta") {
    console.log("[pickLayout] double-CTA guard: downgrading beatType to explanation");
    resolvedBeatType = "explanation";
  }

  const layoutIntent = AI_TO_LAYOUT_INTENT[resolvedBeatType || intent] || (AI_TO_LAYOUT_INTENT[intent] || intent);

  // PRIMARY: beatType filter on structural 'layout' type rows
  // When structural layouts exist in DB, this gives the most accurate zone-structure match.
  // Falls back to intent-based matching when no structural layouts exist yet.
  let candidates = resolvedBeatType
    ? findLayouts({ beatType: resolvedBeatType, type: "layout", orientation })
    : [];

  console.log("[pickLayout] step1 structural candidates:", candidates.length, candidates.slice(0,3).map(l => l.id + '/' + (l.name || l.id)));
  console.log("[pickLayout] beat:", intent, "beatType:", beatType, "→ step1 (beatType+layout):", candidates.length, "ids:", candidates.slice(0,3).map(l=>l.id+'/'+l.name));

  // beatType + orientation yielded nothing — try type='layout' with intent
  if (!candidates.length) {
    candidates = findLayouts({ intent: layoutIntent, energy: level, orientation, type: "layout" });
    if (candidates.length) console.log("[pickLayout] falling back to step2a (intent+energy+layout type):", candidates.length);
  }
  if (!candidates.length) {
    candidates = findLayouts({ intent: layoutIntent, orientation, type: "layout" });
    if (candidates.length) console.log("[pickLayout] falling back to step2b (intent+layout type):", candidates.length);
  }
  if (!candidates.length) {
    candidates = findLayouts({ orientation, type: "layout" });
    if (candidates.length) console.log("[pickLayout] falling back to step2c (orientation+layout type):", candidates.length);
  }

  // No structural layouts in DB yet — fall back to all layouts (templates) by intent
  if (!candidates.length) {
    candidates = findLayouts({ intent: layoutIntent, energy: level, orientation, niche });
    if (candidates.length) console.log("[pickLayout] falling back to step3a (intent+energy+niche):", candidates.length);
  }
  if (!candidates.length) {
    candidates = findLayouts({ intent: layoutIntent, orientation, niche });
    if (candidates.length) console.log("[pickLayout] falling back to step3b (intent+niche):", candidates.length);
  }
  if (!candidates.length) {
    candidates = findLayouts({ intent: layoutIntent, orientation });
    if (candidates.length) console.log("[pickLayout] falling back to step3c (intent only):", candidates.length);
  }
  if (!candidates.length) {
    candidates = findLayouts({ orientation });
    if (candidates.length) console.log("[pickLayout] falling back to step3d (orientation only):", candidates.length);
  }

  // Last resort — any layout
  if (!candidates.length) {
    candidates = findLayouts({});
    console.log("[pickLayout] falling back to step4 (any):", candidates.length);
  }

  // Talking head mode: HARD filter — only layouts with at least one asset zone (for avatar).
  // Unlike hasImageHint this is never relaxed — a text-only layout can't show the avatar.
  if (requireAssetZone) {
    const withAsset = candidates.filter(l => (l.def?.assetCount ?? 0) >= 1);
    if (withAsset.length) candidates = withAsset;
    // If no intent-matched layout has an asset zone, fall back to all asset-zone layouts
    else {
      const allAsset = findLayouts({}).filter(l => (l.def?.assetCount ?? 0) >= 1);
      if (allAsset.length) candidates = allAsset;
    }
  }

  // If beat has an image hint, prefer layouts that have at least one asset zone (soft)
  if (hasImageHint && !requireAssetZone) {
    const withAsset = candidates.filter(l => (l.def?.assetCount ?? 0) >= 1);
    if (withAsset.length) candidates = withAsset;
  }

  // Role bias — soft preference, only applied when ≥2 preferred candidates survive
  if (role && ROLE_PREFERRED[role]) {
    const preferred = candidates.filter(l => ROLE_PREFERRED[role].includes(l.id));
    if (preferred.length >= 2) candidates = preferred;
  }

  // Word count guard: short spoken text cannot meaningfully fill many text zones.
  // Hard filter — if the beat has fewer than 10 words, remove layouts with >2 text zones.
  // This prevents 5-zone layouts being assigned to single-line beats.
  if (spokenWordCount > 0 && spokenWordCount < 10) {
    const simple = candidates.filter(l => l.textCount <= 2);
    if (simple.length >= 1) candidates = simple;
  }

  // Signal-driven filters — applied after intent/energy matching, before dedup

  // imageCountNeeded: 0 = pure text beat (no asset zone), 2 = needs two asset zones
  if (imageCountNeeded === 0) {
    const textOnly = candidates.filter(l => (l.def?.assetCount ?? 0) === 0);
    if (textOnly.length >= 1) candidates = textOnly;
  } else if (imageCountNeeded === 2) {
    const dualAsset = candidates.filter(l => (l.def?.assetCount ?? 0) >= 2);
    if (dualAsset.length >= 1) candidates = dualAsset;
  }

  // textDensity: "simple" = prefer ≤2 text zones, "rich" = prefer ≥3 text zones
  if (textDensity === "simple") {
    const sparse = candidates.filter(l => (l.def?.textCount ?? l.textCount ?? 0) <= 2);
    if (sparse.length >= 1) candidates = sparse;
  } else if (textDensity === "rich") {
    const dense = candidates.filter(l => (l.def?.textCount ?? l.textCount ?? 0) >= 3);
    if (dense.length >= 1) candidates = dense;
  }

  // visualHint: structural hint from the AI script director
  if (visualHint === "text_only") {
    const noAsset = candidates.filter(l => (l.def?.assetCount ?? 0) === 0);
    if (noAsset.length >= 1) candidates = noAsset;
  } else if (visualHint === "comparison") {
    const sideBySide = candidates.filter(l => l.id === "SideBySide" || (l.def?.assetCount ?? 0) >= 2);
    if (sideBySide.length >= 1) candidates = sideBySide;
  } else if (visualHint === "list") {
    const listLayouts = candidates.filter(l => /list|row|stack/i.test(l.id));
    if (listLayouts.length >= 1) candidates = listLayouts;
  } else if (visualHint === "stat") {
    const statLayouts = candidates.filter(l => /stat|data|proof|number/i.test(l.id));
    if (statLayouts.length >= 1) candidates = statLayouts;
  }

  // Exclude ALL layouts already used in this video for maximum variety
  // Relax progressively: first exclude all used, then just recent, then nothing
  const usedSet = new Set(usedLayoutIds);
  const unusedCandidates = candidates.filter(l => !usedSet.has(l.id));
  if (unusedCandidates.length >= 1) {
    candidates = unusedCandidates;
  } else {
    // All intent-matched candidates used — only exclude the last 2
    const recentTwo = new Set(usedLayoutIds.slice(-2));
    const recentFiltered = candidates.filter(l => !recentTwo.has(l.id));
    if (recentFiltered.length) candidates = recentFiltered;
  }

  // Hard guard: never use the same layout as the immediately preceding beat.
  // Applied last — after all other filters — so it overrides every relaxation path.
  // If the matched pool has only one option (same as last), widen to ALL orientation
  // layouts before giving up, so we never silently repeat.
  const lastLayoutId = usedLayoutIds.length ? usedLayoutIds[usedLayoutIds.length - 1] : null;
  if (lastLayoutId) {
    const withoutLast = candidates.filter(l => l.id !== lastLayoutId);
    if (withoutLast.length) {
      candidates = withoutLast;
    } else {
      // Pool exhausted — pull from all orientation layouts and exclude only the last one
      const anyExceptLast = findLayouts({ orientation }).filter(l => l.id !== lastLayoutId);
      if (anyExceptLast.length) candidates = anyExceptLast;
      // absolute last resort: keep original candidates (repeat is better than a crash)
    }
  }

  const pickedId = candidates[Math.floor(Math.random() * candidates.length)]?.id || "DuoStackHook";
  console.log("[pickLayout] PICKED:", pickedId, "name:", candidates.find(l=>l.id===pickedId)?.name, "from", candidates.length, "candidates:", candidates.slice(0,5).map(l=>l.id));
  return pickedId;
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
    if (zone.type === "asset") {
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
  hasImageHint             = false,
  requireAssetZone         = false,
  role                     = null,
  colorStory               = null,
  motionStyle              = null,
  niche                    = null,
  spokenWordCount          = 0,
  imageCountNeeded         = null,
  textDensity              = null,
  visualHint               = null,
  beatType                 = null,
  lastBeatType             = null,
}) {
  const layout = pickLayout({
    intent,
    energy,
    orientation,
    usedLayoutIds,
    hasImageHint,
    requireAssetZone,
    role,
    niche,
    spokenWordCount,
    imageCountNeeded,
    textDensity,
    visualHint,
    beatType,
    lastBeatType,
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