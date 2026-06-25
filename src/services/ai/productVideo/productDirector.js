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

// Scene-count → intent sequence GUIDANCE (the director may adapt; not a hard enum).
// FIXED shot-role sequence per scene count — each scene MUST take its assigned role
// (set shot_role + intent to match), so no two scenes repeat a framing and the
// lifestyle/model shot always lands as a MID scene (never the CTA).
const COUNT_GUIDANCE = {
  1: `ONE scene — a single self-contained mini-ad: a desire line + the product hero (or a striking lifestyle shot) + a CTA, all in one frame. Keep the spoken line to ~12 words MAX. shot_role: "hero" (or "lifestyle").`,
  3: `THREE scenes — follow this EXACT shot-role sequence (each a DIFFERENT shot; do NOT make two hero/pedestal shots):
  (1) shot_role "hero" — the product as the star, clean striking studio shot.
  (2) shot_role "lifestyle" — a REAL PERSON wearing / using / holding the product in a real setting (this is the emotional peak).
  (3) shot_role "cta" — the closing call-to-action on a clean shot.
  ~7 words spoken each.`,
  5: `FIVE scenes — follow this EXACT shot-role sequence (each a DIFFERENT camera; never repeat a framing):
  (1) shot_role "hero" — product as the star, clean studio.
  (2) shot_role "macro" — extreme close-up of texture / material / a key detail.
  (3) shot_role "lifestyle" — a REAL PERSON wearing / using / holding it in context (emotional peak).
  (4) shot_role "detail" — an alternate angle or a second benefit/detail (top-down, low, three-quarter, back).
  (5) shot_role "cta" — closing call-to-action on a clean shot.
  ~7 words spoken each.`,
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
- shot_type: a free description of the camera/treatment (e.g. "three-quarter hero on a lit pedestal, soft rim light"; "extreme macro of the fabric weave and stitching"; "worn by a person mid-stride on a city street, cropped at the torso"; "top-down flat-lay on textured stone"; "low angle looking up, dramatic shadow").
- image_generation_prompt: describe ONLY the scene — environment, surface, lighting, camera angle, framing, mood. NEVER restate the product's own design (the reference carries it). Explicitly leave the anchor's zone as clean, simple, slightly darkened negative space for text. ABSOLUTELY NO text, letters, numbers, logos, watermarks, or UI in the image.
- For a WORN / lifestyle shot, describe the person/context in the prompt ("a person wearing it, cropped below the knee, walking on city steps") — the generator keeps the exact product.

SHOT VARIETY — REQUIRED when there is more than one scene (this is the #1 thing that makes a product video feel real vs. a slideshow of the same packshot). Storyboard it like a real ad: deliberately MIX shot types so NO TWO scenes share the same framing/distance/environment. Draw from:
- HERO / studio — the product as the star on a clean set.
- MACRO / detail — extreme close-up of texture, material, stitching, or a key part.
- LIFESTYLE / in-use — a REAL PERSON using / wearing / holding it in a real environment (describe the person + setting).
- ALTERNATE ANGLE — top-down, low angle, three-quarter, side, or back.
- ENVIRONMENTAL — the product in a fitting real-world scene with depth.
For 3+ scenes you MUST include at least ONE macro close-up AND at least ONE lifestyle/in-use shot — never three pedestal shots in a row. Adapt to THIS product's category: apparel → worn on a person + a fabric/stitch macro; a gadget → in-hand + a port/detail macro; a bottle/jar → poured or held + a label/texture macro. Change the angle, distance and environment EVERY scene.

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

PRODUCT CONTEXT (from the user): brand "${params.brandName || "(read it from the photo)"}"${params.productDescription ? `, described as: ${params.productDescription}` : ""}. CTA: "${params.ctaText || "Shop Now"}".${params.offerText ? ` Offer: ${params.offerText}.` : ""}${params.website ? ` Website: ${params.website}.` : ""} Campaign goal: ${params.goal || "promo"}.

GOAL STRATEGY — shape the script, scene intents, tone and CTA toward this goal: ${GOAL_STRATEGY[params.goal] ?? GOAL_STRATEGY.promo}

${MODE_DIRECTIVE[params.visualMode] ?? MODE_DIRECTIVE.image}

Return ONLY valid JSON, no prose:
{
  "validation": { "is_suitable": true, "rejection_reason": null },
  "product": { "name": "", "category": "clothing|wearable|non_worn", "mood": "premium|playful|minimalist|bold|elegant|organic", "theme": "dark|light|medium", "accent_color": "#hex", "secondary_color": "#hex — a second key color from the product, for two-tone UI / panels / dividers", "has_watermark": false },
  "base_image_prompt": "Nano Banana edit instruction to turn the upload into a clean studio packshot — pure seamless backdrop, clean directional studio light, remove props/clutter, no text added. Keep the product 100% unchanged.",
  "full_script": "the complete voiceover",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook|showcase|feature|detail|lifestyle|cta|standalone",
      "shot_role": "hero|macro|lifestyle|detail|cta — the PHOTOGRAPHY role of this scene (follow the assigned sequence; each scene a different role)",
      "motion_value": "high|low — does a REAL motion clip add something Ken Burns (a slow zoom/pan) cannot? high = a person moving, sparkle/light play, fabric flow, a true reveal/orbit. low = a static packshot whose only motion would be a zoom.",
      "creative_direction": "one art-direction sentence for the overlay designer — this scene's JOB + energy + layout feel (e.g. 'Punchy hero opener — one bold line, huge type, generous negative space, almost no UI')",
      "shot_type": "",
      "image_generation_prompt": "",
      "anchor": "text-top|text-bottom|text-left|text-right",
      "script_segment": "",
      "display": { "kicker": null, "headline": "", "accent_word": null, "body": null, "label": null, "icon": null, "features": [{ "icon": "shield-check", "label": "PREMIUM MATERIALS", "sub": "built to last" }], "stat": null, "badge": null, "strip": ["PREMIUM QUALITY", "MODERN DESIGN", "MADE FOR YOU"] },
      "render": "image",
      "motion_prompt": "if motion_value is high, the real camera/subject motion for the clip; else \"\""
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
// Per-goal emphasis — turns the Goal selector into real art/script direction (soft
// guidance, not a rigid template): each goal steers tone, structure and CTA energy.
const GOAL_STRATEGY = {
  launch:    "LAUNCH — frame it as brand-new / just-dropped. Open with a bold reveal and anticipation ('introducing', 'meet', 'now here'), build desire on the hero, and close on a first-mover CTA. Fresh, exciting, forward-looking.",
  promo:     "PROMO — a balanced, desirable showcase: hook the eye, show 1–2 real benefits, drive a confident 'shop now'. Aspirational but straightforward.",
  discount:  "DISCOUNT — lead with value and urgency: make the offer the star, use time-limited / scarcity language ('today only', 'while it lasts', 'don't miss out'), and a decisive claim-the-deal CTA. If a concrete offer/number is provided, feature it big; otherwise lean on urgency wording.",
  awareness: "AWARENESS — brand & benefit first, not 'buy now'. Tell a short problem→benefit or identity story, emphasize what the product stands for, and end on a soft, inviting CTA (discover / learn more). Calmer, story-led pacing.",
};

// Presentation mode — turns the user's Image / Image+Video / Full Video choice into
// per-scene render decisions. The pipeline animates each render:"video" scene's still
// shot into a clip using its motion_prompt; render:"image" scenes get subtle Ken Burns.
const MODE_DIRECTIVE = {
  image:  "PRESENTATION — IMAGE ONLY: every scene is a still (we add subtle Ken Burns motion in edit). Set render:\"image\" and motion_prompt:\"\" for ALL scenes. Still set motion_value honestly per scene. Put your effort into a strong image_generation_prompt per scene.",
  hybrid: "PRESENTATION — IMAGE + VIDEO (mix): MOST scenes stay stills (Ken Burns handles a gentle zoom/pan); only the scene(s) with REAL motion value become clips. Set render:\"video\" ONLY where motion_value is \"high\" — above all the LIFESTYLE scene (a real person moving). NEVER spend a clip on a static hero/detail whose only motion is a zoom (that's Ken Burns' job), and the CTA scene is ALWAYS render:\"image\". Write a real motion_prompt for each render:\"video\" scene (the actual person/subject/light motion); motion_prompt:\"\" otherwise. ALWAYS provide image_generation_prompt for every scene (it is the clip's first frame).",
  video:  "PRESENTATION — FULL VIDEO: every scene is a clip EXCEPT the CTA scene (render:\"image\" — a CTA reads best as a clean still + motion). For each non-CTA scene write a motion_prompt with REAL motion (hero = slow orbit / reveal, macro = light sweep / sparkle, lifestyle = the person moving, detail = subtle parallax) — never a flat zoom. Set motion_value honestly. Provide image_generation_prompt for every scene — it is the clip's first frame.",
};

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
    has_watermark:  product.has_watermark === true,
  };

  const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  if (!rawScenes.length) throw new Error("productDirector: no scenes returned");

  const scenes = rawScenes.map((s, i) => {
    const d = s.display ?? {};
    return {
      scene_index:  i,
      intent:       typeof s.intent === "string" ? s.intent : "showcase",
      shot_role:    typeof s.shot_role === "string" ? s.shot_role.toLowerCase() : "",
      motion_value: s.motion_value === "high" ? "high" : "low",
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

  console.log(`[productDirector] "${brief.product_name}" | ${brief.product_category} | mood=${brief.product_mood} theme=${brief.product_theme} accent=${brief.accent_color} | ${scenes.length} scenes`);

  return {
    validation: parsed.validation ?? { is_suitable: true },
    brief,
    base_image_prompt: typeof parsed.base_image_prompt === "string" ? parsed.base_image_prompt : "",
    full_script,
    scenes,
  };
}
