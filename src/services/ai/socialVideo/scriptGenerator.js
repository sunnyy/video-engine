/**
 * scriptGenerator.js
 * GPT-4.1 (vision) acts as creative director + scriptwriter: it reads a fetched
 * social post, decides the narrative strategy that fits THAT post, and designs
 * the scenes freely around it (no fixed template).
 */

import { openai } from "../../../server/middleware/shared.js";
import { resolveThemePalette, themeDirective } from "../shared/themeRegistry.js";


const SCRIPT_SYSTEM = `You are a creative director and short-form video scriptwriter.

Your job is NOT to fill a template. It is to understand one specific social post and design the video that best tells ITS story.

━━━ STEP 1 — READ THE POST AS A CREATIVE DIRECTOR ━━━
Before writing anything, work out:
- What KIND of content is this? (a shocking reveal, a before/after, a comparison or debate, a ranked list, a personal story, a hot take or rant, a how-to, a single big claim, a question to the audience…)
- What is the core tension, payoff, or emotional beat — the one thing that makes someone stop scrolling?
- What should the viewer FEEL moment to moment? What is the emotional arc from first frame to last?

━━━ STEP 2 — DESIGN THE VIDEO AROUND THAT ━━━
Let the content dictate the structure. There is NO fixed scene pattern and NO required opening or closing.
- YOU decide how many scenes (3–7), their order, and what each one does.
- The shape must match the story. Inspiration only, never rules:
    • a reveal builds curiosity, then drops the payoff hard
    • a comparison sets up two sides, then lets one win — or hands the choice to the viewer
    • a list stacks rapid payoffs and keeps escalating
    • a personal story moves setup → turn → lesson
    • a hot take opens on its boldest claim and defends it
- Invent the structure that fits. Do not force a generic hook-then-CTA mold onto content that doesn't want one.
- A call-to-action ending is OPTIONAL — use it only when it genuinely serves the piece. If you do end on a CTA, set that scene's intent to "cta".

━━━ VIDEO FORMAT ━━━
Duration 15–60s. Scale scene count to content volume:
  - Short post (<100 words): 3–4 scenes
  - Medium post (100–300 words): 4–5 scenes
  - Long post (>300 words): 5–7 scenes
  - Thread: up to 7 scenes — cover the full thread's key ideas
Each scene voiceover: 5–12 words. The video AMPLIFIES the content — it does not invent new facts.

━━━ VOICEOVER RULES ━━━
- Write for speech. Short punchy sentences. One idea per breath.
- NEVER mention the author's name, username, or handle — not even a first name. The video is about the idea, not who said it.
- Product names, tools, companies, and AI models from the post ARE allowed and should be used. When the post leads with a named product (e.g. "Claude = 550 videos/day"), USE that name in the opening — it is the hook.
- NEVER mention the platform name (Twitter, X, Instagram, etc.) in any scene.
- Scale total voiceover to scene count: ~10 words per scene. 4 scenes ≈ 40 words, 6 scenes ≈ 60 words. Never exceed 80 words total.
- Tone must match the content: inspiring, surprising, funny, informational, dramatic.

━━━ MEDIA STRATEGY (real imagery beats text-only when the content has a clear subject) ━━━
Each scene can carry ONE image, resolved cheapest-first by the pipeline. Set the field that fits the scene (or none):
  use_fetched_image: true → the POST's own attached image (best when that photo IS the visual). Set image_index.
  subject_entity: "<exact Wikipedia article title>" → a REAL photo of a named person/company/product/place central to this scene (e.g. "Sam Altman", "OpenAI", "Mount Fuji"). ONLY real notable entities that have a Wikipedia page with a photo — never documents, events, or abstract ideas.
  stock_query: "<concrete searchable phrase>" → real-world footage/photo for a scene with no specific entity (e.g. "city traffic at night", "hands typing on laptop").
  stock_motion: true → pair with stock_query to use a short real VIDEO clip (b-roll with motion) instead of a still. Choose this for dynamic, atmospheric, or kinetic moments (flowing traffic, ocean waves, a busy crowd, typing hands, city timelapse). Leave false when a crisp still lands better.
  none of these → a pure TYPE/GRAPHIC scene (headline, stat, quote, comparison, list, cta).
Prefer real imagery for scenes with a clear visual subject; keep text/graphic scenes for claims, stats, and CTAs. Don't force an image onto a scene that lands harder as bold type. Set at most ONE of the three per scene.

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

━━━ PER-SCENE CREATIVE BRIEF ━━━
For each scene you are briefing the art director who designs the actual frame. Give them:
- intent: a short keyword in your own words for this scene's job ("reveal", "setup", "turn", "side-a", "side-b", "payoff", "stat", "cta", …). Invent what fits the story.
- creative_brief: 1–2 sentences — what this scene DOES narratively AND how it should LOOK and FEEL (energy, focal point, motion feeling). This is the most important field; be vivid and specific so the art director can realize your vision.
- visual_text: the exact text to DISPLAY on screen (can differ from voiceover — shorter, punchier). For a list, newline-separate the real items.
- script_segment: the spoken words for this scene.

━━━ OUTPUT — valid JSON only ━━━
{
  "projectName": "Short title for this video — 3–6 words, captures the core idea.",
  "creative_direction": "one sentence: the narrative strategy you chose and why it fits this post",
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
      "intent": "your keyword",
      "creative_brief": "what this scene does narratively + how it looks and feels",
      "script_segment": "exact words from full_script for this scene",
      "visual_text": "text to DISPLAY in the scene",
      "use_fetched_image": false,
      "image_index": 0,
      "subject_entity": null,
      "stock_query": null,
      "stock_motion": false,
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
};

export async function generateSocialScript({ content, targetDuration = 25, language = "en", theme = "auto", accentColor = null, accentColor2 = null }) {
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

  // Final video length = spoken length, so anchor the narration to the target by word count
  // (~2.3 words/sec) rather than letting it run long. The model decides scene count itself.
  const wordBudget = Math.round(targetDuration * 2.3);

  const userText = `Post text:
"${postText}"
${imageNote}
Write a ~${targetDuration}-second narration — roughly ${wordBudget} words total across all scenes (the spoken length is the video length, so stay close to that).${threadNote}${lengthNote}${platformDirective ? `\n${platformDirective}` : ""}${langDirective ? `\n${langDirective}` : ""}${themeDirective(theme, accentColor, accentColor2)}`;

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

  const scenes = rawScenes.map((s, i) => {
    const brief = s.creative_brief ?? s.visual_concept ?? "";
    return {
      scene_index:       i,
      intent:            s.intent           ?? "scene",
      creative_brief:    brief,
      script_segment:    s.script_segment   ?? "",
      spoken:            s.script_segment   ?? "",
      visual_text:       s.visual_text      ?? s.script_segment ?? "",
      visual_concept:    brief,
      archetype:         s.archetype        ?? null,
      use_fetched_image: s.use_fetched_image === true && imageUrls.length > 0,
      image_index:       typeof s.image_index === "number" ? Math.min(s.image_index, imageUrls.length - 1) : 0,
      subject_entity:    typeof s.subject_entity === "string" && s.subject_entity.trim() ? s.subject_entity.trim() : null,
      stock_query:       typeof s.stock_query === "string" && s.stock_query.trim() ? s.stock_query.trim() : null,
      stock_motion:      s.stock_motion === true,
      duration_seconds:  s.duration_seconds ?? 4.0,
      duration:          s.duration_seconds ?? 4.0,
    };
  });

  // Deterministic theme enforcement: when a theme is chosen, field + text come from the theme
  // (the model can't drift back to dark); the accent stays flexible unless the user pinned one.
  const themePalette = resolveThemePalette(theme, accentColor);
  const palette = themePalette ? {
    background:          themePalette.background,
    backgroundSecondary: themePalette.backgroundSecondary,
    primaryText:         themePalette.primaryText,
    secondaryText:       themePalette.secondaryText,
    accent:              accentColor || parsed.palette?.accent    || themePalette.accent,
    accent2:             accentColor2 || parsed.palette?.accent2  || null,
    highlight:           accentColor || parsed.palette?.highlight || themePalette.highlight,
  } : {
    background:          parsed.palette?.background          ?? "#0A0A0A",
    backgroundSecondary: parsed.palette?.backgroundSecondary ?? "#111111",
    primaryText:         parsed.palette?.primaryText         ?? "#ffffff",
    secondaryText:       parsed.palette?.secondaryText       ?? "#AAAAAA",
    accent:              accentColor  || parsed.palette?.accent   || "#FFD600",
    accent2:             accentColor2 || parsed.palette?.accent2  || null,
    highlight:           parsed.palette?.highlight           ?? "#FFFFFF",
  };

  const fontPair = {
    hero:       parsed.fontPair?.hero       ?? "Anton",
    supporting: parsed.fontPair?.supporting ?? "Inter",
  };

  const VALID_MOODS = new Set(["energetic", "dramatic", "calm", "playful"]);
  const musicMood = VALID_MOODS.has(parsed.musicMood) ? parsed.musicMood : "energetic";

  const projectName = typeof parsed.projectName === "string" && parsed.projectName.trim()
    ? parsed.projectName.trim()
    : null;

  const creativeDirection = typeof parsed.creative_direction === "string" && parsed.creative_direction.trim()
    ? parsed.creative_direction.trim()
    : null;

  console.log(`[socialScriptGen] ${scenes.length} scenes, mood=${musicMood}, accent=${palette.accent}, name="${projectName}"`);
  if (creativeDirection) console.log(`[socialScriptGen] direction: ${creativeDirection}`);

  return { full_script, scenes, palette, fontPair, musicMood, projectName, creativeDirection };
}
