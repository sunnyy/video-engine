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
- Glow accent elements (radial-gradient divs, subtle, z-index 1–2)
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
  standalone: `STANDALONE SCENE — Complete product ad in one scene overlaid on the product photograph.
- NO product image element — the background IS the product photograph.
- Brand name large, centered or left-aligned (80–120px, bold, white with text-shadow).
- One clear value statement below brand name (40–56px, white).
- CTA button: pill shape, solid accent fill, centered, bold text.
- Optional: offer badge or one feature label.
- Everything — desire and action — as text/UI floating on the photograph.`,

  hook: `HOOK SCENE — Scroll-stopping opener overlaid on the product photograph.
- NO product image element — the background IS the product photograph.
- No brand name or logo in this scene.
- Headline: 2–4 words, massive font (120–160px), bold, all-caps, white, centered in upper-middle area.
- Optional: one short kicker above the headline (tiny label, 24–32px, letter-spaced, white).
- Let the photo breathe — minimal text, maximum impact.`,

  hero: `HERO SCENE — Brand introduction + main value statement overlaid on the product photograph.
- NO product image element — the background IS the product photograph.
- Brand name large, placed in upper 30% of canvas (100–140px, bold, white with text-shadow).
- One headline below brand name (48–64px, describing what it does, white).
- Optional: one or two short feature labels (icon + text) below headline.
- Text grouped in one vertical stack — do not scatter elements.`,

  features: `FEATURES SCENE — Specific product benefits overlaid on the product photograph.
- NO product image element — the background IS the product photograph.
- 2–3 feature rows in the lower 50–60% of the canvas. Each row: icon + bold label (40–56px) + short descriptor (28–36px).
- Optionally add a semi-transparent pill or card behind the feature rows (rgba(0,0,0,0.35), border-radius 16px) to lift text off the photo.
- Upper area intentionally minimal — let the product in the photo be visible.
- No CTA in this scene.`,

  offer: `OFFER SCENE — The deal, prominently stated, overlaid on the product photograph.
- NO product image element — the background IS the product photograph.
- Large offer text centered vertically (120–180px for the number/discount, 40–56px for supporting text).
- Optional: badge or pill with "LIMITED TIME" or similar — use accent color fill.
- Keep text grouped — upper and lower sections of the photo should remain visible.
- No CTA button here — just the offer text.`,

  cta: `CTA SCENE — Final conversion push overlaid on the product photograph.
- NO product image element — the background IS the product photograph.
- Brand name (80–120px, white, text-shadow) in the upper third of the canvas.
- CTA button in the lower third: pill shape, solid accent-color fill, bold text (40–56px), centered, 600–700px wide.
- Website URL below button (24–32px, rgba(255,255,255,0.7), letter-spaced).
- Keep center area mostly open so the product in the photograph shows through.`,
};

// The product shot is injected via a data-asset-type="product-shot" placeholder.
// GPT includes the placeholder as the first element and designs overlay elements on top.
function getAssetDirective() {
  return `BACKGROUND — PRODUCT PHOTOGRAPH PLACEHOLDER:
The canvas background is a full-bleed product photograph. Use this EXACT element as the first child of <body>:
<div data-role="image-placeholder" data-layer="image" data-asset-type="product-shot" data-animation="none" data-scene-element="background" style="position:absolute;left:0;top:0;width:${CANVAS_W}px;height:${CANVAS_H}px;z-index:0;"></div>

The photograph has the product in the LOWER 50–60% of the frame. The upper 40–50% is open background (sky, surface, wall — clear space for text).
You MUST add gradient overlay divs over the photo so text remains legible:
  Top vignette:    background:linear-gradient(180deg,rgba(0,0,0,0.52) 0%,transparent 28%); left:0;top:0;width:${CANVAS_W}px;height:540px;z-index:1;
  Bottom dark:     background:linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.62) 42%,transparent 72%); left:0;top:960px;width:${CANVAS_W}px;height:960px;z-index:1;
Adjust opacity to match product theme — dark products need stronger overlays.
All text elements must have text-shadow: 0 2px 12px rgba(0,0,0,0.7) for legibility.`;
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
  const displayText   = projectContext.displayText   ?? "";

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

GLOW ELEMENTS — gradient divs only, NEVER text:
- data-role="glow" elements MUST be <div> with a radial-gradient background and filter:blur(…).
- NEVER put any text content inside a glow element.
- Do NOT create duplicate/echo text elements as ghost shadows. Every word appears exactly once.

BUTTONS / CTA ELEMENTS — background on the text itself:
- NEVER create a separate background div behind a text element to make a button.
- Apply background, padding, border-radius directly on the text element: style="background:${accentColor}; padding:18px 48px; border-radius:999px; …"
- This keeps button text on one line and prevents wrapping from two-element button layouts.

BRAND NAME PLACEMENT:
Brand name appears ONLY in hero and cta scenes. In hook, features, and offer scenes: do NOT include the brand name anywhere.

ARCHETYPE DEFINITIONS — follow the layout structure for the assigned archetype.
NOTE: The background IS the product photograph. Do NOT add any product image element. All archetypes are text/UI only.
  typography_hero:   Big bold type fills the frame. 2–3 text elements max, massive font sizes (150–300px hero), centered or left-anchored.
  full_bleed_image:  Minimal text overlay (1–2 lines). Text in a tight strip at the top or bottom of the canvas — let the photo breathe.
  split_composition: Text stack on one side (left or right, 40–50% canvas width), right/left side intentionally empty so the product in the photo shows.
  feature_grid:      Text headline in upper 25% of canvas. Below: 2–3 feature rows, each with icon + bold label + short descriptor. Semi-transparent card behind feature rows optional.
  single_stat:       One dominant number or stat takes center stage (180–280px font). Supporting text tiny above/below. Everything else is minimal.
  minimal_cta:       Maximum whitespace. One CTA button and brand name — nothing else. Every element has generous breathing room (100px+ margins).
  numbered_list:     Numbered items (1. 2. 3.) stacked vertically with clear spacing. Number large and in accent color. Item text medium weight.
  quote_statement:   Large bold statement fills most of the canvas (3–4 lines, 60–90px font). Attribution or source sits small below.

ICONS — use Lucide instead of drawn graphics:
- Add data-icon="[kebab-case-name]" on a data-role="icon" element to render a Lucide icon.
- Example: <div data-role="icon" data-layer="decoration" data-icon="check-circle" data-animation="fade-in" data-scene-element="decoration" style="position:absolute;left:80px;top:600px;width:56px;height:56px;color:#ffffff;z-index:5;"></div>
- Available: check-circle, star, zap, shield, package, arrow-right, shopping-bag, heart, sparkles, trending-up, dollar-sign, bar-chart-2, cpu, globe, lock, users
- Set size via width/height (32–80px). Set color via the color: style property.

${designMandate}

${intentDirective}

${assetDirective}

BACKGROUND ELEMENT — MANDATORY FIRST CHILD:
The very first element inside <body> MUST be the product photo placeholder:
<div data-role="image-placeholder" data-layer="image" data-asset-type="product-shot" data-animation="none" data-scene-element="background" style="position:absolute;left:0;top:0;width:${CANVAS_W}px;height:${CANVAS_H}px;z-index:0;"></div>
Add gradient overlay divs immediately after (z-index:1) to darken areas where text will sit.
All other design elements go at z-index 2+.

OUTPUT: Only the HTML. Nothing before DOCTYPE.
The html and body must use: width:${CANVAS_W}px; height:${CANVAS_H}px; overflow:hidden; margin:0; background:transparent;`,

    user: `${archetype ? `LAYOUT TYPE: ${archetype}\n` : ""}SCENE INTENT: ${sceneIntent}
VOICEOVER (context only — not shown on screen):
${sceneScript}
${displayText ? `\nDISPLAY TEXT (show this on screen — use it for the headline/copy):\n${displayText}` : ""}
VISUAL CONCEPT: ${visualConcept || "Choose the best visual approach for this scene"}

BRAND: ${brandName}
${ctaText  ? `CTA TEXT: ${ctaText}`     : ""}
${offerText ? `OFFER: ${offerText}`     : ""}
${website   ? `WEBSITE: ${website}`     : ""}
ACCENT COLOR: ${accentColor}

Design a premium product advertisement scene. The product photo is the background — use the placeholder and add gradient overlays + bold text/UI on top.
All text must be in English.`,
  };
}
