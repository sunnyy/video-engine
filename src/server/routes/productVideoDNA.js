import express from "express";
import { openai, requireAuth } from "../middleware/shared.js";

export const router = express.Router();

// Step 1 — Visual DNA Analysis
router.post("/visual-dna", requireAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    const imageRes = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");
    const imageMimeType = imageRes.headers.get("content-type") || "image/jpeg";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a visual analyst for premium product advertising.
Analyze this product image and extract its visual DNA.
Return ONLY a JSON object — no explanation:
{
  "product_type": "specific product name",
  "category": "product category",
  "primary_colors": ["color1", "color2"],
  "dominant_color_hex": "#hex",
  "accent_color_hex": "#hex",
  "surface_finish": "matte/glossy/suede/metallic/etc",
  "brand_feel": "minimal/bold/playful/luxurious/sporty/elegant",
  "visual_keywords": ["keyword1", "keyword2", "keyword3"],
  "best_camera_angles": ["angle1", "angle2"],
  "recommended_backgrounds": ["background1", "background2"],
  "lighting_style": "soft/dramatic/studio/natural/cinematic",
  "premium_level": "budget/mid/premium"
}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the visual DNA of this product." },
            { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    });

    const dna = JSON.parse(completion.choices[0].message.content);
    res.json(dna);
  } catch (err) {
    console.error("[visual-dna]", err);
    res.status(500).json({ error: err.message });
  }
});

// Step 3 — Script + Image Hint Generator
router.post("/generate-script", requireAuth, async (req, res) => {
  try {
    const { visualDNA, sceneBlueprints, brandName, ctaText, website, offerText, tagline } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a world-class commercial advertising copywriter and art director.
You will receive a product's visual DNA and scene layout blueprints.
Write compelling copy and layout-aware image generation hints for each scene.

RULES:
- Copy must be specific to THIS product — not generic
- Image hints must respect the layout blueprint — product position and negative space must match
- Image hints must end with "NO TEXT in image, pure photography only"
- Headlines must be short and punchy — 2-5 words max
- headline_accent is the second line of the two-tone headline (accent color)
- If no offer, set offer fields to null
- If no website, set website to null

Return JSON:
{
  "scenes": [
    {
      "index": 0,
      "scene_type": "hero_intro",
      "purpose": "hook",
      "headline": "BOLD SHORT HEADLINE",
      "headline_accent": "ACCENT LINE",
      "subheadline": "One compelling sentence.",
      "body": null,
      "features": null,
      "cta": null,
      "brand": "${brandName || ""}",
      "website": ${website ? `"${website}"` : "null"},
      "offer": ${offerText ? `"${offerText}"` : "null"},
      "image_hint": "Detailed layout-aware image generation prompt. Must specify: product position matching blueprint, negative space location matching blueprint, lighting, atmosphere, background. End with: NO TEXT in image, pure photography only."
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Product Visual DNA:
${JSON.stringify(visualDNA, null, 2)}

Scene Blueprints:
${JSON.stringify(sceneBlueprints, null, 2)}

Brand: ${brandName || ""}
CTA Text: ${ctaText || "Shop Now"}
${offerText ? `Offer: ${offerText}` : ""}
${tagline ? `Tagline: ${tagline}` : ""}

Write the scene scripts and image hints. Make the copy feel premium and specific to this product.`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error("[generate-script]", err);
    res.status(500).json({ error: err.message });
  }
});
