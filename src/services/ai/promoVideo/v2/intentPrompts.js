/**
 * intentPrompts.js
 * src/services/ai/promoVideo/v2/intentPrompts.js
 *
 * Intent-specific prompts and prompt builder for the v2 scene designer.
 * Each intent tells GPT how to compose a single HTML frame.
 */

import { getPaletteForProject } from "../../../../core/registries/paletteRegistry.js";
import { getTypographyPreset }  from "../../../../core/registries/typographyRegistry.js";

// Derives a very dark tinted background from the accent color so the canvas
// background actually reflects the user's chosen accent rather than always
// being the same dark purple/navy regardless of accent.
function darkAccentBackground(hex) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const top = `#${Math.round(r * 0.14).toString(16).padStart(2, "0")}${Math.round(g * 0.14).toString(16).padStart(2, "0")}${Math.round(b * 0.14).toString(16).padStart(2, "0")}`;
  const bot = `#${Math.round(r * 0.05).toString(16).padStart(2, "0")}${Math.round(g * 0.05).toString(16).padStart(2, "0")}${Math.round(b * 0.05).toString(16).padStart(2, "0")}`;
  return `radial-gradient(ellipse at 50% 0%, ${top} 0%, ${bot} 70%)`;
}

export const BASE_SYSTEM_PROMPT = `You are a world-class motion graphics art director creating frames for premium SaaS promo videos. Output a single self-contained HTML file with inline CSS only.

Rules:
- No JavaScript
- No SVG
- No Canvas
- No external assets
- Google Fonts via @import allowed
- Fixed size: 1080x1920px
- Vertical video frame
- Production-ready
- Not responsive

This is NOT a website. This is NOT a landing page. This is a single frame from a premium motion graphics promo video.

REQUIRED: Every meaningful HTML element must include these data attributes:
- data-role: semantic identity (headline, subhead, glow, card, step, stat-number, label, badge, background, divider, kicker, icon)
- data-layer: renderer type (text, gradient, image, effect, decoration)
- data-animation: entry animation (fade-in, fade-up, scale-in, slide-left, slide-right, none)
- data-scene-element: grouping (hero, background, workflow, decoration, supporting)

Example:
<div data-role="headline" data-layer="text" data-animation="scale-in" data-scene-element="hero">

CRITICAL LAYOUT RULE:
Every element with data-role must use ONLY inline styles for positioning and dimensions.
Do NOT use CSS classes for position, size, or visual properties of data-role elements.

Required inline style properties on every data-role element:
- position: absolute (always)
- left: [px value] (x position from left edge of 1080px canvas — use the FULL 0–1080px range, not just 0–300px)
- top: [px value] (y position from top edge of 1920px canvas — use the FULL 0–1920px range)
- width: [px value] (explicit pixel width)
- height: [px value] (explicit pixel height, or 'auto' for text)
- z-index: [number]
- opacity: [0-1]
- background: [value] (for gradient/card layers)
- color: [value] (for text layers)
- font-size: [px value] (for text layers)
- font-weight: [value] (for text layers)
- font-family: [value] (for text layers)
- letter-spacing: [value] (for text layers)
- line-height: [value] (for text layers)
- border-radius: [px or %] (REQUIRED on any circular or rounded element — e.g. border-radius:50% for circles)
- border: [value] (for ring/circle elements — put inline, not in CSS class)

CRITICAL — filter, backdrop-filter, box-shadow, and mix-blend-mode MUST be written as inline styles directly on the element. NEVER put these in a CSS class. The renderer reads inline styles only.

CSS classes MAY ONLY be used for:
- Pseudo-elements (::before, ::after)
- Animations (@keyframes)
- Body/html base styles

CSS classes must NOT define position, left, top, width, height, font-size, color, background, z-index, filter, backdrop-filter, box-shadow, or mix-blend-mode for data-role elements.

Example CORRECT element:
<div
  data-role="headline"
  data-layer="text"
  data-animation="fade-up"
  data-scene-element="hero"
  style="position:absolute;left:72px;top:380px;width:860px;height:auto;font-size:110px;font-weight:900;font-family:'Inter',sans-serif;color:#ffffff;letter-spacing:-0.07em;line-height:0.94;z-index:10;opacity:1;">
  Your next viral video
</div>

Example CORRECT gradient/glow element (filter MUST be inline):
<div
  data-role="glow"
  data-layer="gradient"
  data-animation="fade-in"
  data-scene-element="background"
  style="position:absolute;left:50px;top:-280px;width:980px;height:760px;background:radial-gradient(circle,rgba(99,102,241,0.82) 0%,transparent 68%);filter:blur(72px);opacity:0.9;z-index:1;">
</div>

Example CORRECT glass card (backdrop-filter MUST be inline):
<div
  data-role="card"
  data-layer="effect"
  data-animation="scale-in"
  data-scene-element="hero"
  style="position:absolute;left:216px;top:480px;width:648px;height:720px;background:rgba(255,255,255,0.08);border-radius:48px;border:1px solid rgba(255,255,255,0.18);backdrop-filter:blur(24px);box-shadow:0 40px 120px rgba(0,0,0,0.5);z-index:4;opacity:1;">
</div>

COMPOSITION RULES:
- Create one dominant focal area
- Use overlap, depth, scale contrast, asymmetry
- Design for impact first
- Use the FULL 1080x1920 frame — no large dead zones
- Distribute elements across the FULL 1080px width — do NOT cluster everything in the left 300px
- Background glows should span the full width (left:-100px to left:800px range)
- Text elements start at left: 60-120px minimum
- Hero visual elements (cards, rings, stats) should be centered: left 200-650px range
- Decorative elements can be positioned at left: 600-900px for depth and balance

ELEMENT COUNT — STRICT LIMIT:
- Maximum 10 data-role elements total per scene
- Background layers (glow, gradient): maximum 3
- Text elements: maximum 3 (headline + subhead + one label/badge)
- Decoration/card elements: maximum 3
- Stat numbers, icons: maximum 1 each
- If you exceed 10 elements, remove the least impactful ones

TEXT SPACING — CRITICAL:
- Text elements must be separated by at least 80px vertically
- Never place two text blocks within 60px of each other
- Stat numbers need at least 600px width to prevent wrapping (font-size 120px+ needs 600px+ width)
- Headlines at 80-100px font need at least 800px width
- Do NOT stack multiple small text labels in the same vertical zone

MINIMUM FONT SIZES — STRICT:
- headline: 72px minimum, 82-100px preferred
- subhead / body: 36px minimum
- label / badge / kicker / divider text: 32px minimum — NEVER use 22px or below
- stat-number: 120px minimum
- icon text inside circles: 48px minimum

VISUAL ELEMENTS — only meaningful elements:
- text, cards, glows, rings, gradients, connector lines, image placeholders
- NO fake charts, NO fake analytics, NO placeholder text lines, NO progress bars
- NO more than 1 decorative card element per scene

## LOGO & PRODUCT NAME RULES

Product name must appear in:
- Hook scene always — as a badge, kicker, or subtle label
- CTA scene always — prominently
- Maximum 2-3 scenes total — do not repeat product name in every scene

Logo (if a URL is provided):
- Render as: <img data-role="logo" data-layer="image" data-animation="fade-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];opacity:1;" src="[logoUrl]" />
- MINIMUM SIZES: hook scene → 160×160px minimum; CTA scene → 260×260px minimum; other scenes → 140×140px minimum
- Appears in hook scene top-left or top-center area
- Appears in CTA scene center or bottom — large and prominent
- Never appears in process, statistic, or list scenes
- If no logo URL is provided, use product name as text instead

Product name as text:
- Hook scene: small, uppercase, letter-spaced, subtle — top area
- CTA scene: medium size, prominent position
- Never as the headline — always as a supporting element
- Style: accent color or white at 60-70% opacity

Badge treatment for product name:
- Pill shape, font-size 20-24px, uppercase, letter-spacing 0.1em
- background: rgba of accent color at 10-15% opacity
- border: 1px solid accent color at 20-30% opacity

OUTPUT: Only the HTML. Nothing else.`;

export const INTENT_PROMPTS = {

  hook: `Intent: HOOK
The scene exists to stop scrolling.
One dominant focal area. Emotion, impact, attention.
Favor scale, emotion and visual impact.
Text may overlap visuals.
Avoid process diagrams, card stacks, dashboard layouts.
The frame should feel like a cinematic title card.`,

  list: `Intent: LIST
The scene exists to present multiple ideas, benefits, features or items.
Do not create bullet point slides.
Create meaningful visual grouping.
One item may be visually dominant.
Items may appear as cards, modules, tiles or connected objects.
Use hierarchy to guide attention.
Avoid evenly spaced lists.
The scene should feel designed, not arranged.
Favor grouping, comparison and visual storytelling over enumeration.`,

  process: `Intent: PROCESS
The scene exists to explain a sequence.
The viewer should immediately understand that multiple steps occur in order.
Create a strong visual flow from Step 1 to final outcome.
Use connectors, direction, progression and depth.
The process should feel active and moving forward.
Avoid stacked cards. Avoid disconnected elements.
Favor visual flow over decoration.
The scene should communicate progression, transformation and momentum.`,

  statistic: `Intent: STATISTIC
The scene exists to communicate a single important number.
The number is the hero. The number should dominate the composition.
Supporting elements exist only to reinforce the number.
Create strong contrast and visual impact.
Avoid multiple competing focal points.
Avoid dashboards and analytics screens.
Favor simplicity and confidence.
The stat number element must have width: at least 700px and height: auto so it never wraps.
Use only: 1 stat number, 1 label below it, 1 subhead, 1 background glow. Nothing else.
The viewer should understand the statistic within one second.`,

  feature: `Intent: FEATURE
The scene exists to showcase a product capability.
The product asset is the hero.
Text supports the product. Do not create text-heavy compositions.
Create clear visual focus around the featured capability.
Use supporting callouts only when necessary.
Avoid dashboard layouts.
The scene should feel like a premium product reveal.
The viewer should immediately understand what feature is being highlighted.

REQUIRED: Always include an image placeholder element for the feature asset:
<img data-role="feature-asset" data-layer="image" data-animation="scale-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:5;opacity:1;object-fit:cover;border-radius:24px;" src="" />
Size and position this as the dominant visual in the frame. Leave src="" — it will be filled in when the user uploads their screenshot.`,

  statement: `Intent: STATEMENT
The scene exists to communicate one powerful idea.
One headline dominates. Everything else supports it.
Avoid multiple competing messages.
The viewer should feel the weight of the statement.
Strong typography. Strong contrast. Minimal decoration.`,

  benefit: `Intent: BENEFIT
The scene exists to communicate one emotional value to the viewer.
One benefit dominates. Make it feel personal and real.
Avoid generic claims. Be specific: time saved, money saved, effort removed.
Supporting icon or visual reinforces the benefit.
Do not use lists. One statement, one visual, one feeling.
Maximum 3 text elements: one headline, one subhead, one optional small label.
The viewer should feel: "this is for me."`,

  comparison: `Intent: COMPARISON
The scene exists to show contrast between two states.
Left or top: the old way (manual, slow, painful).
Right or bottom: the new way (Vidquence, fast, easy).
Visual split must be immediately obvious — no reading required.
Use labels: "Before" / "After", "Without" / "With", "Manual" / "AI".
Avoid describing the comparison in text only — show it visually.
The contrast should feel dramatic.`,

  proof: `Intent: PROOF
The scene exists to build trust.
Use: large numbers, specific metrics, user counts, time saved, videos created.
One primary proof element dominates.
Supporting context below or beside the main proof.
Avoid vague claims. Specific numbers are more believable than adjectives.
The viewer should think: "this actually works."`,

  cta: `Intent: CTA
The scene exists to drive one action.
One instruction. One button or URL treatment. One product name.
No competing messages. No feature lists. No empty placeholder cards.
Product name or logo must be visible and prominent.
The action should feel easy and low-risk.
End with energy — not a question, a statement.
Maximum elements: headline, subhead, one CTA button/badge, product name, background. That's it.
The viewer should feel compelled to act immediately.`,
};

const PALETTE_MOOD_LABELS = {
  dark_premium:   "premium, sophisticated, high-value",
  dark_energetic: "energetic, bold, high-impact",
  dark_modern:    "modern, technical, precise",
  dark_corporate: "corporate, trustworthy, professional",
  dark_vibrant:   "vibrant, creative, expressive",
  dark_bold:      "bold, confident, growth-focused",
};

/**
 * buildSceneDesignerPrompt(intent, sceneData, projectContext)
 *
 * Combines BASE_SYSTEM_PROMPT + intent prompt + scene content + design system
 * into the final user message sent to the scene designer model.
 */
export function buildSceneDesignerPrompt(intent, sceneData, projectContext) {
  const palette = getPaletteForProject(
    sceneData.mood,
    projectContext.accentColor,
    projectContext.niche,
  );
  const typo = getTypographyPreset(projectContext.niche, sceneData.mood);

  const intentPrompt = INTENT_PROMPTS[intent] ?? INTENT_PROMPTS.statement;
  const moodLabel    = PALETTE_MOOD_LABELS[palette.id] ?? "dark, premium";

  const contentLines = [
    sceneData.spoken    && `Spoken: ${sceneData.spoken}`,
    sceneData.headline  && `Headline: ${sceneData.headline}`,
    sceneData.subhead   && `Subhead: ${sceneData.subhead}`,
    sceneData.body      && `Body: ${sceneData.body}`,
    sceneData.stat      && `Stat: ${sceneData.stat}${sceneData.label ? ` — ${sceneData.label}` : ""}`,
    sceneData.items?.length  && `Items: ${sceneData.items.join(", ")}`,
    sceneData.steps?.length  && `Steps: ${sceneData.steps.join(" → ")}`,
    sceneData.asset_hint     && `Asset: ${sceneData.asset_hint}`,
    sceneData.emphasis        && `Emphasis: ${sceneData.emphasis}`,
  ].filter(Boolean).join("\n");

  return `## INTENT
${intentPrompt}

## PRODUCT
Product: ${projectContext.productName ?? "Product"}
Logo URL: ${projectContext.logoUrl || "none"}
Category: ${projectContext.niche ?? "saas"}
Accent Color: ${palette.accent}
Secondary Color: ${palette.accentSecondary}
Background: ${palette.backgroundDeep}
Mood: ${moodLabel}
Text Color: ${palette.text}
Muted Text: ${palette.textMuted}${projectContext.logoUrl ? `

A logo image is available. Render it using this exact tag (fill in position/size):
<img data-role="logo" data-layer="image" data-animation="fade-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];opacity:1;" src="${projectContext.logoUrl}" />` : ""}

## SCENE CONTENT
${contentLines}

## TYPOGRAPHY
Headline font: ${typo.headline.fontFamily} — ${typo.headline.fontSize}px, weight ${typo.headline.fontWeight}
Body font: ${typo.body.fontFamily} — ${typo.body.fontSize}px, weight ${typo.body.fontWeight}
Label font: ${typo.label.fontFamily} — ${typo.label.fontSize}px, weight ${typo.label.fontWeight}
Stat font: ${typo.stat.fontFamily} — ${typo.stat.fontSize}px, weight ${typo.stat.fontWeight}

## STYLE PREFERENCES
Visual Style: ${projectContext.visualStyle ?? "radiant"}
Accent Color: ${projectContext.accentColor ?? "#6366f1"}
Typography: ${projectContext.typographyStyle ?? "modern"}
Base Background: ${darkAccentBackground(projectContext.accentColor) ?? "radial-gradient(ellipse at 50% 0%, #1a1050 0%, #060614 70%)"}

CRITICAL — Use the Base Background above for all full-canvas background layers. Do NOT use hardcoded #1a1050 or #060614 navy colors — those are the default purple palette and will look wrong when the user has chosen a different accent color.

Typography fonts to use:
- modern: Inter for all text
- bold: Bebas Neue for headlines, Inter for body
- editorial: Playfair Display for headlines, Lora for body
- minimal: Josefin Sans for all text
- energetic: Barlow Condensed for headlines, Inter for body

Visual style guidelines:
- radiant: Use glows, radial gradients, blur effects, depth layers, purple/indigo tones with accent color
- minimal: Flat backgrounds, clean typography, generous whitespace, no glow effects, subtle dividers only
- professional: Dark structured backgrounds, grid-like layouts, strong hierarchy, minimal decoration
- high-contrast: Maximum contrast, bold type, sharp color blocks, strong accent color usage
- soothing: Soft gradient backgrounds, low opacity overlays, gentle blur, muted complementary colors
- cinematic: Deep dark backgrounds, dramatic single light source, film-like color grading, wide letterbox feel

The accent color ${projectContext.accentColor ?? "#6366f1"} MUST be used consistently for highlights, dividers, badges, emphasis text, and icon backgrounds. Do not use a different accent color.

## OUTPUT
Output only the HTML. Start directly with <!DOCTYPE html>.`;
}
