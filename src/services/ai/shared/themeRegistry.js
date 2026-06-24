/**
 * themeRegistry.js — the overall colour THEME axis for video services.
 *
 * This is separate from Visual Style on purpose:
 *   - Visual Style = the "feel" (composition, treatment, type energy, motion) — a soft hint.
 *   - Theme        = the colour FIELD (light / medium / dark) — an ENFORCED constraint.
 *
 * Theme is enforced deterministically in code (the pipelines override the background/text
 * palette with the theme's values), so a user who picks "Light" actually gets a light video
 * instead of the LLM's default dark-glow look. "auto" keeps the old GPT/topic-driven palette.
 *
 * Pure data + pure functions — safe to import from both server pipelines and the frontend.
 */

export const THEMES = {
  light: {
    id: "light", label: "Light",
    background: "#F5F4EF", backgroundSecondary: "#E7E5DC",
    primaryText: "#111114", secondaryText: "#4B4B57",
    defaultAccent: "#7C3AED",
    glow: false,
  },
  medium: {
    id: "medium", label: "Medium",
    background: "#23232C", backgroundSecondary: "#191920",
    primaryText: "#F4F4FA", secondaryText: "#B6B6C6",
    defaultAccent: "#22D3EE",
    glow: true,
  },
  dark: {
    id: "dark", label: "Dark",
    background: "#0A0A0F", backgroundSecondary: "#14141E",
    primaryText: "#FFFFFF", secondaryText: "#AAAAB8",
    defaultAccent: "#FFD600",
    glow: true,
  },
};

export const THEME_IDS = Object.keys(THEMES);

/** UI options for the shared chatbox field. "auto" = let the engine/topic decide (legacy behaviour). */
export const THEME_OPTIONS = [
  // No explicit "Auto" card — Auto is the implicit default (theme stays "auto" until the
  // user picks one; the engine then decides per topic).
  { id: "light",  label: "Light",  desc: "Bright, clean fields", colors: ["#F5F4EF", "#111114"] },
  { id: "medium", label: "Medium", desc: "Soft muted fields",    colors: ["#23232C", "#F4F4FA"] },
  { id: "dark",   label: "Dark",   desc: "Deep, cinematic",      colors: ["#0A0A0F", "#FFD600"] },
];

/**
 * Resolve a concrete, deterministic palette for an enforced theme. Returns null when the
 * theme is unset/"auto" (caller should keep its GPT/topic-driven palette). The accent stays
 * flexible: a pinned `accentColor` wins; otherwise the caller may keep the GPT accent.
 */
export function resolveThemePalette(theme, accentColor, accentColor2 = null) {
  const t = THEMES[theme];
  if (!t) return null; // "auto" or unknown → no override
  const accent = accentColor || t.defaultAccent;
  return {
    background:          t.background,
    backgroundSecondary: t.backgroundSecondary,
    primaryText:         t.primaryText,
    secondaryText:       t.secondaryText,
    accent,
    accent2:             accentColor2 || null,  // user-pinned secondary; null = caller keeps its derived one
    highlight:           accent,
    glow:                t.glow,
  };
}

/** Hard-constraint directive injected into designer/script prompts when a theme is chosen. */
export function themeDirective(theme, accentColor, accentColor2 = null) {
  const t = THEMES[theme];
  // Even with no theme ("auto"), a pinned accent pair should still be honoured.
  if (!t) return accentPairDirective(accentColor, accentColor2);
  const accent = accentColor || t.defaultAccent;
  return `\n\nCOLOUR THEME — HARD CONSTRAINT (the user explicitly chose this; you MUST obey it):
- Theme: ${t.label}. The background field MUST be ${t.label.toLowerCase()} (around ${t.background}). ${
    t.glow
      ? "Subtle glows/tints are allowed."
      : "Do NOT use dark fields or luminous glows — keep it bright and clean; use soft shadows or pale tints instead."
  }
- Primary text ${t.primaryText}, secondary text ${t.secondaryText} — text MUST contrast hard against the ${t.label.toLowerCase()} field.
- Accent colour: ${accent} — use it only for emphasis/highlights.${
    accentColor2 ? `\n- Secondary accent: ${accentColor2} — a brand companion to the primary accent. Use BOTH across the video (gradients, a second highlight, alternating emphasis); vary which one dominates scene to scene. Don't force both into every single frame.` : ""
  }`;
}

/** Accent-pair directive used when no theme is set but the user pinned accent colours. */
function accentPairDirective(accentColor, accentColor2) {
  if (!accentColor && !accentColor2) return "";
  if (accentColor && accentColor2) {
    return `\n\nBRAND COLOURS (the user pinned these — use them): primary accent ${accentColor} and secondary accent ${accentColor2}. Build the design's accents/highlights from BOTH, varying which dominates scene to scene; keep backgrounds and text topic-appropriate.`;
  }
  return `\n\nBRAND ACCENT (the user pinned this): ${accentColor || accentColor2} — use it for emphasis/highlights.`;
}
