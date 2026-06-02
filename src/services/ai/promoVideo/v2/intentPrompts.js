/**
 * intentPrompts.js
 * src/services/ai/promoVideo/v2/intentPrompts.js
 *
 * Intent-specific prompts and prompt builder for the v2 scene designer.
 * Each intent tells GPT how to compose a single HTML frame.
 */

import { getPaletteForProject } from "../../../../core/registries/paletteRegistry.js";
import { getTypographyPreset }  from "../../../../core/registries/typographyRegistry.js";

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
- left: [px value] (x position from left edge of 1080px canvas)
- top: [px value] (y position from top edge of 1920px canvas)
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
- Major elements may overlap or intersect
- Design for impact first
- Use the full 1080x1920 frame — no large dead zones
- Avoid concentrating all content in one area

VISUAL ELEMENTS — only meaningful elements:
- text, cards, glows, rings, gradients, connector lines, image placeholders
- NO fake charts, NO fake analytics, NO placeholder text lines, NO progress bars

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
The viewer should understand the statistic within one second.`,

  feature: `Intent: FEATURE
The scene exists to showcase a product capability.
The product asset is the hero.
Text supports the product. Do not create text-heavy compositions.
Create clear visual focus around the featured capability.
Use supporting callouts only when necessary.
Avoid dashboard layouts.
The scene should feel like a premium product reveal.
The viewer should immediately understand what feature is being highlighted.`,

  statement: `Intent: STATEMENT
The scene exists to communicate one powerful idea.
One headline dominates. Everything else supports it.
Avoid multiple competing messages.
The viewer should feel the weight of the statement.
Strong typography. Strong contrast. Minimal decoration.`,

  cta: `Intent: CTA
The scene exists to drive one action.
One clear instruction dominates.
Product name or logo present.
Supporting elements reinforce the action.
Clean, confident, uncluttered.
The viewer should know exactly what to do next.`,
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
Category: ${projectContext.niche ?? "saas"}
Accent Color: ${palette.accent}
Secondary Color: ${palette.accentSecondary}
Background: ${palette.backgroundDeep}
Mood: ${moodLabel}
Text Color: ${palette.text}
Muted Text: ${palette.textMuted}

## SCENE CONTENT
${contentLines}

## TYPOGRAPHY
Headline font: ${typo.headline.fontFamily} — ${typo.headline.fontSize}px, weight ${typo.headline.fontWeight}
Body font: ${typo.body.fontFamily} — ${typo.body.fontSize}px, weight ${typo.body.fontWeight}
Label font: ${typo.label.fontFamily} — ${typo.label.fontSize}px, weight ${typo.label.fontWeight}
Stat font: ${typo.stat.fontFamily} — ${typo.stat.fontSize}px, weight ${typo.stat.fontWeight}

## OUTPUT
Output only the HTML. Start directly with <!DOCTYPE html>.`;
}
