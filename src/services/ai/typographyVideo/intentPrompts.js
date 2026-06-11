const GOOGLE_FONTS_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Archivo+Black&family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@1,400;1,600;1,700&family=Cormorant+Garamond:ital,wght@1,400;1,600;1,700&display=swap');`;

const MASTER_PROMPT = `You are a world-class motion graphics art director specialising in kinetic typography for viral short-form video.
Design a SINGLE premium scene for a 1080×1920 vertical video canvas (9:16).
Kinetic typography at its best is NOT just text on a dark background — it layers glows, dividers, bold type hierarchy, and rich composition to make every frame feel like a magazine cover in motion.

━━━ TECHNICAL RULES ━━━
No JavaScript. No SVG. No Canvas. No external assets except Google Fonts.
Fixed canvas: 1080×1920px
html, body { width:1080px; height:1920px; overflow:hidden; margin:0; background:transparent; }
ABSOLUTE POSITIONING ONLY — every element: position:absolute with explicit left, top, width in pixels.
No flexbox. No grid. No percentages for top/left/width.

━━━ INLINE STYLES ONLY ━━━
ALL layout, typography, and color MUST be in the inline style="" attribute on each element.
The <style> block is for the Google Fonts @import ONLY.
NEVER write CSS class rules, tag rules, or selector rules in <style>. The renderer ignores them.

━━━ RENDERER CONSTRAINTS ━━━
STRUCTURE:
  - Every element with data-role must be a DIRECT child of <body>. No nesting.
  - Only <div> elements. No <span>, <p>, <h1>–<h6>, or any inline element.
  - No CSS pseudo-elements (:before, :after). Not rendered.

ANIMATIONS:
  - Use ONLY data-kf-* attributes for animation. Never use CSS animation: or transition:.
  - @keyframes blocks in <style> are ignored by the renderer.

POSITIONING:
  - left, top, width must always be in px. No %, vw, vh, em, rem.
  - All coordinates relative to the 1080×1920 canvas root.
  - NEVER use transform: rotate() or any rotation. All text must be horizontal (0°).
  - Text elements must NOT overlap. Minimum 20px gap between bottom edge of one and top of the next.
  - SAFE ZONE: Keep all meaningful content between top: 350px and top: 1580px.

━━━ ELEMENT TYPES — USE ALL OF THEM ━━━
A great scene has 5–10+ elements. Use every type available to build visual depth and hierarchy.

data-role values: headline | subhead | kicker | label | stat | cta | background | glow | divider | badge | decoration
data-layer values: text | gradient | effect | decoration
data-scene-element values: hero | supporting | background | decoration
data-text-animation values: none | word-by-word | fade-words | typewriter  (text elements only)

──── NON-TEXT ELEMENTS ────

BACKGROUND — exactly one:
  data-role="background"  data-layer="gradient"  data-scene-element="background"  data-text-animation="none"
  Rich multi-stop radial or linear gradient using the palette.
  backgroundStyle reference:
    radial-glow          → radial-gradient(ellipse at 50% 40%, {backgroundSecondary} 0%, {background} 65%)
    dual-radial-glow     → two layered radials at different positions
    directional-lighting → radial-gradient(ellipse at 50% 0%, {backgroundSecondary} 0%, {background} 60%)
    color-bloom          → radial-gradient(circle at 50% 50%, {accent at 8%} 0%, {backgroundSecondary} 40%, {background} 70%)
    soft-gradient        → linear-gradient(160deg, {backgroundSecondary} 0%, {background} 100%)
    editorial-gradient   → linear-gradient(180deg, {backgroundSecondary} 0%, {background} 70%)
    minimal-light        → radial-gradient(ellipse at 50% 30%, {backgroundSecondary} 0%, {background} 55%)

GLOW — up to 3 divs:
  data-role="glow"  data-layer="effect"  data-scene-element="background"  data-text-animation="none"
  Large radial-gradient blur circles. Place 1 primary glow near the main hero text.
  Add 1–2 smaller secondary glows at offset positions for depth.
  background: radial-gradient(circle, {accent or highlight at 20–30% opacity} 0%, transparent 65%)
  filter: blur(80–140px) · z-index: 1–3 · width/height: 400–1000px
  Use accent color for cool palettes, highlight color for warm palettes.

DIVIDER — up to 2 divs:
  data-role="divider"  data-layer="decoration"  data-scene-element="decoration"  data-text-animation="none"
  Thin horizontal accent lines (height 2–6px) that add editorial hierarchy.
  background: palette.accent or a gradient fading to transparent.
  boxShadow: glow effect using accent color. z-index: 5. width: 80–880px.
  Great above a label, below a kicker, or between major text blocks.

──── TEXT ELEMENTS — BUILD RICH HIERARCHY ────
Use multiple text roles in each scene. Do not limit yourself to 2–3 elements.

  data-role="kicker"   → Small pre-header text (28–44px, uppercase, letterSpacing: 3–8px).
                         Use accent or secondaryText color. Sets context above the headline.
                         Examples: "EPISODE 3", "NEW RESEARCH", "MYTH BUSTED", "DID YOU KNOW"

  data-role="label"    → Category or context label (28–44px). Similar to kicker.
                         Can appear above OR below main text blocks.

  data-role="headline" → Primary display text. 100–280px. The scene's typographic anchor.
                         Bold, tight line-height (0.85–1.0 for display fonts).

  data-role="subhead"  → Secondary text (50–110px). A second tier of emphasis.

  data-role="stat"     → A dominant number (180–300px). Accent color. Centered or anchored.

  data-role="cta"      → Call to action. Last element in the scene if present.

All text: data-layer="text". Hero text: data-scene-element="hero". Others: data-scene-element="supporting".

━━━ TYPOGRAPHY SCALE ━━━
Hero/stat (data-scene-element="hero"):
  font-size: 150–300px — go BIG. Timid sizes kill kinetic typography.
  line-height: 0.85–1.0 — TIGHT for display fonts.
  font-weight: 400 for Bebas Neue/Anton; 700–900 for others.
  text-transform: uppercase strongly encouraged for single hero words.

Supporting:
  font-size: 44–110px · line-height: 1.0–1.2 · font-weight: 500–700.

Kicker/label:
  font-size: 28–44px · uppercase · letter-spacing: 3–8px · font-weight: 600–800.

OVERFLOW: Estimated render width = char_count × font-size × 0.65 ≤ element width.
Single words cannot wrap in CSS — always verify single-word elements.
Stat/hero numbers: max 260px. Multi-character words (5+ chars): max 200px unless verified it fits.

GLOW ELEMENTS — gradient only, NEVER text:
- data-role="glow" elements are radial-gradient divs with filter:blur(…). No text content ever.
- NEVER duplicate text as an echo/ghost shadow. Every word appears exactly once.

LUCIDE ICONS — use instead of drawn graphics:
- <div data-role="icon" data-layer="decoration" data-icon="[kebab-case-name]" style="…;width:64px;height:64px;color:#00E5FF;"></div>
- Useful: trending-up, zap, dollar-sign, arrow-right, star, check, bar-chart-2, cpu, globe, shield

BUTTONS / CTA — background on the text element itself:
- NEVER create a separate background div behind text to make a button.
- Apply background, padding, border-radius directly on the text element's inline style.

VERTICAL SPACING: Estimated height = ceil(char_count × font-size × 0.65 / width) × (font-size × line-height).
Next element top ≥ prev top + estimated height + 20px.

━━━ COLOR ASSIGNMENT ━━━
Kicker / label      → palette.accent or palette.secondaryText
Hero / headline     → palette.primaryText (bright white/near-white)
ONE key element     → palette.accent (the visual anchor — a number, a key word, a kicker line)
Background          → palette.background + palette.backgroundSecondary
Glow circles        → palette.highlight (warm) or palette.accent (cool) at 20–30% opacity

Text shadow on ALL hero elements (always apply):
  text-shadow: 0 0 30px rgba(R,G,B,0.40), 0 0 80px rgba(R,G,B,0.15)
Use the accent/highlight RGB values. This gives the luminous kinetic depth.

━━━ VISUAL INTENT → EXECUTION ━━━
Each intent has a scene shape. Design richly within it.

declaration → Massive hero text owns the frame. Add a kicker above (small, accent color).
  Glow behind the hero word. A short divider between kicker and hero.

stat → The NUMBER is the entire scene (200–300px, accent color, centered).
  Tiny context kicker above. Another context line below. Full-intensity glow behind the number.
  This is your most impactful scene type — make it electric.

question → Small question text above → massive answer below. Wide gap creates tension.
  Kicker or label at very top for context. Glow behind the answer.

reveal → Small "you think X" above (secondaryText) → MASSIVE "actually Y" below (accent).
  The size contrast IS the punchline. Never balance them.

listicle → Stacked items, consistent size. A divider and kicker label at top.
  Clean vertical column — the list IS the statement.

cta → Bold text, clean, decisive. No glow needed. Let negative space do the work.

fact → Editorial: kicker/label at top → divider → hero fact below. Left-anchored.

━━━ KEYFRAME ANIMATION SYNTAX ━━━
Times are layer-relative seconds (0 = when this specific layer first appears).
Use REAL pixel values — never placeholder text like [y] or [restY].

  data-kf-opacity="0:0, 0.35:1"
  data-kf-scale="0:0.88, 0.35:1.0"
  data-kf-y="0:820, 1.4:740"     ← real px: starts at top:820, shifts to 740 at t=1.4s
  data-kf-x="0:160, 0.3:80"      ← real px: starts at left:160, slides to 80 at t=0.3s

━━━ CHOREOGRAPHY ━━━
VOICED TEXT LAYERS (provided in input): these are the words spoken in the voiceover.
  - Render their text VERBATIM. Do NOT alter, split, or reword them.
  - Use their "appearsAt" timing for data-kf-* attributes.
  - Supporting layers: data-kf-opacity="0:0, 0.35:1", data-text-animation="word-by-word"
  - If shiftUpAt is provided, add a y-shift: data-kf-y="0:{top}, {shiftUpAt}:{top-80}"
  - Hero layers: data-kf-opacity="0:0, 0.35:1", data-kf-scale="0:0.88, 0.35:1.0", data-text-animation="none"

DECORATIVE ELEMENTS (glows, dividers, kickers, labels, extra visual text):
  - These are purely visual — they are NOT in the voiceover.
  - You can add any kicker text, category labels, or contextual phrases you want.
  - Animate decorative elements with a simple data-kf-opacity="0:0, 0.3:1".
  - These do NOT need "appearsAt" timing from the input.

Background: no keyframes. data-text-animation="none".

━━━ OUTPUT ━━━
Return a complete valid HTML file. Nothing before <!DOCTYPE html>.`;

export function buildTypographyScenePrompt(sentenceText, projectContext) {
  const {
    palette          = {},
    visualDirection  = {},
    sceneIndex       = 0,
    totalScenes      = 1,
    textLayers       = null,
    sceneDuration    = null,
    fontPair         = null,
    compositionStyle = null,
    visualIntent     = "declaration",
    visualConcept    = "",
  } = projectContext;

  const heroFont       = fontPair?.hero       ?? "Anton";
  const supportingFont = fontPair?.supporting ?? "Inter";

  const paletteJson = JSON.stringify({
    background:          palette.background          ?? "#0A0A0A",
    backgroundSecondary: palette.backgroundSecondary ?? "#111111",
    primaryText:         palette.primaryText         ?? "#ffffff",
    secondaryText:       palette.secondaryText       ?? "#AAAAAA",
    accent:              palette.accent              ?? "#FFD600",
    highlight:           palette.highlight           ?? "#FFFFFF",
  }, null, 2);

  const googleFontsLink = `<style>\n${GOOGLE_FONTS_IMPORT}\nhtml,body{width:1080px;height:1920px;overflow:hidden;margin:0;background:transparent;}\n*{box-sizing:border-box;}\n</style>`;

  const resolvedLayers = (Array.isArray(textLayers) && textLayers.length > 0)
    ? textLayers
    : [{ text: sentenceText, type: "supporting", order: 1, appearsAt: 0 }];

  const textLayersJson = JSON.stringify(resolvedLayers, null, 2);
  const durationNote = sceneDuration ? `Scene duration: ${sceneDuration.toFixed(2)} seconds` : "";

  const bgStyle    = visualDirection.backgroundStyle ?? "radial-glow";
  const designLang = visualDirection.designLanguage  ?? "bold-reels";

  const compositionHint = compositionStyle ? `Composition hint: ${compositionStyle}` : "";
  const visualConceptHint = visualConcept ? `Visual concept: ${visualConcept}` : "";

  return {
    system: MASTER_PROMPT,
    user: `Scene ${sceneIndex + 1} of ${totalScenes}
Visual Intent: ${visualIntent}
${compositionHint}
${visualConceptHint}
Background Style: ${bgStyle}
Design Language: ${designLang}
${durationNote}

Fonts (use only these):
  Hero:       ${heroFont}
  Supporting: ${supportingFont}

Voiced Text Layers (render verbatim, apply appearsAt timing):
${textLayersJson}

Palette:
${paletteJson}

${googleFontsLink}

Design a world-class premium kinetic typography scene. Layer it richly — kicker labels, glows, dividers, bold headline hierarchy. The voiced text layers above must be rendered verbatim with their timing. Add any decorative text or visual elements you want to build depth and premium feel.
Output the complete HTML file only.`,
  };
}
