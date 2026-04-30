export function getSocialPostPrompt({ headline, subtext, brandName, niche, style, aspectRatio, hasReferenceImage, hasLogo, brandColor }) {
  const textBlock = [
    headline  ? `Headline: "${headline}"` : "",
    subtext   ? `Subtext: "${subtext}"` : "",
    brandName ? `Brand: "${brandName}"` : "",
  ].filter(Boolean).join(". ");

  const STYLE_MAP = {
    modern:  "modern clean design, bold typography, high contrast, professional",
    playful: "fun colorful design, rounded elements, energetic, youth-oriented",
    luxury:  "premium elegant design, gold accents, sophisticated, high-end",
    minimal: "minimalist design, lots of whitespace, refined typography, clean",
    bold:    "bold graphic design, strong colors, impactful, attention-grabbing",
  };
  const styleDesc = STYLE_MAP[style] || STYLE_MAP.modern;

  const ratioDesc = aspectRatio === "1:1" ? "1:1 square format"
    : aspectRatio === "4:5" ? "4:5 portrait format (1080x1350px)"
    : "9:16 vertical story format (1080x1920px)";

  const referenceInstruction = hasReferenceImage
    ? brandColor
      ? `A reference image is provided. Analyze its layout, composition, typography placement, and visual structure ONLY — do NOT adopt its color palette. The user's brand color overrides all reference colors.`
      : `A reference image is provided. Analyze its visual style, layout, color palette, composition, and design language. Generate a SIMILAR but original design — same aesthetic direction but with the new content.`
    : `No reference image provided. Generate an original design based on the niche and style.`;

  const logoInstruction = hasLogo
    ? `The user has a brand logo. Reserve a prominent placement for it in the design (e.g. top-left corner, bottom center) — describe the logo area clearly in the prompt so it appears as a distinct branded element.`
    : "";

  const colorInstruction = brandColor
    ? `BRAND COLOR OVERRIDE: The user's brand color is ${brandColor}. This takes absolute priority — ignore any colors from the reference image. Use ${brandColor} as the dominant color throughout: backgrounds, accents, headlines, buttons, and graphic elements. Build the entire palette around this color.`
    : "";

  return `You are an expert social media graphic designer and AI image prompt engineer.

${referenceInstruction}
${logoInstruction ? "\n" + logoInstruction : ""}
${colorInstruction ? "\n" + colorInstruction : ""}

Create a detailed image generation prompt for a ${ratioDesc} social media post for the ${niche} niche.

User's content to include:
${textBlock || "No specific text provided — create compelling placeholder text appropriate for the niche."}

Design style: ${styleDesc}

Your task:
1. Analyze the reference image (if provided) and extract: layout composition, typography placement, visual elements, overall mood${brandColor ? " — extract structure ONLY, ignore colors" : ", color palette"}
2. Generate a single comprehensive image generation prompt that will produce a professional social media post
3. The prompt must specify: exact layout, background design, color palette, where text appears, visual elements/icons/graphics, lighting, overall aesthetic
4. Include the actual text content in the prompt: headline "${headline || "[compelling headline]"}", subtext "${subtext || "[supporting text]"}", brand "${brandName || "[brand name]"}"
5. Text must be clearly readable, professionally styled, and prominently placed

Output ONLY the image generation prompt — no explanation, no JSON, no markdown. Single paragraph under 400 words. End with: "Professional social media graphic, high resolution, ${ratioDesc}, no watermarks."`;
}
