/**
 * intentPrompts.js
 * src/services/ai/promoVideo/v2/intentPrompts.js
 *
 * Builds the system + user prompt for the v2 scene designer.
 * The designer receives the raw script segment and designs freely.
 */

export function buildSceneDesignerPrompt(sceneScript, projectContext) {
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
- Fixed size: 1080x1920px. Not responsive.
- All positioning, sizing, colors, filter, backdrop-filter, box-shadow, mix-blend-mode must be inline styles. Never in CSS classes.

REQUIRED data attributes on every meaningful element:
- data-role: headline | subhead | glow | card | step | stat-number | label | badge | background | divider | kicker | icon | logo
- data-layer: text | gradient | image | effect | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | slide-right | none
- data-scene-element: hero | background | workflow | decoration | supporting

CRITICAL LAYOUT RULE:
Every element must be positioned absolutely relative to the 1080x1920 canvas root.
Never nest positioned elements inside other positioned elements.
Every div must have position:absolute with explicit left and top values in pixels relative to the full canvas.
Never use right, bottom, flexbox, or grid for positioning.

SPACING RULE:
Every text element must have at least 40px of vertical gap below it before the next element begins.

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

IMPORTANT:
This is NOT a website. This is NOT a landing page. This is NOT a dashboard.
This is a premium motion graphics video scene.

Read the script and determine the emotional message, visual story, focal point, and hierarchy.
Design the scene the way a professional motion designer would.
Think: Apple, Stripe, Linear, Arc, modern SaaS launch videos.

OUTPUT: Only the HTML. Nothing before DOCTYPE.`,

    user: `SCENE SCRIPT:
${sceneScript}

VISUAL CONCEPT FOR THIS SCENE:
${projectContext.visualConcept || "Choose the best visual approach for this script"}
${projectContext.sceneIntent === "solution" ? `
SOLUTION SCENE DIRECTIVE:
This scene introduces the product for the first time. Feature the product name "${projectContext.productName}" as the dominant typographic element — large, bold, unmissable. Use a clean, minimal composition that lets the name breathe. If a logo or product screenshot is available, use it prominently here.` : ""}

${previousScenesContext}

PRODUCT: ${projectContext.productName}
ACCENT COLOR: ${projectContext.accentColor || "#6366f1"}
VISUAL STYLE: ${projectContext.visualStyle || "radiant"}
TYPOGRAPHY: ${projectContext.typographyStyle || "modern"}
${projectContext.logoUrl ? `LOGO: ${projectContext.logoUrl}
Logo dimensions: ${projectContext.logoWidth || "unknown"}x${projectContext.logoHeight || "unknown"}px
Render logo at natural aspect ratio in hook and CTA scenes only.` : ""}
${projectContext.assetUrl ? `PRODUCT SCREENSHOT: ${projectContext.assetUrl}
Use as hero visual where relevant: <img data-role="card" data-layer="image" data-animation="scale-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];opacity:1;object-fit:contain;" src="${projectContext.assetUrl}" />` : ""}`,
  };
}
