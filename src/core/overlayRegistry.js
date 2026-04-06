/**
 * overlayRegistry.js
 * src/core/overlayRegistry.js
 *
 * Single source of truth for:
 * - Overlay types and their defaults
 * - Anchor slot definitions
 * - Which anchors are safe per layout
 * - Auto-assignment rules per intent
 */

/* ─────────────────────────────────────────────────────────────
   ANCHOR SLOTS
   All positions in a 1080×1920 canvas.
   bottom values keep overlays above the 160px caption safe area.
───────────────────────────────────────────────────────────── */
export const ANCHOR_POSITIONS = {
  "top-left":      { top: 80,   left: 48                                  },
  "top-center":    { top: 80,   left: "50%", transform: "translateX(-50%)"},
  "top-right":     { top: 80,   right: 48                                  },
  "mid-left":      { top: "42%", left: 48,  transform: "translateY(-50%)" },
  "mid-right":     { top: "42%", right: 48, transform: "translateY(-50%)" },
  "bottom-left":   { bottom: 200, left: 48                                 },
  "bottom-center": { bottom: 200, left: "50%", transform: "translateX(-50%)"},
  "bottom-right":  { bottom: 200, right: 48                                },
  "center":        { top: "50%", left: "50%", transform: "translate(-50%,-50%)"},
};

export const ANCHOR_LABELS = {
  "top-left":      "Top Left",
  "top-center":    "Top Center",
  "top-right":     "Top Right",
  "mid-left":      "Mid Left",
  "mid-right":     "Mid Right",
  "bottom-left":   "Bottom Left",
  "bottom-center": "Bottom Center",
  "bottom-right":  "Bottom Right",
  "center":        "Center",
};

/* ─────────────────────────────────────────────────────────────
   LAYOUT → SAFE ANCHORS
   Which anchor slots are safe for each layout.
   Excludes anchors that would overlap zone content areas.
───────────────────────────────────────────────────────────── */
export const LAYOUT_SAFE_ANCHORS = {
  FullZone:          ["top-left","top-right","bottom-left","bottom-right","bottom-center"],
  SplitZone:         ["top-left","top-right","bottom-left","bottom-right","bottom-center"],
  ThreeZone:         ["top-left","top-right","bottom-left","bottom-right"],
  TwoTopOneBottom:   ["top-left","top-right","bottom-left","bottom-right","bottom-center"],
  OneTopTwoBottom:   ["top-left","top-right","bottom-left","bottom-right"],
  FourGrid:          ["top-left","top-right","bottom-left","bottom-right"],
  SixGrid:           ["top-left","top-right","bottom-left","bottom-right"],
  BigTopSmallBottom: ["top-left","top-right","bottom-left","bottom-right","bottom-center"],
  SmallTopBigBottom: ["top-left","top-right","bottom-left","bottom-right","bottom-center"],
  LeftHeavy:         ["top-right","bottom-left","bottom-right","bottom-center"],
  RightHeavy:        ["top-left","bottom-left","bottom-right","bottom-center"],
  PictureInPicture:  ["top-left","top-center","top-right","bottom-left","bottom-center"],
  FloatingAvatar:    ["top-left","top-right","bottom-left","bottom-right"],
  SideAvatar:        ["top-left","top-right","bottom-left","bottom-right"],
  CenterAvatar:      ["top-left","top-right","bottom-left","bottom-right"],
};

/* ─────────────────────────────────────────────────────────────
   OVERLAY TYPES
───────────────────────────────────────────────────────────── */
export const OVERLAY_TYPES = {

  HeadlineText: {
    label:   "Headline",
    icon:    "T",
    defaults: {
      text:    "THIS CHANGES EVERYTHING",
      size:    72,
      color:   "#ffffff",
      anchor:  "top-left",
      motion:  "slideUp",
      delay:   0,
    },
    allowedAnchors: ["top-left","top-center","top-right","bottom-left","bottom-center","bottom-right"],
  },

  Badge: {
    label:   "Badge",
    icon:    "★",
    defaults: {
      text:    "LIVE",
      size:    28,
      color:   "#ff4d6d",
      anchor:  "top-right",
      motion:  "pop",
      delay:   0,
      variant: "pill", // pill | solid | outline
    },
    allowedAnchors: ["top-left","top-right","bottom-left","bottom-right"],
  },

  StatCallout: {
    label:   "Stat",
    icon:    "%",
    defaults: {
      value:   "↑ 94%",
      label:   "Engagement",
      color:   "#f0e040",
      anchor:  "bottom-left",
      motion:  "slideUp",
      delay:   0.2,
    },
    allowedAnchors: ["bottom-left","bottom-right","top-left","top-right"],
  },

  HighlightBox: {
    label:   "Highlight",
    icon:    "▬",
    defaults: {
      text:    "Did you know this changes everything?",
      color:   "#f5f3ee",
      textColor: "#111111",
      anchor:  "bottom-center",
      motion:  "fade",
      delay:   0.1,
    },
    allowedAnchors: ["bottom-center","bottom-left","bottom-right","top-center"],
  },

  LiveDot: {
    label:   "Live",
    icon:    "●",
    defaults: {
      text:    "LIVE",
      color:   "#ff4d6d",
      anchor:  "top-left",
      motion:  "pop",
      delay:   0,
    },
    allowedAnchors: ["top-left","top-right"],
  },

  EmojiFloat: {
    label:   "Emoji",
    icon:    "☺",
    defaults: {
      emojis:  ["❤️","🔥","😍"],
      anchor:  "bottom-center",
      motion:  "slideUp",
      delay:   0,
    },
    allowedAnchors: ["bottom-left","bottom-center","bottom-right"],
  },

  ArrowPointer: {
    label:   "Arrow",
    icon:    "↓",
    defaults: {
      direction: "down",
      color:   "#f0e040",
      anchor:  "mid-right",
      motion:  "pop",
      delay:   0.3,
    },
    allowedAnchors: ["mid-left","mid-right","top-center","bottom-center"],
  },

  ImageOverlay: {
    label:   "Image",
    icon:    "🖼",
    defaults: {
      src:      "",
      objectFit: "contain",
      anchor:   "center",
      scale:    1,
      motion:   "fade",
      delay:    0,
    },
    allowedAnchors: ["top-left","top-center","top-right","mid-left","center","mid-right","bottom-left","bottom-center","bottom-right"],
  },

  VideoOverlay: {
    label:   "Video",
    icon:    "▶",
    defaults: {
      src:      "",
      objectFit: "contain",
      anchor:   "center",
      scale:    1,
      motion:   "fade",
      delay:    0,
      loop:     true,
      muted:    true,
    },
    allowedAnchors: ["top-left","top-center","top-right","mid-left","center","mid-right","bottom-left","bottom-center","bottom-right"],
  },

};

export const OVERLAY_TYPE_KEYS = Object.keys(OVERLAY_TYPES);

/* ─────────────────────────────────────────────────────────────
   INTENT → AUTO OVERLAYS
   Used by visualDirector for automated generation.
───────────────────────────────────────────────────────────── */
export const INTENT_OVERLAYS = {
  shock:       ["Badge:BREAKING", "LiveDot"],
  proof:       ["StatCallout", "Badge:VERIFIED"],
  urgency:     ["Badge:LIMITED", "LiveDot"],
  curiosity:   ["ArrowPointer"],
  punchline:   ["EmojiFloat"],
  reveal:      ["HighlightBox"],
  empathy:     ["HighlightBox"],
  explanation: [],
  contrast:    [],
  irony:       [],
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

/** Returns safe anchors for a layout, filtered by overlay type constraints */
export function getSafeAnchors(layout, overlayType, existingOverlays = []) {
  const layoutAnchors  = LAYOUT_SAFE_ANCHORS[layout] || Object.keys(ANCHOR_POSITIONS);
  const typeAnchors    = OVERLAY_TYPES[overlayType]?.allowedAnchors || Object.keys(ANCHOR_POSITIONS);
  const usedAnchors    = existingOverlays.map(o => o.anchor);

  return layoutAnchors
    .filter(a => typeAnchors.includes(a))
    .filter(a => !usedAnchors.includes(a));
}

/** Get CSS position style for an anchor slot */
export function getAnchorStyle(anchor) {
  return ANCHOR_POSITIONS[anchor] || ANCHOR_POSITIONS["top-left"];
}

/** Create a new overlay with defaults */
export function createOverlay(type) {
  const def = OVERLAY_TYPES[type];
  if (!def) return null;
  return {
    id:   "ov_" + Date.now(),
    type,
    ...def.defaults,
  };
}