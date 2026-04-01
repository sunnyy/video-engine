/**
 * visualPlanner.js
 * src/core/visualPlanner.js
 *
 * The visual director for each beat.
 * Uses all registry intelligence to make intentional creative decisions.
 */

import { layoutRegistry }          from "./layoutRegistry";
import { pickZoneBackground }       from "./zoneContrastEngine";
import { getBackgroundForIntent }   from "./backgroundPatternRegistry";
import blockRegistry                from "./blockRegistry";

/* ─────────────────────────────────────────────────────────────
   LAYOUT POOLS
───────────────────────────────────────────────────────────── */
const FACELESS_LAYOUTS = {
  faces:      ["SplitZone","SmallTopBigBottom","BigTopSmallBottom","ThreeZone","TwoTopOneBottom","FullZone"],
  text_only:  ["FullZone","ThreeZone","SplitZone"],
  stat:       ["SplitZone","ThreeZone","FullZone","SmallTopBigBottom"],
  comparison: ["SplitZone","LeftHeavy","RightHeavy","TwoTopOneBottom","FullZone"],
  list:       ["TwoTopOneBottom","OneTopTwoBottom","ThreeZone","SplitZone","FullZone"],
  scene:      ["FullZone","BigTopSmallBottom","ThreeZone","SplitZone"],
  product:    ["SplitZone","SmallTopBigBottom","LeftHeavy","FullZone"],
  none:       ["FullZone","SplitZone","ThreeZone","BigTopSmallBottom","SmallTopBigBottom","SplitZone"],
};

const TALKING_HEAD_LAYOUTS = {
  faces:      ["SideAvatar","PictureInPicture","FloatingAvatar","CenterAvatar"],
  text_only:  ["SideAvatar","CenterAvatar"],
  stat:       ["SideAvatar","PictureInPicture"],
  comparison: ["SideAvatar","PictureInPicture"],
  list:       ["SideAvatar","FloatingAvatar"],
  scene:      ["CenterAvatar","SideAvatar"],
  product:    ["SideAvatar","PictureInPicture"],
  none:       ["SideAvatar","FloatingAvatar","CenterAvatar"],
};

/* ─────────────────────────────────────────────────────────────
   BLOCK → VISUAL HINT MAP
   When these hints appear, inject this block type.
───────────────────────────────────────────────────────────── */
const HINT_TO_BLOCK = {
  stat:       "StatExplosion",
  list:       "ListCountdown",
  comparison: "BeforeAfter",
  text_only:  null,  // use caption, not a block
};

/* ─────────────────────────────────────────────────────────────
   ZONE ASSET STYLING
   Randomized per zone for visual variety.
───────────────────────────────────────────────────────────── */
const STYLE_PRESETS = [
  { scale: 1.0,  borderRadius: 0,  shadowBlur: 0  },  // full bleed
  { scale: 1.0,  borderRadius: 0,  shadowBlur: 0  },  // full bleed (weighted)
  { scale: 0.92, borderRadius: 12, shadowBlur: 20 },  // slightly inset
  { scale: 0.88, borderRadius: 16, shadowBlur: 24 },  // floated
  { scale: 0.82, borderRadius: 20, shadowBlur: 28 },  // well-floated
  { scale: 0.78, borderRadius: 24, shadowBlur: 30 },  // gallery style
];

function pickStylePreset(energy) {
  // High energy = more likely to be full bleed (raw, fast)
  // Low energy = more likely to be floated (considered, editorial)
  if (energy >= 0.8) return STYLE_PRESETS[Math.floor(Math.random() * 2)];
  if (energy <= 0.3) return STYLE_PRESETS[3 + Math.floor(Math.random() * 3)];
  return STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)];
}

/* ─────────────────────────────────────────────────────────────
   MOTION POOL
───────────────────────────────────────────────────────────── */
const MOTIONS_BY_ENERGY = {
  high:   ["kenburns", "cinematicPush", "droneRise", "microZoom"],
  medium: ["kenburns", "pushSlow", "slowZoom", "parallax"],
  low:    ["slowZoom", "microZoom", "pushSlow", "parallax"],
};

const ENTER_BY_ENERGY = {
  high:   ["slideLeftIn", "slideRightIn", "slideUpIn", "scaleIn"],
  medium: ["slideLeftIn", "slideRightIn", "fadeIn", "slideUpIn"],
  low:    ["fadeIn", "slideDownIn", "slideUpIn"],
};

function pickMotion(energy, lastMotion = null) {
  const level = energy >= 0.75 ? "high" : energy >= 0.4 ? "medium" : "low";
  const pool  = MOTIONS_BY_ENERGY[level].filter(m => m !== lastMotion);
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickEnter(energy, zoneIndex) {
  const level = energy >= 0.75 ? "high" : energy >= 0.4 ? "medium" : "low";
  const pool  = ENTER_BY_ENERGY[level];
  return pool[(zoneIndex) % pool.length];
}

/* ─────────────────────────────────────────────────────────────
   LAYOUT PICKER — no repeat of previous layout
───────────────────────────────────────────────────────────── */
function pickLayout({ visual_hint, energy, mode, previousLayout, previousPreviousLayout }) {
  const pool     = mode === "talking_head" ? TALKING_HEAD_LAYOUTS : FACELESS_LAYOUTS;
  const fallback = mode === "talking_head"
    ? ["SideAvatar", "FloatingAvatar", "CenterAvatar"]
    : ["FullZone", "SplitZone", "ThreeZone"];

  const avatarLayouts = ["SideAvatar","CenterAvatar","FloatingAvatar","PictureInPicture"];
  let candidates = (pool[visual_hint] || pool.none || fallback)
    .filter(l => Boolean(layoutRegistry[l]))
    .filter(l => mode === "talking_head" ? true : !avatarLayouts.includes(l));

  if (!candidates.length) candidates = fallback.filter(l => Boolean(layoutRegistry[l]));

  // Exclude previous two layouts for variety
  const excluded = [previousLayout, previousPreviousLayout].filter(Boolean);
  const filtered = candidates.filter(l => !excluded.includes(l));
  if (filtered.length) candidates = filtered;

  // Energy-based filtering
  if (energy >= 0.8) {
    const nonFull = candidates.filter(l => l !== "FullZone");
    if (nonFull.length) candidates = nonFull;
  }
  if (energy <= 0.3) {
    const simple = candidates.filter(l =>
      ["FullZone","SplitZone","SideAvatar","CenterAvatar"].includes(l)
    );
    if (simple.length) candidates = simple;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ─────────────────────────────────────────────────────────────
   BLOCK ZONE PICKER
───────────────────────────────────────────────────────────── */
function chooseBlockZone(layout) {
  const map = {
    SplitZone:        "z2",
    SmallTopBigBottom:"z3",
    BigTopSmallBottom:"z1",
    ThreeZone:        "z2",
    TwoTopOneBottom:  "z3",
    OneTopTwoBottom:  "z1",
    LeftHeavy:        "z2",
    RightHeavy:       "z1",
    PictureInPicture: "z2",
    SideAvatar:       "z2",
    FullZone:         "z1",
  };
  return map[layout] || "z1";
}

/* ─────────────────────────────────────────────────────────────
   BUILD ZONES — with contrast-aware backgrounds + asset styling
───────────────────────────────────────────────────────────── */
function buildZones({
  layout, intent, energy, blockType, blockZone,
  brandColor, lastMotion,
}) {
  const def = layoutRegistry[layout];
  if (!def) return {};

  const stylePreset = pickStylePreset(energy);
  const zones = {};

  def.zones.forEach((z, i) => {
    const isBlockZone   = z === blockZone && blockType;
    const contentKind   = isBlockZone ? "block" : "asset";

    // Pick background with contrast awareness
    const bg = pickZoneBackground({
      contentKind,
      blockType:   isBlockZone ? blockType : null,
      intent,
      energy,
    });

    const motion = pickMotion(energy, i === 0 ? lastMotion : null);
    const enter  = pickEnter(energy, i);

    if (isBlockZone) {
      const blockDef = blockRegistry[blockType];
      const variants = blockDef?.variants || ["default"];
      // Pick variant based on energy
      const variantIndex = energy >= 0.7
        ? Math.floor(Math.random() * variants.length)
        : 0;

      zones[z] = {
        role:    "block",
        content: {
          kind: "block",
          block: {
            type:    blockType,
            variant: variants[variantIndex] || "default",
            props:   {},
          },
        },
        background: {
          kind:           "color",
          color:          bg.style.background,
          backgroundSize: bg.style.backgroundSize || "auto",
        },
        style: { padding: {}, borderRadius: 0, shadowBlur: 0, scale: 1 },
      };
    } else {
      zones[z] = {
        role:    "asset",
        content: {
          kind:  "asset",
          asset: {
            src:             null,
            type:            "image",
            objectFit:       "cover",
            motion,
            enterTransition: enter,
            exitTransition:  "none",
          },
        },
        background: {
          kind:           "color",
          color:          bg.style.background,
          backgroundSize: bg.style.backgroundSize || "auto",
        },
        style: {
          padding:      {},
          scale:        stylePreset.scale,
          borderRadius: stylePreset.borderRadius,
          shadowBlur:   stylePreset.shadowBlur,
        },
      };
    }
  });

  return zones;
}

/* ─────────────────────────────────────────────────────────────
   CHOREOGRAPHY
───────────────────────────────────────────────────────────── */
function buildChoreography(layout, energy) {
  const cascade = ["ThreeZone","TwoTopOneBottom","OneTopTwoBottom","FourGrid","SixGrid"];
  const quick   = ["SplitZone","PictureInPicture","SideAvatar","LeftHeavy","RightHeavy"];

  const stagger = energy >= 0.7 ? 80 : 120;

  if (cascade.includes(layout)) return { mode: "cascade", stagger_ms: stagger, anchor_zone: "z1" };
  if (quick.includes(layout))   return { mode: "cascade", stagger_ms: 60,     anchor_zone: "z1" };
  return                               { mode: "simultaneous", stagger_ms: 0, anchor_zone: "z1" };
}

/* ─────────────────────────────────────────────────────────────
   LAYOUT BACKGROUND — dark/dramatic by default
───────────────────────────────────────────────────────────── */
function buildLayoutBackground(intent, energy, brandColor) {
  const bg = getBackgroundForIntent(intent, "dark");
  return {
    type:  "color",
    value: bg.style.background,
  };
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */
export function planBeatVisual({
  mode             = "faceless",
  intent           = "explanation",
  energy           = 0.5,
  visual_hint      = "none",
  previousLayout   = null,
  previousPreviousLayout = null,
  lastMotion       = null,
  brandColor       = null,
  block_candidate  = null,
}) {
  // Decide block injection
  const hintBlock   = HINT_TO_BLOCK[visual_hint] || null;
  const blockType   = block_candidate || hintBlock || null;
  const layout      = pickLayout({ visual_hint, energy, mode, previousLayout, previousPreviousLayout });
  const blockZone   = blockType ? chooseBlockZone(layout) : null;

  const zones = buildZones({ layout, intent, energy, blockType, blockZone, brandColor, lastMotion });
  const blocks = blockType ? [{
    id:      crypto.randomUUID(),
    type:    blockType,
    variant: zones[blockZone]?.content?.block?.variant || "default",
    zone:    blockZone,
    props:   {},
  }] : [];

  // Padding profile — layout-level spacing
  const layoutPadding = energy >= 0.75 ? 0
    : energy >= 0.5 ? [0,0,8,12][Math.floor(Math.random()*4)]
    : [8,12,16][Math.floor(Math.random()*3)];

  return {
    layout,
    layoutPadding,
    layoutBackground: buildLayoutBackground(intent, energy, brandColor),
    choreography:     buildChoreography(layout, energy),
    zones,
    blocks,
    blockType,
    blockZone,
  };
}