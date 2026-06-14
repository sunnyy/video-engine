/**
 * intentPrompts.js
 * Art-director prompt for the Social Video pipeline.
 *
 * The scriptGenerator (creative director) hands each scene a free-form
 * creative_brief. This prompt does NOT impose a fixed archetype menu — it gives
 * the model the rendering primitives (data-attribute schema, animation enum,
 * layout rules) and asks it to compose whatever frame best realizes the brief.
 */

export function buildSocialScenePrompt(visualText, sceneContext) {
  const {
    sceneIntent      = "scene",
    creativeBrief    = "",
    visualConcept    = "",
    hasFetchedImage  = false,
    palette          = {},
    fontPair         = {},
    showAttribution  = false,
    author           = "",
    authorHandle     = "",
  } = sceneContext;

  const brief = creativeBrief || visualConcept || "";

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
You are handed a CREATIVE BRIEF for ONE scene. Design the single 9:16 video frame (${CANVAS_W}x${CANVAS_H}px) that best realizes that brief — its narrative purpose, focal point, and feeling.
There is no fixed layout menu. Compose freely using the primitives below to serve the brief.
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

FONT SIZE OVERFLOW RULE — MANDATORY, CHECK EVERY ELEMENT BEFORE WRITING IT:
- Formula: estimated_render_width = char_count × font_size × 0.65
- This estimate MUST be ≤ the element's own width style. Reduce font_size until it fits.
- NEVER let text extend beyond the element's left + width boundary. Text that overflows the canvas is a critical failure.
- Single words: add style="white-space:nowrap;overflow:hidden;" — a word CANNOT wrap mid-character.
- In any split/column layout (two halves, comparison grids, etc.): each column is at most 500px wide. All text inside a column MUST fit within 500px. Max font-size for a 11-char word in a 500px column = 500/(11×0.65) ≈ 70px.
- Stat/hero numbers: max font-size 260px. Words 5+ chars: max 180px unless you calculated it fits. Words 8+ chars: max 120px.
- ALWAYS set an explicit width on every text element. Never omit width.

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

GLOW ELEMENTS — gradient divs only, NEVER text:
- data-role="glow" elements MUST be <div> with a radial-gradient background and filter:blur(…).
- NEVER put any text content inside a glow element. Glow elements have no innerHTML.
- Do NOT create duplicate text elements as echoes or ghost shadows. Every word appears exactly once.

LUCIDE ICONS — use instead of drawn graphics:
- Add data-icon="[kebab-case-icon-name]" to any element to render a Lucide icon.
- Example: <div data-role="icon" data-layer="decoration" data-icon="trending-up" data-animation="fade-in" data-scene-element="decoration" style="position:absolute;left:80px;top:400px;width:64px;height:64px;color:#00E5FF;z-index:5;"></div>
- Useful icons: trending-up, trending-down, zap, dollar-sign, arrow-right, star, check, x-circle, alert-triangle, bar-chart-2, cpu, globe, lock, unlock, users, shield
- Size via width/height (32–120px). Color via color: style property.

BUTTONS / CTA ELEMENTS — CRITICAL RULE, NO EXCEPTIONS:
❌ WRONG — separate background div + text div (causes text wrap and misalignment):
  <div style="position:absolute;left:80px;top:1700px;width:300px;height:60px;background:#FFD700;border-radius:8px;"></div>
  <div style="position:absolute;left:80px;top:1710px;">CHOOSE YOUR PATH</div>
✅ CORRECT — background applied directly to the text element:
  <div data-role="cta" ... style="position:absolute;left:80px;top:1700px;background:#FFD700;color:#000;padding:18px 40px;border-radius:8px;font-size:28px;font-weight:800;white-space:nowrap;width:auto;">CHOOSE YOUR PATH</div>
- ONE element only. Background, padding, border-radius go on the text element itself.
- Always add white-space:nowrap to button text so it never wraps.
- Never size the button with a fixed width — let padding determine its size (width:auto).

SOCIAL IMAGE PLACEHOLDER:
When use_fetched_image is true and the brief calls for the post's actual image, use:
<div data-role="image-placeholder" data-layer="image" data-asset-type="social-image" data-animation="fade-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];background:rgba(255,255,255,0.04);border-radius:[r]px;"></div>
Only use data-asset-type="social-image" — never "stock", "ai", or "asset".

COMPOSITION GUIDANCE (a toolkit, NOT templates):
Choose and combine whatever serves the brief. Proven moves you can draw on:
  - One massive headline owning the canvas — for a bold claim or scroll-stopping hook.
  - A premium quote treatment with oversized quotation marks in accent color — for a key statement.
  - One giant number with a radial glow behind it and a short label — for a striking stat.
  - A clean vertical stack, one item per line, staggered fade-up — for a list (parse DISPLAY TEXT by newlines; one positioned element per line; tight readable column, never scattered).
  - A full-bleed social image with a short caption over a dark gradient — when the image is the hero.
  - A split frame, image on one side / bold text on the other — to pair a visual with a message, or to stage a two-sided comparison.
  - A bold standalone action line — for a call to action.
Mix, break, or go beyond these as the brief demands. The brief's feeling and focal point ALWAYS win over any convention. Match the motion (animation choices) to the feeling the brief asks for.

ANIMATION (pick per the feeling the brief wants — stay within this set):
  Background/glow:  data-animation="none" or "fade-in"
  Headlines/quotes: data-animation="fade-up"
  Stat numbers:     data-animation="scale-in"
  Attribution:      data-animation="fade-in"
  CTA:              data-animation="scale-in"
  Lateral motion:   data-animation="slide-left"

ABSOLUTE PROHIBITIONS — violating any of these invalidates the entire scene:
- NEVER display any author name, username, or @handle UNLESS the AUTHOR ATTRIBUTION directive explicitly instructs it
- NEVER display any platform name (Twitter, X, Instagram, TikTok, etc.) anywhere in the scene
- NEVER make author credit prominent — if shown, it is always small, muted, bottom-corner only
- The video is about the IDEA, not who said it or where

OUTPUT: Only the HTML. Nothing before <!DOCTYPE html>.`;

  const useFetchedImageNote = hasFetchedImage
    ? `USE FETCHED IMAGE: true — include exactly one data-asset-type="social-image" placeholder where the post image belongs.`
    : `USE FETCHED IMAGE: false — do NOT include any image placeholder.`;

  const attributionDirective = showAttribution
    ? `
AUTHOR ATTRIBUTION (this scene only):
Place the author credit in the bottom-left corner of the canvas, small and tasteful.
  - Handle: "${authorHandle || author}"${author && authorHandle ? `\n  - Name: "${author}"` : ""}
  - Style: font-size 28–32px, muted color (secondaryText from palette), font="${fontPair.supporting ?? "Inter"}"
  - Position: left ~80px, bottom ~60px (top = canvasHeight − 60 − element height)
  - Do NOT make this prominent — it is a credit, not a headline
  - One line only: handle preferred, or "name · handle" if both present`
    : "";

  const user = `CREATIVE BRIEF (design the frame that realizes this):
"${brief || "(no brief — use your best judgment for this scene)"}"
SCENE INTENT: ${sceneIntent}
${useFetchedImageNote}
${attributionDirective}
DISPLAY TEXT (show in scene):
"${visualText}"

Design the single most striking, premium, scroll-stopping 9:16 frame that delivers this brief.
The composition, focal point, and motion must match the brief's feeling — not a generic layout.
${showAttribution ? "Author credit is allowed on this scene only — small, bottom-left, as described above." : "Remember: NO author names, NO handles, NO platform names — anywhere."}`;

  return { system, user };
}
