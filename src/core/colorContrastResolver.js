/**
 * colorContrastResolver.js
 * src/core/colorContrastResolver.js
 *
 * Resolves a coherent, contrast-safe color set for a beat,
 * given the DNA colorStory and the user's brand colors.
 *
 * Usage:
 *   const colors = resolveColors({ colorStory, brandColor, brandColor2, energy });
 *   colors.text       → main text color
 *   colors.accent     → primary accent (buttons, highlights, decoratives)
 *   colors.accent2    → secondary accent (badges, sub-elements)
 *   colors.textShadow → CSS shadow for text on dark backgrounds
 *   colors.bgGradient → rich CSS background gradient for text-only beats
 *   colors.bgIsDark   → boolean
 */

/* ── Helpers ─────────────────────────────────────────────────── */

// Convert hex to RGB tuple
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Relative luminance per WCAG
function luminance([r, g, b]) {
  const toLinear = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isDark(hex) {
  try {
    return luminance(hexToRgb(hex)) < 0.18;
  } catch {
    return true;
  }
}

// Blend two colors at a ratio (0 = full a, 1 = full b)
function blend(hex1, hex2, ratio = 0.5) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/* ── Rich gradient library ───────────────────────────────────── */
// Produces a vivid multi-stop gradient given a primary accent color.
function buildRichGradient(bgColor, accentColor, energy = 0.5) {
  const [r, g, b] = hexToRgb(accentColor);
  const alphaHigh = energy >= 0.7 ? 0.28 : 0.18;
  const alphaLow  = energy >= 0.7 ? 0.10 : 0.06;

  // Multi-stop diagonal gradient: gradients layer on top, base color is last (CSS requirement)
  return [
    // radial glow at top-left from accent
    `radial-gradient(ellipse at 15% 10%, rgba(${r},${g},${b},${alphaHigh}) 0%, transparent 55%)`,
    // radial glow at bottom-right from accent
    `radial-gradient(ellipse at 85% 90%, rgba(${r},${g},${b},${alphaLow}) 0%, transparent 50%)`,
    // subtle top vignette
    `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)`,
    // base bg color must be last in CSS multi-layer background
    `${bgColor}`,
  ].join(", ");
}

/* ── Main export ─────────────────────────────────────────────── */
/**
 * Resolves a consistent color set for a beat.
 * @param {object} opts
 * @param {object} opts.colorStory    - DNA colorStory { bg, primary, text }
 * @param {string} opts.brandColor    - User primary brand color (optional)
 * @param {string} opts.brandColor2   - User secondary brand color (optional)
 * @param {number} opts.energy        - Beat energy 0–1
 * @returns {object} colors
 */
export function resolveColors({
  colorStory = null,
  brandColor  = null,
  brandColor2 = null,
  energy = 0.5,
} = {}) {
  // Background: DNA bg > dark fallback
  const bg = colorStory?.bg || "#0b0b10";
  const bgDark = isDark(bg);

  // Accent (primary): user brand > DNA primary > purple
  const accent  = brandColor  || colorStory?.primary || "#7c5cfc";
  // Accent2 (secondary): user brand2 > blended > complementary
  const accent2 = brandColor2 || blend(accent, bgDark ? "#ffffff" : "#000000", 0.3);

  // Text: use palette's own text color if set (niche palettes define this for contrast-safety),
  // else derive from bg brightness.
  const text = colorStory?.text || (bgDark ? "#ffffff" : "#0a0a0a");

  // Text shadow intensity based on energy and bg darkness
  const shadowStrength = bgDark ? (energy >= 0.7 ? "0 4px 24px rgba(0,0,0,0.95)" : "0 2px 16px rgba(0,0,0,0.8)") : "none";

  // Block background — accent color at low opacity for readability
  const [r, g, b] = hexToRgb(accent);
  const blockBg = `rgba(${r},${g},${b},0.18)`;
  const blockBorder = `rgba(${r},${g},${b},0.45)`;

  // Rich gradient for text-only beats (no asset)
  const bgGradient = buildRichGradient(bg, accent, energy);

  return {
    bg,
    bgIsDark:    bgDark,
    text,
    textShadow:  shadowStrength,
    accent,
    accent2,
    blockBg,
    blockBorder,
    bgGradient,
  };
}
