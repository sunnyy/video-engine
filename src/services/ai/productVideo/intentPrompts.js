/**
 * intentPrompts.js
 * src/services/ai/productVideo/v2/intentPrompts.js
 *
 * Builds the system + user prompt for the product video scene designer (GPT-5.4).
 * Product-video-specific: always includes a product image zone, premium ecommerce aesthetic.
 */

const CANVAS_W = 1080;
const CANVAS_H = 1920;

function hexToRgba(hex, alpha) {
  const h = (hex ?? "#000000").replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(0,0,0,${alpha})`;
}

function buildDesignMandate(accentColor, theme = "dark", productMood = "premium") {
  const themeRules =
    theme === "light"
      ? `THEME: LIGHT
- Background must be very light: #ffffff, #f8f9fa, #fdf4f4, or a soft tint of the accent color at 5–8% opacity
- Text is near-black (#0a0a12, #111827, #1a1d2e)
- Glow effects use accent color at 10–15% opacity only — subtle, not dramatic
- No dark overlays. No black gradients. No near-black backgrounds.
- The product image zone sits on a soft light surface — gentle drop shadow instead of glow`
      : theme === "medium"
      ? `THEME: MEDIUM — COLOR-DERIVED
- Background must be a VISIBLY COLORED dark tone derived from the accent color — not near-black, not navy
- Target: roughly 15–25% lightness of the accent color so the color is clearly visible
- Examples: accent pink #FF6B9D → background #6b1535 or #7a1a3d; accent orange → #7a3010; accent green → #1a5c2a
- Use a radial gradient that goes from a slightly lighter version at center to the base color at edges
- The background must look like it BELONGS to the product's color family — someone should immediately associate it with the product
- Text is white or near-white (#ffffff, rgba(255,255,255,0.9))
- Glow effects use accent color at 40–60% opacity
- FORBIDDEN: near-black (#000, #0a0a0a, anything below 10% lightness), generic dark navy, pure white`
      : `THEME: DARK
- Background must be very dark: #04050a, #060812, #0a0a10, or a near-black tinted with the accent color
- Text is white or near-white (#ffffff, rgba(255,255,255,0.9))
- No light backgrounds. No white backgrounds.
- Glow effects use accent color at 30–50% opacity — rich and luminous`;

  return `
## DESIGN MANDATE — FOLLOW EXACTLY

### ACCENT COLOR: ${accentColor}
This is the brand color for the entire scene. Use it on:
- CTA buttons (solid fill)
- Badge backgrounds and borders
- Divider lines and accent elements
- Glow layers behind the product image zone
- Stat numbers and key labels

Derived values to use (copy these exactly):
- Full:       ${accentColor}
- 70% opacity: ${hexToRgba(accentColor, 0.7)}
- 40% opacity: ${hexToRgba(accentColor, 0.4)}
- 15% opacity: ${hexToRgba(accentColor, 0.15)}
- 8% opacity:  ${hexToRgba(accentColor, 0.08)}

FORBIDDEN: Do not use generic purple (#6366f1) or indigo unless that IS the accent color.
Background must use accent color in at least one radial gradient:
CORRECT: radial-gradient(circle at 50% 40%, ${hexToRgba(accentColor, 0.19)} 0%, transparent 55%)

### PRODUCT MOOD: ${productMood}
Let this mood influence the visual feel of every design decision:
  premium     → refined, minimal, generous breathing room, elegant thin typography
  playful     → vibrant, expressive, more elements, fun font weights
  minimalist  → ultra-clean, maximum whitespace, one focal point only
  bold        → high contrast, heavy type, aggressive composition, strong edges
  elegant     → sophisticated, thin fonts, soft details, restrained color usage
  organic     → warm tones, soft gradients, natural materials aesthetic

### ${themeRules}

### VISUAL STYLE: Premium Ecommerce
Think: the product's brand aesthetic — Apple, Glossier, MVMT, or whatever matches the product.
- Product is the hero — everything else frames it
- Clean typography — large, confident, lots of breathing room
- No clutter — fewer elements, more impact
`;
}

const INTENT_DIRECTIVES = {
  standalone: `STANDALONE SCENE — Complete product ad in one scene.
- Product image zone occupies upper 50–55% of canvas, centered.
- Brand name large below the product (80–120px, bold).
- One clear value statement below brand name (40–56px).
- CTA button: pill shape, solid accent fill, centered, bold text.
- Optional: offer badge or one feature label.
- Atmospheric background with glow behind product zone — follow the THEME from the DESIGN MANDATE exactly.
- Everything — desire, product, and action — in a single frame.`,

  hook: `HOOK SCENE — Scroll-stopping opener.
- No brand name or logo in this scene.
- Product image zone occupies upper 55–65% of canvas. Product is centered and large.
- Headline below the product zone — 2–4 words, massive font (120–160px), bold, all-caps.
- Optional: one short kicker above the product zone (tiny label, 24–32px, letter-spaced).
- Atmosphere: dramatic. Background and glow follow the THEME from the DESIGN MANDATE — do not override it.`,

  hero: `HERO SCENE — Brand introduction + main value statement.
- Product image zone on one side (left or right), occupies 45–55% of canvas width, full height or 60% height.
- Brand name large on the opposite side (100–140px, bold).
- One headline below brand name (48–64px, describing what it does).
- Optional: one or two short feature labels (icon + text) below headline.
- Bottom: no CTA here — this is a showcase, not a sell.`,

  features: `FEATURES SCENE — Specific product benefits.
- Product image zone at the top (40–50% of canvas height, centered).
- Below: 2–3 feature rows. Each row: icon + bold label (40–56px) + short descriptor (28–36px).
- Leave clear visual gap between product zone and feature list.
- Keep background consistent with the scene theme — glow-lit behind the product zone only.
- No CTA in this scene.`,

  offer: `OFFER SCENE — The deal, prominently stated.
- Product image zone at top-center (35–45% of canvas height).
- Large offer text below (120–180px for the number/discount, 40–56px for supporting text).
- Optional: badge or pill with "LIMITED TIME" or similar.
- Background: slightly different glow — maybe warmer or brighter to signal urgency.
- No CTA button here — just the offer.`,

  cta: `CTA SCENE — Final conversion push.
- Product image zone smaller (30–40% of canvas height, centered or offset).
- Brand name large (80–120px) below or beside product zone.
- CTA button: pill shape, solid accent-color fill, bold text (40–56px), centered, 600–700px wide.
- Website URL below button (24–32px, muted, letter-spaced).
- Keep it clean — this scene must feel like landing on a store page.`,
};

function getAssetDirective(intent) {
  if (intent === "standalone" || intent === "cta") {
    return `PRODUCT IMAGE DIRECTIVE:
Include a product image placeholder — smaller than other scenes.
data-asset-type="product" — this is where the product shot goes.
Position it above the brand name, centered, height ~35% of canvas.`;
  }
  return `PRODUCT IMAGE DIRECTIVE — MANDATORY:
You MUST include exactly one image placeholder with data-asset-type="product".
This is where the actual product photograph will be injected.
Make it large and prominent — it is the visual hero of this scene.
data-role="image-placeholder" data-layer="image" data-asset-type="product" data-asset-hint="[describe what the shot should show]"
Give it a subtle border-radius (12–24px) and a soft glow box-shadow using the accent color.`;
}

export function buildProductScenePrompt(sceneScript, projectContext) {
  const accentColor   = projectContext.accentColor   ?? "#7c5cfc";
  const theme         = projectContext.theme         ?? "dark";
  const productMood   = projectContext.productMood   ?? "premium";
  const brandName     = projectContext.brandName     ?? "Brand";
  const ctaText       = projectContext.ctaText       ?? "Shop Now";
  const offerText     = projectContext.offerText     ?? "";
  const website       = projectContext.website       ?? "";
  const sceneIntent   = projectContext.sceneIntent   ?? "hero";
  const archetype     = projectContext.archetype     ?? null;
  const visualConcept = projectContext.visualConcept ?? "";

  const intentDirective  = INTENT_DIRECTIVES[sceneIntent] ?? INTENT_DIRECTIVES.hero;
  const assetDirective   = getAssetDirective(sceneIntent);
  const designMandate    = buildDesignMandate(accentColor, theme, productMood);

  return {
    system: `You are a world-class motion graphics art director designing premium product advertisement scenes.
Output a single self-contained HTML file with inline CSS only.

Rules:
- No JavaScript. No SVG. No Canvas. No external assets.
- Google Fonts via @import allowed.
- Fixed size: ${CANVAS_W}x${CANVAS_H}px. Not responsive.
- All positioning must be absolute with explicit left and top in pixels.
- Never nest positioned elements inside other positioned elements.
- Never use flexbox or grid for positioning.

REQUIRED data attributes on every meaningful element:
- data-role: headline | subhead | kicker | badge | label | glow | card | background | divider | icon | "image-placeholder"
- data-layer: text | gradient | image | effect | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | none
- data-scene-element: hero | background | supporting | decoration | workflow

SPACING RULE:
Calculate each element's bottom edge: bottom = top + (font-size × line-count × line-height).
Next element's top must be ≥ that bottom + 40px. No vertical overlaps on text elements.

OVERFLOW PREVENTION — calculate before finalizing any font-size:
  Estimated render width = char_count × font-size × 0.60
  This must be ≤ element width. If not, reduce font-size until it fits.
  Single words cannot wrap in CSS — for a single-word element this is critical.
  Example: "GLOWING" = 7 chars → max font-size = floor(900 / (7 × 0.60)) = 214px.

HEIGHT RULE:
Never set a fixed height on text elements. Only set left, top, width — omit height. Renderer computes height.

BRAND NAME PLACEMENT:
Brand name appears ONLY in hero and cta scenes. In hook, features, and offer scenes: do NOT include the brand name anywhere.

ARCHETYPE DEFINITIONS — follow the layout structure for the assigned archetype:
  typography_hero:   Full-canvas text composition. No product image required. Big bold type fills the frame.
                     2–3 text elements max, massive font sizes (150–300px hero), centered or left-anchored.
  full_bleed_image:  Product image placeholder fills 65–80% of canvas height. Minimal text overlay (1–2 lines).
                     Text in a tight strip above or below the image zone.
  split_composition: Canvas split into two zones. Product image on one side (40–50% canvas width), all text on the other.
                     Left/right split — image and text never overlap.
  feature_grid:      Product image at top (30–40% canvas height). Below: 2–3 feature rows, each with icon + bold label + short descriptor.
                     Items evenly spaced, uniform left alignment, clear visual gap between product and features.
  single_stat:       One dominant number or stat takes center stage (180–280px font). Supporting text tiny above/below.
                     Everything else is minimal. Product image small or absent.
  minimal_cta:       Maximum whitespace. One CTA button, brand name, and product image — nothing else. No decoration.
                     Every element has generous breathing room (100px+ margins).
  numbered_list:     Numbered items (1. 2. 3.) stacked vertically with clear spacing. Number large and in accent color.
                     Item text medium weight. Product image small at top (25–35% canvas height).
  quote_statement:   Large bold statement fills most of the canvas (3–4 lines, 60–90px font).
                     Attribution or source sits small below. Product image minimal or absent.

PRODUCT IMAGE PLACEHOLDER FORMAT:
<div data-role="image-placeholder" data-layer="image" data-asset-type="product" data-asset-hint="[specific shot description]" data-animation="scale-in" data-scene-element="hero" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:5;border-radius:[r]px;background:rgba(255,255,255,0.04);box-shadow:0 0 60px ${accentColor}40;overflow:hidden;"></div>

ICONS:
Use Lucide icons via data-icon="icon-name" on data-role="icon" elements.
Available: check-circle, star, zap, shield, package, arrow-right, shopping-bag, heart, sparkles, etc.

${designMandate}

${intentDirective}

${assetDirective}

BACKGROUND ELEMENT — MANDATORY FIRST CHILD:
The very first element inside <body> must be a full-canvas solid background div:
<div data-role="background" data-layer="gradient" data-animation="none" data-scene-element="background" style="position:absolute;left:0;top:0;width:${CANVAS_W}px;height:${CANVAS_H}px;z-index:0;background:[SOLID COLOR FROM THEME — opaque, not transparent];"></div>
This div must use a SOLID OPAQUE background color from the THEME above — no rgba with low opacity, no transparent gradients.
Glow and atmosphere effects go in SEPARATE elements layered on top (z-index 1+), never replace the solid background.

OUTPUT: Only the HTML. Nothing before DOCTYPE.
The html and body must use: width:${CANVAS_W}px; height:${CANVAS_H}px; overflow:hidden; margin:0; background:transparent;`,

    user: `${archetype ? `LAYOUT TYPE: ${archetype}\n` : ""}SCENE INTENT: ${sceneIntent}
SCENE VOICEOVER:
${sceneScript}

VISUAL CONCEPT: ${visualConcept || "Choose the best visual approach for this script"}

BRAND: ${brandName}
${ctaText  ? `CTA TEXT: ${ctaText}`     : ""}
${offerText ? `OFFER: ${offerText}`     : ""}
${website   ? `WEBSITE: ${website}`     : ""}
ACCENT COLOR: ${accentColor}

Design a premium product ad scene. The product image placeholder is mandatory (except for pure-text hero scenes).
All text must be in English regardless of the voiceover language.`,
  };
}
