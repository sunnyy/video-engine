/**
 * colorContrastResolver.js
 * src/core/elements/colorContrastResolver.js
 *
 * Resolves text and element colors to ensure readability
 * against any background using WCAG contrast ratio formulas.
 */

/* ── Helpers ─────────────────────────────────────────────────── */

function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "").replace(/^([0-9a-f]{3})$/i, "$1$1");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r, g, b) {
  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
}

/**
 * Get relative luminance of a hex color (0–1) per WCAG 2.x.
 */
export function getLuminance(hex) {
  try {
    const [r, g, b] = hexToRgb(hex);
    const toLinear = c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  } catch {
    return 0;
  }
}

/**
 * Get contrast ratio between two hex colors (1–21) per WCAG.
 */
export function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extract the dominant background color from a CSS background string.
 * Handles solid colors, gradients, and pattern strings.
 * Falls back to #000000 (dark) if unparseable.
 */
function extractBgColor(backgroundStyle) {
  if (!backgroundStyle) return "#000000";

  // Object format: { background: "..." }
  const bg = typeof backgroundStyle === "object"
    ? (backgroundStyle.background || backgroundStyle.backgroundColor || "")
    : String(backgroundStyle);

  // Extract last hex-like color (usually the base)
  const hexMatches = bg.match(/#[0-9a-f]{3,8}/gi);
  if (hexMatches?.length) {
    // Return the last match — tends to be the base bg color in multi-stop gradients
    return hexMatches[hexMatches.length - 1];
  }

  // Try rgba/rgb
  const rgbaMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbaMatch) {
    return rgbToHex(parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3]));
  }

  return "#000000";
}

/**
 * Returns "#ffffff" or "#000000" — whichever has better contrast against bg.
 */
export function resolveTextColor(bgHex) {
  const whiteContrast = getContrastRatio(bgHex, "#ffffff");
  const blackContrast = getContrastRatio(bgHex, "#000000");
  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

/**
 * Lightens a hex color by a ratio (0–1). 1 = white.
 */
function lighten(hex, ratio) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * ratio,
    g + (255 - g) * ratio,
    b + (255 - b) * ratio,
  );
}

/**
 * Darkens a hex color by a ratio (0–1). 1 = black.
 */
function darken(hex, ratio) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
}

/**
 * Returns the accent color adjusted for >= 4.5:1 contrast ratio against bg.
 * Lightens if bg is dark, darkens if bg is light.
 */
export function resolveAccentOnBg(bgHex, accentHex) {
  const TARGET = 4.5;
  let current  = accentHex;

  // If already meeting target, return as-is
  if (getContrastRatio(bgHex, current) >= TARGET) return current;

  const bgIsDark = getLuminance(bgHex) < 0.18;

  // Try adjusting in steps
  for (let i = 1; i <= 10; i++) {
    const step = i * 0.08;
    const adjusted = bgIsDark ? lighten(accentHex, step) : darken(accentHex, step);
    if (getContrastRatio(bgHex, adjusted) >= TARGET) return adjusted;
    current = adjusted;
  }

  // Last resort: return white or black
  return resolveTextColor(bgHex);
}

/**
 * Full resolver — takes a beat's background style + videoDNA.
 * Returns resolved color values for all text/UI elements.
 */
export function resolveBeatColors(backgroundStyle, videoDNA) {
  const bgHex   = extractBgColor(backgroundStyle);
  const bgDark  = getLuminance(bgHex) < 0.18;

  // Base accent from DNA
  const accent  = videoDNA?.colorStory?.primary || "#7c5cfc";

  // Headline: always max contrast against bg
  const headlineColor = resolveTextColor(bgHex);

  // Subtext: same color at 0.75 opacity
  const subtextColor  = headlineColor; // opacity applied at render time

  // Accent adjusted to be readable on bg
  const accentColor   = resolveAccentOnBg(bgHex, accent);

  // Badge bg: accent at 0.18 opacity — but compute a solid equiv for contrast check
  // Use a semi-opaque version of accent blended with bg for solid check
  const [ar, ag, ab] = hexToRgb(accentColor);
  const [br, bg_, bb] = hexToRgb(bgHex);
  const badgeBgSolid  = rgbToHex(
    ar * 0.2 + br * 0.8,
    ag * 0.2 + bg_ * 0.8,
    ab * 0.2 + bb * 0.8,
  );
  const badgeBgColor   = `rgba(${ar},${ag},${ab},0.18)`;
  const badgeTextColor = resolveTextColor(badgeBgSolid);

  return {
    headlineColor,
    subtextColor,
    accentColor,
    badgeBgColor,
    badgeTextColor,
    bgIsDark: bgDark,
    bgHex,
  };
}
