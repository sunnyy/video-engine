/**
 * intentPrompts.js
 * src/services/ai/promoVideo/v2/intentPrompts.js
 *
 * Builds the system + user prompt for the v2 scene designer.
 * The designer receives the raw script segment and designs freely.
 */

export const LAYOUT_VARIANTS = {
  hook: [
    "Headline dominates the upper two-thirds. One strong subhead below. Visual element or stock photo anchors bottom-right. Left-aligned text. Asymmetric composition.",
    "Single giant statement centered vertically. Nothing competing. Atmospheric glows only. Minimal — one idea, full impact.",
    "Split composition: problem copy left-aligned upper half, atmospheric visual or stock photo fills right side top to bottom. Text and visual coexist without overlapping.",
    "Visual metaphor or stock photo fills upper half as hero. Headline overlays bottom third with strong contrast. Subhead below headline.",
  ],
  frustration: [
    "Stacked list of pain points left side, each with small icon or marker. Atmospheric visual or stock photo right side. Kicker label top.",
    "Single large emotional statement upper half. Supporting detail cards below showing failed attempts. Dark moody atmosphere.",
    "Full-width headline top. Three small comparison cards below showing the failed workarounds side by side. Bottom has one emotional closer line.",
    "Stock photo of frustrated person dominates left. Text stack right — kicker, headline, subhead vertically arranged.",
  ],
  benefit: [
    "Outcome statement as giant hero text centered. One specific proof detail below in smaller text. Clean negative space. No cards.",
    "Split: before state implied left (muted, dark), after state right (accent color, bright). Headline bridges both sides.",
    "Large number or metric as focal hero. Label above explains what it means. Subhead below with context. Atmospheric glow behind number.",
    "Stock photo showing the positive outcome fills bottom half. Headline top. Subhead overlays photo edge with gradient mask.",
  ],
  process: [
    "Three numbered steps stacked vertically left side. Product visual or screenshot right side. Steps reveal sequentially.",
    "Horizontal flow — three steps connected by arrow or line. Each step has number, title, one-line description. Full width.",
    "Single step dominates each card. Large number accent color. Step title large. Description small. Three cards stacked with spacing.",
    "Hub and spoke: product name center circle, three or four inputs/outputs radiating outward with connecting lines and labels.",
  ],
  feature: [
    "Product screenshot or asset hero — large, centered, slight tilt. Feature name above. One benefit line below.",
    "Feature name giant top-left. Screenshot or visual bottom-right, partially cropped for depth. Subhead mid-left.",
    "Dark card containing the feature visual fills lower two-thirds. Feature name and benefit text above the card.",
    "Side by side: before (without feature) left muted, after (with feature) right vibrant. Feature name headline top.",
  ],
  proof: [
    "Giant number or metric centered. Label above in accent color. Context line below. Deep glow behind the number. Nothing else.",
    "Testimonial quote large and italic, centered. Attribution below. Simple atmospheric background. No decorative elements.",
    "Three metrics side by side in cards. Each has number, label, small context. Headline above explaining what these prove.",
    "Stock photo of happy customer or successful outcome fills right. Metric or proof statement left. Bold and confident.",
  ],
  comparison: [
    "Vertical split: left side dark/muted showing old way with label. Right side bright/accent showing new way with label. Clear dividing line.",
    "Before/after stack: old way top with strikethrough or muted treatment. New way bottom with accent color and energy.",
    "Three failed alternatives as small muted cards top. One large bright solution card bottom. Visual hierarchy shows the winner.",
    "Timeline: old process shown as long painful sequence. New process shown as single step. Dramatic contrast in length.",
  ],
  cta: [
    "Product name as giant hero text with gradient. Single action line below. Logo top. Clean and confident. Nothing competing.",
    "Outcome statement top — what life looks like after. Product name large below. CTA action line smallest at bottom.",
    "Split: what you get left as bullet outcomes. Product name and CTA right. Accent color on CTA side.",
    "Full atmospheric scene. Product name centered with glow. Tagline below. CTA pill button treatment at bottom.",
  ],
  statistic: [
    "Single number enormous and centered. Accent color. Label above. Context below. Deep atmospheric glow. Nothing else.",
    "Number left-aligned large. Label and context right. Divider line between. Clean and editorial.",
    "Number at top. Visual bar or progress indicator below showing scale. Context line at bottom.",
    "Dark card with number hero inside. Surrounding context labels outside the card. Depth through layering.",
  ],
};

export function buildSceneDesignerPrompt(sceneScript, projectContext) {
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

HEIGHT RULE:
Never set a fixed height on text elements. Only set left, top, and width — omit height entirely. The renderer calculates height from content and font size.

SPACING RULE:
Every text element must have at least 40px of vertical gap below it before the next element begins.
If a headline ends at y=580 (y + height = 580), the next element must start at y ≥ 620.
Dense layouts are acceptable — cramped layouts are not. Elements can be close but must never touch or overlap.

LAYOUT RULES:
1. Never split a single sentence or phrase across multiple elements. Each text element must contain complete, self-contained copy.
2. No two text elements may overlap vertically. If element A ends at y+height=600, element B must start at y≥620.

ASSET PLACEHOLDERS:
When a real image, photo, or visual would genuinely strengthen the scene, add a placeholder div.
Only add one per scene. Only add it when it truly improves the composition — not as filler.

Use this exact format:
<div
  data-role="image-placeholder"
  data-layer="image"
  data-asset-type="[stock|ai|asset]"
  data-asset-hint="[specific descriptive prompt]"
  data-animation="fade-in"
  data-scene-element="hero"
  style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];border-radius:[r]px;background:rgba(255,255,255,0.04);">
</div>

Asset type rules:
- "asset" — product screenshot or screen recording would fit (feature/process scenes)
- "stock" — real photo of a person, place, or situation would fit (hook frustration, benefit outcome)
- "ai" — abstract visual, illustration, or atmospheric concept art would fit

Asset hint must be specific enough to generate or find the right image:
- Good: "frustrated content creator at cluttered desk with multiple open browser tabs, late night, blue monitor glow"
- Bad: "person working"

CRITICAL LAYOUT RULE:
Every element must be positioned absolutely relative to the 1080x1920 canvas root.
Never nest positioned elements inside other positioned elements.
Every div must have position:absolute with explicit left and top values in pixels relative to the full canvas.
Never use right, bottom, flexbox, or grid for positioning.
Never place a div inside another div that has position:absolute — all elements are siblings at the root level.

CORRECT:
<div style="position:absolute;left:514px;top:860px;width:566px;height:400px;...">card background</div>
<div style="position:absolute;left:546px;top:892px;width:200px;...">card title text</div>

WRONG:
<div style="position:absolute;left:514px;top:860px;">
  <div style="position:relative;left:32px;">nested content</div>
</div>

IMPORTANT:
This is NOT a website. This is NOT a landing page. This is NOT a dashboard.
This is a premium motion graphics video scene.

Read the script and determine:
- the emotional message
- the visual story
- the focal point
- the hierarchy

Do not simply place text on screen.
Design the scene the way a professional motion designer would.

You decide composition, visual metaphor, focal point, typography, scale, depth, spacing, color palette, visual style.
Choose whatever best communicates the script.

If the script is about frustration: show tension, clutter, pressure.
If the script is about speed: show momentum, flow, acceleration.
If the script is about simplicity: show clarity, focus, reduction.

Think: Apple, Stripe, Linear, Arc, modern SaaS launch videos.

ANIMATION TIMING:
Design elements to appear progressively across the full scene duration — not all at once.
Early elements (background, atmosphere) appear first.
Hero content (headline) appears in the first third.
Supporting elements appear in the middle third.
Detail elements (labels, stats, cards) appear in the final third.
The scene should feel like it's building — not a static slide that appears all at once.
Assign data-animation values that reflect this progressive build:
- Background/glow layers: data-animation="none" or data-animation="fade-in"
- Headline: data-animation="fade-up"
- Subhead: data-animation="fade-up"
- Cards/visuals: data-animation="scale-in"
- Labels/details: data-animation="slide-left" or data-animation="fade-in"
- CTA elements: data-animation="scale-in"

OUTPUT: Only the HTML. Nothing before DOCTYPE.`,

    user: `SCENE SCRIPT:
${sceneScript}

PRODUCT: ${projectContext.productName}
ACCENT COLOR: ${projectContext.accentColor || '#6366f1'}
VISUAL STYLE: ${projectContext.visualStyle || 'radiant'}
TYPOGRAPHY: ${projectContext.typographyStyle || 'modern'}
${projectContext.logoUrl ? `LOGO: ${projectContext.logoUrl}
${projectContext.logoWidth && projectContext.logoHeight ? `Logo dimensions: ${projectContext.logoWidth}x${projectContext.logoHeight}px. Render at natural aspect ratio — if wider than tall, use width:180px and scale height proportionally; if taller than wide, use height:80px and scale width proportionally.` : `Render logo at a reasonable size (width:160-200px).`}
Use logo in hook and CTA scenes only. In all other scenes do NOT write the product name as text — omit it entirely.
Template: <img data-role="logo" data-layer="image" data-animation="fade-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];opacity:1;" src="${projectContext.logoUrl}" />` : ''}
${projectContext.assetUrl ? `PRODUCT SCREENSHOT: ${projectContext.assetUrl}
Use as hero visual where relevant: <img data-role="card" data-layer="image" data-animation="scale-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];opacity:1;object-fit:contain;" src="${projectContext.assetUrl}" />` : ''}
${projectContext.layoutVariant ? `
COMPOSITION DIRECTIVE:
${projectContext.layoutVariant}
Follow this composition direction. All creative decisions within this layout are yours — typography, colors, depth, atmosphere, decorative elements. Just anchor the overall structure to this directive.` : ''}`
  }
}
