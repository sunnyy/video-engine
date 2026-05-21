import express from "express";
import { openai, requireAuth, supabaseAdmin } from "../middleware/shared.js";

export const router = express.Router();

// ─── STEP 1: ANALYZE ────────────────────────────────────────────────────────
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

// ─── STEP 3: GENERATE SHOTS ─────────────────────────────────────────────────
router.post("/generate-shots", requireAuth, async (req, res) => {
  const { productImageUrl, productCutoutUrl, projectId, singleShot } = req.body;
  const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
  const referenceUrl = productCutoutUrl || productImageUrl;

  const ANCHOR = "Use the uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, textures, branding, proportions, shape, and design details — completely unchanged. Only change the scene, environment, surface, lighting, and advertisement composition as described: ";

  try {
    // When called with a single custom shot (from compose pipeline), skip hardcoded list
    if (singleShot) {
      const generateShot = async (shot, attempt = 1) => {
        try {
          const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
            method: "POST",
            headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              image_urls: [referenceUrl],
              prompt: ANCHOR + "STRICT RULE: This image must contain ZERO text, ZERO words, ZERO letters, ZERO numbers, ZERO UI elements, ZERO buttons, ZERO labels. Absolutely no typography of any kind anywhere in the image. Pure photography only.\n" + shot.prompt,
            }),
          });
          const raw = await falRes.text();
          if (!falRes.ok) {
            if (falRes.status === 429 && attempt < 3) {
              await new Promise(r => setTimeout(r, 1500 * attempt));
              return generateShot(shot, attempt + 1);
            }
            throw new Error(`fal failed: ${raw.slice(0, 200)}`);
          }
          const data = JSON.parse(raw);
          const falUrl = data.images?.[0]?.url;
          if (!falUrl) throw new Error("No image URL from fal");
          const imgRes = await fetch(falUrl);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const safePurpose = (singleShot?.purpose || shot.purpose || "scene")
            .replace(/[^a-zA-Z0-9]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 30);
          const key = `product-videos/${req.user.id}/${projectId || "tmp"}/shot-${safePurpose}-${Date.now()}.jpg`;
          await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: "image/jpeg", upsert: false });
          const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
          return { purpose: shot.purpose, url: publicUrl };
        } catch (err) {
          console.error(`[shot-${shot.purpose}]`, err.message);
          return { purpose: shot.purpose, url: null, error: err.message };
        }
      };
      const result = await generateShot(singleShot);
      return res.json({ shots: [result] });
    }

    const NO_TEXT = `STRICT RULE: This image must contain ZERO text, ZERO words, ZERO letters, ZERO numbers, ZERO UI elements, ZERO buttons, ZERO labels. Absolutely no typography of any kind anywhere in the image. Pure photography only.\n`;

    const shots = [
      {
        purpose: "hook",
        prompt: NO_TEXT + `Create a dramatic, scroll-stopping product advertisement photograph.
The product is the hero — place it dynamically in the frame with cinematic lighting and atmosphere.
Leave significant negative space in either the upper third or lower third of the frame for text overlay.
Background should be bold and atmospheric — dark, moody, or high contrast — derived from the product colors.
Cinematic lighting, dramatic shadows, motion-inspired energy, premium commercial photography quality.
The negative space must be clean and uncluttered — solid color, gradient, or smooth blur.
Vertical 9:16 format. DO NOT PRINT THIS PROMPT BACK`,
      },
      {
        purpose: "hero",
        prompt: NO_TEXT + `Create a clean, premium product hero photograph for a luxury advertisement.
The product is centered and beautifully lit — studio quality, elegant and aspirational.
Leave clear negative space in the lower third of the frame for headline text overlay.
Background should be clean, minimal, and complementary to the product colors — gradient, soft texture, or elegant surface.
Soft cinematic lighting, realistic reflections, premium shadows, luxury commercial photography quality.
The negative space must be smooth and text-ready.
Vertical 9:16 format. DO NOT PRINT THIS PROMPT BACK`,
      },
      {
        purpose: "lifestyle",
        prompt: NO_TEXT + `Create a premium lifestyle advertisement photograph showing the product in a real-world context.
The product should be naturally present in an aspirational, authentic environment.
Leave clear negative space in the upper third of the frame for headline text overlay.
The scene should feel cinematic, emotional, and premium — not staged or artificial.
Shallow depth of field, natural cinematic lighting, authentic atmosphere, luxury lifestyle photography quality.
The negative space must be clean — sky, wall, or blurred background.
Vertical 9:16 format. DO NOT PRINT THIS PROMPT BACK`,
      },
      {
        purpose: "features",
        prompt: NO_TEXT + `Create a detailed macro product photograph showcasing craftsmanship and material quality.
Focus on textures, details, and premium construction of the product.
Leave clear negative space on the left third of the frame for feature text overlay.
Background should be dark or neutral, making the product details pop.
Macro cinematic lighting, sharp detail rendering, premium material photography quality.
The negative space must be clean and uncluttered.
Vertical 9:16 format. DO NOT PRINT THIS PROMPT BACK`,
      },
      {
        purpose: "offer",
        prompt: NO_TEXT + `Create a clean, bold product advertisement photograph optimized for promotional text overlay.
The product should be prominently placed with maximum visual impact.
Leave very generous negative space in the upper half of the frame for large offer text overlay.
Background should be clean and bold — solid color or simple gradient derived from product colors.
Clean studio lighting, premium commercial photography quality, bold and impactful composition.
The negative space must be completely clean — no distracting elements.
Vertical 9:16 format. DO NOT PRINT THIS PROMPT BACK`,
      },
      {
        purpose: "cta",
        prompt: NO_TEXT + `Create a clean, elegant product advertisement photograph optimized for call-to-action overlay.
The product should be centered and aspirational — the final impression of the brand.
Leave clear negative space in the lower third of the frame for CTA button and text overlay.
Background should be clean, minimal, and brand-appropriate — light or neutral tones.
Soft elegant lighting, premium commercial photography quality, clean and conversion-focused composition.
The negative space must be smooth and button-ready.
Vertical 9:16 format. DO NOT PRINT THIS PROMPT BACK`,
      },
    ];

    const generateShot = async (shot, attempt = 1) => {
      try {
        const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
          method: "POST",
          headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            image_urls: [referenceUrl],
            prompt: ANCHOR + shot.prompt,
          }),
        });
        const raw = await falRes.text();
        if (!falRes.ok) {
          if (falRes.status === 429 && attempt < 3) {
            await new Promise(r => setTimeout(r, 1500 * attempt));
            return generateShot(shot, attempt + 1);
          }
          throw new Error(`fal failed: ${raw.slice(0, 200)}`);
        }
        const data = JSON.parse(raw);
        const falUrl = data.images?.[0]?.url;
        if (!falUrl) throw new Error("No image URL from fal");

        const imgRes = await fetch(falUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const safePurpose = (shot.purpose || "scene")
          .replace(/[^a-zA-Z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 30);
        const key = `product-videos/${req.user.id}/${projectId || "tmp"}/shot-${safePurpose}-${Date.now()}.jpg`;
        await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: "image/jpeg", upsert: false });
        const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
        return { purpose: shot.purpose, url: publicUrl };
      } catch (err) {
        console.error(`[shot-${shot.purpose}]`, err.message);
        return { purpose: shot.purpose, url: null, error: err.message };
      }
    };

    const results = [];
    for (const shot of shots) {
      const result = await generateShot(shot);
      results.push(result);
      await new Promise(r => setTimeout(r, 500));
    }

    res.json({ shots: results });
  } catch (err) {
    console.error("[generate-shots]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 4: VISION TO JSON ──────────────────────────────────────────────────
router.post("/vision-to-json", requireAuth, async (req, res) => {
  try {
    const {
      imageUrl, purpose, start, end, sceneIndex,
      productCutoutUrl, brandName, headline, subheadline,
      ctaText, website, offerText
    } = req.body;

    const { VISION_JSON_REFERENCE } = await import("../../services/ai/productVideo/visionJsonReference.js");

    // Fetch image and convert to base64 to avoid OpenAI timeout on Supabase URLs
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");
    const imageMimeType = imageRes.headers.get("content-type") || "image/jpeg";
    const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

    const systemPrompt = `You are a world-class graphic designer and motion designer.
You will be given a beautiful product advertisement photograph.
Your job is to design text and accent element layers that would look stunning overlaid on top of this image.

Think like a designer:
1. Study the image — identify negative space, dominant colors, focal point, mood, composition
2. Decide where text would look best — in the negative space, not over the product
3. Choose colors that complement the image — derived from the image palette
4. Choose typography that matches the mood — bold for dramatic, elegant for luxury, playful for fun
5. Design accent elements — thin lines, small badges, dots — that enhance the composition
6. Keep it minimal — fewer elements, more impact

CANVAS: 1080x1920 pixels (9:16 portrait)
COORDINATE SYSTEM: x and y are offsets from canvas CENTER.
- x:0, y:0 = dead center of canvas
- x:-540 = left edge, x:540 = right edge
- y:-960 = top edge, y:960 = bottom edge

WHAT TO OUTPUT:
1. ONE image layer — the background scene image (full canvas, objectFit: cover)
2. ONE image layer — the product cutout (if provided, positioned where it looks best)
3. TEXT layers — headline, subheadline, optional body text, optional CTA button
4. GRADIENT layers — accent lines, shadow overlays, badges, decorative elements
DO NOT output audio layers.

TEXT CONTENT TO USE:
- Brand: "${brandName || ""}"
- Headline: "${headline || ""}"
- Subheadline: "${subheadline || ""}"
- CTA: "${ctaText || "Shop Now"}"
- Website: "${website || ""}"
- Offer: "${offerText || ""}"

Only include text layers for content that is provided and non-empty.
If website is empty, skip the website layer.
If offer is empty, skip the offer layer.

SCENE TIMING: start: ${start}, end: ${end}
SCENE PURPOSE: ${purpose}
SCENE INDEX: ${sceneIndex}

Scene purpose guidelines:
- hook: Bold, attention-grabbing. Large headline. High energy. CTA optional.
- hero: Clean and premium. Product is the star. Minimal text. Brand name prominent.
- lifestyle: Emotional. Headline in negative space. Minimal text overlay.
- features: Detail-focused. Feature points as body text. Product visible.
- offer: Offer text prominent. Clean layout. CTA button required.
- cta: Strong CTA button. Brand name. Website. Clean minimal text.

LAYER FORMAT REFERENCE — follow this exactly:
${JSON.stringify(VISION_JSON_REFERENCE, null, 2)}

RULES:
- All layers must have start: ${start} and end: ${end}
- Give every layer a unique id prefixed with "s${sceneIndex}_"
- trackId must equal id
- Keep layers minimal — quality over quantity
- Text must be positioned in negative space — never over the main product in the photo
- Colors must be derived from or complement the image
- Keyframes for text: always fade in from opacity 0 with a slight y slide-up
- Product cutout: add a gentle float animation via y keyframes
- Background image: add a subtle scale keyframe from 1.0 to 1.06 over the scene duration

Return ONLY valid JSON: { "layers": [...] }
No explanation. No markdown. Just the JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Design beautiful text and accent layers for this ${purpose} scene. Background image URL: ${imageUrl}. Product cutout URL: ${productCutoutUrl || "none"}. Be creative and make it look premium.`,
            },
            {
              type: "image_url",
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content);
    const layers = Array.isArray(raw.layers) ? raw.layers : [];

    const timedLayers = layers.map((layer, i) => {
      const id = layer.id || `s${sceneIndex}_layer_${i}`;
      return {
        ...layer,
        id,
        trackId: layer.trackId || id,
        start: typeof layer.start === "number" ? layer.start : start,
        end: typeof layer.end === "number" ? layer.end : end,
        visible: layer.visible !== false,
        locked: false,
        sfx: null,
      };
    });

    res.json({ layers: timedLayers });
  } catch (err) {
    console.error("[vision-to-json]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ANALYZE + SCRIPT ────────────────────────────────────────────────────────
router.post("/analyze-and-script", requireAuth, async (req, res) => {
  try {
    const { imageUrl, brandName, videoType, offerText, ctaText, website, tagline, sceneCount = 3 } = req.body;

    const imageRes = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");
    const imageMimeType = imageRes.headers.get("content-type") || "image/jpeg";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a world-class creative director and copywriter for premium ecommerce product advertisements.
You will be given a product image. Your job is to:
1. Analyze the product deeply — understand what it is, its colors, mood, style, target audience, and key features
2. Write a complete 3-scene video ad script with creative copy and image generation hints for each scene

Return a single JSON object with this exact structure:
{
  "productAnalysis": {
    "category": "string — specific product category",
    "colors": ["array of hex or color names"],
    "dominantColor": "#hex",
    "mood": "string — emotional tone",
    "style": "string — visual style",
    "audience": "string — target audience",
    "key_features": ["array of real product features you can see"],
    "premium_level": "budget | mid | premium"
  },
  "scenes": [
    {
      "index": 0,
      "purpose": "hook",
      "asset_hint": "Detailed image generation prompt. Describe: lighting, background, atmosphere, color palette, product placement, composition. CRITICAL: specify exactly where safe/empty space should be for text overlay (e.g. 'leave upper third of frame as clean dark background for headline text'). No text in the image.",
      "copy": {
        "category_label": "short category label in caps",
        "headline": "bold impactful headline — 2-5 words, all caps",
        "subheadline": "supporting line — one sentence max",
        "body": null,
        "cta": null,
        "brand": "${brandName || ""}"
      }
    }
  ]
}

Scene purposes and copy guidelines:
- hook (index 0): Bold attention-grabbing opener. Large headline. Strong subheadline. No CTA.
- hero (index 1): Product showcase with features. Headline + subheadline + 2-3 feature points as body text.
- cta (index 2): Conversion scene. Headline + subheadline + CTA button${ctaText ? ` saying "${ctaText}"` : ' saying "Shop Now"'}${website ? ` + website "${website}"` : ''}.

Asset hint guidelines:
- hook: dramatic, cinematic, bold atmosphere. Safe area: upper-left or upper-right corner clear for text.
- hero: clean premium product showcase. Safe area: left half OR right half clear for feature text.
- cta: clean minimal background. Safe area: upper half clear for headline, lower portion for CTA button.

Write copy that is specific to THIS product — not generic. Use what you actually see.
${offerText ? `Include this offer in the relevant scene: ${offerText}` : ""}
${tagline ? `Brand tagline: ${tagline}` : ""}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this product and write the complete 3-scene ad script." },
            { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    res.json(parsed);
  } catch (err) {
    console.error("[analyze-and-script]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STEP 5: MOTION PASS ─────────────────────────────────────────────────────
router.post("/motion", requireAuth, async (req, res) => {
  try {
    const { layers, direction } = req.body;
    if (!Array.isArray(layers)) return res.json({ layers: [] });

    const isKinetic = direction?.energy === "high";

    const enriched = layers.map((layer) => {
      const out = { ...layer, sfx: null };
      const dur = (layer.end ?? 0) - (layer.start ?? 0);
      const kf = { ...(out.keyframes ?? { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] }) };

      if (layer.type === "image" && layer.zIndex <= 2) {
        // Background image — slow zoom
        if (!kf.scale?.length) {
          kf.scale = [
            { time: 0,   value: 1,    easing: "linear" },
            { time: dur, value: 1.06, easing: "linear" },
          ];
        }
      } else if (layer.type === "text") {
        const fadeInDur = isKinetic ? 0.25 : 0.35;
        out.animation = {
          in:  { type: isKinetic ? "slide-up" : "fade", duration: fadeInDur },
          out: { type: "fade", duration: 0.2 },
        };
        if (!kf.opacity?.length) {
          kf.opacity = [
            { time: 0,          value: 0, easing: "ease-out" },
            { time: fadeInDur,  value: 1, easing: "ease-out" },
          ];
        }
        if (!kf.y?.length) {
          const baseY = layer.transform?.y ?? 0;
          const slideDistance = isKinetic ? 30 : 20;
          kf.y = [
            { time: 0,          value: baseY + slideDistance, easing: "ease-out" },
            { time: fadeInDur,  value: baseY,                 easing: "ease-out" },
          ];
        }
      } else if (layer.type === "gradient") {
        if (!kf.opacity?.length) {
          kf.opacity = [
            { time: 0,   value: 0, easing: "ease-out" },
            { time: 0.4, value: 1, easing: "ease-out" },
          ];
        }
      }

      out.keyframes = kf;
      return out;
    });

    res.json({ layers: enriched });
  } catch (err) {
    console.error("[motion]", err);
    res.status(500).json({ error: err.message });
  }
});
