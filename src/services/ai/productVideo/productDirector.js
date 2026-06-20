/**
 * productDirector.js
 * src/services/ai/productVideo/productDirector.js
 *
 * The Product Video "brain" — a single GPT-4.1 VISION call that reads the user's
 * product photo and returns the whole plan: a validation gate, the product brief
 * (name/category/mood/theme/accent), a base-image cleanup prompt, and a per-scene
 * shot strategy. Each scene carries everything both halves of the pipeline need:
 *   - image_generation_prompt  → Nano Banana edit (scene/lighting only, NO text)
 *   - anchor                   → shared placement contract (image leaves it clean,
 *                                overlay fills it) so they compose, never collide
 *   - display block            → kicker / headline / accent_word / body / label / icon
 *   - script_segment           → short spoken line (kept tight so scenes stay 3–4s)
 *   - render                   → "image" | "video" (video wiring deferred)
 *   - motion_prompt            → reserved for the image-to-video step
 *
 * Reconstruction of the old Product Ad Studio /analyze brain (productAdAnalysis.js,
 * since deleted), aligned to the video pipeline. See routes/productAd.js for the
 * proven generation backend this plan drives.
 */

import { openai } from "../../../server/middleware/shared.js";
import { getStyle, styleMenuForDirector, STYLE_IDS } from "../shared/visualStyles.js";

// Sensible style fallback by product mood (when Auto and the model doesn't return a valid id).
const MOOD_STYLE = { premium: "dark_cinematic", elegant: "dark_cinematic", minimalist: "minimal", bold: "bold_pop", playful: "bold_pop", organic: "editorial_retro" };

// The visual-style directive for the director: honor a locked pick, else have it choose.
function styleDirective(visualStyle) {
  const locked = getStyle(visualStyle);
  if (locked) {
    return `## VISUAL STYLE (locked by the user): ${locked.label} — ${locked.description}
Shoot EVERY scene in this aesthetic: ${locked.photoStyle}. Palette feel (a direction only — pull the actual accent from the product itself): ${locked.paletteGuidance}
Set product.visual_style to "${locked.id}".`;
  }
  return `## VISUAL STYLE — YOU CHOOSE the look that best fits THIS product's positioning. Pick exactly ONE id from:
${styleMenuForDirector()}
Match the product to its market: a premium/luxury/tech product must NOT get a casual or meme look; a playful consumer product can. Shoot every scene's environment, lighting, and mood in the chosen style. Set product.visual_style to the chosen id.`;
}

// Scene-count → intent sequence GUIDANCE (the director may adapt; not a hard enum).
const COUNT_GUIDANCE = {
  1: `ONE scene — a single self-contained mini-ad: a desire line + the product hero + a CTA, all in one frame. Keep the spoken line to ~12 words MAX.`,
  3: `THREE scenes — a tight funnel: (1) hook/showcase hero, (2) one strong feature shot (macro material OR lifestyle/on-foot), (3) CTA. ~7 words spoken each.`,
  5: `FIVE scenes — richer variety: (1) hook/showcase hero, (2) macro material closeup, (3) lifestyle/on-foot in context, (4) a detail or sole/grip closeup, (5) CTA. ~7 words spoken each. Make every shot a DIFFERENT camera — never repeat the same framing.`,
};

// Anchor vocabulary — a shared placement contract, not a visual template.
const ANCHORS = `Placement anchors (pick the one that suits the shot; the image leaves that zone clean, the overlay fills it):
- "text-top"    → product sits in the lower ~60%; keep the UPPER ~40% clean/simple for text.
- "text-bottom" → product sits in the upper ~60%; keep the LOWER ~38% clean for text.
- "text-left"   → product anchored to the RIGHT ~55%; keep the LEFT ~45% clean for text.
- "text-right"  → product anchored to the LEFT ~55%; keep the RIGHT ~45% clean for text.`;

function buildSystem(count, params) {
  return `You are the creative director AND product photographer for a premium short-form product video (9:16). You are looking at the user's actual product photo. Design a sequence of distinct, magazine-grade scenes — like the panels of a high-end product ad, each shown full-screen for ~3–4 seconds.

FIRST, validate: is this a clear, usable photo of a single physical product? If it is unusable (not a product, multiple unrelated products, unreadable), set validation.is_suitable=false with a short reason and stop.

${COUNT_GUIDANCE[count] ?? COUNT_GUIDANCE[3]}

EACH SCENE is a different CAMERA on the SAME product (the generator preserves the product's identity from a reference image — you only describe the scene around it):
- creative_direction: ONE art-direction sentence telling the overlay designer this scene's JOB and how it should feel + lay out (energy, density, focus). Make consecutive scenes feel DIFFERENT — a hook is punchy/minimal, a feature scene is calm/structured, a CTA is decisive. This drives tonal variety across the video.
- shot_type: a free description of the camera/treatment (e.g. "angled hero pair on a concrete step, warm side light"; "extreme macro of the laces and panel stitching"; "worn on-foot, cropped at the calf, urban street"; "top-down of the insole"; "low angle of the outsole tread").
- image_generation_prompt: describe ONLY the scene — environment, surface, lighting, camera angle, framing, mood. NEVER restate the product's own design (the reference carries it). Explicitly leave the anchor's zone as clean, simple, slightly darkened negative space for text. ABSOLUTELY NO text, letters, numbers, logos, watermarks, or UI in the image.
- For a WORN / lifestyle shot, describe the person/context in the prompt ("a person wearing it, cropped below the knee, walking on city steps") — the generator keeps the exact product.

${ANCHORS}

OVERLAY (what we render over the shot, in the anchor's clean zone). Give each scene FOCUSED content that suits its intent — NOT every element type on every scene. This is a 3-second video scene, so less-but-bigger reads better than a packed poster. Match the intent:
- a HOOK / showcase scene: just a kicker + headline (+ maybe one body line). No feature list.
- a FEATURE / detail scene: a headline + 1–2 features (NOT 3+).
- a CTA scene: a headline + the CTA (+ optionally a tiny credential strip).
Fields:
- display.kicker: a tiny eyebrow line (e.g. "EFFORTLESS STREET STYLE") or null.
- display.headline: the big line(s). Use \\n for a line break. 2–6 words. ALWAYS present.
- display.accent_word: the word/phrase within the headline to color with the accent (must appear in headline) or null.
- display.body: one short supporting sentence or null.
- display.features: an ARRAY of 0–2 feature points, each { "icon": "lucide-name", "label": "LIGHTWEIGHT FEEL", "sub": "short 2–4 word line" }. Use ONLY on feature/detail scenes. Empty otherwise.
- display.stat: an optional spec callout { "value": "100%", "label": "GENUINE SUEDE" } or null — only when there's a real, true number/spec.
- display.badge / display.label: a single short tag or null — sparingly.
- display.strip: 0 or 3 short credential phrases — only on a CTA/closing scene, else empty.
- Lucide icon names to draw from: footprints, feather, shield-check, leaf, sparkles, shield, zap, award, check-circle, layers, move, badge-check.
- Spell every word exactly. Never put the product's own brand text in the overlay unless it's the brand name on hero/CTA. Prefer roomy anchors (text-top / text-left / text-right) when a scene has more content.

SCRIPT: write a SHORT spoken line per scene (the word caps above are hard limits — long scripts make scenes too long). full_script = all script_segments joined naturally.

PALETTE: derive from the product. Premium goods → editorial dark, moody field with the product's accent on the key word/icon. Bright/playful goods → lighter field. accent_color = a single #hex pulled from the product.

${styleDirective(params.visualStyle)}

PRODUCT CONTEXT (from the user): brand "${params.brandName || "(read it from the photo)"}"${params.productDescription ? `, described as: ${params.productDescription}` : ""}. CTA: "${params.ctaText || "Shop Now"}".${params.offerText ? ` Offer: ${params.offerText}.` : ""}${params.website ? ` Website: ${params.website}.` : ""} Campaign goal: ${params.goal || "promo"}.

Return ONLY valid JSON, no prose:
{
  "validation": { "is_suitable": true, "rejection_reason": null },
  "product": { "name": "", "category": "clothing|wearable|non_worn", "mood": "premium|playful|minimalist|bold|elegant|organic", "theme": "dark|light|medium", "accent_color": "#hex", "secondary_color": "#hex — a second key color from the product, for two-tone UI / panels / dividers", "visual_style": "the chosen (or locked) style id", "has_watermark": false },
  "base_image_prompt": "Nano Banana edit instruction to turn the upload into a clean studio packshot — pure seamless backdrop, clean directional studio light, remove props/clutter, no text added. Keep the product 100% unchanged.",
  "full_script": "the complete voiceover",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook|showcase|feature|detail|lifestyle|cta|standalone",
      "creative_direction": "one art-direction sentence for the overlay designer — this scene's JOB + energy + layout feel (e.g. 'Punchy hero opener — one bold line, huge type, generous negative space, almost no UI')",
      "shot_type": "",
      "image_generation_prompt": "",
      "anchor": "text-top|text-bottom|text-left|text-right",
      "script_segment": "",
      "display": { "kicker": null, "headline": "", "accent_word": null, "body": null, "label": null, "icon": null, "features": [{ "icon": "shield-check", "label": "PREMIUM MATERIALS", "sub": "built to last" }], "stat": null, "badge": null, "strip": ["PREMIUM QUALITY", "MODERN DESIGN", "MADE FOR YOU"] },
      "render": "image",
      "motion_prompt": "subtle camera move for the later video step"
    }
  ]
}`;
}

const VALID_ANCHORS = new Set(["text-top", "text-bottom", "text-left", "text-right"]);
const VALID_CATS    = new Set(["clothing", "wearable", "non_worn"]);
const VALID_THEMES  = new Set(["dark", "light", "medium"]);
const VALID_MOODS   = new Set(["premium", "playful", "minimalist", "bold", "elegant", "organic"]);

/**
 * generateProductPlan(productImageUrl, params)
 * @returns {{ validation, product, base_image_prompt, full_script, scenes }}
 * @throws if the image is rejected (validation.is_suitable === false)
 */
export async function generateProductPlan(productImageUrl, params = {}) {
  const count = [1, 3, 5].includes(parseInt(params.sceneCount)) ? parseInt(params.sceneCount) : 3;
  const system = buildSystem(count, params);

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await openai.chat.completions.create({
        model:       "gpt-4.1",
        temperature: 0.7,
        max_tokens:  3000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: [
            { type: "text", text: `Design the ${count}-scene product video for this product. Return only JSON.` },
            { type: "image_url", image_url: { url: productImageUrl } },
          ] },
        ],
      });
      break;
    } catch (err) {
      const retryable = err.status === 429 || err.status === 500 || err.status === 503;
      if (retryable && attempt < 3) { await new Promise(r => setTimeout(r, attempt * 1500)); continue; }
      throw err;
    }
  }

  const raw = (response.choices[0].message.content ?? "").trim();
  const sanitized = raw
    .replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "")
    .replace(/"((?:[^"\\]|\\.)*)"/g, (m) => m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t"));
  let parsed;
  try { parsed = JSON.parse(sanitized); }
  catch {
    const m = sanitized.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`productDirector: JSON parse failed.\n${raw.slice(0, 400)}`);
    parsed = JSON.parse(m[0]);
  }

  if (parsed.validation && parsed.validation.is_suitable === false) {
    const reason = parsed.validation.rejection_reason || "This image is not suitable for a product video.";
    const e = new Error(reason);
    e.code = "UNSUITABLE_IMAGE";
    throw e;
  }

  const product = parsed.product ?? {};
  const brief = {
    product_name:   typeof product.name === "string" && product.name.trim() ? product.name.trim() : (params.brandName || "Product"),
    product_category: VALID_CATS.has(product.category) ? product.category : "non_worn",
    product_mood:   VALID_MOODS.has(product.mood)   ? product.mood   : "premium",
    product_theme:  VALID_THEMES.has(product.theme) ? product.theme  : "dark",
    accent_color:   /^#[0-9a-f]{3,8}$/i.test(product.accent_color ?? "") ? product.accent_color : "#C8954F",
    secondary_color: /^#[0-9a-f]{3,8}$/i.test(product.secondary_color ?? "") ? product.secondary_color : null,
    visual_style:   getStyle(params.visualStyle)?.id                          // locked pick wins
                    ?? (STYLE_IDS.includes(product.visual_style) ? product.visual_style  // else the director's choice
                    : (MOOD_STYLE[product.mood] ?? "dark_cinematic")),                    // else by mood
    has_watermark:  product.has_watermark === true,
  };

  const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  if (!rawScenes.length) throw new Error("productDirector: no scenes returned");

  const scenes = rawScenes.map((s, i) => {
    const d = s.display ?? {};
    return {
      scene_index:  i,
      intent:       typeof s.intent === "string" ? s.intent : "showcase",
      creative_direction: typeof s.creative_direction === "string" ? s.creative_direction : "",
      shot_type:    typeof s.shot_type === "string" ? s.shot_type : "",
      image_generation_prompt: typeof s.image_generation_prompt === "string" ? s.image_generation_prompt : "",
      anchor:       VALID_ANCHORS.has(s.anchor) ? s.anchor : "text-top",
      script_segment: typeof s.script_segment === "string" ? s.script_segment : "",
      spoken:       typeof s.script_segment === "string" ? s.script_segment : "",
      render:       s.render === "video" ? "video" : "image",
      motion_prompt: typeof s.motion_prompt === "string" ? s.motion_prompt : "",
      display: {
        kicker:      typeof d.kicker === "string" ? d.kicker : "",
        headline:    typeof d.headline === "string" ? d.headline : "",
        accent_word: typeof d.accent_word === "string" ? d.accent_word : "",
        body:        typeof d.body === "string" ? d.body : "",
        label:       typeof d.label === "string" ? d.label : "",
        icon:        typeof d.icon === "string" ? d.icon : "",
        features:    Array.isArray(d.features)
          ? d.features.filter(f => f && typeof f.label === "string").slice(0, 3).map(f => ({
              icon:  typeof f.icon === "string" ? f.icon : "",
              label: f.label,
              sub:   typeof f.sub === "string" ? f.sub : "",
            }))
          : [],
        stat:        (d.stat && typeof d.stat.value === "string")
          ? { value: d.stat.value, label: typeof d.stat.label === "string" ? d.stat.label : "" }
          : null,
        badge:       typeof d.badge === "string" ? d.badge : "",
        strip:       Array.isArray(d.strip) ? d.strip.filter(x => typeof x === "string").slice(0, 4) : [],
      },
    };
  });

  const full_script = typeof parsed.full_script === "string" && parsed.full_script.trim()
    ? parsed.full_script.trim()
    : scenes.map(s => s.script_segment).join(" ");

  console.log(`[productDirector] "${brief.product_name}" | ${brief.product_category} | mood=${brief.product_mood} theme=${brief.product_theme} style=${brief.visual_style} accent=${brief.accent_color} | ${scenes.length} scenes`);

  return {
    validation: parsed.validation ?? { is_suitable: true },
    brief,
    base_image_prompt: typeof parsed.base_image_prompt === "string" ? parsed.base_image_prompt : "",
    full_script,
    scenes,
  };
}
