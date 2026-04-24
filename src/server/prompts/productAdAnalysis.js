export function getProductAnalysisPrompt(mode) {
  const clothingExtra = mode === "clothing" ? `
CLOTHING-SPECIFIC RULES:
- All shots must feature the same human model for visual consistency
- Define model appearance in product_analysis.model_description (skin tone, hair, body type) — this will be reused across all image generation calls
- Shot types must include: full-body walk, close-up embroidery/detail, mid-shot lifestyle, hem/slit detail, 360 rotation
- image_generation_prompt for each shot MUST start with the model_description verbatim before describing the shot
` : mode === "wearable" ? `
WEARABLE-SPECIFIC RULES:
- Mix of worn shots (on wrist, in ear, on face) and pure product shots
- For worn shots: define a consistent hand/arm/ear model in product_analysis.model_description
- image_generation_prompt for worn shots MUST start with model_description verbatim
` : `
NON-WORN PRODUCT RULES:
- No human model required
- Focus on product cinematography: orbiting shots, macro details, lifestyle context, hero shots
- Environment/surface choices should match the product's aesthetic
`;

  return `You are a product video strategist. Analyze the provided product image and return a JSON strategy for a short-form video ad (TikTok/Reels/Shorts style).

Auto-detect the product category from the image:
- "clothing" — garments, fabric, fashion items worn on the body
- "wearable" — tech worn on body: watches, earphones, glasses, rings
- "non_worn" — everything else: serums, bottles, food, gadgets, furniture, etc.

${clothingExtra}

Return ONLY valid JSON, no markdown, no explanation:

{
  "product_analysis": {
    "product_type": "concise description",
    "category": "clothing|wearable|non_worn",
    "model_description": "detailed consistent model description — only for clothing/wearable, null for non_worn",
    "key_features": ["feature 1", "feature 2", "feature 3"],
    "target_audience": "description",
    "aesthetic_style": "description",
    "color_palette": "description of dominant colors",
    "recommended_music_mood": "energetic|calm|luxury|playful|dramatic"
  },
  "shots": [
    {
      "id": "shot_1",
      "shot_type": "e.g. hero product, close-up detail, lifestyle, 360 rotation",
      "narrative": "what this shot communicates to the viewer",
      "duration_seconds": 3,
      "camera_motion": "e.g. slow orbit, dolly in, static, gentle push",
      "image_generation_prompt": "full prompt for Fal.ai image generation — photorealistic, 9:16 portrait, no text",
      "video_motion_prompt": "motion-only prompt for video model — describe camera and subject motion only, not the subject itself"
    }
  ]
}

Generate 5 shots. Each shot must be visually distinct. Shots should tell a story: establish → detail → lifestyle → detail → CTA/brand.
video_motion_prompt must describe ONLY motion and camera behavior (the image already shows the subject). Example: "Camera slowly orbits 180 degrees around the product. Studio light creates evolving reflections across the surface."
image_generation_prompt must be photorealistic, vertical 9:16 portrait composition, no text, no watermarks.`;
}
