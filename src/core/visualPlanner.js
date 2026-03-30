/**
 * visualPlanner.js
 * src/core/visualPlanner.js
 *
 * Decides layout, zones, blocks, padding, background for each beat.
 * Receives `mode` (faceless/talking_head) and `energy` + `visual_hint`
 * from the new rich beat format.
 */

import { layoutRegistry }         from "./layoutRegistry";
import { layoutDefaultsRegistry } from "./layoutDefaultsRegistry";
import { buildVisualIdentity }     from "./visualIdentityEngine";

/* ─────────────────────────────────────────────────────────────
   LAYOUT POOLS
   Separated by mode so avatar layouts only appear in talking_head.
───────────────────────────────────────────────────────────── */
const FACELESS_LAYOUTS = {
  // visual_hint → ordered candidates (first = preferred)
  faces:       ["SplitZone",    "ThreeZone",       "TwoTopOneBottom", "FullZone"],
  text_only:   ["FullZone",     "ThreeZone"],
  stat:        ["ThreeZone",    "SplitZone",       "FullZone"],
  comparison:  ["SplitZone",    "TwoTopOneBottom", "FullZone"],
  list:        ["TwoTopOneBottom","OneTopTwoBottom","ThreeZone",      "FullZone"],
  scene:       ["FullZone",     "ThreeZone",       "SplitZone"],
  product:     ["SplitZone",    "ThreeZone",       "FullZone"],
  none:        ["FullZone",     "SplitZone",       "ThreeZone"],
};

const TALKING_HEAD_LAYOUTS = {
  faces:       ["SideAvatar",   "PictureInPicture","FloatingAvatar",  "CenterAvatar"],
  text_only:   ["SideAvatar",   "CenterAvatar"],
  stat:        ["SideAvatar",   "PictureInPicture"],
  comparison:  ["SideAvatar",   "PictureInPicture"],
  list:        ["SideAvatar",   "FloatingAvatar"],
  scene:       ["CenterAvatar", "SideAvatar"],
  product:     ["SideAvatar",   "PictureInPicture"],
  none:        ["SideAvatar",   "FloatingAvatar",  "CenterAvatar"],
};

/* Fallback pool when nothing matches */
const FACELESS_FALLBACK    = ["FullZone", "SplitZone", "ThreeZone"];
const TALKING_HEAD_FALLBACK = ["SideAvatar", "CenterAvatar", "FloatingAvatar"];

/* ─────────────────────────────────────────────────────────────
   LAYOUT PADDING VARIATION
   Adds visual variety — not always 0.
───────────────────────────────────────────────────────────── */
const PADDING_PROFILES = [
  { layout: 0,  zone: 0  },  // edge-to-edge (most common)
  { layout: 0,  zone: 0  },
  { layout: 8,  zone: 0  },
  { layout: 12, zone: 0  },
  { layout: 16, zone: 8  },
  { layout: 0,  zone: 12 },
];

function pickPaddingProfile() {
  return PADDING_PROFILES[Math.floor(Math.random() * PADDING_PROFILES.length)];
}

/* ─────────────────────────────────────────────────────────────
   PICK LAYOUT
───────────────────────────────────────────────────────────── */
function pickLayout({ visual_hint, intent, energy, mode }) {
  const pool  = mode === "talking_head" ? TALKING_HEAD_LAYOUTS : FACELESS_LAYOUTS;
  const fallback = mode === "talking_head" ? TALKING_HEAD_FALLBACK : FACELESS_FALLBACK;

  let candidates = pool[visual_hint] || pool.none || fallback;

  // Filter to only layouts that exist in layoutRegistry
  candidates = candidates.filter(l => Boolean(layoutRegistry[l]));
  if (!candidates.length) candidates = fallback.filter(l => Boolean(layoutRegistry[l]));
  if (!candidates.length) return "FullZone";

  // High energy → prefer more complex layouts (more zones = more visual movement)
  if (energy >= 0.8 && candidates.length > 1) {
    // Avoid FullZone for very high energy unless it's the only option
    const nonFull = candidates.filter(l => l !== "FullZone");
    if (nonFull.length) candidates = nonFull;
  }

  // Low energy → prefer simpler layouts
  if (energy <= 0.3 && candidates.length > 1) {
    const simple = candidates.filter(l =>
      ["FullZone", "SplitZone", "SideAvatar", "CenterAvatar"].includes(l)
    );
    if (simple.length) candidates = simple;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ─────────────────────────────────────────────────────────────
   BUILD ZONES
───────────────────────────────────────────────────────────── */
function buildZones(layout, paddingProfile, visualIdentity) {
  const def    = layoutRegistry[layout];
  if (!def) return {};

  const zones = {};

  def.zones.forEach(z => {
    zones[z] = {
      role: "asset",
      content: {
        kind: "asset",
        asset: {
          src:        null,
          type:       "image",
          objectFit:  "cover",
          motion:     "kenburns",
        },
      },
      background: {
        kind:  "color",
        color: visualIdentity?.colorStory?.surface || "#111118",
      },
      style: {
        padding: paddingProfile.zone > 0
          ? { top: paddingProfile.zone, right: paddingProfile.zone, bottom: paddingProfile.zone, left: paddingProfile.zone }
          : {},
      },
    };
  });

  return zones;
}

/* ─────────────────────────────────────────────────────────────
   CHOOSE WHICH ZONE GETS THE BLOCK
───────────────────────────────────────────────────────────── */
function chooseBlockZone(layout) {
  const map = {
    SplitZone:       "z2",
    ThreeZone:       "z2",
    TwoTopOneBottom: "z3",
    OneTopTwoBottom: "z1",
    PictureInPicture:"z2",
    SideAvatar:      "z2",
    FullZone:        "z1",
  };
  return map[layout] || "z1";
}

/* ─────────────────────────────────────────────────────────────
   BUILD CHOREOGRAPHY
───────────────────────────────────────────────────────────── */
function buildChoreography(layout) {
  const cascade = ["ThreeZone", "TwoTopOneBottom", "OneTopTwoBottom", "FourGrid"];
  const quick   = ["SplitZone", "PictureInPicture", "SideAvatar"];

  if (cascade.includes(layout)) {
    return { mode: "cascade",      stagger_ms: 120, anchor_zone: "z1" };
  }
  if (quick.includes(layout)) {
    return { mode: "cascade",      stagger_ms: 80,  anchor_zone: "z1" };
  }
  return   { mode: "simultaneous", stagger_ms: 0,   anchor_zone: "z1" };
}

/* ─────────────────────────────────────────────────────────────
   APPLY LAYOUT DEFAULTS (transitions, motions)
───────────────────────────────────────────────────────────── */
function applyLayoutDefaults(zones, layout) {
  const defaults = layoutDefaultsRegistry[layout];
  if (!defaults?.zones) return zones;

  const result = { ...zones };

  Object.keys(result).forEach(z => {
    const d    = defaults.zones[z];
    const zone = result[z];
    if (!d || zone.role !== "asset") return;

    result[z] = {
      ...zone,
      content: {
        ...zone.content,
        asset: {
          ...zone.content.asset,
          enterTransition: d.assetEnter  || "fadeIn",
          exitTransition:  d.assetExit   || "none",
          motion:          d.assetMotion || "kenburns",
        },
      },
    };
  });

  return result;
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */
export function planBeatVisual({
  project         = null,
  mode            = "faceless",
  videoType       = "viral",
  intent          = "explanation",
  energy          = 0.5,
  visual_hint     = "none",
  spoken          = "",
  duration        = 3,
  visual_type     = null,
  block_candidate = null,
  visual_weight   = null,
}) {

  const visualIdentity  = buildVisualIdentity(project);
  const paddingProfile  = pickPaddingProfile();

  /* Use visual_hint if available, fall back to visual_type (legacy) */
  const hint = visual_hint !== "none" && visual_hint
    ? visual_hint
    : visual_type || "none";

  const layout = pickLayout({ visual_hint: hint, intent, energy, mode });
  let   zones  = buildZones(layout, paddingProfile, visualIdentity);
  const blocks = [];

  /* ── Inject block if candidate provided ── */
  if (block_candidate) {
    const zone = chooseBlockZone(layout);

    zones[zone] = {
      role: "block",
      content: {
        kind: "block",
        block: {
          type:    block_candidate,
          variant: "default",
        },
      },
      background: {
        kind:  "color",
        color: visualIdentity?.colorStory?.surface || "#111118",
      },
      style: {
        padding: paddingProfile.zone > 0
          ? { top: paddingProfile.zone, right: paddingProfile.zone, bottom: paddingProfile.zone, left: paddingProfile.zone }
          : {},
      },
    };

    blocks.push({
      id:      crypto.randomUUID(),
      type:    block_candidate,
      variant: "default",
      zone,
      props:   {},
    });
  }

  /* ── Apply layout-level defaults (asset transitions, motions) ── */
  zones = applyLayoutDefaults(zones, layout);

  /* ── Layout background ── */
  const dominant = visualIdentity?.colorStory?.dominant || "#000000";

  return {
    layout,
    layoutPadding: paddingProfile.layout,
    layoutBackground: {
      type:  "color",
      value: dominant,
    },
    choreography: buildChoreography(layout),
    zones,
    blocks,
  };
}