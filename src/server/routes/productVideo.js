import express from "express";
import { openai, requireAuth, supabaseAdmin } from "../middleware/shared.js";

export const router = express.Router();

async function callGPT(systemPrompt, userContent, maxTokens = 1500) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userContent },
    ],
  });
  return JSON.parse(completion.choices[0].message.content);
}

// ─── STEP 1: ANALYZE ────────────────────────────────────────────────────────
// Analyzes product image via vision. Returns product understanding.
router.post("/analyze", requireAuth, async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a product analyst for commercial ads. Analyze the product image carefully.
Return JSON only: { "category": string, "style": "minimal|bold|elegant|playful|premium|organic", "colors": string[], "dominantColor": string, "audience": string, "material": string, "premium_level": "budget|mid|premium|luxury", "key_features": string[], "mood": string }
dominantColor must be the most prominent product color as a hex code.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this product for a commercial ad." },
            imageBase64
              ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
              : { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error("[analyze]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 2: BACKGROUND REMOVAL ─────────────────────────────────────────────
// Removes background from product image using Fal.ai birefnet.
// Returns URL of cutout image stored in Supabase.
router.post("/remove-background", requireAuth, async (req, res) => {
  try {
    const { imageUrl, projectId } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    const falRes = await fetch("https://fal.run/fal-ai/birefnet", {
      method: "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, model: "General Use (Light)", output_format: "png" }),
    });

    const raw = await falRes.text();
    if (!falRes.ok) throw new Error(`birefnet failed: ${raw.slice(0, 300)}`);
    const data = JSON.parse(raw);
    const falUrl = data.image?.url;
    if (!falUrl) throw new Error("No cutout URL from birefnet");

    // Store permanently in Supabase
    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const key = `product-videos/${req.user.id}/${projectId || "tmp"}/cutout-${Date.now()}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(key, buffer, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("[remove-background]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 3: DIRECTION ──────────────────────────────────────────────────────
// Creative direction derived from product. Palette locked here for entire video.
router.post("/direction", requireAuth, async (req, res) => {
  try {
    const { productAnalysis, videoType, brandName } = req.body;
    const result = await callGPT(
      `You are a creative director for commercial product ads. Output creative direction as JSON only.
CRITICAL: The palette you output will be used for the ENTIRE video — all scenes, all text, all elements. Make it cohesive and derived from the product's dominant color.

Return: {
  "palette": {
    "primary": "hex — main brand/product color",
    "secondary": "hex — complementary color",
    "accent": "hex — highlight/CTA color",
    "bg": "hex — background color for solid bg scenes (light or dark)",
    "text": "hex — main text color (must contrast with bg)",
    "textOnDark": "hex — text color when bg is dark image"
  },
  "fonts": {
    "headline": "one of: Bebas Neue | Barlow Condensed | Playfair Display | Oswald | Unbounded — for headlines only",
    "body": "one of: Outfit | Inter | DM Sans — for subheadlines and body text"
  },
  "tone": string,
  "energy": "low|medium|high",
  "musicMood": string,
  "bgImagePrompt": "detailed prompt for the hero background image — clean product photography style, matching product category and colors. No text. No people.",
  "lifestylePrompt": "detailed prompt for lifestyle scene — person using or interacting with the product naturally, matching audience and tone. Photorealistic."
}

Rules:
- palette.bg should be light/neutral for most product types (skincare, food, fashion) — avoid dark unless product is clearly premium dark-themed
- palette.primary must be derived from productAnalysis.dominantColor
- bgImagePrompt: clean, product-appropriate background — studio-style, lifestyle, or natural setting. Will be full-canvas background image.

Font pair selection rules:
- Sporty/athletic products → headline: "Barlow Condensed", body: "Outfit"
- Luxury/premium products → headline: "Playfair Display", body: "DM Sans"
- Bold/streetwear/youth → headline: "Bebas Neue", body: "Outfit"
- Modern/tech/minimal → headline: "Oswald", body: "DM Sans"
- Playful/food/beverage/lifestyle → headline: "Unbounded", body: "Outfit"
- Default → headline: "Oswald", body: "Outfit"`,
      `Product: ${JSON.stringify(productAnalysis)}\nVideo type: ${videoType}\nBrand: ${brandName || ""}`,
      1000
    );
    res.json(result);
  } catch (err) {
    console.error("[direction]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 4: SCENE PLAN ─────────────────────────────────────────────────────
// Plans scenes based on video type. Each scene has a clear purpose and bg type.
router.post("/scene-plan", requireAuth, async (req, res) => {
  try {
    const { productAnalysis, direction, videoType, offerText, ctaText, tagline, brandName } = req.body;

    const sceneTemplates = {
      promo: ["hook", "hero", "lifestyle", "features", "offer", "cta"],
      launch: ["hook", "hero", "feature1", "feature2", "lifestyle", "cta"],
      feature: ["hook", "hero", "feature1", "feature2", "feature3", "cta"],
      brand: ["hook", "hero", "lifestyle", "story", "cta"],
    };

    const scenes = sceneTemplates[videoType] || sceneTemplates.promo;

    const result = await callGPT(
      `You are a product ad scriptwriter. Plan scenes for a short-form product ad video as JSON only.
The video type is "${videoType}". Scene order is fixed: ${scenes.join(" → ")}.

For each scene return:
{
  "id": "scene_1",
  "purpose": "${scenes[0]}|etc",
  "duration_sec": number (3-6 per scene),
  "bgType": "solid|gradient|generated_hero|generated_lifestyle",
  "headline": "SHORT punchy text — max 4 words",
  "subheadline": "supporting line — max 8 words",
  "bodyText": "feature/benefit text — max 12 words, null if not needed",
  "spoken": "natural voiceover — 1 sentence max",
  "showLogo": boolean,
  "showOffer": boolean,
  "showCTA": boolean,
  "showWebsite": boolean
}

bgType rules:
- hook → "solid" or "gradient"
- hero → "generated_hero" (uses the generated hero background)
- lifestyle → "generated_lifestyle" (uses the generated lifestyle image)
- features/offer/story → "solid" or "gradient"
- cta → "solid"

showLogo: true for hook and cta scenes only
showOffer: true only if offerText is provided and scene purpose is hook/offer/cta
showCTA: true only for cta scene
showWebsite: true only for cta scene

Return: { "scenes": [...] }`,
      `Product: ${JSON.stringify(productAnalysis)}
Direction: ${JSON.stringify(direction)}
Offer text: ${offerText || "none"}
CTA text: ${ctaText || "Shop Now"}
Tagline: ${tagline || ""}
Brand: ${brandName || ""}`,
      2000
    );
    res.json(result);
  } catch (err) {
    console.error("[scene-plan]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 5: GENERATE BACKGROUND IMAGES ─────────────────────────────────────
// Generates hero background and lifestyle image via Fal.ai.
// Max 2 images per video.
router.post("/generate-backgrounds", requireAuth, async (req, res) => {
  try {
    const { bgImagePrompt, lifestylePrompt, projectId, productImageUrl } = req.body;
    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    const generateHero = async (prompt) => {
      const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image_size: { width: 1080, height: 1920 },
          num_inference_steps: 4,
          num_images: 1,
        }),
      });
      const raw = await falRes.text();
      if (!falRes.ok) throw new Error(`flux failed: ${raw.slice(0, 200)}`);
      const data = JSON.parse(raw);
      return data.images?.[0]?.url;
    };

    const generateLifestyle = async (prompt, productRef) => {
      const anchoredPrompt = `Keep the exact same product — same design, colors, branding, and shape — completely unchanged. Place it naturally in this lifestyle scene: ${prompt}`;
      const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
        method: "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image_urls: [productRef], prompt: anchoredPrompt }),
      });
      const raw = await falRes.text();
      if (!falRes.ok) throw new Error(`nano-banana lifestyle failed: ${raw.slice(0, 200)}`);
      const data = JSON.parse(raw);
      return data.images?.[0]?.url;
    };

    const storeImage = async (falUrl, suffix) => {
      const imgRes = await fetch(falUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const key = `product-videos/${req.user.id}/${projectId || "tmp"}/${suffix}-${Date.now()}.jpg`;
      await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: "image/jpeg", upsert: false });
      const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
      return publicUrl;
    };

    const [heroUrl, lifestyleUrl] = await Promise.all([
      bgImagePrompt
        ? generateHero(bgImagePrompt).then(url => url ? storeImage(url, "hero-bg") : null)
        : Promise.resolve(null),
      lifestylePrompt && productImageUrl
        ? generateLifestyle(lifestylePrompt, productImageUrl).then(url => url ? storeImage(url, "lifestyle") : null)
        : Promise.resolve(null),
    ]);

    res.json({ heroUrl, lifestyleUrl });
  } catch (err) {
    console.error("[generate-backgrounds]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 6: COMPOSE ────────────────────────────────────────────────────────
// Composes timeline layers from ProductAdSpec.
// Deterministic rules + GPT for text positioning.
router.post("/compose", requireAuth, async (req, res) => {
  try {
    const { spec } = req.body;
    const {
      scenes, palette, font, fonts, brandName, offerText, ctaText, website, tagline,
      logoUrl, productImageUrl, productCutoutUrl, heroBackgroundUrl, lifestyleImageUrl,
    } = spec;
    const headlineFont = fonts?.headline ?? "Oswald";
    const bodyFont = fonts?.body ?? font ?? "Outfit";

    const totalDuration = scenes.reduce((sum, s) => sum + (s.duration_sec ?? 4), 0);

    const systemPrompt = `You are a motion design ad compositor. You compose product ad videos as timeline JSON layers.
This is NOT a cinematic video. This is a clean, structured, professional product ad — like a premium Canva template animated.

CRITICAL COLOR RULES — NEVER VIOLATE:
- Use ONLY colors from the palette provided in the spec. Never invent colors.
- palette.bg = background color for solid/gradient bg scenes
- palette.primary = main brand color — use for accents, lines, category label backgrounds, dot bullets
- palette.accent = CTA button color, highlight elements
- palette.text = all text on light backgrounds
- palette.textOnDark = all text on dark/photo backgrounds
- palette.secondary = secondary accents, gradients

For gradient backgrounds: always use palette.bg and palette.secondary or palette.primary — NOT arbitrary colors.
Example: if palette = { bg: "#FFF0F5", primary: "#FF69B4", secondary: "#FFB6C1" }, the gradient must be "linear-gradient(160deg, #FFF0F5, #FFB6C1)" — NOT white-to-teal or any unrelated color.

For text colors: ALWAYS use palette.text on light backgrounds, palette.textOnDark on photo/dark backgrounds.

CANVAS: 1080x1920 (9:16 portrait)
COORDINATE SYSTEM: x,y = offset from canvas CENTER. x:0,y:0 = centered. x:540=right edge. y:960=bottom edge.

DESIGN PRINCIPLES:
- Clean, structured layouts. Not dark and cinematic.
- Product is always the hero — large and prominent.
- Typography hierarchy: category label → headline → subheadline → body → CTA
- Consistent font: "${font}" for ALL text layers in ALL scenes.
- Consistent palette throughout — use ONLY these colors: ${JSON.stringify(palette)}
- Simple geometric accents only — thin lines, rectangles as dividers. NO glow rings, NO speed lines, NO burst rays.
- Solid/gradient backgrounds should be clean and light-to-medium (not dark).

LAYER TYPES: image, text, gradient (for backgrounds and overlays)

TEXT ROLES AND SIZING (strict — follow exactly):
- category_label: fontSize 32-38, fontWeight 600, letterSpacing 3-4, textTransform uppercase, opacity 0.75
- headline: fontSize 88-130, fontWeight 900, lineHeight 1.0-1.1 — NEVER below 88
- subheadline: fontSize 48-60, fontWeight 600, lineHeight 1.2 — NEVER below 48
- body_text: fontSize 38-44, fontWeight 400, lineHeight 1.4, opacity 0.85 — NEVER below 38
- offer_text: fontSize 120-160, fontWeight 900 (for discount numbers)
- offer_label: fontSize 52-64, fontWeight 700
- cta_button: fontSize 48-60, fontWeight 700, background: palette.accent, color: white or palette.bg, borderRadius: 50, padding: 20
- website: fontSize 30-36, fontWeight 400, opacity 0.7
- logo_placeholder: only if logoUrl is null — text showing brandName, fontSize 28-34, fontWeight 700

FONT RULES — STRICTLY FOLLOW:
- headline role → fontFamily: "${headlineFont}"
- category_label role → fontFamily: "${headlineFont}", letterSpacing: 3-4
- offer_text role → fontFamily: "${headlineFont}"
- offer_label role → fontFamily: "${headlineFont}"
- logo_placeholder role → fontFamily: "${headlineFont}"
- subheadline role → fontFamily: "${bodyFont}"
- body_text role → fontFamily: "${bodyFont}"
- cta_button role → fontFamily: "${bodyFont}", fontWeight: 700
- website role → fontFamily: "${bodyFont}"
Every text layer must include a "role" field matching one of the above roles.

TEXT HEIGHT RULE: height = Math.ceil(fontSize * lineHeight * estimatedLines) + 24. Never less than 80px.

VERTICAL SPACING RULES (critical — follow exactly):
- Minimum gap between any two text layers: 20px
- After category_label: leave 60px gap before headline
- After headline: leave 40px gap before subheadline
- After subheadline: leave 30px gap before body_text
- After each body_text line: leave 20px gap before next body_text
- After body_text block: leave 50px gap before CTA button
- After CTA button: leave 24px gap before website text
- Calculate cumulative y positions — do NOT place two text layers at y values closer than (height_of_first + 20)
- When stacking text top-to-bottom, start from a y position and ADD each layer's height plus the gap to get the next y

PRODUCT IMAGE PLACEMENT:
- Use productCutoutUrl if available (background removed) — place as positioned layer, objectFit: "contain"
- If no cutout, use productImageUrl — still place as positioned, objectFit: "contain"
- Product must be LARGE and prominent — the hero of the scene
- Size rules by scene purpose:
  - hook: width 700-850px, height proportional
  - hero: width 850-950px, height proportional
  - features: width 500-620px (shares space with text column)
  - offer: width 680-800px, height proportional
  - cta: width 750-880px, height proportional
  - lifestyle: NO separate product layer — product appears in the background photo
- NEVER make product smaller than 500px wide except in features scene
- Height should be proportional to width — for a typical shoe/sneaker: height = width * 0.75. For a can/bottle: height = width * 1.2. For a box/square product: height = width.

SHADOW LAYER (always add under product image):
- type: "gradient", gradient: "radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, transparent 70%)"
- width: same as product width, height: 80-120px
- position: directly below product bottom edge, zIndex: product.zIndex - 1

BACKGROUND RULES per bgType:
- "solid" → type: "gradient", gradient: "palette.bg as solid color"
- "gradient" → type: "gradient", gradient: "linear-gradient(160deg, palette.bg, palette.secondary)"
- "generated_hero" → type: "image", src: heroBackgroundUrl, objectFit: "cover", with semi-transparent overlay gradient on top (zIndex 2): "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.4) 100%)"
- "generated_lifestyle" → type: "image", src: lifestyleImageUrl, objectFit: "cover", with same overlay

LAYOUT TEMPLATES — each scene must use a different template. Never use the same layout twice in a row.

TEMPLATE A — "Left Text, Right Product":
- Text block: x range -540 to -60, textAlign: left
- Product: x: 200 to 350, centered vertically or lower half
- Use for: hook, features scenes on solid bg

TEMPLATE B — "Top Text, Bottom Product":
- Text block: y range -900 to -300, textAlign: center, x: 0
- Product: y: 50 to 400, x: 0, centered horizontally
- Use for: offer, cta scenes

TEMPLATE C — "Bottom Text, Top/Center Product":
- Product: y: -600 to -100, x: 0 or offset, large (width 700-900)
- Text block: y: 350 to 700, textAlign: center or left
- Use for: hero scene on generated bg

TEMPLATE D — "Full Bleed Photo + Text Overlay":
- Background: generated photo, full canvas
- Overlay gradient on top of photo
- Text: positioned top third (y: -700 to -300) OR bottom third (y: 300 to 650)
- No product image layer (lifestyle already shows product in photo)
- Use for: lifestyle scene

TEMPLATE E — "Split Screen":
- Left half bg: gradient or solid (rendered as a gradient layer, x: -540, y: 0, width: 540, height: 1920)
- Right half: lighter version or white
- Text: left side, x: -500 to -100
- Product: right side, x: 150 to 400
- Use for: feature or offer scenes for variety

Assign templates by scene purpose:
- hook → Template A or B (vary between videos)
- hero → Template C
- lifestyle → Template D
- features → Template A or Template E
- offer → Template B
- cta → Template B

SCENE-SPECIFIC COMPOSITION:

hook scene: bg (solid/gradient) → thin accent line → category_label (top) → headline (large, centered or left) → subheadline → product image (right or center, large) → shadow → logo if showLogo

hero scene: bg (generated_hero) → overlay → product image (center, very large, cutout) → shadow → headline (bottom third) → subheadline

lifestyle scene: bg (generated_lifestyle) → overlay → headline (top third, bold) → subheadline

features scene:
- bg (solid or gradient, full canvas)
- Layout: LEFT COLUMN for text (x range: -540 to -50, width: 500-550px), RIGHT COLUMN for product (x range: 100 to 350, width: 500-600px)
- Thin divider line at top of text column (y: -780 to -700)
- headline (left column, y: -650 to -550, fontSize 80-96, fontWeight 900)
- subheadline (left column, y: headline_y + headline_height + 30)
- 2-3 feature bullet points (left column, each with a small dot accent left of text):
  - dot: width 12, height 12, borderRadius 6, x: text_x - 30, color: palette.accent
  - text: fontSize 34-38, fontWeight 400, width: 480-520px
  - gap between bullets: 20px minimum
  - NEVER place bullet text y closer than (prev_y + prev_height + 20)
- product image: RIGHT column, x: 150-350, y: -100 to 100, width: 500-600, height proportional, objectFit: contain
- product shadow: same x as product, y: product_y + product_height - 60, width: same as product
- Total text block must fit within y: -700 to 500. If text would exceed y: 500, reduce fontSize or remove lowest priority body text.

offer scene: bg (solid or gradient) → large offer_text (number) → offer_label → subheadline → product image

cta scene: bg (solid) → product image (center) → headline (brand/product name) → cta_button → website if showWebsite → logo if showLogo

ACCENT ELEMENTS (simple only):
- Thin horizontal line: type "gradient", height 2-3px, full width or partial, gradient: solid palette.primary or accent
- Small rectangle badge behind category label: type "gradient", height ~40px, borderRadius 4

ANIMATION per layer role:
- bg layers: animation.in fade 0.4s
- product image: animation.in zoom 0.5s
- headline: animation.in slide-up 0.3s (stagger 0.1s after bg)
- subheadline: animation.in fade 0.4s (stagger 0.2s)
- body text: animation.in fade 0.4s (stagger 0.3s each)
- cta button: animation.in zoom 0.3s (stagger 0.4s)
- logo: animation.in fade 0.3s

zIndex order: bg=1, overlay=2, shadow=3, accents=4, product=5, text=6-12, logo=13, cta=14

15. OVERFLOW GUARD: No layer may have y + height/2 > 920 (bottom safe area) or y - height/2 < -920 (top safe area). If a calculated position would exceed these bounds, move it inward. Text near the bottom must never go below y: 800.

OUTPUT: Return JSON only — { "layers": [...] }`;

    const userMessage = `Spec:
Scenes: ${JSON.stringify(scenes)}
Palette: ${JSON.stringify(palette)}
Font: ${font}
Brand: ${brandName}
Offer: ${offerText}
CTA: ${ctaText}
Website: ${website}
Tagline: ${tagline}
Has logo: ${!!logoUrl}
Has product cutout: ${!!productCutoutUrl}
Product cutout URL: ${productCutoutUrl || productImageUrl}
Hero background URL: ${heroBackgroundUrl || "null"}
Lifestyle image URL: ${lifestyleImageUrl || "null"}
Total duration: ${totalDuration}s

Compose all scenes as a single layers[] array. Stack scenes sequentially based on duration_sec.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 10000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content);
    const rawLayers = Array.isArray(raw.layers) ? raw.layers : [];

    console.log('[compose] first 3 layers raw:', JSON.stringify(rawLayers.slice(0, 3), null, 2));
    console.log('[compose timing debug]', rawLayers.slice(0, 5).map(l => ({ id: l.id, start: l.start, end: l.end, startTime: l.startTime, endTime: l.endTime, scene: l.scene, sceneId: l.sceneId })));

    // Build sceneId → absolute {start, end} from the scenes array
    const sceneTimingMap = {};
    let cursor = 0;
    for (const scene of scenes) {
      const dur = scene.duration_sec ?? 4;
      sceneTimingMap[scene.id] = { start: cursor, end: cursor + dur };
      cursor += dur;
    }

    // Inject absolute timing into raw layers based on scene field
    const timedLayers = rawLayers.map(layer => {
      const sceneId = layer.scene ?? layer.sceneId;
      const timing = sceneTimingMap[sceneId];
      if (timing) {
        return {
          ...layer,
          start: layer.start ?? timing.start,
          end:   layer.end   ?? timing.end,
        };
      }
      return layer;
    });

    // Validate and sanitize
    const seenIds = new Set();

    const layers = timedLayers.map((layer, index) => {
      let id = layer.id || `layer_${index}`;
      if (seenIds.has(id)) id = `${id}_${index}`;
      seenIds.add(id);

      const isAudio = layer.type === "audio";

      // Bug 1 fix: GPT may use startTime/endTime or scene-level timing fields
      const rawStart = layer.start ?? layer.startTime ?? layer.start_time ?? 0;
      const rawEnd   = layer.end   ?? layer.endTime   ?? layer.end_time   ?? null;
      const start = typeof rawStart === "number" ? rawStart : 0;
      const end   = typeof rawEnd   === "number" && rawEnd > start ? rawEnd : start + 1;

      const zIndex = Math.min(20, Math.max(0, typeof layer.zIndex === "number" ? layer.zIndex : 1));

      // Bug 3 fix: merge root-level position fields with nested transform
      const transform = isAudio ? null : {
        x:           layer.transform?.x           ?? layer.x           ?? 0,
        y:           layer.transform?.y           ?? layer.y           ?? 0,
        width:       layer.transform?.width       ?? layer.width       ?? 1080,
        height:      layer.transform?.height      ?? layer.height      ?? 200,
        rotation:    layer.transform?.rotation    ?? layer.rotation    ?? 0,
        scale:       layer.transform?.scale       ?? layer.scale       ?? 1,
        opacity:     layer.transform?.opacity     ?? layer.opacity     ?? 1,
        blur:        layer.transform?.blur        ?? layer.blur        ?? 0,
        borderRadius:layer.transform?.borderRadius ?? layer.borderRadius ?? 0,
        borderWidth: layer.transform?.borderWidth ?? layer.borderWidth ?? 0,
        borderColor: layer.transform?.borderColor ?? layer.borderColor ?? "#ffffff",
      };

      const keyframes = isAudio ? undefined : (layer.keyframes ?? {
        x: [], y: [], scale: [], rotation: [], opacity: [], blur: [],
      });

      const validated = {
        ...layer, id,
        trackId: layer.trackId || id,
        start, end, zIndex,
        visible: layer.visible !== false,
        locked: false,
        transform,
        animation: isAudio ? null : (layer.animation ?? { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } }),
        transition: isAudio ? null : (layer.transition ?? { type: "none", duration: 0.5 }),
        sfx: null,
      };

      if (keyframes !== undefined) validated.keyframes = keyframes;

      if (layer.type === "text") {
        validated.content = typeof layer.content === "string" && layer.content
          ? layer.content
          : (typeof layer.text === "string" && layer.text ? layer.text : "Text");
        console.log('[compose] text layer content:', { id: layer.id, content: validated.content, text: layer.text, layerContent: layer.content });

        const baseStyle = layer.style && typeof layer.style === "object" ? layer.style : {};

        // Determine correct font by layer role
        const headlineRoles = new Set(["headline", "category_label", "offer_text", "offer_label", "logo_placeholder"]);
        const roleFont = headlineRoles.has(layer.role) ? headlineFont : bodyFont;

        // Merge root-level style fields into style object (root takes priority)
        validated.style = {
          fontFamily:    roleFont,
          fontSize:      layer.fontSize      ?? baseStyle.fontSize      ?? 88,
          fontWeight:    layer.fontWeight    ?? baseStyle.fontWeight    ?? 800,
          color:         layer.color         ?? baseStyle.color         ?? (spec?.palette?.text || "#ffffff"),
          textAlign:     layer.textAlign     ?? baseStyle.textAlign     ?? "center",
          lineHeight:    layer.lineHeight    ?? baseStyle.lineHeight    ?? 1.2,
          letterSpacing: layer.letterSpacing ?? baseStyle.letterSpacing ?? 0,
          textShadow:    baseStyle.textShadow   ?? null,
          background:    layer.background    ?? baseStyle.background    ?? null,
          borderRadius:  layer.borderRadius  ?? baseStyle.borderRadius  ?? 0,
          padding:       layer.padding       ?? baseStyle.padding       ?? 0,
          textTransform: layer.textTransform ?? baseStyle.textTransform ?? undefined,
          opacity:       layer.opacity       ?? baseStyle.opacity       ?? undefined,
        };

        // Remove undefined values
        Object.keys(validated.style).forEach(k => {
          if (validated.style[k] === undefined) delete validated.style[k];
        });

        // Font already enforced by role above — no override needed

        // Recalculate height if too small for fontSize
        const fs = validated.style.fontSize ?? 88;
        const lh = validated.style.lineHeight ?? 1.2;
        const w = layer.width ?? layer.transform?.width ?? 800;
        const charsPerLine = Math.floor(w / (fs * 0.55));
        const contentLength = validated.content?.length ?? 10;
        const estimatedLines = Math.max(1, Math.ceil(contentLength / Math.max(1, charsPerLine)));
        const minHeight = Math.ceil(fs * lh * estimatedLines) + 24;
        const gptHeight = layer.height ?? layer.transform?.height ?? 0;
        const finalHeight = Math.max(minHeight, gptHeight);
        if (validated.transform) validated.transform.height = finalHeight;
      }

      if (isAudio) {
        validated.audioType = layer.audioType || "music";
        validated.volume = typeof layer.volume === "number" ? layer.volume : 0.4;
        validated.fadeIn = typeof layer.fadeIn === "number" ? layer.fadeIn : 1;
        validated.fadeOut = typeof layer.fadeOut === "number" ? layer.fadeOut : 2;
        validated.src = layer.src ?? null;
        delete validated.keyframes;
      }

      return validated;
    });

    // Add music placeholder if missing
    const hasMusic = layers.some(l => l.type === "audio" && l.audioType === "music");
    if (!hasMusic) {
      layers.push({
        id: "music_bg", type: "audio", name: "Background Music",
        audioType: "music", src: null, start: 0, end: totalDuration,
        volume: 0.4, fadeIn: 1.5, fadeOut: 2.0,
        visible: true, locked: false, trackId: "music_bg",
        transform: null, animation: null, transition: null, sfx: null, zIndex: 0,
      });
    }

    res.json({ layers });
  } catch (err) {
    console.error("[compose]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 7: MOTION PASS ─────────────────────────────────────────────────────
// Deterministic motion enrichment. No GPT.
router.post("/motion", requireAuth, async (req, res) => {
  try {
    const { layers, direction } = req.body;
    if (!Array.isArray(layers)) return res.json({ layers: [] });

    console.log('[motion timing check]', layers.slice(0, 3).map(l => ({ id: l.id, start: l.start, end: l.end })));

    const isKinetic = direction?.energy === "high";

    const enriched = layers.map((layer) => {
      if (layer.type === "audio") {
        if (layer.audioType === "music") {
          return { ...layer, fadeIn: 1.5, fadeOut: 2.0, volume: Math.min(0.5, Math.max(0.3, layer.volume ?? 0.4)) };
        }
        return layer;
      }

      const out = { ...layer, sfx: null };
      const dur = (layer.end ?? 0) - (layer.start ?? 0);
      const kf = { ...(out.keyframes ?? { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] }) };

      // Background image — slow zoom
      if (layer.type === "image" && layer.zIndex === 1) {
        if (!kf.scale?.length) kf.scale = [{ time: 0, value: 1.0, easing: "linear" }, { time: dur, value: 1.06, easing: "linear" }];
        out.animation = { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } };
        out.transition = { type: "fade", duration: 0.5 };
      }

      // Product image — gentle float
      else if (layer.type === "image" && (layer.zIndex ?? 0) >= 4) {
        const baseY = layer.transform?.y ?? 0;
        if (!kf.y?.length) kf.y = [
          { time: 0, value: baseY, easing: "ease-in-out" },
          { time: dur / 2, value: baseY - 15, easing: "ease-in-out" },
          { time: dur, value: baseY, easing: "ease-in-out" },
        ];
        out.animation = { in: { type: "zoom", duration: 0.5 }, out: { type: "none", duration: 0.3 } };
      }

      // Text layers
      else if (layer.type === "text") {
        out.animation = {
          in: isKinetic ? { type: "slide-up", duration: 0.25 } : { type: "fade", duration: 0.35 },
          out: { type: "fade", duration: 0.2 },
        };

        const fadeInDur = isKinetic ? 0.2 : 0.35;

        if (!kf.opacity?.length) {
          kf.opacity = [
            { time: 0,         value: 0, easing: "ease-out" },
            { time: fadeInDur, value: 1, easing: "ease-out" },
          ];
        }

        if (!kf.y?.length) {
          const baseY = layer.transform?.y ?? 0;
          const slideDistance = isKinetic ? 30 : 20;
          kf.y = [
            { time: 0,         value: baseY + slideDistance, easing: "ease-out" },
            { time: fadeInDur, value: baseY,                 easing: "ease-out" },
          ];
        }
      }

      out.keyframes = kf;
      return out;
    });

    console.log('[motion timing out]', enriched.slice(0, 3).map(l => ({ id: l.id, start: l.start, end: l.end })));

    res.json({ layers: enriched });
  } catch (err) {
    console.error("[motion]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GENERATE SCENE IMAGE (kept from previous) ────────────────────────────
router.post("/generate-scene-image", requireAuth, async (req, res) => {
  try {
    const { productImageUrl, prompt, projectId } = req.body;
    if (!productImageUrl || !prompt) return res.status(400).json({ error: "productImageUrl and prompt required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    const anchoredPrompt = `Use the uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, branding, and shape — completely unchanged. Only change the scene, environment, surface, and lighting as described: ${prompt}`;

    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
      method: "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_urls: [productImageUrl], prompt: anchoredPrompt }),
    });
    const raw = await falRes.text();
    if (!falRes.ok) throw new Error(`nano-banana failed: ${raw.slice(0, 200)}`);
    const data = JSON.parse(raw);
    const falUrl = data.images?.[0]?.url;
    if (!falUrl) throw new Error("No image URL returned from Fal.ai");

    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : "jpg";
    const key = `product-videos/${req.user.id}/${projectId || "tmp"}/${Date.now()}.${ext}`;
    await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("[generate-scene-image]", err);
    res.status(500).json({ error: err.message });
  }
});
