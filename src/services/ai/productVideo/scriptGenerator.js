/**
 * scriptGenerator.js
 * Phase 1 of the product video pipeline.
 *
 * Takes a productBrief (from productAnalyzer) + project params.
 * Returns scenes with voiceover, display_lines, and shot_directives.
 * No vision call — the brief already contains the visual analysis.
 */

import { openai } from "../../../server/middleware/shared.js";

const CAMPAIGN_GOAL_DIRECTIVES = {
  launch:    "CAMPAIGN GOAL: PRODUCT LAUNCH — Debut energy. Emphasize newness, excitement, first-time availability. Create a sense of discovery.",
  promo:     "CAMPAIGN GOAL: PROMOTIONAL AD — Focus on desire, lifestyle aspiration, and why this product is worth having.",
  discount:  "CAMPAIGN GOAL: DISCOUNT / SALE — Price and urgency are the story. Highlight savings and limited-time nature.",
  awareness: "CAMPAIGN GOAL: BRAND AWARENESS — Brand story, values, emotional connection. Soft sell — plant the brand in the viewer's mind.",
};

export const PRODUCT_INTENT_PATTERNS = {
  1: [
    { intents: ["standalone"], tone: "One powerful scene — product, desire, and CTA all in one." },
  ],
  3: [
    { intents: ["hook", "hero", "cta"],     tone: "Bold opener → product showcase → buy now" },
    { intents: ["hook", "features", "cta"], tone: "Desire hook → what you get → action" },
  ],
  5: [
    { intents: ["hook", "hero", "features", "offer", "cta"], tone: "Full funnel — grab attention, showcase product, highlight benefits, present deal, drive action" },
    { intents: ["hook", "features", "hero", "offer", "cta"], tone: "Benefits-first — lead with outcomes, then reveal the product, close with offer and CTA" },
  ],
};

export const SCENE_BUDGETS = {
  standalone: { duration: 8.0, words: 32 },
  hook:       { duration: 3.5, words: 12 },
  hero:       { duration: 4.0, words: 16 },
  features:   { duration: 4.5, words: 18 },
  offer:      { duration: 3.0, words: 10 },
  cta:        { duration: 3.5, words: 12 },
};

function buildSystemPrompt(brief, intents, selected, structureLines) {
  const benefitsList = brief.key_benefits.length
    ? brief.key_benefits.map((b, i) => `  ${i + 1}. ${b}`).join("\n")
    : "  (derive from product category)";

  return `You are a world-class product advertising copywriter for premium ecommerce brands.

PRODUCT BRIEF:
- Name: ${brief.product_name}
- Category: ${brief.product_category}
- Mood: ${brief.product_mood}
- Target audience: ${brief.target_audience || "general consumer"}
- Key benefits:
${benefitsList}
- Visual style: ${brief.visual_style || "aspirational lifestyle photography"}

SCRIPT RULES:
- Sound like a confident brand speaking directly to the customer
- Short punchy fragments, not full sentences
- Brand name appears in hero/standalone scene and CTA — nowhere else
- Never say: revolutionary, game-changing, next-gen, cutting-edge, unlock, leverage
- Focus on what the customer feels or gets — not abstract features
- Write specifically for this product using the brief above

SCENE STRUCTURE (follow exactly):
${structureLines}

Pattern tone: ${selected.tone}

SCENE INTENT DESCRIPTIONS:
- hook:       Scroll-stopping opener. No brand name. Bold claim, question, or desire statement.
- hero:       Introduce brand/product. One clear value statement. What it is + why it's different.
- features:   2–3 specific benefits the customer feels. Short fragments, each one punchy.
- offer:      State the deal. Price, discount, or urgency. Short and bold.
- cta:        Brand name + call to action as one flowing line.
- standalone: All of the above compressed into one scene.

PUNCTUATION RULES (controls TTS pacing):
- Periods after each complete statement or list item
- Commas only within a single continuous thought
- Em dash (—): dramatic pause between contrasting beats
- Question marks for direct-address hooks
LIST ITEMS — always periods, never commas:
  WRONG: "Dry skin, dull tone, uneven texture."
  RIGHT: "Dry skin. Dull tone. Uneven texture."
CTA — never em dash. Comma for one continuous energetic thought:
  RIGHT: "Try it risk-free, shop now"

DISPLAY TEXT:
Each scene needs display_text — the key text that will appear ON SCREEN (not spoken).
Write it as short, punchy lines separated by newlines. 1–4 lines max.
This is what the visual designer uses as the headline/copy for the scene.
Examples:
  hook:     "STAND OUT\nWITHOUT TRYING"
  hero:     "WHERE COMFORT\nMEETS STYLE"
  features: "WHY YOU'LL LOVE IT\nLightweight feel\nFlexible outsole\nSoft cushioning"
  offer:    "50% OFF TODAY\nLimited time deal"
  cta:      "OWN YOUR STYLE\nShop the collection"

VISUAL CONCEPT:
Each scene needs visual_concept — one sentence describing the visual mood/energy for the scene designer.
Example: "Dramatic cinematic feel — product as the hero against a moody dark surface."

SHOT DIRECTIVE:
Each scene needs a shot_directive — a single-sentence instruction for an AI photo editor that has the product image.
The directive describes ONLY the environment, lighting, and composition — never the product itself.
Always start with: "Keep the product exactly as shown."
Then describe: surface, lighting, atmosphere, composition.
End with: "No text, no words, no UI elements. Vertical portrait format."

CRITICAL COMPOSITION RULE: The product must sit in the LOWER 50–60% of the frame.
The upper 40–50% must be open, clean background — sky, surface, wall, or soft bokeh — so headline text overlays cleanly on top.
The bottom 15% should also be relatively uncluttered for a feature strip overlay.

Match the scene intent:
- hook: dramatic, cinematic, product lower-center on a moody surface
- hero: warm lifestyle setting, product lower-center, open background above
- features: contextual editorial — product lower-center with relevant props nearby
- offer: bold, bright, punchy — product lower on a vivid background
- cta: clean, premium — product lower with breathing room around it
- standalone: aspirational hero, product lower-center, rich background above

OUTPUT — return ONLY valid JSON:
{
  "full_script": "complete voiceover from start to finish",
  "accent_color": "#hex — use the brief's accent or dominant color, choose what works better for text",
  "product_mood": "${brief.product_mood}",
  "product_theme": "${brief.product_theme}",
  "product_category": "${brief.product_category}",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook",
      "script_segment": "exact voiceover words for this scene from full_script",
      "shot_directive": "Keep the product exactly as shown. [environment/lighting description]. No text, no words, no UI elements. Vertical portrait format.",
      "duration_seconds": 3.5,
      "display_text": "HEADLINE LINE ONE\nHEADLINE LINE TWO",
      "visual_concept": "One sentence describing the visual mood for this scene."
    }
  ]
}

RULES:
- script_segment values must be consecutive substrings of full_script
- full_script = all script_segments joined naturally
- Count words before submitting — stay within budget per scene
- display_text lines max ~30 chars each so they fit on screen`;
}

export async function generateProductScript({ productBrief, brandName, ctaText, offerText, website, sceneCount, goal }) {
  const brief   = productBrief ?? {};
  const count   = [1, 3, 5].includes(parseInt(sceneCount)) ? parseInt(sceneCount) : 3;
  const patterns = PRODUCT_INTENT_PATTERNS[count] ?? PRODUCT_INTENT_PATTERNS[3];
  const selected = patterns[Math.floor(Math.random() * patterns.length)];
  const intents  = selected.intents;

  const structureLines = intents.map((intent, i) => {
    const b = SCENE_BUDGETS[intent];
    return `  Scene ${i + 1} (${intent}): max ${b.words} words spoken, ~${b.duration}s`;
  }).join("\n");

  const systemPrompt = buildSystemPrompt(brief, intents, selected, structureLines);
  const goalDirective = CAMPAIGN_GOAL_DIRECTIVES[goal] ?? CAMPAIGN_GOAL_DIRECTIVES.promo;

  const userPrompt = `Brand: ${brandName || brief.product_name || "Unknown Brand"}
CTA text: ${ctaText || "Shop Now"}
${offerText ? `Offer/deal: ${offerText}` : ""}
${website   ? `Website: ${website}`      : ""}
Scene count: ${count}
${goalDirective}

Write the script, display_text, visual_concept, and shot_directives for each scene.`;

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await openai.chat.completions.create({
        model:       "gpt-4.1",
        temperature: 0.7,
        max_tokens:  2500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
      });
      break;
    } catch (err) {
      const retryable = err.status === 431 || err.status === 429 || err.status === 500 || err.status === 503;
      if (retryable && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 1500));
        continue;
      }
      throw err;
    }
  }

  const raw = (response.choices[0].message.content ?? "").trim();
  // GPT sometimes outputs literal newlines/tabs inside JSON string values — sanitize before parsing
  const sanitized = raw.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
    match.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
  );
  let parsed;
  try { parsed = JSON.parse(sanitized); }
  catch {
    const m = sanitized.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else throw new Error(`productScriptGenerator: JSON parse failed.\n${raw.slice(0, 400)}`);
  }

  const rawScenes   = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  const full_script = typeof parsed.full_script === "string"
    ? parsed.full_script
    : rawScenes.map(s => s.script_segment).join(" ");

  if (!rawScenes.length) throw new Error("productScriptGenerator: no scenes returned");

  const scenes = rawScenes.map((s, i) => {
    const intent = s.intent ?? intents[i] ?? "hero";
    return {
      scene_index:      i,
      intent,
      script_segment:   s.script_segment  ?? "",
      spoken:           s.script_segment  ?? "",
      display_text:     typeof s.display_text   === "string" ? s.display_text   : "",
      visual_concept:   typeof s.visual_concept === "string" ? s.visual_concept : "",
      shot_directive:   typeof s.shot_directive === "string" ? s.shot_directive : "",
      duration_seconds: SCENE_BUDGETS[intent]?.duration ?? 4.0,
      duration:         SCENE_BUDGETS[intent]?.duration ?? 4.0,
    };
  });

  const product_theme = ["dark", "light", "medium"].includes(parsed.product_theme)
    ? parsed.product_theme
    : brief.product_theme ?? "dark";

  console.log(`[productScriptGen] ${scenes.length} scenes | mood=${parsed.product_mood ?? brief.product_mood} | theme=${product_theme} | accent=${parsed.accent_color ?? brief.accent_color}`);

  return {
    full_script,
    scenes,
    accent_color:     parsed.accent_color     ?? brief.accent_color  ?? "#7c5cfc",
    product_mood:     parsed.product_mood      ?? brief.product_mood  ?? "premium",
    product_theme,
    product_category: parsed.product_category ?? brief.product_category ?? "product",
    pattern_name:     selected.tone,
  };
}
