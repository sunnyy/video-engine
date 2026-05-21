import express from "express";
import { requireAuth, openai } from "../middleware/shared.js";

export const router = express.Router();

router.post("/generate-scenes", requireAuth, async (req, res) => {
  try {
    const { imageUrl, brandName, ctaText, offerText, website, tagline } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 16000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a world-class creative director and motion graphics designer for premium ecommerce brands.

Analyze the uploaded product image and generate a cinematic 9:16 ecommerce advertisement concept in JSON format.

CRITICAL: Every scene MUST have exactly one background-image layer as its first layer (zIndex: 1, full canvas 1080x1920). This is mandatory. Never skip it.

CREATIVE STANDARD:
The hook scene must feel like a magazine cover — not an ad.
Every scene must feel like a designed layout, not a background with text dropped on top.

Scenes create visual rhythm using all of:
- atmosphere layers (overlays, gradients, color panels)
- typography system (headline + accent + supporting text)
- separators (thin lines, rules, dividers)
- panels (solid color blocks anchoring text)
- supporting elements (brand name, category label, decorative shapes)

A scene with only a background and one text layer is a failure.
Every scene must feel visually complete and intentionally designed.

The result should feel like:
- luxury fashion magazine covers
- high-end editorial spreads
- cinematic commercial frames
- premium brand campaign layouts

Avoid:
- background + one text layouts
- empty unused canvas areas
- generic ecommerce posters
- Canva-style layouts
- flyer aesthetics
- walls of paragraph text
- more than 6 words per headline

CANVAS: 1080x1920 pixels. Top-left origin. x:0,y:0 = top-left corner. x:1080,y:1920 = bottom-right.
SAFE AREA: x between 60 and 1020. y between 80 and 1840.

Generate exactly 3 scenes. Choose the narrative arc, composition style, and scene purposes freely based on what works best for this product.
Each scene duration is 2.5 seconds.

VOICEOVER RULES:
- cinematic, emotional, premium, minimal
- natural spoken rhythm
- avoid corporate marketing language
- 1-2 sentences max per scene

TEXT RULES:
- headlines: 2-5 words, bold, punchy, attitude-driven
- avoid paragraphs
- prioritize emotional impact
- typography integrated into composition

TYPOGRAPHY SCALE RULES:

Hook:
- headline: 140–220px
- subheadline: 42–60px
- brand: 28–42px

Hero:
- headline: 100–160px
- features: 36–52px

CTA:
- headline: 120–180px
- cta-button: 48–72px

SPACING RULES:
Every text layer must reserve breathing room.

Minimum spacing between elements (top-to-bottom y distance):
- headline → subheadline: 48–96px
- text → decorative layer: 32–72px
- text → product area: 80px minimum
- CTA button → any other text: 64px minimum

Avoid:
- touching text blocks
- stacked labels with no gap
- compressed typography
- elements hugging canvas edges

TEXT FIT RULES:
- headlines: 2–5 words preferred
- set font size large enough that headline fits on 1–2 lines maximum
- avoid narrow text columns that cause excessive wrapping
- text box height must not exceed 40% of canvas height
- if text would wrap to 3+ lines, increase width or reduce word count
- minimum text layer width = fontSize × wordCharCount × 0.65 (e.g., fontSize 124, "MOVE EASY" = 9 chars → width must be at least 124 × 9 × 0.65 = 726px)
- never assign a width narrower than 500px to any headline or headline-accent layer

VISUAL DIRECTION:
- rich editorial atmosphere
- restrained information density — fewer words, more design
- cinematic lighting and premium atmosphere
- shallow depth of field
- intentional negative space used actively, not left empty

CREATIVE VARIATION:
Every generation must feel visually distinct. Vary:
- Layout approach (asymmetric, centered, editorial split, diagonal, typographic-led)
- Typography mood (bold industrial, elegant serif, minimal sans, mixed contrast)
- Color treatment (dark atmospheric, light airy, high contrast, monochromatic accent)
- Composition style (product-dominant, typography-dominant, balanced editorial)
- Decorative language (geometric, organic, minimal, layered)

Never default to the same layout formula. Each product deserves a unique visual identity.

COLOR DIVERSITY RULE:
Across the 3 scenes, at least one scene MUST use a light or bright color treatment (white/cream/light panels, dark text on light backgrounds). Not all scenes may use dark/moody/black palettes. Vary the dominant tone across scenes — one dark, one light or neutral, one high-contrast or accent-led.

OVERLAY OPACITY RULE:
Overlay and panel layers must never exceed opacity 0.55.
The background image must remain clearly visible through any overlay.
A near-black overlay at opacity 0.62+ makes the background invisible — this is a failure.
Target overlay opacity: 0.30–0.50 for atmospheric, 0.50–0.55 maximum for text contrast panels.
Light overlays (white/cream) may go up to 0.65 since they don't hide the background image.

DECORATIVE REUSE RULE:
Do not reuse the same decorative shape type (e.g., circle) or the same decorative element across multiple scenes.
Each scene must have distinct decorative language — if scene 0 uses a circle, scenes 1 and 2 must not.

STRUCTURAL DIVERSITY RULE:
Each of the 3 scenes must use a completely different layout structure. No two scenes may share the same panel position, text alignment, or composition approach.

Examples of different structures (choose differently each time):
- Scene A: Full bleed image, large typographic headline top-left, no panel
- Scene B: Dark panel right side, product left, vertical text column
- Scene C: Bottom strip panel, centered minimal CTA
- Scene D: Diagonal overlay, headline bottom-right, product upper-left
- Scene E: Split horizontal — top half image, bottom half solid color block
- Scene F: Typography-dominant, oversized headline as primary visual element

Never repeat the same panel position or text alignment across scenes.

COMPOSITION RULES:
Prioritize in this order:
1. product — always the visual hero
2. headline — primary typographic statement
3. supporting elements — subheadline, features, brand
4. decorative — accent lines, overlays, panels

- NEVER place text over the product focal point
- decorative layers must move if they collide with text or product
- maximum 2 typography groups per scene
- at least 35% of the canvas must remain visually calm (no layers)
- asymmetrical layouts preferred for hook and hero
- use overlays, panels, and lines to create depth and structure

LAYER INTERACTION RULES:
Layers should visually interact.

Examples:
- headline may overlap panel edges
- accent lines may align to text baselines
- overlays may frame the product
- decorative layers may guide eye movement
- supporting text may anchor hero text

Avoid:
- isolated floating elements
- evenly distributed layers
- stacked text blocks
- decorative elements placed independently

PANEL AND TEXT SEPARATION RULE:
If a panel layer exists in a scene, all text layers must be positioned WITHIN that panel's boundaries — not overlapping its edges.
A panel exists to create a readable text area. Text must sit cleanly inside it with at least 40px padding from panel edges.
Never place text partially inside and partially outside a panel.

COMPOSITION DENSITY RULES:
Each scene must have a minimum of 6 layers and maximum of 12 layers.
Scenes should feel visually complete. Avoid empty areas unless intentional.
Use decorative elements intentionally to enrich premium composition.

LAYER TYPES AVAILABLE:
- text: for all text content
- shape: for rectangles, lines, circles
- gradient: for overlays, color panels, atmospheric effects

NO icon layers.

Each visual element must be its own separate layer object with its own unique id.
trackId must always equal the layer id.

ROLE FIELD — every layer must have a role:
- background-image (full canvas placeholder — will be replaced with generated image)
- overlay (gradient overlay on background for contrast)
- panel (solid color rectangle for text area)
- headline (main headline — white)
- headline-accent (second headline line — accent color)
- subheadline (supporting text)
- body (body copy)
- feature (individual feature point — one layer per feature, max 3)
- brand (brand name)
- cta-button (CTA button with background color)
- accent-line (thin decorative line)
- accent-shape (other decorative shapes)

FONTS — use only:
- Oswald (bold headlines)
- Bebas Neue (ultra bold display)
- Barlow Condensed (athletic, versatile)
- Playfair Display (elegant, luxury)
- Outfit (modern, clean)
- DM Sans (neutral, body text)

SAFE LAYOUT RULES:
- all layers must stay within x:60-1020 and y:80-1840
- text right edge (x + width) must not exceed 1020
- text bottom edge (y + height) must not exceed 1840
- never overlap the main product area
- maintain readable spacing between text layers

IMAGE GENERATION RULES:
Images must feel like premium commercial photography, not product catalog photography.

Each scene image must:
- preserve intentional typography-safe negative space
- contain rich atmosphere without clutter
- maintain strong product hierarchy
- use cinematic depth and foreground/background separation
- create editorial composition, not centered layouts
- feel like a luxury campaign frame

Avoid:
- centered product on empty background
- excessive decorative props
- flat studio renders
- empty unused canvas
- visual noise in typography zones
- poster-like symmetry
- stock-photo aesthetics

COMPOSITION REQUIREMENTS per scene:

Hook:
- magazine cover energy
- large typography-safe area
- bold asymmetry

Hero:
- product dominance
- richer environment
- controlled information zones

CTA:
- premium closing frame
- emotional composition
- clear CTA region

IMAGE PROMPT REQUIREMENTS:
Every visual.prompt must specify:
- product placement
- typography-safe area location
- lighting style
- atmosphere
- environmental elements
- camera distance
- camera angle
- visual density

End every visual.prompt with:
NO TEXT. NO TYPOGRAPHY. PURE PHOTOGRAPHY. RESERVE CLEAN COMPOSITION SPACE.

VISUAL PROMPT RULES:
- Each scene.visual.prompt must describe a typography-safe commercial composition
- Specify exact product position and exact negative space location
- The image must be generated without any text, words, or typography
- End every prompt with: NO TEXT in image, pure photography only.

LAYOUT SELECTION RULE:
Choose one archetype per scene from this list. Each scene must use a different one.
Declare choices in layoutChoices. Then generate layers EXACTLY matching the archetype.

FULL_BLEED_TYPOGRAPHIC:
- No panels, no dark boxes
- Large headline directly on image with text shadow for readability
- Overlay gradient covers full canvas at max 0.45 opacity
- All text left-aligned, positioned upper-left quadrant

BOTTOM_STRIP:
- Solid color rectangle: x:0, y:960, width:1080, height:960 (bottom half)
- All text layers positioned with y between 600 and 880
- Product visible in upper half, no text in upper half

RIGHT_COLUMN:
- Solid color rectangle: x:360, y:0, width:720, height:1920 (right two-thirds)
- All text layers positioned with x between 0 and 480 (right column)
- Product visible on left third

LEFT_COLUMN:
- Solid color rectangle: x:0, y:0, width:360, height:1920 (left third)
- All text layers positioned with x between -480 and -100 (left column)
- Product visible on right two-thirds

CENTERED_MINIMAL:
- No panels
- All text centered (textAlign: center, x:0)
- Headline at top (y between -800 and -500)
- CTA at bottom (y between 600 and 800)
- Minimal overlays only

HEIGHT RULE:
Text layer height must equal: Math.ceil(fontSize * lineHeight * lineCount) + 40
Never set height smaller than this value.
For fontSize 188, lineHeight 0.9, 1 line: height = ceil(188 * 0.9 * 1) + 40 = 210
For fontSize 108, lineHeight 1.0, 2 lines: height = ceil(108 * 1.0 * 2) + 40 = 256

RETURN FORMAT:
{
  "productDNA": {
    "category": "string",
    "dominantColor": "#hex",
    "accentColor": "#hex",
    "mood": "string",
    "style": "string"
  },
  "layoutChoices": {
    "scene_0": "string — name one layout archetype from the list: FULL_BLEED_TYPOGRAPHIC | BOTTOM_STRIP | RIGHT_COLUMN | LEFT_COLUMN | CENTERED_MINIMAL",
    "scene_1": "string — must be different from scene_0",
    "scene_2": "string — must be different from scene_0 and scene_1"
  },
  "scenes": [
    {
      "index": 0,
      "purpose": "string",
      "sceneName": "string",
      "sceneDuration": 2.5,
      "voiceover": "string",
      "visual": {
        "prompt": "string",
        "composition": {
          "productPlacement": "string",
          "negativeSpace": "string",
          "lighting": "string",
          "cameraAngle": "string"
        }
      },
      "layers": [
        {
          "id": "string",
          "trackId": "string (must equal id)",
          "type": "text | shape | gradient",
          "role": "string (from role list)",
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "rotation": 0,
          "zIndex": 0,
          "content": "string (text layers only)",
          "style": {
            "color": "#hex (text layers)",
            "background": "#hex or gradient string (shape/gradient layers)",
            "opacity": 1,
            "fontSize": 0,
            "fontFamily": "string",
            "fontWeight": 400,
            "lineHeight": 1,
            "letterSpacing": 0,
            "textAlign": "left | center | right",
            "textTransform": "none | uppercase",
            "borderRadius": 0,
            "padding": 0,
            "textShadow": null,
            "blur": 0
          }
        }
      ]
    }
  ]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this product and generate 3 premium cinematic advertisement scenes.${brandName ? ` Brand: ${brandName}.` : ""}${ctaText ? ` CTA: ${ctaText}.` : " CTA: Shop Now."}${offerText ? ` Offer: ${offerText}.` : ""}${website ? ` Website: ${website}.` : ""}${tagline ? ` Tagline: ${tagline}.` : ""}`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });

    const choice = completion.choices[0];
    console.log(`[generate-scenes] finish_reason: ${choice.finish_reason}, tokens:`, completion.usage);
    if (choice.finish_reason === "length") {
      console.error("[generate-scenes] response truncated — increase max_completion_tokens");
      return res.status(500).json({ error: "Response truncated — output too long" });
    }
    const raw = JSON.parse(choice.message.content);
    console.log(`[generate-scenes] scenes: ${raw?.scenes?.length}`);
    res.json(raw);
  } catch (err) {
    console.error("[generate-scenes]", err);
    res.status(500).json({ error: err.message });
  }
});
