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
- 3–4 glow layers using accent color at different opacities and blur levels
- Background has 2–3 radial gradient orbs using accent color
- Example background: radial-gradient(circle at 20% 30%, ${accentColor}40 0%, transparent 50%), linear-gradient(180deg, #04050a 0%, #06070b 100%)
- Dividers have box-shadow glow: "0 0 24px ${accentColor}80"
- Badges use gradient fills: "linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}15 100%)"
- Headline may have text-shadow: "0 0 30px ${accentColor}50"
- Overall feel: rich, glowing, premium`
    : visualStyle === 'minimal'
    ? `Minimal style — clean, sparse, purposeful.
- Maximum 1 glow layer, subtle, small
- No decorative dividers unless serving a purpose
- Badges: simple solid fill at 8% accent opacity with 1px accent border
- No text shadows on headline
- Lots of negative space — do not fill every corner
- Accent color appears on: key labels, CTA button, one stat number
- Overall feel: clean, confident, spacious`
    : visualStyle === 'professional'
    ? `Professional style — structured, trustworthy, corporate.
- Card-based layout — content sits in frosted glass or subtle dark cards
- Subtle single glow behind hero section only
- Dividers: thin 1px lines using accent at 30% opacity
- Badges: pill shape with accent border
- Typography is the hero — large, confident headlines
- Overall feel: polished, authoritative, enterprise-grade`
    : `High Contrast style — bold, striking, maximum legibility.
- Very dark background with very bright text
- Accent color at full saturation on key elements — no transparency on fills
- Bold thick dividers using solid accent color
- Headline at maximum font weight (900)
- No subtle effects — everything is deliberate and bold
- Overall feel: aggressive, energetic, bold`;

  const matrixKey = `${visualStyle}+${theme}`;
  const matrixRules =
    matrixKey === 'minimal+light'      ? `Light Minimal: white background (#ffffff), thin accent-colored borders, generous whitespace, accent for labels and CTA only.` :
    matrixKey === 'radiant+light'      ? `Light Radiant: off-white background (#f8f9ff), soft colored glows using accent at 10–15% opacity, accent-tinted gradients, light and airy.` :
    matrixKey === 'professional+light' ? `Light Professional: white background, card-based layout with subtle drop shadows, accent for headers and CTAs, clean grid structure.` :
    matrixKey === 'high-contrast+light'? `Light High Contrast: pure white background, accent color as bold fills and thick borders, maximum contrast with dark text.` :
    matrixKey === 'radiant+medium'     ? `Medium Radiant: mid-dark background (#1a1d2e), rich glows, accent at 30–50% on glow layers, vibrant feel.` :
    matrixKey === 'minimal+medium'     ? `Medium Minimal: dark-ish background (#1a1d2e), flat layout, accent used sparingly for key labels and dividers only.` :
    matrixKey === 'radiant+dark'       ? `Dark Radiant: near-black background, heavy glows, accent fully saturated on key elements, dramatic depth.` :
    matrixKey === 'minimal+dark'       ? `Dark Minimal: near-black background, no glows, accent color appears only on dividers, badge borders, and one CTA.` :
    matrixKey === 'professional+dark'  ? `Dark Professional: deep charcoal (#0c1118) background, structured cards, accent for highlights and structural lines.` :
    matrixKey === 'high-contrast+dark' ? `Dark High Contrast: pitch-black background, accent color fills hero elements completely, pure white text, maximum punch.` :
    `Apply ${visualStyle} principles on a ${theme} background as described above.`;

  return `
## DESIGN MANDATE — FOLLOW EXACTLY

### THEME: ${theme}
${themeRules}

### ACCENT COLOR: ${accentColor}
This is the PRIMARY color for the entire scene. It is NOT a subtle accent — it is the DOMINANT color.
EVERY gradient, glow, badge fill, divider, stat number, CTA button, and decorative element must use this color.

Derive these values and use them throughout:
- Full:  ${accentColor}   (solid fills, CTA buttons, strong glows)
- 70%:   ${accentColor}B3 (gradient midpoints, badge fills)
- 40%:   ${accentColor}66 (background glow layers)
- 15%:   ${accentColor}26 (subtle background tints, card fills)
- 8%:    ${accentColor}14 (very subtle overlays)

FORBIDDEN: Do not use purple (#6366f1, #8b5cf6), indigo, or blue unless that IS the accent color.
FORBIDDEN: Do not use generic "premium SaaS" default colors. Use ONLY ${accentColor}.

Background gradient MUST reference the accent color:
CORRECT: radial-gradient(circle at 20% 30%, ${accentColor}40 0%, transparent 50%)
WRONG: radial-gradient(circle at 20% 30%, rgba(99,102,241,0.20) 0%, transparent 50%)

### VISUAL STYLE: ${visualStyle}
${styleRules}

### STYLE + THEME MATRIX — you are generating: ${visualStyle} + ${theme}
${matrixRules}
`;
}

export function buildSceneDesignerPrompt(sceneScript, projectContext) {
  const canvasW     = projectContext.canvasWidth  ?? 1080;
  const canvasH     = projectContext.canvasHeight ?? 1920;
  const formatRatio = projectContext.formatRatio  ?? '9:16';
  const accentColor = projectContext.accentColor  || "#6366f1";
  const visualStyle = projectContext.visualStyle  || "radiant";
  const theme       = projectContext.theme        || "dark";
  const previousScenesContext = projectContext.previousScenes?.length > 0
    ? `PREVIOUS SCENES ALREADY DESIGNED:
${projectContext.previousScenes.map(s => `Scene ${s.index} (${s.intent}): ${s.visual_concept}`).join("\n")}

Your visual approach must be completely distinct from all scenes above. If previous scenes used typography-dominant layouts, use image or diagram-dominant. If previous scenes used centered compositions, use asymmetric or split. If previous scenes used cards, avoid cards. Surprise the viewer.`
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

AI IMAGE HINT RULES:
Write hints as one line, maximum 15 words. Describe what the camera sees — never describe emotions or feelings.
Always include: subject + context + lighting style.
BAD: "frustrated creator staring at screen" — GOOD: "creator at editing desk, video timeline on monitor, cinematic side lighting"
BAD: "person feeling overwhelmed with work" — GOOD: "cluttered desk, laptop with video editor open, warm overhead lighting"
BAD: "abstract creative frustration concept" — GOOD: "dark studio workspace, multiple screens, glowing UI, blue cinematic light"

ASSET REQUIREMENTS BY INTENT — this is mandatory, not optional:
- solution: MUST include one image-placeholder with data-asset-type="asset". Shows the actual product interface.
- feature: MUST include one image-placeholder with data-asset-type="asset". Shows the feature in action.
- process: MUST include one image-placeholder with data-asset-type="asset". Shows the workflow or onboarding.
- proof: SHOULD include one image-placeholder with data-asset-type="asset" if showing results or metrics.
- hook: NEVER use data-asset-type="asset" — use stock or ai only. Hook shows pain, not product.
- problem: NEVER use data-asset-type="asset" — use stock or ai only.
- cta: NEVER use data-asset-type="asset" — keep clean and typographic.
- standalone: MUST include one image-placeholder with data-asset-type="asset". Shows the product.

For asset hints on product scenes, be specific:
- solution: "product dashboard or main interface showing [product name] in action"
- feature: "close-up of [specific feature] in the [product name] interface"
- process: "step-by-step view of [product name] workflow or onboarding screen"
- standalone: "product main interface or dashboard screenshot"
${buildDesignMandate(accentColor, visualStyle, theme)}
VISUAL LANGUAGE:
All text elements in the scene must be in English regardless of the voiceover language.
Headlines, subheads, labels, kickers, stats, badges — always English. Never Hindi, never Hinglish.

IMPORTANT:
This is NOT a website. This is NOT a landing page. This is NOT a dashboard.
This is a premium motion graphics video scene.

Read the script and determine the emotional message, visual story, focal point, and hierarchy.
Design the scene the way a professional motion designer would.
Think: Apple, Stripe, Linear, Arc, modern SaaS launch videos.

OUTPUT: Only the HTML. Nothing before DOCTYPE.
The html and body must use: width:${canvasW}px; height:${canvasH}px; overflow:hidden; margin:0;`,

    user: `SCENE INTENT: ${projectContext.sceneIntent || "unknown"}
CANVAS FORMAT: ${formatRatio} — ${FORMAT_GUIDANCE[formatRatio] ?? FORMAT_GUIDANCE['9:16']}
SCENE SCRIPT:
${sceneScript}

VISUAL CONCEPT FOR THIS SCENE:
${projectContext.visualConcept || "Choose the best visual approach for this script"}
${projectContext.sceneIntent === "solution" ? `
SOLUTION SCENE DIRECTIVE:
This scene introduces the product for the first time. Feature the product name "${projectContext.productName}" as the dominant typographic element — large, bold, unmissable. Use a clean, minimal composition that lets the name breathe. Include a product screenshot placeholder (data-asset-type="asset") prominently.` : ""}
${["solution", "feature", "process", "standalone"].includes(projectContext.sceneIntent) ? `
ASSET DIRECTIVE: You MUST include exactly one image-placeholder with data-asset-type="asset" in this scene. This is not optional. The product must be visually present.` : ""}
${["hook", "problem", "cta"].includes(projectContext.sceneIntent) ? `
ASSET DIRECTIVE: Do NOT use data-asset-type="asset" in this scene. Use stock or ai imagery only, or no image at all.` : ""}

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
