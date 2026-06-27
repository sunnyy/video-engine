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
- YOU decide the order and what each scene does; the NUMBER of scenes follows the post's content — one per point (see VIDEO FORMAT below).
- The shape must match the story. Inspiration only, never rules:
    • a reveal builds curiosity, then drops the payoff hard
    • a comparison sets up two sides, then lets one win — or hands the choice to the viewer
    • a list stacks rapid payoffs and keeps escalating
    • a personal story moves setup → turn → lesson
    • a hot take opens on its boldest claim and defends it
- Invent the structure that fits. Do not force a generic hook-then-CTA mold onto content that doesn't want one.
- A call-to-action ending is OPTIONAL — use it only when it genuinely serves the piece. If you do end on a CTA, set that scene's intent to "cta".

━━━ VIDEO FORMAT — ONE SCENE PER POINT, COVER EVERYTHING ━━━
Pull out EVERY distinct point, item, tip, step or idea the post makes. Give EACH ONE its OWN scene with its own visual — this is what creates variety and lets the viewer absorb one idea at a time. Then add a punchy opening HOOK scene and (when it fits) a short CTA.
- COVER ALL of the post's content. NEVER merge several points into one scene, NEVER compress points into an on-screen list, NEVER distill multiple points into a summary, NEVER prioritise some and drop the rest. Every point earns its own scene.
- Each scene carries ONE idea, and its spoken line is SHORT and punchy — at most ~8 words so the scene runs UNDER 4 seconds. Snappy, fast-cut pacing; no long lingering scenes.
- Scene count follows the POST, not a fixed range: a 3-point post → ~5 scenes (hook + 3 + CTA); an 11-point post → ~13 scenes. There is NO scene cap — cover everything.
- Aim to land near the target duration below. With many points the video fills the time naturally; it's fine to run a little over to keep every point — but keep EVERY scene tight (≤4s). NEVER pad a thin post with filler or repeat yourself to stretch the time.
The video AMPLIFIES the content — it does not invent new facts.

━━━ VOICEOVER RULES ━━━
- The narration moves through the points, ONE per scene. Each scene's spoken line is SHORT and punchy (≤~8 words) and lands its ONE point cleanly. The lines still connect naturally scene to scene so it sounds like a person talking — not a robotic list — but keep every line tight enough to run under 4 seconds.
- NEVER mention the author's name, username, or handle — not even a first name. The video is about the idea, not who said it.
- Product names, tools, companies, and AI models from the post ARE allowed and should be used. When the post leads with a named product (e.g. "Claude = 550 videos/day"), USE that name in the opening — it is the hook.
- NEVER mention the platform name (Twitter, X, Instagram, etc.) in any scene.
- Each scene's spoken line is ≤~8 words (≈4 seconds at speaking pace). The whole video's length = all those short lines back to back, so it grows with the number of points — that is expected and good. Don't shrink the point count to hit a duration; cover every point.
- Tone must match the content: inspiring, surprising, funny, informational, dramatic.

━━━ MEDIA STRATEGY (real imagery beats text-only when the content has a clear subject) ━━━
Each scene can carry ONE image, resolved cheapest-first by the pipeline. Set the field that fits the scene (or none):
  use_fetched_image: true → the POST's own attached image (best when that photo IS the visual). Set image_index.
  subject_entity: "<exact Wikipedia article title>" → a REAL photo of a named person/company/product/place central to this scene (e.g. "Sam Altman", "OpenAI", "Mount Fuji"). ONLY real notable entities that have a Wikipedia page with a photo — never documents, events, or abstract ideas.
  stock_query: "<concrete searchable phrase>" → real-world footage/photo for a scene with no specific entity (e.g. "city traffic at night", "hands typing on laptop").
  stock_motion: true → pair with stock_query to use a short real VIDEO clip (b-roll with motion) instead of a still. Choose this for dynamic, atmospheric, or kinetic moments (flowing traffic, ocean waves, a busy crowd, typing hands, city timelapse). Leave false when a crisp still lands better.
  none of these → a pure TYPE/GRAPHIC scene for this ONE point (headline, stat, quote, comparison, cta) — never a multi-item list.
Prefer real imagery for scenes with a clear visual subject; keep text/graphic scenes for claims, stats, and CTAs. Don't force an image onto a scene that lands harder as bold type. Set at most ONE of the three per scene.
MIX FOR RHYTHM — abstract points (tips, steps, rules, warnings with NO concrete visual subject) should be bold TYPE/GRAPHIC scenes, NOT generic stock. Putting a stock photo behind every point makes every scene look identical (image + overlay text) and flat. Across the video, ALTERNATE: image scenes only where the point has a genuinely concrete, recognizable subject; everything else is a designed type/graphic frame. A list of abstract points should be mostly type/graphic, with images the exception — variety of layout is what makes it watchable.

━━━ PALETTE GUIDE ━━━
Match the emotional tone:
  Inspiring/success → dark charcoal (#0A0A0A), gold accent (#FFD700)
  Tech/AI/future    → near-black (#050B18), cyan accent (#00E5FF)
  Money/finance     → black (#0A0A0A), gold (#FFD700) + red (#FF3B3B) highlight
  Motivation/hustle → deep dark (#0D0500), orange accent (#F97316)
  Funny/viral       → dark (#0D1117), bright accent (pink/green/yellow)
  Drama/controversy → near-black (#08080E), violet accent (#E879F9)

━━━ PUNCTUATION & RHYTHM — controls TTS pacing ━━━
- Each scene's line is SHORT but must still read naturally — use commas/connectors within the line so it sounds spoken, not a robotic staccato of single words. Lines connect from one scene to the next.
- Periods end a complete statement; commas connect within a thought; em dash (—) is a dramatic pause between two contrasting beats ("Stuck for hours — done in seconds."); question marks for direct-address hooks.
- CTA — use a comma for one continuous energetic thought, never an em dash: "Follow for more, save this now."

━━━ PER-SCENE CREATIVE BRIEF ━━━
For each scene you are briefing the art director who designs the actual frame. Give them:
- intent: a short keyword in your own words for this scene's job ("reveal", "setup", "turn", "side-a", "side-b", "payoff", "stat", "cta", …). Invent what fits the story.
- creative_brief: 1–2 sentences — what this scene DOES narratively AND how it should LOOK and FEEL (energy, focal point, motion feeling). This is the most important field; be vivid and specific so the art director can realize your vision.
- visual_text: the exact text to DISPLAY on screen for THIS one point — short and punchy (a few words / one line), distinct from the spoken line. One point per scene, so NEVER dump a multi-item list here — covering each point IS the job of its own scene.
- script_segment: the spoken words for this scene.

━━━ OUTPUT — valid JSON only ━━━
{
  "projectName": "Short title for this video — 3–6 words, captures the core idea.",
  "creative_direction": "one sentence: the narrative strategy you chose and why it fits this post",
  "full_script": "the complete flowing voiceover (all scenes' segments joined) — sized to the target duration, not a fixed word cap",
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
  hinglish: "LANGUAGE — TWO SCRIPTS BY FIELD: the SPOKEN voiceover (script_segment + full_script) must be conversational Hindi WRITTEN IN DEVANAGARI (natural Hinglish flow — English/brand terms may stay Latin where a speaker actually says them in English). Romanized Hindi ('Ek haddi, pure sheher') is a FAILURE — it makes the voice mispronounce words. But the ON-SCREEN text (visual_text) must stay LATIN — short punchy romanized-Hinglish/English keywords. So the viewer HEARS Devanagari Hindi and SEES Latin text.",
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

  const langDirective     = LANGUAGE_DIRECTIVES[language] ?? "";
  const platformDirective = PLATFORM_TONE_DIRECTIVES[content.platform] ?? "";

  // Length comes from COVERAGE, not a word cap: one short scene per point. The target duration is a
  // guide to aim near (cover all points snappily) — covering everything matters more than hitting it
  // exactly. Each scene's spoken line must be ≤~8 words so no scene runs past ~4s (MAX_SCENE_WORDS).
  const MAX_SCENE_WORDS = 11; // ~8 target + tolerance before we regenerate for snappier scenes
  const wordCount  = postText.split(/\s+/).filter(Boolean).length;
  const lengthNote = wordCount > 120
    ? `\nThis post is ~${wordCount} words and packs several distinct points — give EACH point its own short scene; cover them ALL, do not merge or drop any.`
    : "";

  const userText = `Post text:
"${postText}"
${imageNote}
TARGET DURATION: ~${targetDuration}s — aim near it, but COVERING EVERY POINT in the post matters more than hitting it exactly. Build ONE short scene per point (each spoken line ≤~8 words, under 4 seconds); the video's length follows the number of points. Do not pad a thin post to fill the time, and do not drop points to shorten it.${threadNote}${lengthNote}${platformDirective ? `\n${platformDirective}` : ""}${langDirective ? `\n${langDirective}` : ""}${themeDirective(theme, accentColor, accentColor2)}`;

  const countWords = (s) => (typeof s === "string" ? s.split(/\s+/).filter(Boolean).length : 0);

  // One model call. `correction` (optional) is appended when a draft needs snappier scenes.
  async function runModel(correction) {
    const ut = correction ? `${userText}\n\n${correction}` : userText;
    const messages = [{ role: "system", content: SCRIPT_SYSTEM }];
    if (imageUrls.length > 0) {
      messages.push({ role: "user", content: [{ type: "text", text: ut }, ...imageUrls.map(url => ({ type: "image_url", image_url: { url } }))] });
    } else {
      messages.push({ role: "user", content: ut });
    }
    // Cap sized for the LONGEST case: a 60s one-scene-per-point list can be 15-20 scenes, each with
    // creative_brief + script_segment + visual_text + media fields. At 2500 the JSON truncated mid-array
    // (parse error) for 60s videos. 8000 is a ceiling, not a cost — the model only emits what it needs.
    const response = await openai.chat.completions.create({ model: "gpt-4.1", temperature: 0.6, max_tokens: 8000, messages });
    const choice = response.choices[0];
    const raw = (choice.message.content ?? "").trim();
    try { return JSON.parse(raw); }
    catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) { try { return JSON.parse(match[0]); } catch {} }
      // A truncated (finish_reason="length") response can't be repaired — surface it clearly.
      const why = choice.finish_reason === "length" ? " (response hit the token cap — increase max_tokens)" : "";
      throw new Error(`socialScriptGenerator: JSON parse failed${why}\n${raw.slice(0, 300)}`);
    }
  }

  let parsed = await runModel(null);
  // Enforce snappy ≤4s scenes: if any scene's spoken line is too long, regenerate ONCE asking it to
  // split long scenes into more one-point scenes (keep coverage, just shorter). Cheap — pre-TTS.
  const longScenes = (parsed.scenes || []).filter(s => countWords(s.script_segment) > MAX_SCENE_WORDS);
  if (longScenes.length) {
    console.warn(`[socialScriptGen] ${longScenes.length} scene(s) over ~4s — regenerating snappier`);
    parsed = await runModel(`${longScenes.length} of your scenes had a spoken line longer than ~8 words (over 4 seconds). Rewrite so EVERY scene is ONE point with a spoken line of at most ~8 words. Split any long scene into multiple one-point scenes — keep covering ALL the points, just make each scene shorter.`);
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
