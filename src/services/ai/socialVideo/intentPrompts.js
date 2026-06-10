/**
 * intentPrompts.js
 * Scene designer prompts for the Social Video pipeline.
 *
 * Archetypes:
 *   typography_hero   — hook: massive text dominates canvas
 *   quote_statement   — quote: premium quote card
 *   single_stat       — stat: one number dominates
 *   full_bleed_image  — image: fetched social image fills canvas
 *   split_composition — image: image left, text right
 *   minimal_cta       — cta: clean attribution + action
 */

export function buildSocialScenePrompt(visualText, sceneContext) {
  const {
    sceneIntent   = "quote",
    archetype     = null,
    visualConcept = "",
    hasFetchedImage = false,
    palette = {},
    fontPair = {},
  } = sceneContext;

  const bg   = palette.background          ?? "#0A0A0A";
  const bg2  = palette.backgroundSecondary ?? "#111111";
  const fg   = palette.primaryText         ?? "#FFFFFF";
  const muted = palette.secondaryText      ?? "#AAAAAA";
  const accent = palette.accent            ?? "#FFD600";
  const hl   = palette.highlight           ?? "#FFFFFF";

  const heroFont  = fontPair.hero       ?? "Anton";
  const bodyFont  = fontPair.supporting ?? "Inter";

  const CANVAS_W = 1080;
  const CANVAS_H = 1920;

  const system = `You are a world-class motion graphics art director for short-form viral social media videos.
Design a single 9:16 video frame (${CANVAS_W}x${CANVAS_H}px).
Output ONLY a self-contained HTML file with inline CSS. Nothing before <!DOCTYPE html>.

RULES:
- No JavaScript. No SVG. No Canvas. No external assets except Google Fonts via @import.
- All properties (position, color, font, filter, etc.) must be inline styles — never in <style> classes.
- Every element: position:absolute, explicit left and top in px relative to the full canvas.
- Never use flexbox or grid for layout. Never nest positioned elements.
- x: 0–${CANVAS_W}. y: 0–${CANVAS_H}.
- html and body: width:${CANVAS_W}px; height:${CANVAS_H}px; overflow:hidden; margin:0.

SPACING:
- 40px minimum gap between consecutive text elements.
- Never overlap text.

HEIGHT:
- Never set height on text elements — only left, top, width.

FONTS:
- Hero font: "${heroFont}" — use for main display text.
- Body font: "${bodyFont}" — use for supporting text, captions, attribution.
- Load both via Google Fonts @import.

PALETTE (follow exactly — do NOT invent colors):
  background:          ${bg}
  backgroundSecondary: ${bg2}
  primaryText:         ${fg}
  secondaryText:       ${muted}
  accent:              ${accent}
  highlight:           ${hl}

DATA ATTRIBUTES (required on every meaningful element):
  data-role: headline | subhead | stat | quote | attribution | badge | background | glow | divider | label | icon | cta
  data-layer: text | gradient | image | effect | decoration
  data-animation: fade-in | fade-up | scale-in | slide-left | none
  data-scene-element: hero | background | decoration | supporting

SOCIAL IMAGE PLACEHOLDER:
When use_fetched_image is true and the archetype calls for the post's actual image, use:
<div data-role="image-placeholder" data-layer="image" data-asset-type="social-image" data-animation="fade-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];background:rgba(255,255,255,0.04);border-radius:[r]px;"></div>
Only use data-asset-type="social-image" — never "stock", "ai", or "asset".

ARCHETYPE EXECUTION:
  typography_hero  → massive headline text owns the canvas. Accent color for key words. Minimal decoration. Nothing competes with text.
  quote_statement  → the quote owns the canvas. Large quotation marks in accent color. Attribution below in muted color. Premium card or no card at all.
  single_stat      → one massive number in accent color, plus a short label above or below. Radial glow behind the number. Nothing else competes.
  full_bleed_image → social-image placeholder fills 70%+ of canvas (top portion). Short caption or title text at bottom, overlaid on dark gradient.
  split_composition→ social-image on top half (~55%), bold text block on bottom half. Clear horizontal separation.
  minimal_cta      → bold CTA text dominates (e.g. "SAVE THIS", "FOLLOW FOR MORE"). No author name, no platform name.

ANIMATION:
  Background/glow:  data-animation="none" or "fade-in"
  Headline:         data-animation="fade-up"
  Subhead/quote:    data-animation="fade-up"
  Stat number:      data-animation="scale-in"
  Attribution:      data-animation="fade-in"
  CTA:              data-animation="scale-in"

ABSOLUTE PROHIBITIONS — violating any of these invalidates the entire scene:
- NEVER display any author name, username, or @handle anywhere in the scene
- NEVER display any platform name (Twitter, X, Instagram, TikTok, etc.) anywhere in the scene
- NEVER use the words "FOLLOW", "@", or any social handle as text content
- The video is about the IDEA, not who said it or where

OUTPUT: Only the HTML. Nothing before <!DOCTYPE html>.`;

  const useFetchedImageNote = hasFetchedImage
    ? `USE FETCHED IMAGE: true — include exactly one data-asset-type="social-image" placeholder where the post image belongs.`
    : `USE FETCHED IMAGE: false — do NOT include any image placeholder.`;

  const user = `ARCHETYPE: ${archetype ?? sceneIntent}
INTENT: ${sceneIntent}
VISUAL CONCEPT: ${visualConcept || "(choose best approach)"}
${useFetchedImageNote}

DISPLAY TEXT (show in scene):
"${visualText}"

Design a stunning, viral-quality social video scene for this content.
Make it look premium, bold, and shareable.
Remember: NO author names, NO handles, NO platform names — anywhere.`;

  return { system, user };
}
