/**
 * resolveColor.js
 * src/core/resolveColor.js
 *
 * Single source of truth for the three-tier color system:
 *   Tier 1 — Brand   : user's explicit brand.color (highest priority)
 *   Tier 2 — DNA     : colorStory.primary derived from videoType + tone
 *   Tier 3 — Element : preset's own hardcoded default (fallback only)
 *
 * Semantic tokens:
 *   "primary"   → brand color → DNA primary → #7c5cfc
 *   "secondary" → brand color2 → brand color → DNA primary
 *   "text"      → DNA text → #ffffff
 *   "bg"        → DNA bg → #0b0b10
 *   "muted"     → dimmed text (rgba, not brand-derived)
 *   <hex>       → pass-through unchanged
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

/* ── Token resolver ──────────────────────────────────────────── */
/**
 * @param {string} token  — semantic token or literal hex
 * @param {{ dna?: object, brand?: object }} context
 * @returns {string} resolved hex / rgba / css value
 */
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
      return token; // literal hex / css — pass through unchanged
  }
}

/* ── Preset color resolver ───────────────────────────────────── */
/**
 * Resolves a preset's text `color` at build time.
 *
 * Decision logic (no `colorRole` field needed on presets):
 *   - transparent / outline presets  → keep as-is (WebkitTextStroke drives the look)
 *   - explicit `colorRole: "fixed"`  → keep preset's hardcoded color
 *   - explicit `colorRole: "brand"`  → always use brand/DNA primary
 *   - generic white (#fff / "white") → auto-upgrade to brand/DNA primary
 *   - any other intentional color    → keep fixed (gold, cyan, green = thematic)
 *
 * @param {object} preset
 * @param {{ dna?: object, brand?: object }} context
 * @returns {string} resolved CSS color
 */
export function resolvePresetColor(preset, context = {}) {
  const color = preset?.style?.color;
  const role  = preset?.colorRole;

  // Explicit overrides
  if (role === "fixed") return color;
  if (role === "brand") return resolveColor("primary", context);

  // Transparent / outline — keep (stroke color drives the look)
  if (!color || color === "transparent") return color;

  // Generic white → upgrade to brand/DNA primary
  if (color === "#ffffff" || color === "white") {
    return resolveColor("primary", context);
  }

  // Intentional thematic color (gold, cyan, neon green, etc.) → keep
  return color;
}

/* ── Preset background resolver ─────────────────────────────── */
/**
 * Replaces the color component in a CSS background string with the brand primary.
 * Used for pill/badge/quote presets that hardcode the default purple.
 *
 * Handles:
 *   rgba(124,92,252,0.9)  → rgba(r,g,b,0.9)
 *   #7c5cfc               → brand hex
 *   rgba(124,92,252,0.2)  → rgba(r,g,b,0.2)
 *
 * @param {string}  cssBg     — original background CSS value
 * @param {string}  brandHex  — resolved brand primary hex
 * @returns {string}
 */
export function applyBrandToBackground(cssBg, brandHex) {
  if (!cssBg || !brandHex) return cssBg;
  const [r, g, b] = hexToRgb(brandHex);

  // rgba format — extract opacity, rebuild with brand color
  const rgbaMatch = cssBg.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
  if (rgbaMatch) {
    return `rgba(${r},${g},${b},${rgbaMatch[1]})`;
  }

  // Solid hex — replace with brand hex
  if (/^#[0-9a-f]{3,8}$/i.test(cssBg.trim())) {
    return brandHex;
  }

  return cssBg; // unparseable — leave unchanged
}

/**
 * Resolves a preset's background property at build time.
 * Only replaces if `preset.backgroundRole === "primary"`.
 *
 * @param {object} preset
 * @param {{ dna?: object, brand?: object }} context
 * @returns {string|undefined} resolved background CSS, or undefined if not applicable
 */
export function resolvePresetBackground(preset, context = {}) {
  if (preset?.backgroundRole !== "primary") return undefined;
  const bg = preset?.style?.background;
  if (!bg) return undefined;
  const primary = resolveColor("primary", context);
  return applyBrandToBackground(bg, primary);
}
