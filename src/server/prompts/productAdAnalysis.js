export function getProductAnalysisPrompt({ targetMarket = "" } = {}) {
  const MARKET_TO_MODEL = {
    south_asia:     "a young South Asian woman with wheatish to dusky skin tone, long dark hair, Indian or Pakistani features",
    east_asia:      "a young East Asian woman with fair to light skin tone, straight dark hair, Chinese, Japanese, or Korean features",
    southeast_asia: "a young Southeast Asian woman with medium skin tone, dark hair, Filipino, Thai, or Indonesian features",
    middle_east:    "a young Middle Eastern woman with olive to tan skin tone, dark hair, modest styling",
    africa:         "a young Black African woman with dark skin tone, natural hair, confident expression",
    europe:         "a young European woman with light skin tone, varied hair color, Western features",
    north_america:  "a young North American woman with varied skin tone, modern casual styling",
    latin_america:  "a young Latin American woman with olive to tan skin tone, dark hair, expressive features",
  };
  const modelAppearance = MARKET_TO_MODEL[targetMarket] || "a young woman with a globally neutral, ethnically ambiguous appearance";

  return `You are a product video strategist. Analyze the provided product image and return a JSON strategy for a short-form video ad (TikTok/Reels/Shorts style).

STEP 0 — VALIDATION (evaluate this before anything else):
Examine the image and determine if it is suitable for AI product video ad generation.

Set "is_suitable": false if the image contains ANY of the following:
- Nudity, sexual content, or explicit/adult material
- Graphic violence, gore, or disturbing content
- Waste, bodily fluids, disgusting content, or poop/excrement
- A human face as the primary subject (selfie, portrait — not a product)
- No identifiable product (blank image, meme, screenshot, text document, random photo)
- Extremely low quality, blurry, or unrecognizable content

Set "has_mannequin": true if the clothing or wearable product is displayed on a mannequin, dress form, dummy figure, or any non-human display stand. This is ONLY relevant for clothing/wearable category.

Set "has_watermark": true if the product image contains any visible watermark, stock-photo watermark, semi-transparent text overlay, copyright notice, or logo overlay that is NOT part of the product's own branding.

GLOBAL IMAGE RULES — apply to every single shot without exception:
- Real human models only. Never mannequins, dress forms, store displays, or CGI figures.
- All models must be fully clothed at all times. No exposed skin below the collar except hands and lower arms.
- No wind-blown skirts or dresses that expose legs above the knee.
- No upward or low-angle shots that could expose undergarments or private areas.
- Modest, natural poses only. No provocative posing.
- No flowing fabric shots where the garment opens or separates from the body.

Auto-detect the product category from the image:
- "clothing" — garments, fabric, fashion items worn on the body
- "wearable" — tech worn on body: watches, earphones, glasses, rings
- "non_worn" — everything else: serums, bottles, food, gadgets, furniture, etc.

Return ONLY valid JSON, no markdown, no explanation:

{
  "validation": {
    "is_suitable": true,
    "rejection_reason": null,
    "has_mannequin": false,
    "mannequin_warning": null,
    "has_watermark": false
  },
  "product_analysis": {
    "product_type": "concise description",
    "category": "clothing|wearable|non_worn",
    "garment_description": "For clothing/wearable ONLY: Write a detailed text description of the garment for use in image generation prompts. Include: color(s), fabric/material look, silhouette, length, neckline, sleeve style, any prints/embroidery/embellishments, and key design details. Example: 'A teal and gold embroidered lehenga choli set. The lehenga is floor-length with a wide flared skirt covered in dense golden zari embroidery on teal fabric. The choli is sleeveless with a sweetheart neckline and matching embroidery. A matching teal dupatta with gold border.' For non_worn: null.",
    "model_description": "For clothing only: ${modelAppearance}. This description must appear at the start of every clothing shot prompt. For wearable and non_worn: null.",
    "key_features": ["feature 1", "feature 2", "feature 3"],
    "target_audience": "description",
    "aesthetic_style": "description",
    "color_palette": "description of dominant colors",
    "recommended_music_mood": "energetic|calm|luxury|playful|dramatic"
  },
  "shots": [
    {
      "id": "shot_1",
      "shot_type": "e.g. hero, macro detail, action, lifestyle, brand CTA",
      "narrative": "what this shot communicates to the viewer",
      "duration_seconds": 3,
      "camera_motion": "e.g. slow orbit, dolly in, static, gentle push",
      "requires_model": false,
      "image_generation_prompt": "CLOTHING: A single reference image is provided — it shows the model already wearing the exact garment. Every prompt MUST begin with: 'Use the uploaded photo as the face and identity reference. Keep the same person's face, skin tone, hair, and exact outfit completely unchanged.' Then describe the scene, environment, lighting, and pose. End with: 'Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays.' WEARABLE product-only shots (requires_model: false): The reference image shows the clean product. Start with: 'The product from the reference image in [scene]. Keep the exact same branding, label, colors, shape, and identity.' Then describe ONLY the scene. End with: 'Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays.' WEARABLE worn shots (requires_model: true): A reference photo of a real person is provided. Start with: 'Use the uploaded photo as the identity reference. Keep the person's face, skin tone, hair, and identity completely unchanged.' Then describe the product being worn naturally and the environment. Do NOT describe the product's visual design — only its position (on wrist, in ear, on face). End with: 'Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays.' NON_WORN: The reference image shows the cleaned product on a plain background. Start with: 'The product from the reference image in [scene]. Keep the exact same branding, label, colors, shape, and identity.' Then describe ONLY the scene. End with: 'Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays.'",
      "video_motion_prompt": "Describe ONLY camera movement and subject motion — not the product itself. Be specific to the shot type: for liquid/pour shots say 'amber liquid pours in slow motion, droplets catch the light'; for fabric/movement shots say 'fabric billows and flows gently, model walks with natural stride, modest movement'; for orbit shots say 'camera slowly orbits 180 degrees, studio light creates evolving reflections'; for lifestyle shots say 'gentle handheld push toward subject, natural ambient motion in background'."
    }
  ]
}

Generate exactly 5 shots. Use the following structure based on the detected category:

FOR non_worn (bottles, cans, food, gadgets, furniture, serums, etc.):
  Shot 1 — Hero: product facing camera straight on, centered on an elegant surface, dramatic studio lighting, clean background
  Shot 2 — Macro detail: extreme close-up of label, texture, lid, opening, or key design element
  Shot 3 — Action: something dynamic happening TO or WITH the product — liquid being poured, product being opened, steam rising, condensation dripping, product being sprayed/applied
  Shot 4 — Lifestyle context: product in a real-world setting (kitchen counter, cafe table, gym bag, bathroom shelf) with natural props
  Shot 5 — Angled: product at a 45-degree angle showing depth and side profile, strong directional light, aspirational final frame

FOR clothing:
  Shot 1 — Walking toward camera, golden hour outdoor. Prompt: "Full body shot, model walking confidently toward the camera on a sunlit outdoor garden path, warm golden hour light from the side, soft bokeh background of trees and greenery, natural relaxed stride. Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."
  Shot 2 — Waist-up, indoor lifestyle. Prompt: "Waist-up framing, model looking slightly off-camera with a relaxed natural smile, standing in a warmly lit boutique or bright café interior, soft diffused ambient light, shallow depth of field with blurred indoor background. Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."
  Shot 3 — Mid-stride, scenic outdoor. Prompt: "Full body shot, model mid-stride walking through a scenic stone courtyard or garden promenade, natural bright daylight, architectural background with flowers and greenery, natural body movement. Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."
  Shot 4 — Seated, warm indoor. Prompt: "Model seated at a café table or lounge chair in a warm cozy indoor setting, casual relaxed pose with hands resting naturally on the table, warm golden light from a nearby lamp or window, background softly blurred with bokeh. Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."
  Shot 5 — 3/4 rear, looking back over shoulder. Prompt: "Model in a 3/4 rear or side angle, turning head back to look over the shoulder toward the camera with a soft expression, standing in a lush outdoor garden or courtyard, soft natural light, gently blurred bokeh background. Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."

FOR wearable (watches, earphones, glasses, rings, shoes, etc.):
  All wearable shots use requires_model: false. No model reference image is used. For worn shots, describe the person in text only.
  Shot 1 — Hero product (requires_model: false): product alone on a clean premium surface, dramatic directional studio light. Prompt starts with product reference.
  Shot 2 — Worn close-up (requires_model: false): describe in text a close-up of the product being worn. Example for shoes: "The product from the reference image worn on feet. ${modelAppearance}, feet and lower legs walking on clean urban pavement, wearing the exact sneakers from the reference photo. Keep exact same shoe colors, design, materials, and branding. Low angle macro shot, shallow depth of field, warm afternoon light. Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays." Adapt naturally to the specific wearable type.
  Shot 3 — Lifestyle worn (requires_model: false): describe in text a person actively using the product in motion. Example for shoes: "The product from the reference image in active use. ${modelAppearance}, jogging on a park trail, the exact sneakers from the reference photo on her feet, captured mid-stride. Keep exact shoe design, colors, and branding unchanged. Natural daylight, motion blur on background, energetic feel. Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays." Adapt naturally to the specific wearable type.
  Shot 4 — Macro detail (requires_model: false): extreme close-up of face/dial/mesh band/lens/sole/engraving. Prompt starts with product reference.
  Shot 5 — Aspirational (requires_model: false): product in a premium aspirational environment — rooftop, luxury interior, golden hour outdoor. Prompt starts with product reference.

CRITICAL for image_generation_prompt (clothing — ALL shots use model):
- One reference image is provided: the base image already shows the model wearing the exact garment.
- DO NOT describe the outfit, garment, colors, fabric, embroidery, silhouette, or ANY clothing detail in the prompt. Describing clothing overrides the reference and changes the outfit.
- ONLY describe: environment/location, pose and body position, lighting, camera angle, and mood/atmosphere.
- End every prompt with: "Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."
- For detail/close-up shots: frame chest-up or waist-up so the person is still visible.
- Do NOT use dual-image instructions like "image 1" or "image 2" — there is only one reference.

CRITICAL for image_generation_prompt (wearable — ALL shots use product reference, requires_model: false for every shot):
- Product-only shots (shots 1, 4, 5): reference image is the clean product. Start every prompt with "The product from the reference image in [scene]. Keep exact same design, branding, and identity." Describe ONLY the scene and product placement. No people.
- Worn shots (shots 2, 3): still use the product reference image. Describe the person wearing the product entirely in text — no model image is provided. Start with "The product from the reference image being worn by ${modelAppearance}." Then describe the exact scene, environment, and lighting. Always specify that the product's design, colors, branding, and shape must remain exactly as in the reference. End with: "Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."

CRITICAL for image_generation_prompt (non_worn — NO model in any shot):
- One reference image is provided: a clean product shot (plain/white background).
- Every non_worn prompt MUST start with: "The product from the reference image in [scene]. Keep the exact same branding, label, colors, shape, and identity."
- Then describe ONLY the scene. No people, no model, no worn/used by person.
- End with: "Hyper-realistic, photorealistic, 9:16 vertical portrait, no text overlays."

IMPORTANT for video_motion_prompt: describe ONLY motion and camera behavior. Never describe the product appearance.`;
}
