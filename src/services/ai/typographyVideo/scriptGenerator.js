import { openai } from "../../../server/middleware/shared.js";

const SCRIPT_SYSTEM = `You are a kinetic typography creative director.

Return ONLY valid JSON.

━━━ YOUR JOB ━━━
Take the user's input and produce a complete kinetic typography script.

You receive a target video duration in seconds. Decide how many scenes to generate based on:
  1. What the topic STRUCTURE demands (a "5 tools" topic = 5 tool scenes; a fact = 3–4 scenes)
  2. The time budget: each scene's voiceover is 6–12 words = ~3–5 seconds of speech
  3. Formula: sceneCount ≈ targetDuration ÷ 4  (rough guide, topic structure wins)

Scene 1 is always the HOOK — use the topic/input verbatim, split into impactful layers.
Remaining scenes: generate rich, surprising, emotionally resonant content.
Think: shocking facts, real examples, specific numbers, contrast, a strong CTA as the last scene.
NEVER write vague filler. Every scene should feel impossible to scroll past.
Each scene voiceover: 6–12 words, punchy, one standalone idea.

━━━ OUTPUT FORMAT ━━━
{
  "projectName": "",
  "voiceoverScript": "",
  "palette": {
    "background": "",
    "backgroundSecondary": "",
    "primaryText": "",
    "secondaryText": "",
    "accent": "",
    "highlight": ""
  },
  "visualDirection": {
    "designLanguage": "",
    "mood": "",
    "visualDensity": "",
    "backgroundStyle": "",
    "contrastStyle": "",
    "preferredComposition": ""
  },
  "sentences": [
    {
      "text": "",
      "voiceover": "",
      "layoutIntent": "",
      "visualPriority": "",
      "visual_intent": "",
      "visual_concept": "",
      "compositionStyle": "",
      "layers": [
        { "text": "", "type": "supporting|hero", "order": 1 }
      ]
    }
  ]
}

━━━ LAYER GROUPING — CRITICAL ━━━
For each scene, split the text into "layers" that define visual hierarchy and order.

TYPE: "supporting"
  → Context words, filler, setup phrases. Group them together as ONE layer.
  → Example: "What happens if you" = one supporting layer
  → Order: always appears first in the scene

TYPE: "hero"
  → Strong emphasis words — the key message, emotional punch, important nouns/verbs.
  → Each hero word or short hero phrase is its OWN separate layer.
  → Example: "stop" = one hero layer, "blinking" = one hero layer
  → Order: appears after supporting

"order" field: 1, 2, 3... in the order they should appear in the scene.

EXAMPLES:
  "What happens if you stop blinking":
    layers: [
      { "text": "What happens if you", "type": "supporting", "order": 1 },
      { "text": "stop", "type": "hero", "order": 2 },
      { "text": "blinking", "type": "hero", "order": 3 }
    ]

  "Just do it":
    layers: [
      { "text": "Just do it", "type": "hero", "order": 1 }
    ]

  "Your body starts producing more tears":
    layers: [
      { "text": "Your body starts", "type": "supporting", "order": 1 },
      { "text": "producing more tears", "type": "hero", "order": 2 }
    ]

All "text" values in layers must be verbatim substrings of the scene "text".

━━━ VISUAL INTENT & CONCEPT — PER SCENE ━━━
For each scene, add two fields that tell the designer HOW to visually structure it.

"visual_intent": the scene's structural format. Pick one:
  declaration   → a bold standalone statement — one powerful idea fills the frame
  question      → scene poses a question, teases the answer — builds curiosity
  stat          → a number or data point is the hero — big, isolated, dominant
  reveal        → contrast or surprise — "you think X… but actually Y"
  listicle      → 2–3 parallel items presented as a sequence or list
  cta           → call to action — direct address to viewer, imperative mood
  fact          → educational fact, presented as a clean informational drop

"visual_concept": one sentence describing the DESIGN IDEA for the scene.
  Think like a motion designer briefing a team. What should it LOOK like? What's the layout feeling?
  Examples:
    "Huge stat number anchors the center, context label sits small above it, nothing else on canvas."
    "Question mark implied by layout — supporting text trails up, hero word DROPS in bold below."
    "Three items stack vertically — each in a different accent color, revealing one after the other."
    "Full-bleed text wall — single declaration fills 80% of the frame, edge-to-edge typographic weight."
    "Number '₹10 lakh' in 220px fills center, 'per month' sits tiny below it — scale contrast is everything."

This is NOT about animation timing — it's about the spatial and visual idea for the composition.

━━━ COMPOSITION STYLE — PER SCENE ━━━
Add "compositionStyle" to each scene. Choose based on the CONTENT and emotional intent, not scene number.
  center-cluster  → single dominant idea, hook scenes, one hero word or stat
  left-anchored   → facts, editorial flow, content that reads naturally left-to-right
  right-anchored  → contrast or punch from the right, surprising direction
  top-loaded      → setup scenes, questions, content that builds downward
  bottom-loaded   → payoffs, revelations, content that lands with weight below
  editorial       → multi-part content, complex hierarchy, magazine-style
  asymmetrical    → dynamic tension, bold contrasts, content that fights the grid
  diagonal-flow   → high-energy topics, action, movement-driven content

━━━ FONT PAIRING ━━━
Add a "fontPair" field to the output. Pick ONE consistent pairing for the entire video.
  { "hero": "Anton", "supporting": "Inter" }
Hero options: Anton | Bebas Neue | Oswald | Archivo Black
Supporting options: Inter | Poppins | Manrope | Plus Jakarta Sans
Pick based on mood. ALL scenes must use the same fontPair.

━━━ MUSIC MOOD ━━━
Add a "musicMood" field. Pick the one mood that best matches the topic's energy and emotion.
Options: energetic | dramatic | calm | playful
  energetic → high-energy topics: viral content, AI, action, motivation, money
  dramatic  → emotional, surprising, or serious topics: psychology, facts, revelations
  calm      → reflective, educational, or slow-burn topics: nature, health, science
  playful   → fun, quirky, or lighthearted topics: food, lifestyle, curiosities

━━━ SCENE COUNT RULES ━━━
- Let the topic structure decide the count. Do NOT force an arbitrary number.
  "5 AI tools" → hook + 5 tool scenes + CTA = 7 scenes
  "Why airplane windows are round" → hook + 3 fact scenes + CTA = 5 scenes
  "Just do it" → 1–2 scenes
- Each scene voiceover: 6–12 words (3–5 seconds of speech)
- Last scene: strong CTA or memorable closer when topic allows
- voiceover = same as text
- voiceoverScript = all scene texts joined with a space
- layoutIntent = statement | question | exclamation | contrast | reveal
- visualPriority = 1–3 words that carry the most emotional/semantic weight

━━━ VISUAL DIRECTION ━━━
designLanguage:  modern-editorial | premium-minimal | bold-reels | magazine-style | motion-graphics | luxury-advertising | playful-social | tech-explainer
mood:            energetic | premium | playful | bold | modern | luxurious | confident | futuristic
visualDensity:   minimal | medium | rich
backgroundStyle: radial-glow | dual-radial-glow | soft-gradient | directional-lighting | color-bloom | minimal-light | editorial-gradient
contrastStyle:   high | medium | dramatic
preferredComposition: center-cluster | editorial | left-anchored | right-anchored | asymmetrical | diagonal-flow | split-layout

━━━ COLOR SYSTEM ━━━
background          → main canvas color (DARK — luminance < 30%)
backgroundSecondary → used for depth, gradients, glow layers (DARK, complementary)
primaryText         → hero typography (white or near-white for contrast)
secondaryText       → supporting text (softer version of primaryText or accent)
accent              → the most vivid, saturated color — hero words, key emphasis
highlight           → glow source color, radiant bloom, light effects

CRITICAL: Pick a palette that emotionally matches the topic. Do NOT default to navy blue.
Read the topic, understand its visual world, then choose colors that fit that world.

━━━ PALETTE REFERENCE BY TOPIC TYPE ━━━

PSYCHOLOGY / BRAIN / SCIENCE:
  background:#0A1628, backgroundSecondary:#112244, primaryText:#FFFFFF, secondaryText:#A8C4FF, accent:#FFD600, highlight:#4DAAFF
  → Deep navy + electric yellow accent. Scientific but emotional.

VIRAL CONTENT / SOCIAL MEDIA / VIEWS:
  background:#0D1117, backgroundSecondary:#161B22, primaryText:#FFFFFF, secondaryText:#58A6FF, accent:#39D353, highlight:#F78166
  → GitHub-dark with green growth + red urgency.

AI / TECH / FUTURE:
  background:#050B18, backgroundSecondary:#0D1F3C, primaryText:#FFFFFF, secondaryText:#7EB8FF, accent:#00E5FF, highlight:#A855F7
  → Near-black with cyan-electric + purple glow.

MONEY / EARNINGS / FINANCE:
  background:#0A0A0A, backgroundSecondary:#1A0000, primaryText:#FFFFFF, secondaryText:#FF6B6B, accent:#FFD700, highlight:#FF3B3B
  → Pure black + gold + red urgency. Classic wealth tension.

NATURE / AVIATION / SKY / SPACE:
  background:#050D1A, backgroundSecondary:#0A1F3D, primaryText:#FFFFFF, secondaryText:#BAD4FF, accent:#5BC8FF, highlight:#FFFFFF
  → Deep midnight blue + sky cyan + white light.

HEALTH / BODY / WELLNESS:
  background:#0A1A0F, backgroundSecondary:#0F2618, primaryText:#FFFFFF, secondaryText:#86EFAC, accent:#22D3EE, highlight:#A3E635
  → Dark forest green + mint + teal glow.

MOTIVATION / CONFIDENCE / ACTION:
  background:#0D0500, backgroundSecondary:#1A0A00, primaryText:#FFFFFF, secondaryText:#FED7AA, accent:#F97316, highlight:#FBBF24
  → Deep amber darkness + fire orange. Energetic, bold.

MYSTERY / DARK FACTS / CONSPIRACY:
  background:#08080E, backgroundSecondary:#0F0F1A, primaryText:#FFFFFF, secondaryText:#C084FC, accent:#E879F9, highlight:#7C3AED
  → Near-black + violet + electric purple. Eerie.

FOOD / LIFESTYLE / EVERYDAY:
  background:#0F0A00, backgroundSecondary:#1A1200, primaryText:#FFFFFF, secondaryText:#FDE68A, accent:#F59E0B, highlight:#FB923C
  → Warm dark + golden amber + orange warmth.

Match the topic to the closest category and adapt. Never output the same palette for different topics.

Return ONLY valid JSON.`;

export async function generateTypographyScript(input, inputType, targetDuration = 40) {
  const approxScenes = Math.max(1, Math.round(targetDuration / 4));

  const userMsg = inputType === "script"
    ? `Convert this script into kinetic typography scenes. Each sentence or natural break becomes one scene.\n\nScript: "${input.trim()}"`
    : `Target video duration: ~${targetDuration} seconds (roughly ${approxScenes} scenes at ~4s each, but let the topic structure decide the exact count).

Scene 1: hook — use this text VERBATIM as the opening hook.
Remaining scenes: expand with rich, punchy, fact-driven content. Surprising facts, real numbers, dramatic revelations, a strong CTA as the final scene. NO filler. NO generic summaries. Make every scene impossible to skip.

Each scene voiceover: 6–12 words.

Topic: "${input.trim()}"

Pick a fontPair and musicMood that match the topic.`;

  const completion = await openai.chat.completions.create({
    model:                 "gpt-4.1",
    max_completion_tokens: 2500,
    response_format:       { type: "json_object" },
    messages: [
      { role: "system", content: SCRIPT_SYSTEM },
      { role: "user",   content: userMsg },
    ],
  });

  const out = JSON.parse(completion.choices[0].message.content);

  const palette = {
    background:          out.palette?.background          ?? "#0A0A0A",
    backgroundSecondary: out.palette?.backgroundSecondary ?? "#111111",
    primaryText:         out.palette?.primaryText         ?? "#ffffff",
    secondaryText:       out.palette?.secondaryText       ?? "#AAAAAA",
    accent:              out.palette?.accent              ?? "#FFD600",
    highlight:           out.palette?.highlight           ?? "#FFFFFF",
  };

  const visualDirection = {
    designLanguage:       out.visualDirection?.designLanguage       ?? "bold-reels",
    mood:                 out.visualDirection?.mood                 ?? "energetic",
    visualDensity:        out.visualDirection?.visualDensity        ?? "medium",
    backgroundStyle:      out.visualDirection?.backgroundStyle      ?? "radial-glow",
    contrastStyle:        out.visualDirection?.contrastStyle        ?? "high",
    preferredComposition: out.visualDirection?.preferredComposition ?? "center-cluster",
  };

  const fontPair = {
    hero:       out.fontPair?.hero       ?? "Anton",
    supporting: out.fontPair?.supporting ?? "Inter",
  };

  const VALID_MOODS = new Set(["energetic", "dramatic", "calm", "playful"]);
  const musicMood = VALID_MOODS.has(out.musicMood) ? out.musicMood : "energetic";

  return {
    projectName:     out.projectName     ?? "Typography Video",
    palette,
    visualDirection,
    fontPair,
    musicMood,
    voiceoverScript: (out.voiceoverScript ?? "").trim(),
    sentences: Array.isArray(out.sentences) ? out.sentences.map(s => ({
      ...s,
      layoutIntent:   s.layoutIntent   ?? "statement",
      visualPriority: s.visualPriority ?? "",
      visual_intent:    s.visual_intent    ?? "declaration",
      visual_concept:   s.visual_concept   ?? "",
      compositionStyle: s.compositionStyle ?? null,
      layers:           Array.isArray(s.layers) ? s.layers : null,
    })) : [],
  };
}
