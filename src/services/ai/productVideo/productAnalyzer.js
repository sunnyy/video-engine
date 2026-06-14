/**
 * productAnalyzer.js
 * Phase 0 of the product video pipeline.
 * Analyzes the product image with GPT-4.1 vision and returns a creative brief
 * that the scriptGenerator uses instead of doing its own vision call.
 */

import { openai } from "../../../server/middleware/shared.js";

const SYSTEM = `You are a senior brand strategist and visual merchandiser.
Analyze this product photograph and return a creative brief as valid JSON.

Examine:
1. What is the product? (name, category, specific variant/flavor if visible)
2. Dominant visual colors from the product and packaging
3. Target customer and emotional benefits of owning/using it
4. Overall visual mood: premium | playful | minimalist | bold | elegant | organic
5. Background theme:
   - dark: black/charcoal/dark packaging
   - light: white/ivory/near-white packaging
   - medium: ANY colorful product (pink, red, green, blue, pastel, vibrant — if the product has a color, use medium)

Return ONLY valid JSON — no prose before or after:
{
  "product_name": "specific name if readable (e.g. 'OLIPOP Classic Grape'), else descriptive (e.g. 'Energy Drink Can')",
  "product_category": "one short phrase (e.g. 'prebiotic soda', 'luxury face serum', 'wireless earbuds')",
  "dominant_color": "#hex — single most dominant color from packaging/product",
  "accent_color": "#hex — contrasting or complementary brand accent color",
  "product_mood": "premium | playful | minimalist | bold | elegant | organic",
  "product_theme": "dark | light | medium",
  "target_audience": "one sentence describing who buys this",
  "key_benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "visual_style": "one sentence: how to photograph this product aspirationally for a premium ad"
}`;

export async function analyzeProduct(productImageUrl) {
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    try {
      const res = await openai.chat.completions.create({
        model:       "gpt-4.1",
        temperature: 0.2,
        max_tokens:  600,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text",      text: "Analyze this product image." },
              { type: "image_url", image_url: { url: productImageUrl } },
            ],
          },
        ],
      });

      const raw = (res.choices[0].message.content ?? "").trim();
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : null;
      }
      if (!parsed) throw new Error("JSON parse failed");

      const VALID_MOODS   = new Set(["premium", "playful", "minimalist", "bold", "elegant", "organic"]);
      const VALID_THEMES  = new Set(["dark", "light", "medium"]);

      const brief = {
        product_name:     typeof parsed.product_name === "string"     ? parsed.product_name.trim()     : "Product",
        product_category: typeof parsed.product_category === "string" ? parsed.product_category.trim() : "product",
        dominant_color:   /^#[0-9a-f]{3,8}$/i.test(parsed.dominant_color ?? "") ? parsed.dominant_color : "#ffffff",
        accent_color:     /^#[0-9a-f]{3,8}$/i.test(parsed.accent_color  ?? "") ? parsed.accent_color  : "#7c5cfc",
        product_mood:     VALID_MOODS.has(parsed.product_mood)   ? parsed.product_mood   : "premium",
        product_theme:    VALID_THEMES.has(parsed.product_theme) ? parsed.product_theme  : "dark",
        target_audience:  typeof parsed.target_audience === "string" ? parsed.target_audience : "",
        key_benefits:     Array.isArray(parsed.key_benefits)
          ? parsed.key_benefits.filter(b => typeof b === "string").slice(0, 5)
          : [],
        visual_style:     typeof parsed.visual_style === "string" ? parsed.visual_style : "",
      };

      console.log(`[productAnalyzer] "${brief.product_name}" | ${brief.product_category} | mood=${brief.product_mood} | theme=${brief.product_theme} | accent=${brief.accent_color}`);
      return brief;

    } catch (err) {
      const retryable = err.status === 431 || err.status === 429 || err.status === 500 || err.status === 503;
      if (retryable && attempt < 3) {
        console.warn(`[productAnalyzer] attempt ${attempt} failed (${err.status}), retrying…`);
        await new Promise(r => setTimeout(r, attempt * 1500));
        continue;
      }
      console.error("[productAnalyzer] failed:", err.message);
      break;
    }
  }

  // Fallback brief — pipeline continues with generic defaults
  return {
    product_name:     "Product",
    product_category: "product",
    dominant_color:   "#ffffff",
    accent_color:     "#7c5cfc",
    product_mood:     "premium",
    product_theme:    "dark",
    target_audience:  "",
    key_benefits:     [],
    visual_style:     "",
  };
}
