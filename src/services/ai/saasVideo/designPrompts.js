/**
 * designPrompts.js
 * src/services/ai/saasVideo/designPrompts.js
 *
 * Scene designer prompt for the SaaS Video (v3) pipeline.
 *
 * Key differences from the v2 promo designer prompt:
 *   1. DURATION-AWARE — TTS runs before design, so every scene knows its exact
 *      airtime. Element budget scales with duration.
 *   2. ASSET-GROUNDED — three visual sources, all guaranteed renderable:
 *      "screenshot" embeds a real harvested screenshot URL, "mockup" builds a
 *      stylized UI in pure HTML, "typographic" uses no imagery.
 *      There is NO pending-placeholder path. Ever.
 *   3. Brand name restricted to solution/cta scenes (the v2 prompt lost this rule).
 *   4. Vertical-overlap rule scoped to same-column elements (v2's global rule
 *      contradicted split/side-by-side layouts).
 *   5. Mandatory self-check pass before output.
 *   6. No "previous scenes" ban-list — variety is planned by the director,
 *      which is what allows parallel design.
 */

const FORMAT_GUIDANCE = {
  '9:16': 'Vertical canvas. Stack elements top-to-bottom. Hero content in upper half. Supporting content below.',
  '16:9': 'Horizontal canvas. Distribute elements left-to-right. Left third for text, right two-thirds for visuals, or split 50/50.',
  '1:1':  'Square canvas. Center-focused composition. Balance elements around the center.',
};

// ── Style × theme design mandate (proven in v2 — kept, lightly tightened) ───

function buildDesignMandate(accentColor, visualStyle, theme, isFootage = false) {
  if (isFootage) {
    return `
## DESIGN MANDATE — OVERLAY STYLING

### ACCENT COLOR: ${accentColor}
Use it on: the CTA/badge fill, one stat number or keyword highlight, thin divider accents.
Derived values: 70% ${accentColor}B3, 40% ${accentColor}66, 15% ${accentColor}26.
Text is white (#ffffff / rgba(255,255,255,0.92)) with text-shadow for legibility — the scrim plus shadow carries contrast, not boxes behind text.
FORBIDDEN on footage scenes: glow orb divs, decorative gradients, full-canvas tints beyond the single scrim.`;
  }

  const themeRules = theme === 'dark'
    ? `- Background must be very dark: #04050a, #060812, #07080f or similar near-black
- Text is white or near-white (#ffffff, #f8faff, rgba(255,255,255,0.85))
- No light backgrounds. No white backgrounds. No grey backgrounds.`
    : theme === 'medium'
    ? `- Background is mid-tone dark: #1a1d2e, #16192a, #1c1f35 or similar
- Text is white or light (#ffffff, rgba(255,255,255,0.90))
- No near-black backgrounds. No white backgrounds.`
    : `- Background must be very light: #ffffff, #f8f9fa, #f4f6ff or similar near-white
- Text is near-black (#0a0b12, #111827, #1a1d2e)
- No dark backgrounds. No black backgrounds. No rgba dark overlays.`;

  const styleRules = visualStyle === 'radiant'
    ? `Radiant style — layered glows, rich gradients, luminous depth.
- 2–4 glow layers using the accent color at different opacities and blur levels
- Glow elements are DIVS with radial-gradient backgrounds — NEVER text elements with glow styling
- Background has 2–3 radial gradient orbs using the accent color
- Dividers may have box-shadow glow: "0 0 24px ${accentColor}80"
- Overall feel: rich, glowing, premium`
    : visualStyle === 'minimal'
    ? `Minimal style — clean, sparse, purposeful.
- Maximum 1 glow layer, subtle, small
- No decorative dividers unless serving a purpose
- Lots of negative space — do not fill every corner
- Accent color appears on: key labels, CTA button, one stat number
- Overall feel: clean, confident, spacious`
    : visualStyle === 'professional'
    ? `Professional style — structured, trustworthy, corporate.
- Card-based layout — content sits in frosted glass or subtle cards
- Subtle single glow behind the hero section only
- Dividers: thin 1px lines using accent at 30% opacity
- Typography is the hero — large, confident headlines
- Overall feel: polished, authoritative, enterprise-grade`
    : `High Contrast style — bold, striking, maximum legibility.
- Accent color at full saturation on key elements — no transparency on fills
- Headline at maximum font weight (900)
- No subtle effects — everything is deliberate and bold
- Overall feel: aggressive, energetic, bold`;

  return `
## DESIGN MANDATE — FOLLOW EXACTLY

### THEME: ${theme}
${themeRules}

### ACCENT COLOR: ${accentColor}
This is the DOMINANT color of the scene, not a subtle accent.
Derive these values and use them throughout:
- Full:  ${accentColor}   (solid fills, CTA buttons, strong glows)
- 70%:   ${accentColor}B3 (gradient midpoints, badge fills)
- 40%:   ${accentColor}66 (background glow layers)
- 15%:   ${accentColor}26 (subtle background tints, card fills)
- 8%:    ${accentColor}14 (very subtle overlays)

FORBIDDEN: generic "premium SaaS" purple/indigo defaults — use ONLY ${accentColor} unless that IS the accent.
Background gradients MUST reference the accent color:
CORRECT: radial-gradient(circle at 20% 30%, ${accentColor}40 0%, transparent 50%)
WRONG:   radial-gradient(circle at 20% 30%, rgba(99,102,241,0.20) 0%, transparent 50%)

### VISUAL STYLE: ${visualStyle}
${styleRules}`;
}

// ── Duration → element budget ────────────────────────────────────────────────

function elementBudget(durationSeconds) {
  if (durationSeconds < 2.6) return { max: 4, note: "VERY short scene — background + headline + at most 2 supporting elements. Nothing else." };
  if (durationSeconds < 4.2) return { max: 6, note: "Short scene — background, glow, headline, and up to 3 supporting elements." };
  if (durationSeconds < 6.0) return { max: 8, note: "Medium scene — full composition allowed, but every element must still earn its place." };
  return { max: 10, note: "Long scene — full composition. Use progressive reveals to hold attention." };
}

// ── Visual source directives ─────────────────────────────────────────────────

function visualSourceDirective(scene, screenshotUrl, canvasW = 1080, canvasH = 1920) {
  if (scene.background?.kind === "video" || scene.background?.kind === "image") {
    return `
VISUAL SOURCE: REAL ${scene.background.kind === "video" ? "STOCK FOOTAGE" : "PHOTOGRAPH WITH MOTION"} (injected by the pipeline — you do NOT embed it)
The pipeline places ${scene.background.kind === "video" ? "a real video clip" : "a moving photograph"} behind your design: "${scene.shot_query ?? "cinematic footage"}".
YOU ARE DESIGNING OVERLAYS ON FOOTAGE. Hard rules:
- body background MUST be transparent (background: transparent on html and body).
- Include EXACTLY ONE scrim element — the legibility layer over the footage. EXPLICIT PIXELS, never percentages:
  <div data-role="background" data-layer="gradient" data-animation="none" data-scene-element="background" style="position:absolute;left:0px;top:0px;width:${canvasW}px;height:${canvasH}px;background:linear-gradient(180deg, rgba(2,4,10,0.32) 0%, rgba(2,4,10,0.45) 55%, rgba(2,4,10,0.85) 100%);"></div>
  Footage brightness is unpredictable — the scrim must NEVER drop below rgba alpha 0.28 at any point, and must be strongest where your text sits (shift the gradient direction toward your text block).
  It must stay SEMI-TRANSPARENT — never opaque, never a solid color, never a designed gradient that hides the footage.
- NO glow orbs. NO decorative shapes. NO full-canvas cards. NO image elements. The footage IS the visual.
- Maximum 4 content elements on top of the scrim (headline / stat / badge / kicker / icon / CTA). Fewer is better.
- Text gets strong presence: big, bold, text-shadow allowed (0 2px 24px rgba(0,0,0,0.6)).
- This must read as designed motion-graphics over film — NOT as captions slapped on a video. Use hierarchy: one dominant element, supporting elements clearly subordinate.`;
  }
  if (scene.visual_source === "screenshot" && screenshotUrl) {
    return `
VISUAL SOURCE: REAL PRODUCT SCREENSHOT
This scene features a real screenshot of the product. Embed it with an <img> tag:
<img data-role="card" data-layer="image" data-animation="scale-in" data-scene-element="hero" src="${screenshotUrl}" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];object-fit:cover;object-position:top;border-radius:24px;" />
- Frame it like a premium device/browser mockup: rounded corners (20-28px), a subtle border div (1px rgba accent 30%), and a soft shadow glow div BEHIND it.
- The screenshot is a wide desktop capture — give it generous width (900-1000px on a 1080 canvas) and crop height via object-fit:cover with object-position:top.
- On a vertical canvas use a STACKED composition: screenshot as the wide hero (full-ish width), text above or below it. Do NOT squeeze text into a narrow side column next to the screenshot — side-by-side splits are for landscape, not 9:16.
- Do NOT create any other image element or placeholder in this scene.`;
  }
  if (scene.visual_source === "mockup") {
    return `
VISUAL SOURCE: HTML UI MOCKUP
No real screenshot exists for this scene. Build a STYLIZED product UI mockup in pure HTML — this is a signature of this studio, make it beautiful.
AN EMPTY FRAME IS A FAILURE. The frame must visibly contain UI. MANDATORY CHECKLIST — all of these INSIDE the frame, positioned with canvas-absolute pixels that fall within the frame's bounds:
1. A top bar strip with 3 small circle divs (window dots)
2. At least 3 abstract content shapes: sidebar bars, progress bars, or chart columns (divs with accent-color fills at varying heights/opacities)
3. At least one large stat number or short label element
4. One accent-highlighted element (a "primary button" pill or active chart bar)
Rules:
- Keep it ABSTRACT and elegant: shapes and bars, not readable fake text (except the stat/label)
- Everything inside the frame uses the accent alpha ladder for cohesion
- Do NOT create any image element or image-placeholder. The mockup IS the visual.`;
  }
  return `
VISUAL SOURCE: TYPOGRAPHIC
No imagery in this scene. The design is typography, Lucide icons, gradient shapes, and glow — nothing else.
Do NOT create any image element or image-placeholder.`;
}

// ── Main prompt builder ──────────────────────────────────────────────────────

export function buildSaasScenePrompt(scene, brief, ctx) {
  const canvasW     = ctx.canvasWidth  ?? 1080;
  const canvasH     = ctx.canvasHeight ?? 1920;
  const formatRatio = ctx.formatRatio  ?? '9:16';
  const accent      = brief.accent_color;
  const duration    = scene.duration_seconds ?? 4;
  const budget      = elementBudget(duration);
  const screenshotUrl = scene.screenshot_index != null ? (ctx.screenshotUrls?.[scene.screenshot_index] ?? null) : null;
  const isFootage     = scene.background?.kind === "video" || scene.background?.kind === "image";

  const brandNameAllowed = ["solution", "cta"].includes(scene.intent);

  // Caption band: captions render at ~77-88% of canvas height when enabled
  const capTop    = Math.round(canvasH * 0.77);
  const capBottom = Math.round(canvasH * 0.885);
  const coverageFloor = Math.round(canvasH * 0.74); // composition must reach at least this far down
  const captionRule = ctx.includeCaptions
    ? `CAPTION-SAFE ZONE — RESERVED, DO NOT USE:
Word-synced captions are burned in later across y=${capTop} to y=${capBottom}, full width.
NO text, icon, card, button, or image may intersect that band. Background gradients and soft glows may pass through it; nothing else.
Content may sit ABOVE the band (up to y=${capTop - 40}) and BELOW it (y=${capBottom + 40} to y=${canvasH - 60}) — a kicker, divider, or icon row below the band is a great way to ground the composition.`
    : `BOTTOM MARGIN: keep the lowest 60px of the canvas clear.`;

  // Composition rules differ fundamentally: footage scenes are overlay design,
  // designed scenes (mockup/typographic/screenshot) own the whole canvas.
  const compositionBlock = isFootage
    ? `COMPOSITION — OVERLAYS ON FOOTAGE:
- The footage owns the canvas. Your overlays punctuate it; they do not fill it.
- One dominant element (usually upper third or center), supporting elements grouped near it or anchored low.
- Generous breathing room — empty footage is GOOD here, it is the production value.
${captionRule}`
    : `VERTICAL COVERAGE — THE COMPOSITION MUST OWN THE FULL CANVAS:
- This is a ${canvasH}px tall frame. Clustering everything in the top half and leaving the bottom ~45% as empty glow is a FAILURE.
- At least one non-background element (icon row, stat, divider, card, kicker, or the hero visual itself) must reach down to y=${coverageFloor} or beyond.
- Distribute deliberately: hero in the upper third, supporting elements through the middle, an anchoring element in the lower third.
- No vertical void larger than ~480px between consecutive content elements — if a gap that large appears, move an element into it or enlarge the hero.
- Decorative-only filler does not count as anchoring — the lower element must carry meaning (a label, icon+word, stat, or CTA support line).

${captionRule}`;

  const system = `You are a world-class motion graphics art director designing one frame of a premium SaaS promo video.
Output a single self-contained HTML file with inline CSS only.

STRUCTURAL RULES (the parser depends on these — violations break the render):
- No JavaScript. No SVG. No Canvas. No external assets except the real screenshot URL if provided below.
- Google Fonts via @import allowed (max 2 families).
- Fixed size: ${canvasW}x${canvasH}px. Not responsive.
- Every meaningful element: position:absolute with explicit left/top in pixels relative to the ${canvasW}x${canvasH} canvas root. Never use right, bottom, flexbox, or grid for positioning. Never nest positioned elements.
- All styling inline. Never in CSS classes (only @import lives in <style>).
- Required data attributes on every meaningful element:
  data-role: headline | subhead | glow | card | step | stat-number | label | badge | background | divider | kicker | icon | logo
  data-layer: text | gradient | image | effect | decoration
  data-animation: fade-in | fade-up | scale-in | slide-left | slide-right | none
  data-scene-element: hero | background | workflow | decoration | supporting

TIMING — THIS SCENE IS EXACTLY ${duration.toFixed(1)} SECONDS ON SCREEN:
- ELEMENT BUDGET: maximum ${isFootage ? Math.min(5, budget.max) : budget.max} elements total (background/scrim and glows count). ${isFootage ? "Footage scene — overlays only, fewer is better." : budget.note}
- The hero element must be readable within the first 0.5s — give it data-animation="fade-up" and keep it dominant.
- A viewer gets ~2 words of reading per second. Total on-screen words across ALL elements must not exceed ${Math.max(4, Math.round(duration * 2.5))}.

${compositionBlock}

FONT SIZE OVERFLOW RULE — CHECK EVERY TEXT ELEMENT:
- estimated_render_width = longest_line_char_count × font_size × 0.65 — MUST be ≤ the element's width.
- Single words: white-space:nowrap. A word CANNOT be cut at the canvas edge.
- Words 8+ chars: max font-size 120px. Words 5–7 chars: max 180px. Always set an explicit width on every text element.
- Never set a fixed height on text elements — only left, top, width.

SPACING RULE (applies to elements in the SAME column — side-by-side columns are exempt):
- Within a column, a text element's bottom edge (top + font-size × line-count × 1.25) must be ≥ 40px above the next element's top.
- Two-column/split layouts are allowed and encouraged where the archetype calls for it — columns are independent for this rule.

BUTTONS / CTA — ONE element only, background on the text element itself, padding 18-22px 40-48px, white-space:nowrap. NEVER a background div behind a separate text div.

GLOW RULE: glow elements are divs with radial-gradient backgrounds and data-role="glow". Never apply glow styling to text elements (text-shadow on a headline is fine; a "glow element" made of text is not).

BRAND NAME RULE — STRICT:
${brandNameAllowed
  ? `This is a ${scene.intent} scene — the product name "${brief.product_name}" SHOULD appear as a prominent element.`
  : `This is a ${scene.intent} scene — the product name "${brief.product_name}" must NOT appear anywhere in this scene. No logo, no name, no watermark. The concept carries the scene.`}

ICONS: use real Lucide icons via data-icon="kebab-case-name" on data-role="icon" elements (bookmark, trending-up, zap, shield, bar-chart, users, check-circle, arrow-right, layers, etc. — full Lucide library available). Icons replace imagery for concepts that don't need a photo.
${visualSourceDirective(scene, screenshotUrl, canvasW, canvasH)}
${buildDesignMandate(accent, brief.visual_style, brief.theme, isFootage)}

ARCHETYPE: ${scene.archetype} — what owns the canvas:
typography_hero — large text owns the canvas. single_stat — one dominant number. split_composition — two clearly separated zones, one idea each. numbered_list — the numbered rows. feature_grid — the card grid. full_bleed_image — the visual owns 70%+, text is overlay. minimal_cta — the CTA text and action element. proof_social — the testimonial/review element. process_steps — sequential steps reading as progression. quote_statement — the quote, attribution below.
Every element must directly represent something spoken. A meaningful headline reinforcing the concept is always allowed. Beyond that, build only what the spoken content shows.

LANGUAGE: all on-screen text in ${ctx.onScreenLanguage ?? "English"}.

This is NOT a website or landing page. It is a premium motion-graphics video frame. Think Apple, Stripe, Linear launch videos.

SELF-CHECK — before emitting output, verify silently and fix violations:
1. Element count ≤ ${isFootage ? Math.min(5, budget.max) : budget.max}. 2. Every text element passes the overflow formula. 3. No same-column vertical overlaps. 4. Brand name rule respected. 5. All positions within 0..${canvasW} x 0..${canvasH}. 6. Every element has all four data attributes. ${isFootage ? "7. body background is transparent and exactly one semi-transparent scrim exists. 8. No glow orbs or image elements." : `7. A meaningful element reaches y=${coverageFloor}+.`} ${ctx.includeCaptions ? `9. Nothing except background/glow intersects y=${capTop}-${capBottom}.` : ""}

OUTPUT: only the HTML. Nothing before <!DOCTYPE html>. The html and body use width:${canvasW}px;height:${canvasH}px;overflow:hidden;margin:0;`;

  const user = `SCENE ${scene.scene_index} — INTENT: ${scene.intent}
ARCHETYPE: ${scene.archetype}
DURATION: ${duration.toFixed(1)}s
CANVAS: ${formatRatio} — ${FORMAT_GUIDANCE[formatRatio] ?? FORMAT_GUIDANCE['9:16']}

SPOKEN SCRIPT FOR THIS SCENE:
"${scene.script_segment}"

DIRECTOR'S VISUAL CONCEPT:
${scene.visual_concept}

PRODUCT: ${brief.product_name} (${brief.niche})
POSITIONING: ${brief.positioning}

Design this frame.`;

  return { system, user };
}
