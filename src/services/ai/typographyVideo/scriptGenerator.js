import { openai } from "../../../server/middleware/shared.js";
import { getStyle } from "../shared/visualStyles.js";
import { resolveThemePalette, themeDirective } from "../shared/themeRegistry.js";

const SCRIPT_SYSTEM = `You are a kinetic typography creative director for fast-paced, punchy short-form videos.

Return ONLY valid JSON.

YOUR JOB
Produce a kinetic typography script. Each voiceover sentence is split into visual BEATS -- the actual words shown on screen, one beat = one flash scene.
Think Apple keynote. Think Nike commercial. Think BBC documentary with kinetic text.

TONE - READ THE TOPIC
  QUESTION topics ("What happens if...", "Why do...", "How does..."): Hook must keep the QUESTION/CURIOSITY form.
    "What Happens If You Stop Blinking?" -> first beat: "What happens if you" (phrase) NOT "Stop Blinking"
  MOTIVATIONAL topics: commands, energy, declarations.
  EDUCATIONAL/FACT topics: stats, reveals, dramatic facts.

TWO CONCEPTS - CRITICAL
  voiceover = what the narrator SAYS (full natural sentence, 6-14 words, flows as documentary narration)
  beats = what APPEARS ON SCREEN (visual sub-units of that sentence)

BEATS - THE MOST IMPORTANT PART
Each beat is one flash on screen. The beat text MUST be words from the voiceover (in order).
Beat types:
  "phrase" - a chunk of 2-6 words shown all at once (for context, setup, flowing ideas)
  "keyword" - 1-3 impactful words shown BIG and BOLD (for action words, emotions, key facts)

Rules for beats:
  - Together, beats cover the KEY words of the voiceover (can skip function words: a, an, the, is, of, to, etc.)
  - Beats must appear in the SAME ORDER as in the voiceover
  - 1-word beats are the most dramatic -- use them for THE most impactful word
  - Consecutive keywords get alternating accent colors automatically
  - Each beat appears and disappears EXACTLY when that word is spoken -- so keep beats SHORT

EXAMPLE - "What Happens If You Stop Blinking?":
Scene voiceover: "What actually happens when you stop blinking?"
  beats: [
    { "text": "What actually happens", "type": "phrase" },
    { "text": "Stop", "type": "keyword" },
    { "text": "Blinking", "type": "keyword" }
  ]

Scene voiceover: "Your eyes immediately lose their protective moisture layer."
  beats: [
    { "text": "Your eyes", "type": "phrase" },
    { "text": "lose moisture", "type": "keyword" }
  ]

Scene voiceover: "A stinging burning sensation sets in almost immediately."
  beats: [
    { "text": "Stinging", "type": "keyword" },
    { "text": "Burning", "type": "keyword" },
    { "text": "Sensation", "type": "keyword" }
  ]

Scene voiceover: "Your cornea begins to dry out and scratch with every movement."
  beats: [
    { "text": "Cornea", "type": "keyword" },
    { "text": "drying out", "type": "keyword" },
    { "text": "every movement", "type": "phrase" }
  ]

Scene voiceover: "So remember, your eyes need to blink to stay alive."
  beats: [
    { "text": "Remember", "type": "keyword" },
    { "text": "Blink.", "type": "keyword" },
    { "text": "Always.", "type": "keyword" }
  ]

SCENE COUNT
targetDuration / 2 = approximate scene count (= number of voiceover sentences).
Each scene typically produces 2-5 beats (visual flashes).
Last scene: strong CTA or memorable closer.

voiceoverScript = ALL voiceover fields joined with a single space -- one continuous documentary narration paragraph.

OUTPUT FORMAT:
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
  "fontPair": { "hero": "Inter|DM Sans|Outfit|Space Grotesk", "supporting": "Inter|Manrope|DM Sans|Plus Jakarta Sans" },
  "musicMood": "energetic|dramatic|calm|playful",
  "niche": "health|psychology|tech|finance|fitness|motivation|lifestyle|mystery|education|entertainment|nature|viral",
  "scenes": [
    {
      "voiceover": "",
      "beats": [
        { "text": "", "type": "phrase|keyword" }
      ]
    }
  ]
}

FONT PAIRING
ONE consistent fontPair. Clean geometric sans-serif only -- NO condensed, NO display, NO serif.
Hero: Inter | DM Sans | Outfit | Space Grotesk
Supporting: Inter | Manrope | DM Sans | Plus Jakarta Sans

NICHE
One word describing the content domain: health, psychology, tech, finance, fitness, motivation, lifestyle, mystery, education, entertainment, nature, viral

MUSIC MOOD
energetic -> AI, tech, money, action, motivation, viral
dramatic  -> psychology, facts, revelations, emotional
calm      -> nature, health, science, reflective
playful   -> food, lifestyle, curiosities, fun facts

COLOR PALETTE
background          -> DARK (luminance < 30%)
backgroundSecondary -> DARK, complementary, for gradient depth
primaryText         -> white or near-white
secondaryText       -> softer version, for supporting text
accent              -> most vivid, saturated color
highlight           -> glow source or secondary vivid color

PALETTE REFERENCE:
AI/TECH:       background:#050B18 backgroundSecondary:#0D1F3C primaryText:#FFFFFF secondaryText:#7EB8FF accent:#00E5FF highlight:#A855F7
MONEY/FINANCE: background:#0A0A0A backgroundSecondary:#1A0000 primaryText:#FFFFFF secondaryText:#FF6B6B accent:#FFD700 highlight:#FF3B3B
MOTIVATION:    background:#0D0500 backgroundSecondary:#1A0A00 primaryText:#FFFFFF secondaryText:#FED7AA accent:#F97316 highlight:#FBBF24
PSYCHOLOGY:    background:#0A1628 backgroundSecondary:#112244 primaryText:#FFFFFF secondaryText:#A8C4FF accent:#FFD600 highlight:#4DAAFF
HEALTH:        background:#0A1A0F backgroundSecondary:#0F2618 primaryText:#FFFFFF secondaryText:#86EFAC accent:#22D3EE highlight:#A3E635
MYSTERY:       background:#08080E backgroundSecondary:#0F0F1A primaryText:#FFFFFF secondaryText:#C084FC accent:#E879F9 highlight:#7C3AED
VIRAL/SOCIAL:  background:#0D1117 backgroundSecondary:#161B22 primaryText:#FFFFFF secondaryText:#58A6FF accent:#39D353 highlight:#F78166
NATURE/SPACE:  background:#050D1A backgroundSecondary:#0A1F3D primaryText:#FFFFFF secondaryText:#BAD4FF accent:#5BC8FF highlight:#FFFFFF

Return ONLY valid JSON.`;

const LANG_DIRECTIVES = {
  hinglish: "\nLANGUAGE: Write ALL voiceover and beat text in Hinglish (natural Hindi + English mix, Roman script).",
  es:       "\nLANGUAGE: Write ALL voiceover and beat text in Spanish.",
};

export async function generateTypographyScript(input, inputType, targetDuration = 40, language = "en", styleId = "auto", theme = "auto", accentColor = null, accentColor2 = null) {
  // Final length = spoken length. Measured ≈2.3 words/sec (TTS 1.1x + scene pacing), so the
  // duration target is expressed as a word budget — the model decides scene/sentence count itself.
  const wordBudget    = Math.round(targetDuration * 2.3);
  const langDirective = LANG_DIRECTIVES[language] ?? "";

  // Visual style is a soft leaning on the PALETTE + ENERGY (fonts stay clean/kinetic
  // per the rules above). "auto" → keep the niche-driven choice.
  const s = getStyle(styleId);
  const styleBlock = s ? `\n\nVISUAL STYLE — the user chose "${s.label}": ${s.description}
- Palette feel (a direction — keep on-screen text high-contrast and legible): ${s.paletteGuidance}
- Pacing / energy: ${s.motion.energy}.
Lean the palette and energy toward this style, while keeping the clean kinetic-typography font rules above.` : "";

  // Theme is a HARD constraint (light/medium/dark + accent) — reinforced in the prompt and,
  // crucially, enforced deterministically on the parsed palette below so the LLM can't drift dark.
  const themeBlock = themeDirective(theme, accentColor, accentColor2);

  const userMsg = inputType === "script"
    ? `Convert this into kinetic typography scenes with voiceover + beats per scene.${langDirective}\n\nScript: "${input.trim()}"`
    : `Write a ~${targetDuration}-second short-form narration for this topic — roughly ${wordBudget} words total (the spoken length is the video length, so stay close to that). Match the topic's tone, then break the narration into short on-screen beats.${langDirective}

Topic: "${input.trim()}"`;

  const completion = await openai.chat.completions.create({
    model:                 "gpt-4.1",
    max_completion_tokens: 3000,
    response_format:       { type: "json_object" },
    messages: [
      { role: "system", content: SCRIPT_SYSTEM + styleBlock + themeBlock },
      { role: "user",   content: userMsg },
    ],
  });

  const out = JSON.parse(completion.choices[0].message.content);

  // Deterministic theme enforcement: when a theme is chosen, the field + text come from the
  // theme (the LLM can't drift back to dark); the accent stays flexible unless the user pinned one.
  const themePalette = resolveThemePalette(theme, accentColor);
  const palette = themePalette ? {
    background:          themePalette.background,
    backgroundSecondary: themePalette.backgroundSecondary,
    primaryText:         themePalette.primaryText,
    secondaryText:       themePalette.secondaryText,
    accent:              accentColor || out.palette?.accent    || themePalette.accent,
    accent2:             accentColor2 || out.palette?.accent2  || null,
    highlight:           accentColor || out.palette?.highlight || themePalette.highlight,
  } : {
    background:          out.palette?.background          ?? "#0A0A0A",
    backgroundSecondary: out.palette?.backgroundSecondary ?? "#111111",
    primaryText:         out.palette?.primaryText         ?? "#ffffff",
    secondaryText:       out.palette?.secondaryText       ?? "#AAAAAA",
    accent:              accentColor  || out.palette?.accent   || "#FFD600",
    accent2:             accentColor2 || out.palette?.accent2  || null,
    highlight:           out.palette?.highlight           ?? "#FFFFFF",
  };

  const fontPair = {
    hero:       out.fontPair?.hero       ?? "Inter",
    supporting: out.fontPair?.supporting ?? "Inter",
  };

  const VALID_MOODS = new Set(["energetic", "dramatic", "calm", "playful"]);
  const musicMood = VALID_MOODS.has(out.musicMood) ? out.musicMood : "energetic";

  const VALID_NICHES = new Set(["health", "psychology", "tech", "finance", "fitness", "motivation", "lifestyle", "mystery", "education", "entertainment", "nature", "viral"]);
  const niche = VALID_NICHES.has(out.niche) ? out.niche : null;

  const scenes = Array.isArray(out.scenes) ? out.scenes.map(sc => ({
    voiceover: sc.voiceover ?? "",
    beats: Array.isArray(sc.beats) ? sc.beats.map(b => ({
      text: b.text ?? "",
      type: ["phrase", "keyword"].includes(b.type) ? b.type : "keyword",
    })) : [],
  })).filter(sc => sc.voiceover && sc.beats.length > 0) : [];

  return {
    projectName:     out.projectName     ?? "Typography Video",
    palette,
    fontPair,
    musicMood,
    niche,
    voiceoverScript: (out.voiceoverScript ?? "").trim(),
    scenes,
  };
}
