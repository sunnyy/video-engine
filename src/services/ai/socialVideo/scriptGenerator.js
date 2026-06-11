/**
 * scriptGenerator.js
 * GPT-4.1 (vision) analyzes a fetched social post and writes a viral video script.
 */

import { openai } from "../../../server/middleware/shared.js";


const SCRIPT_SYSTEM = `You are a viral social media video producer.

Take a social media post and produce a short-form video script that amplifies its impact into a shareable reel or short.

━━━ VIDEO FORMAT ━━━
Duration: 15–60 seconds. Scale scene count to content volume:
  - Short post (<100 words): 3–4 scenes
  - Medium post (100–300 words): 4–5 scenes
  - Long post (>300 words): 5–7 scenes
  - Thread: up to 7 scenes — cover the full thread's key ideas
Each scene voiceover: 5–12 words.
The video amplifies the content — it does NOT create new information.
Find what makes this content compelling (a number, a bold claim, a list of examples, an image, a story beat) and build around it.
For long posts and threads: cover the key points across scenes — hook → main ideas → CTA.

━━━ VOICEOVER RULES ━━━
- Write for speech. Short punchy sentences. One idea per breath.
- NEVER mention the author's name, username, or handle — not even their first name. The video is about the idea, not who said it.
- Product names, tools, companies, and AI models mentioned in the post ARE allowed and should be used. When the post leads with a named product (e.g. "Claude = 550 videos/day"), USE that name in the hook — it is the hook.
- NEVER mention the platform name (Twitter, X, Instagram, etc.) — not in any scene.
- Scale total voiceover to scene count: ~10 words per scene. 4 scenes ≈ 40 words, 6 scenes ≈ 60 words, 7 scenes ≈ 70 words. Never exceed 80 words total.
- The tone must match the content: inspiring, surprising, funny, informational

━━━ SCENE STRUCTURE ━━━
  hook:  Opening. The single most scroll-stopping element — a number, a claim, a shock.
  quote: The key message from the post, displayed as a premium quote card.
  stat:  A striking number FROM THE POST'S CONTENT (e.g. "10x faster", "$2M raised", "3 hours"). NEVER use views, likes, retweets, or any engagement count.
  list:  When the post contains a list of items. Show 8–10 of the most compelling items per scene (pick the most surprising or valuable ones). For long lists use multiple list scenes. visual_text MUST be the actual list items newline-separated (e.g. "AI Video Generator\nBaby Heartbeat App\nBible Widget"). Do NOT summarise — show the real items.
  image: The post's media image as the visual hero of the scene.
  cta:   Call to action. Always the final scene. Never attribution — focus on the action (save, follow, share).

Use 3–4 scenes for text-only posts. Use 4–5 scenes when an image is available.
When the post is primarily a list, use: hook → 2–3 list scenes covering different items → cta.
Always end with a cta scene. Always start with a hook scene.

━━━ ASSET STRATEGY ━━━
  use_fetched_image: true  → only for image/split_composition scenes when image is available
  use_fetched_image: false → for all typography/stat/quote/cta scenes

━━━ ARCHETYPES ━━━
  typography_hero   → hook scenes — massive text, nothing else
  single_stat       → stat scenes — one number dominates
  quote_statement   → quote scenes — premium quote card layout
  list_reveal       → list scenes — vertical stack of items, one per line. Use this for list intent ONLY.
  full_bleed_image  → image scenes — fetched image fills canvas
  split_composition → image scenes — image on one side, text on other
  minimal_cta       → cta scenes — clean attribution and action

━━━ PALETTE GUIDE ━━━
Match the emotional tone:
  Inspiring/success → dark charcoal (#0A0A0A), gold accent (#FFD700)
  Tech/AI/future    → near-black (#050B18), cyan accent (#00E5FF)
  Money/finance     → black (#0A0A0A), gold (#FFD700) + red (#FF3B3B) highlight
  Motivation/hustle → deep dark (#0D0500), orange accent (#F97316)
  Funny/viral       → dark (#0D1117), bright accent (pink/green/yellow)
  Drama/controversy → near-black (#08080E), violet accent (#E879F9)

━━━ PUNCTUATION RULES — controls TTS pacing ━━━
- Periods: use after each complete statement. Each item in a list gets its own period — natural breath between each one.
- Commas: only to connect fragments within a single continuous thought. Never to separate list items.
- Em dash (—): dramatic pause between two contrasting beats. e.g. "Stuck for hours — done in seconds."
- Question marks: perfect for direct-address hooks.
LIST ITEMS — always use periods, never commas:
  WRONG: "Too slow, too expensive, too complicated."
  RIGHT: "Too slow. Too expensive. Too complicated."
CTA — never use em dash. Use a comma for one continuous energetic thought:
  WRONG: "Follow for more — save this now"
  RIGHT: "Follow for more, save this now"

━━━ OUTPUT — valid JSON only ━━━
{
  "full_script": "complete speakable voiceover — 30–40 words max",
  "palette": {
    "background": "#hex",
    "backgroundSecondary": "#hex",
    "primaryText": "#hex",
    "secondaryText": "#hex",
    "accent": "#hex",
    "highlight": "#hex"
  },
  "fontPair": {
    "hero": "Anton | Bebas Neue | Oswald | Archivo Black",
    "supporting": "Inter | Poppins | Manrope | Plus Jakarta Sans"
  },
  "musicMood": "energetic | dramatic | calm | playful",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook",
      "script_segment": "exact words from full_script for this scene",
      "visual_text": "text to DISPLAY in the scene — can differ from voiceover (shorter, more impactful)",
      "visual_concept": "one short phrase — what this scene should look like",
      "archetype": "typography_hero",
      "use_fetched_image": false,
      "image_index": 0,
      "duration_seconds": 3.5
    }
  ]
}`;

const LANGUAGE_DIRECTIVES = {
  hinglish: "LANGUAGE: Write ALL voiceover text in Hinglish (natural mix of Hindi and English, written in Roman/Latin script). Keep it conversational and punchy — how young urban Indians actually speak.",
  es:       "LANGUAGE: Write ALL voiceover text in Spanish. Keep it punchy and natural — short sentences, informal tone suitable for viral short-form video.",
};

const PLATFORM_TONE_DIRECTIVES = {
  instagram: "PLATFORM: Instagram. Visual-first, lifestyle-driven. Tone: aspirational, energetic, relatable. Lead with the most striking visual idea or emotional hook.",
  linkedin:  "PLATFORM: LinkedIn. Professional audience. Tone: authoritative, insightful, credible. Lead with the key business insight or professional takeaway.",
  reddit:    "PLATFORM: Reddit. Community-driven. Tone: genuine, direct, informative. Lead with the most surprising, counterintuitive, or interesting point from the post.",
};

export async function generateSocialScript({ content, targetDuration = 25, language = "en" }) {
  const postText   = (content.text || content.title || "").slice(0, 2000);
  const imageUrls  = content.imageUrls?.length ? content.imageUrls : (content.imageUrl ? [content.imageUrl] : []);
  const threadNote = content.isThread
    ? `\nThis is a ${content.threadLength}-tweet thread — all tweets are combined above. Cover the full thread's ideas across scenes.`
    : "";
  const imageNote  = imageUrls.length > 1
    ? `Images available: ${imageUrls.length} — use image_index (0-based) in each scene to assign which image to use.`
    : imageUrls.length === 1
      ? "Image available: 1 — use image_index: 0 for any scene using the image."
      : "Image available: false";

  const wordCount  = postText.split(/\s+/).filter(Boolean).length;
  const lengthNote = wordCount > 300 ? `\nPost length: ${wordCount} words — this is a long post, use 5–7 scenes to cover the key ideas.`
                   : wordCount > 100 ? `\nPost length: ${wordCount} words.`
                   : "";

  const langDirective     = LANGUAGE_DIRECTIVES[language] ?? "";
  const platformDirective = PLATFORM_TONE_DIRECTIVES[content.platform] ?? "";

  const userText = `Post text:
"${postText}"
${imageNote}
Target duration: ~${targetDuration} seconds${threadNote}${lengthNote}${platformDirective ? `\n${platformDirective}` : ""}${langDirective ? `\n${langDirective}` : ""}`;

  const messages = [{ role: "system", content: SCRIPT_SYSTEM }];

  if (imageUrls.length > 0) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userText },
        ...imageUrls.map(url => ({ type: "image_url", image_url: { url } })),
      ],
    });
  } else {
    messages.push({ role: "user", content: userText });
  }

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.7,
    max_tokens:  2000,
    messages,
  });

  const raw = (response.choices[0].message.content ?? "").trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`socialScriptGenerator: JSON parse failed\n${raw.slice(0, 300)}`);
  }

  const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  if (!rawScenes.length) throw new Error("socialScriptGenerator: no scenes returned");

  const full_script = typeof parsed.full_script === "string"
    ? parsed.full_script
    : rawScenes.map(s => s.script_segment).join(" ");

  const scenes = rawScenes.map((s, i) => ({
    scene_index:       i,
    intent:            s.intent           ?? "quote",
    script_segment:    s.script_segment   ?? "",
    spoken:            s.script_segment   ?? "",
    visual_text:       s.visual_text      ?? s.script_segment ?? "",
    visual_concept:    s.visual_concept   ?? "",
    archetype:         s.archetype        ?? null,
    use_fetched_image: s.use_fetched_image === true && imageUrls.length > 0,
    image_index:       typeof s.image_index === "number" ? Math.min(s.image_index, imageUrls.length - 1) : 0,
    duration_seconds:  s.duration_seconds ?? 4.0,
    duration:          s.duration_seconds ?? 4.0,
  }));

  const palette = {
    background:          parsed.palette?.background          ?? "#0A0A0A",
    backgroundSecondary: parsed.palette?.backgroundSecondary ?? "#111111",
    primaryText:         parsed.palette?.primaryText         ?? "#ffffff",
    secondaryText:       parsed.palette?.secondaryText       ?? "#AAAAAA",
    accent:              parsed.palette?.accent              ?? "#FFD600",
    highlight:           parsed.palette?.highlight           ?? "#FFFFFF",
  };

  const fontPair = {
    hero:       parsed.fontPair?.hero       ?? "Anton",
    supporting: parsed.fontPair?.supporting ?? "Inter",
  };

  const VALID_MOODS = new Set(["energetic", "dramatic", "calm", "playful"]);
  const musicMood = VALID_MOODS.has(parsed.musicMood) ? parsed.musicMood : "energetic";

  console.log(`[socialScriptGen] ${scenes.length} scenes, mood=${musicMood}, accent=${palette.accent}`);

  return { full_script, scenes, palette, fontPair, musicMood };
}
