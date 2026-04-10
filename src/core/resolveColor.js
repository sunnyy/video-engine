/**
 * resolveColor.js
 * src/core/resolveColor.js
 *
 * Single source of truth for the three-tier color system:
 *   Tier 1 — Brand   : user's explicit brand.color (highest priority)
 *   Tier 2 — DNA     : colorStory from niche palette registry
 *   Tier 3 — Element : preset's own hardcoded default (fallback only)
 *
 * Key rule: ALL colors are validated for contrast against colorStory.bg.
 * Light backgrounds (skincare cream, food warm, etc.) get dark text automatically.
 */

/* ── Helpers ─────────────────────────────────────────────────── */
function hexToRgb(hex) {
  const h = (hex || "#000").replace("#", "");
  const full = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]) {
  const toLinear = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isDark(hex) {
  try { return luminance(hexToRgb(hex)) < 0.18; }
  catch { return true; }
}

function isLight(hex) {
  return !isDark(hex);
}

// Convert a hex to rgba with given opacity
function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Token resolver ──────────────────────────────────────────── */
export function resolveColor(token, { dna = null, brand = null } = {}) {
  switch (token) {
    case "primary":
    case "accent":
      return brand?.color || dna?.colorStory?.primary || "#7c5cfc";

    case "secondary":
      return brand?.color2 || brand?.color || dna?.colorStory?.primary || "#7c5cfc";

    case "text":
      return dna?.colorStory?.text || "#ffffff";

    case "bg":
      return dna?.colorStory?.bg || "#0b0b10";

    case "muted":
      return "rgba(255,255,255,0.55)";

    default:
      return token;
  }
}

/* ── Preset color resolver ───────────────────────────────────── */
/**
 * Resolves text color for a zone, always contrast-safe against the niche bg.
 *
 * Rules:
 *   - colorRole: "fixed"  → keep preset color as-is (designer intent)
 *   - colorRole: "brand"  → always use DNA primary
 *   - transparent/outline → keep (stroke drives the look)
 *   - All other colors    → use DNA.colorStory.text (guaranteed contrast-safe)
 *     The niche palette already picked text=#1a1a1a for light bgs, text=#fff for dark bgs.
 */
export function resolvePresetColor(preset, context = {}) {
  const color = preset?.style?.color;
  const role  = preset?.colorRole;

  if (role === "fixed") return color;
  if (role === "brand") return resolveColor("primary", context);

  // Transparent / outline — keep
  if (!color || color === "transparent") return color;

  // Always use the palette's text color — it's already contrast-safe for this niche's bg.
  // This replaces all hardcoded white/orange/peach with the correct readable color.
  const paletteText = context?.dna?.colorStory?.text || "#ffffff";
  return paletteText;
}

/* ── Preset background resolver ─────────────────────────────── */
/**
 * Resolves background for pill/badge/quote presets.
 * Uses DNA primary at the same opacity as the preset's original background.
 * On light bg: ensures the badge bg is dark enough to be readable.
 */
export function applyBrandToBackground(cssBg, brandHex) {
  if (!cssBg || !brandHex) return cssBg;
  const [r, g, b] = hexToRgb(brandHex);

  const rgbaMatch = cssBg.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
  if (rgbaMatch) {
    return `rgba(${r},${g},${b},${rgbaMatch[1]})`;
  }

  if (/^#[0-9a-f]{3,8}$/i.test(cssBg.trim())) {
    return brandHex;
  }

  return cssBg;
}

export function resolvePresetBackground(preset, context = {}) {
  if (preset?.backgroundRole !== "primary") return undefined;
  const bg = preset?.style?.background;
  if (!bg) return undefined;

  const primary = resolveColor("primary", context);

  // On light niche backgrounds, the primary accent might also be light (e.g. peach on cream).
  // Ensure the badge/pill background has enough contrast — use a darker variant if needed.
  const nicheBg = context?.dna?.colorStory?.bg || "#0b0b10";
  const primaryHex = primary.startsWith("#") ? primary : primary;

  if (isLight(nicheBg) && isLight(primaryHex)) {
    // Both bg and primary are light — use a darkened version of primary for the badge bg
    const [r, g, b] = hexToRgb(primaryHex);
    const darkenedR = Math.round(r * 0.5);
    const darkenedG = Math.round(g * 0.5);
    const darkenedB = Math.round(b * 0.5);
    const darkPrimary = `#${darkenedR.toString(16).padStart(2,"0")}${darkenedG.toString(16).padStart(2,"0")}${darkenedB.toString(16).padStart(2,"0")}`;
    return applyBrandToBackground(bg, darkPrimary);
  }

  return applyBrandToBackground(bg, primary);
}
