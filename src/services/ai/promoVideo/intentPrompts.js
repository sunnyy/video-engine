/**
 * intentPrompts.js
 * src/services/ai/promoVideo/v2/intentPrompts.js
 *
 * Builds the system + user prompt for the v2 scene designer.
 * The designer receives the raw script segment and designs freely.
 */

const FORMAT_GUIDANCE = {
  '9:16': 'Vertical canvas. Stack elements top-to-bottom. Hero content in upper half. Supporting content below. Wide elements span full width.',
  '16:9': 'Horizontal canvas. Distribute elements left-to-right. Left third for text, right two-thirds for visuals. Or split 50/50. Never stack everything vertically.',
  '1:1':  'Square canvas. Center-focused composition. Balance elements around the center. Text can be centered or left-aligned. Visuals fill remaining space.',
};

function buildDesignMandate(accentColor, visualStyle, theme) {
  const themeDir = theme === 'light'
    ? 'LIGHT theme — light backgrounds, dark high-contrast text.'
    : theme === 'medium'
    ? 'MEDIUM theme — mid-tone backgrounds, light high-contrast text.'
    : 'DARK theme — dark backgrounds, light high-contrast text.';

  return `
## ART DIRECTION (you are the designer — make this scene look premium and distinct)
You have full creative control of the palette and visual treatment. The only fixed point is the brand accent and the theme direction below; everything else is your call.

- BRAND ACCENT: ${accentColor}. Use it as the primary brand anchor — but you are NOT limited to one color. Build a real, cohesive palette around it: neutrals, tints and shades, and a tasteful complementary or secondary color when it strengthens the design. Do NOT paint every element the same hue, and do NOT make the scene monochrome.
- THEME: ${themeDir} Keep strong text contrast. Choose the exact background colors and gradients yourself, and VARY them from scene to scene so the video never feels monotone.
- STYLE LEANING: "${visualStyle}" is a loose direction, not a rulebook. Interpret it freely. Above all, design what looks best for THIS specific scene and its mood — and deliberately VARY your treatment across scenes (glow vs flat, gradient vs solid, dense vs airy, bold vs restrained). Never apply one formula to every scene.
- Aim for the polish and variety of a modern launch video (Apple / Stripe / Linear / Arc). Two scenes in the same video should not look like the same template recolored.
`;
}

export function buildSceneDesignerPrompt(sceneScript, projectContext) {
  const canvasW     = projectContext.canvasWidth  ?? 1080;
  const canvasH     = projectContext.canvasHeight ?? 1920;
  const formatRatio = projectContext.formatRatio  ?? '9:16';
  const accentColor = projectContext.accentColor  || "#6366f1";
  const visualStyle = projectContext.visualStyle  || "radiant";
  const theme       = projectContext.theme        || "dark";
  const isTH        = projectContext.videoType === 'talking_head';
  const beatDuration = projectContext.beatDuration ?? null;
  const overlayMode  = projectContext.overlayMode === true;
  const regionTop    = projectContext.regionTop    ?? null;
  const regionHeight = projectContext.regionHeight ?? null;
  const previousScenesContext = projectContext.previousScenes?.length > 0
    ? `PREVIOUS SCENES ALREADY DESIGNED:
${projectContext.previousScenes.map(s => `Scene ${s.index} (${s.intent}): ${s.visual_concept}`).join("\n")}

Vary your visual approach from the scenes above where it serves the story — avoid repeating the same composition back-to-back (if the previous scene was typography-dominant, lean image/diagram/split here). Keep variety in service of clarity, never variety for its own sake.`
    : "";

  return {
    system: `You are a world-class motion graphics art director and premium SaaS promo video designer.
Your task is to design a single video scene frame from a voiceover script.
Output a single self-contained HTML file with inline CSS only.

Rules:
- No JavaScript. No SVG. No Canvas. No external assets.
- Google Fonts via @import allowed.
- Fixed size: ${canvasW}x${canvasH}px. Not responsive.
- All positioning, sizing, colors, filter, backdrop-filter, box-shadow, mix-blend-mode must be inline styles. Never in CSS classes.

REQUIRED data attributes on every meaningful element:
- data-role: headline | subhead | glow | card | step | stat-number | label | badge | background | divider | kicker | icon | logo
- data-layer: text | gradient | image | effect | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | slide-right | none
- data-scene-element: hero | background | workflow | decoration | supporting

CRITICAL LAYOUT RULE:
Every element must be positioned absolutely relative to the ${canvasW}x${canvasH}px canvas root.
Never nest positioned elements inside other positioned elements.
Every div must have position:absolute with explicit left and top values in pixels relative to the full canvas.
Never use right, bottom, flexbox, or grid for positioning.
x values must be between 0 and ${canvasW}. y values must be between 0 and ${canvasH}.

FONT SIZE OVERFLOW RULE — MANDATORY, CHECK EVERY ELEMENT:
- Formula: estimated_render_width = char_count × font_size × 0.65
- This MUST be ≤ the element's width. Reduce font_size until it fits.
- Single words: add white-space:nowrap;overflow:hidden — a word CANNOT be cut off at the canvas edge.
- COLUMN / CARD WIDTH is NOT 500px in a multi-column grid — compute it: column_width ≈ (${canvasW} − ~160 outer margin − gaps) ÷ number_of_columns. So on this canvas roughly: 2 columns ≈ 440px each, 3 columns ≈ 290px each, 4 columns ≈ 210px each. EVERY text element inside a card/column must fit its REAL column width — apply the formula above against that width, not 500.
- Inside a narrow card, size headings/labels to fit: a 3-column card grid usually needs heading font-size ≈ 28–40px (not 60px+). NEVER let a card heading or label break awkwardly mid-phrase — shrink the font until the longest line fits the card width cleanly.
- Words 8+ chars: max font-size 120px. Words 5–7 chars: max 180px. Always set an explicit width on every text element.

BUTTONS / CTA ELEMENTS — CRITICAL RULE, NO EXCEPTIONS:
❌ WRONG — two elements (causes text overflow and misalignment):
  <div style="position:absolute;left:80px;top:1700px;width:300px;height:60px;background:#FFD700;border-radius:8px;"></div>
  <div style="position:absolute;left:80px;top:1710px;">BUY NOW</div>
✅ CORRECT — one element, background on the text itself:
  <div data-role="cta" ... style="position:absolute;left:80px;top:1700px;background:#FFD700;color:#000;padding:18px 40px;border-radius:8px;font-size:28px;font-weight:800;white-space:nowrap;width:auto;">BUY NOW</div>
- ONE element only. Never a background div behind a text div.
- Always add white-space:nowrap so button text never wraps.

SPACING RULE:
Every text element must have at least 40px of vertical gap below it before the next element begins.
Before finalising top values, calculate each element's bottom edge: bottom = top + (font-size × line-count × line-height).
The next element's top must be ≥ that bottom + 40px.
Never let two text elements' vertical ranges overlap — even if one has a large font size that causes extra wrapping.

HEIGHT RULE:
Never set a fixed height on text elements. Only set left, top, and width — omit height entirely. The renderer calculates height from content and font size.

ANIMATION TIMING:
Design elements to appear progressively across the full scene duration.
Background/glow layers: data-animation="none" or data-animation="fade-in"
Headline: data-animation="fade-up"
Subhead: data-animation="fade-up"
Cards/visuals: data-animation="scale-in"
Labels/details: data-animation="slide-left" or data-animation="fade-in"
CTA elements: data-animation="scale-in"

ASSET PLACEHOLDERS:
When an image would strengthen the scene add:
<div data-role="image-placeholder" data-layer="image" data-asset-type="[stock|ai|asset]" data-asset-hint="[specific description]" data-animation="fade-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];border-radius:[r]px;background:rgba(255,255,255,0.04);"></div>
- stock: real photo of person/place/situation
- ai: abstract visual, illustration, concept art
- asset: product screenshot or recording
Maximum 1 placeholder per scene.

ICONS:
Use real Lucide icons instead of gradient boxes or CSS tricks whenever a concept can be represented iconically.
To use an icon, add data-icon="icon-name" to any data-role="icon" element.
Use standard Lucide icon names in kebab-case: bookmark, trending-up, graduation-cap, search, globe, wrench, zap, shield, star, heart, check-circle, arrow-right, book-open, code, terminal, users, lock, package, layers, bar-chart, etc.
The full Lucide library is available — use any icon name that exists in Lucide.
Style the icon container with a background color or gradient as usual. Set CSS color on the element to control the icon color.
Icons can replace image-placeholders for concepts that don't need a photo — a "save" concept needs a bookmark icon, not a stock photo.

AI IMAGE HINT RULES:
Write hints as one line, maximum 15 words. Describe what the camera sees — never describe emotions or feelings.
Always include: subject + context + lighting style.
BAD: "frustrated creator staring at screen" — GOOD: "creator at editing desk, video timeline on monitor, cinematic side lighting"
BAD: "person feeling overwhelmed with work" — GOOD: "cluttered desk, laptop with video editor open, warm overhead lighting"
BAD: "abstract creative frustration concept" — GOOD: "dark studio workspace, multiple screens, glowing UI, blue cinematic light"

${isTH ? `ASSET REQUIREMENTS FOR THIS SCENE:
Asset placeholders are OPTIONAL for TH video scenes.
Only include an image-placeholder if the visual_concept explicitly calls for a product screenshot or UI mockup.
NEVER include an image-placeholder for hook or cta scenes.
When in doubt, do NOT include a placeholder — use typography, cards, icons, and gradients instead.` : overlayMode ? "" : `ASSET DECISION — driven by the creative brief, not by a fixed rule:
${projectContext.wantsProductVisual
  ? `This scene SHOWS the product. The product image is the HERO — Include exactly ONE image-placeholder with data-asset-type="asset".
The asset hint must be specific, e.g. "product dashboard showing [product name] in action" or "close-up of [specific feature] in the [product name] interface".
Give the placeholder a large dedicated region (at least 45% of the canvas). Place a short headline and at most one supporting line in the REMAINING space. Do NOT build a competing list/card/step UI — the product image carries the scene.`
  : `This scene does NOT show the product UI. Do NOT use data-asset-type="asset".
If an atmospheric or conceptual visual genuinely strengthens the scene, you may use ONE data-asset-type="stock" (real photo) or "ai" (abstract/illustration) placeholder — otherwise use typography, cards, icons, and gradients only.`}
Maximum ONE image-placeholder per scene. Valid data-asset-type values are exactly: asset | stock | ai.

IMAGE-PLACEHOLDER = RESERVED ZONE (CRITICAL): The rectangle of ANY image-placeholder is exclusive. NO other element (headline, card, label, icon, divider, glow, text) may overlap its area — not even partially, not even a transparent one. A real image or screenshot will fill it; anything on top is covered and wasted. Lay every other element entirely OUTSIDE the placeholder rectangle (above, below, or beside it). Verify each element's box does not intersect the placeholder's left/top/width/height before writing it.`}
${buildDesignMandate(accentColor, visualStyle, theme)}
${beatDuration != null ? `
## SCREEN-TIME BUDGET — THIS FRAME IS ON SCREEN FOR ~${beatDuration.toFixed(1)} SECONDS (match complexity to time)
The viewer must absorb the whole frame in ${beatDuration.toFixed(1)}s. Build only what can be read in that time.
- ${beatDuration <= 2 ? `THIS IS A SHORT BEAT (≤2s): build ONE dominant element only — a single massive headline/word, or one big stat. NO cards, lists, grids, numbered steps, multi-icon layouts, or "interface" mockups. A short punchy idea is a typographic hit, not a built UI. 1–3 elements total (plus background/scrim).` :
     beatDuration <= 3.5 ? `THIS IS A MEDIUM BEAT (2–3.5s): one main element plus at most one supporting line or a small accent. Keep it instantly readable. Avoid dense multi-card / multi-step layouts.` :
     `This beat has enough time (>3.5s): you may build a richer structured composition (a card set, a short list, numbered steps) IF the idea genuinely needs that structure. Otherwise still prefer a clean focal layout.`}
- Never build a multi-element interface that cannot be read in ${beatDuration.toFixed(1)}s. Elaborate UI is only justified when the idea is conceptual AND has the time to land.` : ""}
${overlayMode ? `
## OVERLAY MODE — THIS FRAME SITS ON TOP OF A FULL-SCREEN PHOTO/IMAGE (overrides the background rules above)
- The canvas background MUST be transparent. Do NOT fill the background with a solid color or theme color. There is already an image behind this frame.
- Do NOT include any image-placeholder element — the background image is provided separately.
- Include exactly ONE readability scrim: a data-role="background" div with a dark gradient (e.g. linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)) so the text stays legible over the photo. The scrim is the only "background" element.
- Keep it lean: a strong headline and at most one supporting line. The photo carries the visual weight; your text reinforces it.
` : ""}
VISUAL LANGUAGE:
All text elements in the scene must be in English regardless of the voiceover language.
Headlines, subheads, labels, kickers, stats, badges — always English. Never Hindi, never Hinglish.

IMPORTANT:
This is NOT a website. This is NOT a landing page. This is NOT a dashboard.
This is a premium motion graphics video scene.

Read the script and determine the emotional message, visual story, focal point, and hierarchy.
Design the scene the way a professional motion designer would.
Think: Apple, Stripe, Linear, Arc, modern SaaS launch videos.

EXECUTION PRINCIPLE:
Every element must earn its place by directly representing something spoken. Design for instant comprehension of the spoken concept. Every element either communicates that concept or does not exist.
A meaningful headline that reinforces the concept is always allowed. Beyond that, build only what the spoken content explicitly shows.

EXAMPLES OF CORRECT EXECUTION:
- "Save this reel" → bookmark icon + bold CTA text. Nothing else.
- "Google doesn't highlight these websites" → Google search UI mockup. Nothing else.
- "Free Games, Open Source, Books, Tools" → grid of cards, one per category with icon and label. Nothing else.
- "The website is called Deep Web Nest" → product name large on screen. Nothing else.

COMPOSITION TOOLKIT (choose and combine whatever realizes the creative brief — these are options, NOT a fixed menu, and you may go beyond them):
- One massive headline owning the canvas — for a bold claim or hook.
- One dominant number with a radial glow — for a striking stat.
- Two clearly separated zones — for a comparison or before/after.
- Numbered rows or a card grid — for a list of items, features, or categories.
- A full-bleed image with text overlay — when an image is the hero (70%+ of canvas).
- A clean standalone CTA — when the action owns the canvas.
- A social-proof element (comment / review / testimonial) — for proof beats.
- Sequential steps — for showing how something works.
- A premium quote treatment — for a key statement.
Let the brief's focal point and feeling decide. One idea owns each frame — everything else is subordinate.

OUTPUT: Only the HTML. Nothing before DOCTYPE.
The html and body must use: width:${canvasW}px; height:${canvasH}px; overflow:hidden; margin:0;`,

    user: `${projectContext.archetype ? `LAYOUT TYPE: ${projectContext.archetype}\n\n` : ''}SCENE INTENT: ${projectContext.sceneIntent || "unknown"}
CANVAS FORMAT: ${formatRatio} — ${FORMAT_GUIDANCE[formatRatio] ?? FORMAT_GUIDANCE['9:16']}
SCENE SCRIPT:
${sceneScript}

CREATIVE BRIEF FOR THIS SCENE:
${projectContext.creativeBrief || projectContext.visualConcept || "Choose the best visual approach for this script"}
${overlayMode && regionTop != null && regionHeight != null ? `
LAYOUT REGION (MANDATORY): Place ALL text/content within the vertical band from y=${regionTop}px to y=${regionTop + regionHeight}px (this frame shares the canvas with an image in the other half). Keep every element's top inside this band.` : ""}
${projectContext.visual_source === 'categories' ? `
VISUAL SOURCE: CATEGORIES
The spoken content is a list of categories, features, or items.
Build the visual entirely in HTML — cards, tiles, icon grid, or bento layout.
DO NOT create any image-placeholder element.
The items themselves are the visual. Each item gets its own card with icon and label.
` : ''}
${projectContext.visual_source === 'asset' ? `
VISUAL SOURCE: ASSET
Include exactly one image-placeholder for the product screenshot or UI mockup.
` : ''}
${!isTH && !overlayMode && projectContext.wantsProductVisual ? `
ASSET DIRECTIVE: This scene shows the product — include exactly one image-placeholder with data-asset-type="asset". The product must be visually present.` : ""}
${!isTH && !overlayMode && projectContext.wantsProductVisual === false ? `
ASSET DIRECTIVE: This scene does not show the product UI. Do NOT use data-asset-type="asset". Use stock or ai imagery only if it strengthens the scene, or no image at all.` : ""}

${previousScenesContext}

PRODUCT: ${projectContext.productName}
TONE: ${projectContext.tone || "professional"}
TYPOGRAPHY: ${projectContext.typographyStyle || "modern"}
${projectContext.logoUrl ? `LOGO: ${projectContext.logoUrl}
Logo dimensions: ${projectContext.logoWidth || "unknown"}x${projectContext.logoHeight || "unknown"}px
Render logo at natural aspect ratio in hook and CTA scenes only.` : ""}
${projectContext.assetUrl ? `PRODUCT SCREENSHOT: ${projectContext.assetUrl}
Use as hero visual where relevant: <img data-role="card" data-layer="image" data-animation="scale-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];opacity:1;object-fit:contain;" src="${projectContext.assetUrl}" />` : ""}
${projectContext.patternName === 'custom' ? `
NOTE: The voiceover script was written by the user. Design visuals that complement this exact script. Do not suggest alternative copy.` : ""}`,
  };
}
