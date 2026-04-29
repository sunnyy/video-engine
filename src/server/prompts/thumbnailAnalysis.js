export function getThumbnailAnalysisPrompt({ headline, subtext, niche, style, hasImage }) {
  const STYLE_MAP = {
    bold:    "bold dramatic high-contrast, large aggressive typography, intense colors, dark shadows, cinematic lighting",
    minimal: "clean minimal, elegant whitespace, refined typography, soft neutral tones, premium feel",
    vibrant: "vibrant energetic, electric saturated colors, dynamic layout, eye-catching contrast",
    dark:    "dark moody cinematic, deep shadows, neon or golden accents, mysterious atmosphere",
  };
  const styleDesc = STYLE_MAP[style] || STYLE_MAP.bold;

  return `You are a viral YouTube thumbnail strategist. Your job is to write a single highly specific image generation prompt for nano-banana that will produce a scroll-stopping, clickbait-worthy thumbnail.

INPUTS:
- Niche: ${niche}
- Headline: "${headline}"
${subtext ? `- Subtext: "${subtext}"` : ""}
- Visual style: ${styleDesc}
- Has reference image: ${hasImage ? "YES — the reference image will be passed to the model. Build the composition around it." : "NO — generate entirely from scratch."}

RULES:
1. Return ONLY the image generation prompt — no explanation, no JSON, no markdown
2. The prompt must be a single paragraph, under 300 words
3. Start with the most important visual element
4. Include: composition layout, background, lighting, color palette, typography placement and style, mood
5. Embed the headline text in quotes exactly as provided: "${headline}"
6. Make it 16:9 horizontal landscape format
7. End with: "Hyper-realistic, ultra-sharp, professional thumbnail quality, no watermarks"
8. Do NOT use generic filler phrases like "eye-catching" or "scroll-stopping" — be specific and visual

${hasImage
  ? `Since a reference image is provided, describe how to transform/enhance it into the thumbnail. Describe what visual elements to add around/over the person or subject in the image.`
  : `Since no image is provided, describe the full scene from scratch. Invent a compelling visual background, atmosphere, and any visual elements appropriate for the ${niche} niche.`
}`;
}
