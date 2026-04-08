// src/core/elements/elementSchema.js

export const ELEMENT_TYPES = {
  // ── BACKGROUNDS ──
  noise_gradient: {
    category:   "background",
    layer:      0,
    variants: [
      { id: "ng_dark",    colors: ["videoDNA.bg", "videoDNA.surface"],  angle: 135 },
      { id: "ng_accent",  colors: ["videoDNA.primary", "videoDNA.bg"],  angle: 160 },
      { id: "ng_warm",    colors: ["videoDNA.secondary", "videoDNA.bg"],angle: 45  },
      { id: "ng_neutral", colors: ["#1a1a2e", "#0a0a0a"],               angle: 90  },
    ],
    triggers:  ["always"],
    excludes:  [],
    max:       1,
  },

  solid_color: {
    category:  "background",
    layer:     0,
    variants: [
      { id: "sc_primary",   color: "videoDNA.bg"      },
      { id: "sc_surface",   color: "videoDNA.surface" },
      { id: "sc_accent",    color: "videoDNA.primary" },
    ],
    triggers:  ["visual_rest", "low_energy"],
    excludes:  ["hook", "cta"],
    max:       1,
  },

  diagonal_cut: {
    category:  "background",
    layer:     0,
    variants: [
      { id: "dc_left",  angle: -15, colorA: "videoDNA.primary", colorB: "videoDNA.bg"      },
      { id: "dc_right", angle:  15, colorA: "videoDNA.bg",      colorB: "videoDNA.surface" },
      { id: "dc_steep", angle: -25, colorA: "videoDNA.secondary",colorB: "videoDNA.bg"     },
    ],
    triggers:  ["proof", "contrast", "escalate"],
    excludes:  ["visual_rest", "empathy"],
    max:       1,
  },

  blob_shape: {
    category:  "background",
    layer:     0,
    variants: [
      { id: "blob_top",    position: "top",    color: "videoDNA.primary",   size: 0.6 },
      { id: "blob_bottom", position: "bottom", color: "videoDNA.secondary", size: 0.5 },
      { id: "blob_center", position: "center", color: "videoDNA.surface",   size: 0.7 },
    ],
    triggers:  ["empathy", "lifestyle", "curiosity"],
    excludes:  ["hook", "news", "proof"],
    max:       1,
  },

  checker_pattern: {
    category:  "background",
    layer:     0,
    variants: [
      { id: "chk_small", size: 40, colorA: "videoDNA.bg",      colorB: "videoDNA.surface"  },
      { id: "chk_large", size: 80, colorA: "videoDNA.primary", colorB: "videoDNA.bg"       },
      { id: "chk_accent",size: 60, colorA: "videoDNA.secondary",colorB: "videoDNA.bg"      },
    ],
    triggers:  ["cta", "hook", "high_energy"],
    excludes:  ["empathy", "visual_rest", "proof"],
    max:       1,
  },

  asset_fill: {
    category:  "background",
    layer:     0,
    variants: [
      { id: "af_cover",   objectFit: "cover",   motion: "kenburns_in"  },
      { id: "af_blurred", objectFit: "cover",   blur: 40, opacity: 0.4 },
      { id: "af_top",     objectFit: "cover",   position: "top"        },
    ],
    triggers:  ["has_asset"],
    excludes:  [],
    max:       1,
  },

  // ── OVERLAYS ──
  gradient_vignette: {
    category:  "overlay",
    layer:     1,
    variants: [
      { id: "gv_bottom", direction: "bottom", strength: 0.8 },
      { id: "gv_top",    direction: "top",    strength: 0.6 },
      { id: "gv_both",   direction: "both",   strength: 0.5 },
    ],
    triggers:  ["has_asset", "has_text_over_asset"],
    excludes:  [],
    max:       1,
  },

  color_tint: {
    category:  "overlay",
    layer:     1,
    variants: [
      { id: "ct_primary",   color: "videoDNA.primary",   opacity: 0.35 },
      { id: "ct_secondary", color: "videoDNA.secondary", opacity: 0.25 },
      { id: "ct_dark",      color: "#000000",             opacity: 0.45 },
    ],
    triggers:  ["has_asset", "proof", "reveal"],
    excludes:  [],
    max:       1,
  },

  noise_texture: {
    category:  "overlay",
    layer:     1,
    variants: [
      { id: "nt_subtle", opacity: 0.04 },
      { id: "nt_medium", opacity: 0.08 },
    ],
    triggers:  ["always"],
    excludes:  [],
    max:       1,
  },

  // ── FRAMES ──
  polaroid_card: {
    category:  "frame",
    layer:     2,
    variants: [
      { id: "pol_center",  rotation:  2, position: "center", size: 0.7  },
      { id: "pol_left",    rotation: -3, position: "left",   size: 0.55 },
      { id: "pol_stacked", rotation:  5, position: "center", size: 0.65, count: 2 },
    ],
    triggers:  ["lifestyle", "entertainment", "story"],
    excludes:  ["news", "proof", "stat"],
    max:       1,
  },

  inset_frame: {
    category:  "frame",
    layer:     2,
    variants: [
      { id: "if_white",  color: "#ffffff", inset: 0.08, thickness: 2 },
      { id: "if_accent", color: "videoDNA.primary", inset: 0.06, thickness: 3 },
      { id: "if_double", color: "#ffffff", inset: 0.06, thickness: 1, double: true },
    ],
    triggers:  ["proof", "reveal", "escalate"],
    excludes:  ["visual_rest"],
    max:       1,
  },

  ticker_bar: {
    category:  "frame",
    layer:     2,
    variants: [
      { id: "tk_top",    position: "top",    color: "videoDNA.primary",   speed: 30 },
      { id: "tk_bottom", position: "bottom", color: "videoDNA.secondary", speed: 25 },
    ],
    triggers:  ["cta", "hook", "news"],
    excludes:  ["visual_rest", "empathy"],
    max:       1,
  },

  torn_edge: {
    category:  "frame",
    layer:     2,
    variants: [
      { id: "te_bottom", position: "bottom", color: "videoDNA.bg"      },
      { id: "te_top",    position: "top",    color: "videoDNA.surface" },
    ],
    triggers:  ["story", "empathy", "lifestyle"],
    excludes:  ["news", "hook"],
    max:       1,
  },

  // ── TYPOGRAPHY ELEMENTS ──
  hero_word: {
    category:  "typography",
    layer:     3,
    variants: [
      { id: "hw_fill",    style: "fill",    size: "90vw", weight: 900 },
      { id: "hw_outline", style: "outline", size: "85vw", weight: 900 },
      { id: "hw_split",   style: "fill",    size: "75vw", weight: 900, splitColor: true },
    ],
    triggers:  ["hook", "reveal", "high_energy", "has_single_word"],
    excludes:  ["visual_rest", "proof"],
    max:       1,
  },

  label_badge: {
    category:  "typography",
    layer:     3,
    variants: [
      { id: "lb_pill",   shape: "pill",      position: "top-left",     bg: "videoDNA.primary" },
      { id: "lb_rect",   shape: "rectangle", position: "bottom-left",  bg: "videoDNA.secondary" },
      { id: "lb_outline",shape: "pill",      position: "top-right",    bg: "transparent", border: true },
    ],
    triggers:  ["always"],
    excludes:  [],
    max:       2,
  },

  script_accent: {
    category:  "typography",
    layer:     3,
    variants: [
      { id: "sa_under", position: "below_main", font: "Caveat",         color: "videoDNA.primary" },
      { id: "sa_over",  position: "above_main", font: "Dancing Script", color: "videoDNA.secondary" },
    ],
    triggers:  ["lifestyle", "empathy", "story"],
    excludes:  ["news", "proof", "hook"],
    max:       1,
  },

  circle_badge: {
    category:  "typography",
    layer:     3,
    variants: [
      { id: "cb_top_right",    position: "top-right",    size: 80,  rotation: 360, duration: 8  },
      { id: "cb_bottom_right", position: "bottom-right", size: 70,  rotation: 360, duration: 10 },
      { id: "cb_top_left",     position: "top-left",     size: 90,  rotation: -360,duration: 12 },
    ],
    triggers:  ["cta", "hook", "brand"],
    excludes:  ["visual_rest", "proof"],
    max:       1,
  },

  outline_text: {
    category:  "typography",
    layer:     3,
    variants: [
      { id: "ot_large",  style: "stroke", strokeWidth: 2, color: "videoDNA.primary",   opacity: 0.15 },
      { id: "ot_medium", style: "stroke", strokeWidth: 1, color: "videoDNA.secondary", opacity: 0.12 },
    ],
    triggers:  ["hook", "cta", "high_energy"],
    excludes:  ["empathy", "visual_rest"],
    max:       1,
  },

  // ── DECORATIVES ──
  star_burst: {
    category:  "decorative",
    layer:     4,
    variants: [
      { id: "sb_sm_tr", points: 8, size: 60,  position: "top-right",    color: "videoDNA.primary"   },
      { id: "sb_lg_bl", points: 4, size: 100, position: "bottom-left",  color: "videoDNA.secondary" },
      { id: "sb_md_tl", points: 6, size: 80,  position: "top-left",     color: "videoDNA.primary"   },
      { id: "sb_sm_br", points: 8, size: 50,  position: "bottom-right", color: "videoDNA.accent"    },
    ],
    triggers:  ["hook", "cta", "high_energy", "reveal"],
    excludes:  ["empathy", "proof", "visual_rest"],
    max:       2,
  },

  arrow_swoosh: {
    category:  "decorative",
    layer:     4,
    variants: [
      { id: "as_right",  direction: "right", style: "curved", color: "videoDNA.primary"   },
      { id: "as_down",   direction: "down",  style: "curved", color: "#ffffff"            },
      { id: "as_bounce", direction: "right", style: "bounce", color: "videoDNA.secondary" },
    ],
    triggers:  ["cta", "proof", "curiosity"],
    excludes:  ["hook", "visual_rest"],
    max:       1,
  },

  dot_grid: {
    category:  "decorative",
    layer:     4,
    variants: [
      { id: "dg_corner_tr", position: "top-right",   size: 4, gap: 12, color: "videoDNA.primary",   opacity: 0.4 },
      { id: "dg_corner_bl", position: "bottom-left", size: 3, gap: 10, color: "videoDNA.secondary", opacity: 0.3 },
      { id: "dg_full",      position: "full",         size: 2, gap: 20, color: "#ffffff",             opacity: 0.05},
    ],
    triggers:  ["proof", "explanation", "visual_rest"],
    excludes:  ["hook", "high_energy"],
    max:       1,
  },

  line_accent: {
    category:  "decorative",
    layer:     4,
    variants: [
      { id: "la_h_top",    orientation: "horizontal", position: "top",    thickness: 2, color: "videoDNA.primary"   },
      { id: "la_h_bottom", orientation: "horizontal", position: "bottom", thickness: 3, color: "videoDNA.secondary" },
      { id: "la_v_left",   orientation: "vertical",   position: "left",   thickness: 4, color: "videoDNA.primary"   },
      { id: "la_diagonal", orientation: "diagonal",   position: "center", thickness: 1, color: "#ffffff", opacity: 0.2 },
    ],
    triggers:  ["always"],
    excludes:  [],
    max:       2,
  },

  sparkle: {
    category:  "decorative",
    layer:     4,
    variants: [
      { id: "sp_scatter", count: 5, size: [8, 16], color: "videoDNA.primary",   animated: true  },
      { id: "sp_corner",  count: 3, size: [10,20], color: "videoDNA.secondary", animated: true  },
      { id: "sp_gold",    count: 4, size: [6, 14], color: "#f5c518",            animated: false },
    ],
    triggers:  ["lifestyle", "empathy", "entertainment", "cta"],
    excludes:  ["news", "proof"],
    max:       1,
  },

  wave_shape: {
    category:  "decorative",
    layer:     4,
    variants: [
      { id: "ws_bottom", position: "bottom", color: "videoDNA.surface",   amplitude: 20 },
      { id: "ws_top",    position: "top",    color: "videoDNA.bg",        amplitude: 15 },
    ],
    triggers:  ["lifestyle", "empathy", "story"],
    excludes:  ["hook", "news", "cta"],
    max:       1,
  },

  corner_accent: {
    category:  "decorative",
    layer:     4,
    variants: [
      { id: "ca_tl", corner: "top-left",     color: "videoDNA.primary",   size: 40 },
      { id: "ca_tr", corner: "top-right",    color: "videoDNA.secondary", size: 40 },
      { id: "ca_bl", corner: "bottom-left",  color: "videoDNA.primary",   size: 30 },
      { id: "ca_br", corner: "bottom-right", color: "videoDNA.secondary", size: 30 },
    ],
    triggers:  ["always"],
    excludes:  [],
    max:       2,
  },
};
