/**
 * beatDirector.js
 * src/services/ai/promptVideo/beatDirector.js
 *
 * Stage 1 — plans the ENTIRE film at BEAT level in one call.
 *
 * The unit of composition is the beat: one spoken sentence/clause, 2-4
 * seconds, one visual. A 45s video is ~14 beats, not 4 scenes. Script and
 * beat plan are the same artifact at this granularity, so the director
 * writes both together — guaranteeing a 1:1 sentence-to-visual mapping.
 *
 * Treatments (the director's instrument set):
 *   ai_illustration   — styled AI image (locked style string), full-bleed
 *   cutout_colorblock — subject cutout on a bold designed color block
 *   artifact          — real-world artifact rebuilt in HTML (tweet card, stat
 *                       card, versus screen, quote card, mini chart) — text is
 *                       ALWAYS real and correct, our signature advantage
 *   annotated_photo   — photo with comic annotations popping in (bubbles,
 *                       arrows, zings)
 *   typography_punch  — kinetic text slam
 *   stock_moment      — real footage/photo texture
 *   versus_split      — two-zone comparison frame
 */

import { openai } from "../../../server/middleware/shared.js";
import { STYLE_PRESETS, STYLE_IDS, styleMenuForDirector, styleDirectiveBlock } from "./styleSystem.js";
import { normalizeHex, ensureVividAccent } from "./utils.js";
import { resolveThemePalette, themeDirective } from "../shared/themeRegistry.js";

const DIRECTOR_MODEL = "gpt-4.1";

const ASSET_TYPES = ["none", "ai_image", "photo", "cutout", "stock_video"];
const TRANSITIONS = ["zoom", "slide-left", "slide-up", "slide-down", "fade", "none"];
const CAMERAS = ["slow_zoom_in", "fast_zoom_in", "slow_zoom_out", "pan_left", "pan_right", "hold"];

// Soft floor + hard safety cap on scene count — NOT a word/length budget. The director
// decides how many scenes the content needs; these only stop a degenerate plan or a runaway.
const MIN_BEATS = 6, MAX_BEATS = 48;

const wordsIn = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;
// True if the string carries a non-Latin script (Devanagari, Arabic, CJK, …). Our on-screen
// fonts are Latin-only, so such text must never become an overlay (it would render as boxes).
const hasNonLatinScript = (s) => /[ऀ-ॿ؀-ۿ֐-׿฀-๿぀-ヿ一-鿿가-힯]/.test(String(s || ""));

// The voiceover the viewer hears is the beats' script_lines concatenated. To guarantee it
// sounds like one flowing narration (not a list of headline fragments), we let the director
// author the whole narration as prose, then re-slice THAT verbatim across the beats — using
// each beat's own line length as the chunk size. Result: joined script_lines == narration
// word-for-word, so TTS flows AND the count-based per-beat timing/sync is unchanged.
// No-ops (keeps the model's per-beat lines) when narration is missing or clearly inconsistent.
function reconcileNarrationToBeats(beats, narration) {
  const narr = String(narration || "").trim();
  if (!narr || !beats?.length) return;
  const narrTokens = narr.split(/\s+/).filter(Boolean);
  if (narrTokens.length < 4) return;

  const beatWords = beats.map(b => wordsIn(b.script_line));
  const totalBeatWords = beatWords.reduce((a, n) => a + n, 0);
  if (totalBeatWords < 1) return;

  // If the narration and the beat lines describe wildly different amounts of speech, the model
  // likely wrote them inconsistently — don't force a re-slice that could scramble the script.
  const ratio = narrTokens.length / totalBeatWords;
  if (ratio < 0.45 || ratio > 2.5) {
    console.warn(`[ai-video/director] narration/beat word ratio ${ratio.toFixed(2)} out of range — keeping per-beat lines`);
    return;
  }

  // Hand each beat its proportional share of the narration tokens, in order; the last
  // non-empty beat absorbs any rounding remainder so every word is placed exactly once.
  let idx = 0;
  for (let i = 0; i < beats.length; i++) {
    const remainingBeats = beats.length - i;
    let take = Math.round(beatWords[i] * ratio);
    take = Math.max(1, Math.min(take, narrTokens.length - idx - (remainingBeats - 1)));
    if (i === beats.length - 1) take = narrTokens.length - idx;
    if (take <= 0) { beats[i].script_line = ""; continue; }
    beats[i].script_line = narrTokens.slice(idx, idx + take).join(" ");
    idx += take;
  }
  if (idx < narrTokens.length) {
    const last = beats[beats.length - 1];
    last.script_line = `${last.script_line} ${narrTokens.slice(idx).join(" ")}`.trim();
  }
}

// Fixed assumed speaking pace → a concrete TOTAL word budget per runtime. This is a budget for
// the WHOLE narration (the lever that actually holds duration), NOT a per-scene word cap — so it
// controls length without chopping speech into the headline stubs that made it sound like a list.
const WORDS_PER_MINUTE = 145;
const budgetWords = (seconds) => Math.round(seconds * WORDS_PER_MINUTE / 60);
const narrationWordCount = (plan) =>
  wordsIn(plan?.narration) ||
  (Array.isArray(plan?.beats) ? plan.beats.reduce((n, b) => n + wordsIn(b.script_line), 0) : 0);

// One director completion. `extraUser` appends a follow-up instruction (the runtime-fit pass).
async function runDirectorCompletion(prompt, extraUser = "") {
  const response = await openai.chat.completions.create({
    model: DIRECTOR_MODEL,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user",   content: extraUser ? `${prompt.user}\n\n${extraUser}` : prompt.user },
    ],
  });
  return JSON.parse(response.choices[0].message.content);
}

// Human-readable language name for the dominant output-language banner.
function languageName(language) {
  if (language === "hi" || language === "hinglish") return "HINDI (Devanagari script)";
  if (language === "es") return "SPANISH";
  if (language === "en") return "ENGLISH";
  return String(language || "ENGLISH").toUpperCase();
}

function languageBlock(language) {
  if (language === "en") return "LANGUAGE: English.";
  if (language === "hinglish" || language === "hi") {
    return `LANGUAGE — STRICT, TWO SCRIPTS BY FIELD (this matters for both pronunciation AND on-screen rendering):
- SPOKEN — the "narration" and every "script_line": conversational Hindi WRITTEN IN DEVANAGARI. Keep the natural, casual Hinglish FLOW (the way people actually talk), and you MAY leave genuine English / brand / tech terms or acronyms in Latin where a speaker truly says them in English (e.g. "AI", "iPhone", "reels") — but ALL Hindi words MUST be in Devanagari, never romanized. Romanized Hindi ("Ek haddi, pure sheher ko badal de") is a FAILURE: the voice mispronounces it. Write it as Devanagari, e.g. "एक हड्डी पूरे शहर को बदल देती है, और लोग उसे सम्मान देते हैं।"
- ON-SCREEN — the "content" fields (headline / subtext / items / attribution) and anything shown on screen: keep these in LATIN script (short, punchy romanized-Hinglish or English keywords, e.g. "EK HADDI", "ONE BONE", "150+ CITIES"). NEVER put Devanagari in content/on-screen strings — the on-screen fonts cannot render it and it shows as empty boxes.
So the viewer HEARS Devanagari Hindi (correct pronunciation) and SEES Latin text. Different scripts, on purpose.`;
  }
  return `LANGUAGE — STRICT: Every script_line must be written in ${language}. content strings may use short Latin-script keywords.`;
}

function buildDirectorPrompt({ research, style, targetDuration, language, theme = "auto", accentColor = null, accentColor2 = null }) {
  const themeBlock = themeDirective(theme, accentColor, accentColor2);
  const targetWords = budgetWords(targetDuration);

  return {
    system: `⚠️ OUTPUT LANGUAGE = ${languageName(language)}. The spoken "narration" and every "script_line" MUST be written in ${languageName(language)} — NOT English. These instructions are written in English for you, but your OUTPUT (the narration the viewer hears) is in ${languageName(language)}. (On-screen "content" text follows the LANGUAGE rule further down.) Writing the narration in the wrong language is a total failure.

You are the director of a short-form video studio that makes dense, fast-cut, subject-specific videos.
You plan the WHOLE film in one pass: the narration AND one visual per spoken beat. Script and shot list are the same artifact.

${style ? styleDirectiveBlock(style) : `## VISUAL STYLE: choose one for this video from:\n${styleMenuForDirector()}\nPick what fits the topic's tone. Lock it — every beat inherits it.`}
${themeBlock}

THE SCENE SYSTEM:
- A "beat" is one SCENE: one visual moment with words spoken over it. Divide the narration into scenes by MEANING — start a new scene wherever the idea, subject, or image should change. Let the CONTENT decide how many scenes there are and how long each runs; there is no fixed scene count and no per-scene word limit. Some scenes carry a few words, some carry a full sentence — whatever the moment needs.
- FAST PACING — EVERY scene is a DISTINCT visual, and NO visual may stay on screen longer than ~4 seconds (a longer hold is dead weight in short-form). Cut to a NEW, different visual every 2–4 seconds. That means roughly ${Math.max(3, Math.round(targetDuration / 3))} distinct visuals for this ${targetDuration}s video. Give EACH scene its OWN visual — its own image_prompt OR shot_query OR subject_entity — never let one backdrop carry several scenes.
- "continues_previous" is a RARE exception, NOT the rule: use it only when two adjacent scenes are genuinely one quick moment of the SAME visual that together last under ~4s (e.g. a two-line title landing). NEVER chain 3+ scenes onto one held visual, and never hold a single visual past ~4s. When unsure, CUT to a fresh, distinct visual — variety beats holding.
- TARGET RUNTIME ≈ ${targetDuration}s — a goal to PACE toward, not a hard cap. As a rough guide, narration runs ~145 words/minute, so ${targetDuration}s is ABOUT ${targetWords} words — use that only to gauge your pacing. Landing a little over is completely fine (a ${targetDuration}s request is happy anywhere up to ~${Math.round(targetDuration * 1.4)}s); just don't drift to roughly double the target.
- RESPECT THE NATURE OF THE TOPIC OVER THE CLOCK. Read what the topic actually IS and deliver THAT in full — the runtime bends to the content, not the reverse. Whatever the request promises by its nature (a list covers all its items, a story reaches its ending, an explainer actually explains, a comparison weighs both sides, a how-to gives every step), deliver the whole of it; if it names a quantity that's just one such promise to keep. NEVER quietly drop part of what the topic is — a point, the hook, the CTA — to save seconds. When the content is fuller than the time, make each part TIGHTER and punchier (fewer words, zero filler) so all of it still fits close to the target. A 10-second video can still carry a 5-item topic if each item is a few crisp words. PACE it down, don't CUT it down.
- Don't pad to fill time and don't ramble to sound "complete": say exactly what the topic needs, as tightly as the runtime wants, then stop. The aim is to honor BOTH the request AND a runtime near ${targetDuration}s — and when they tension, keep the content and tighten the words.
- The viewer must never rest: every scene has motion, every cut has a transition.
- Every beat's visual_concept must be DISTINCT — different subject, different compositional idea, different energy from its neighbors. Two beats that would look alike is a failure.

NARRATION — THE SINGLE MOST IMPORTANT PART. The voiceover is what the viewer HEARS; if it sounds like a list of captions being read out, the whole video fails.
- FIRST write "narration": the COMPLETE voiceover as ONE flowing piece of spoken storytelling — real, connected sentences with the natural connective tissue people actually use when they talk, IN THE OUTPUT LANGUAGE (${languageName(language)}). A narrator telling a story start to finish — NOT a slideshow of clipped phrases.
- THEN break that exact narration into beats. Each beat's script_line is a CONTIGUOUS SLICE of the narration — copy the words verbatim, in order, adding nothing and removing nothing. Concatenating every script_line in order must reproduce the narration word-for-word.
- A single sentence SPANS several beats. Within a sentence, ONLY the final beat ends with . ! or ? — every earlier beat ends on a comma, an em-dash, or nothing at all, so the speech flows straight through the visual cut with no pause.
- FORBIDDEN — headline / telegram fragments as the spoken line. script_line is SPEECH, not a caption (captions live separately in content.headline). Clipped nominal fragments and "Label: value" colon-constructions, strung together, read as dead-air bullet points — one full stop after another. The cure is real connective tissue between ideas and letting one sentence flow across several scenes, so it sounds like a person talking, not a list being read.
- The SAME rule holds in EVERY language (Hinglish included): write the way someone actually speaks that language, with its natural spoken connectors — never clipped keywords.
- Minimize colons and semicolons — TTS reads them as long pauses.
- FINAL TEST before you return: read the narration aloud in your head, end to end. It must sound like one person talking naturally. If any stretch sounds like bullet points, rewrite it into flowing sentences.

REAL SUBJECT IMAGERY:
For beats featuring a real public figure, organization, country, or landmark, set "subject_entity" to its exact Wikipedia article title (e.g. "Yogi Adityanath", "European Union", "Taj Mahal") — the pipeline fetches a REAL photo. ONLY entities that have a Wikipedia page with a photo: people, orgs, places, products. NEVER documents, laws, events, or abstract concepts. Pair it with asset_type "photo" or "cutout". Real imagery beats generated likenesses.

${languageBlock(language)}

YOU DECIDE THREE THINGS PER BEAT — source, content, and overlay-or-clean. A designer decides ALL form.

1. SOURCE (asset_type) — what raw material the beat uses:
- "none": an HTML/CSS INFORMATION FRAME. ONLY for content that IS information: a stat, a quote, a list, a title/date, a data comparison, a small chart, a CTA. NEVER for pictorial concepts — an iceberg, a ship, a crowd, a place, an animal, a person, an event are IMAGES, not HTML. If the moment can be SEEN, it is a shot, not a designed frame.
- "ai_image": a generated cinematic SHOT (full-bleed). LAST RESORT — the pipeline generates AT MOST ~2 of these per video; any extra ai_image scenes are dropped, which is why videos end up with too few distinct visuals. Use it ONLY for a truly un-photographable concept (a metaphor, an abstract idea, a dramatized moment with no real footage). If a scene shows ANYTHING real — a person, place, building, object, landscape, event — it is a real photo or stock clip, NEVER ai_image. Defaulting to ai_image for depictable subjects is a FAILURE.
- "photo": a realistic photo shot. With subject_entity set, a REAL photo of that person/org/landmark is fetched (free + strongest). Use this when SEEING that real person/org/place/landmark is the point of the beat — NOT merely because the line mentions a real name. If the beat is really about an idea, a number, or an argument that just references them, a designed frame beats a stock face.
- "cutout": the subject on transparency, composed by the designer inside a designed frame.
- "stock_video": real footage of a real-world moment (a city, a crowd, machinery, nature). Provide shot_query (concrete searchable phrase). PREFER this over ai_image for any real-world scene that footage could show.
LEAD WITH REAL IMAGERY. Faceless videos are carried by VISUALS, not UI cards — most scenes SHOW something with the spoken line as a text overlay. Each scene's visual comes from, IN STRICT PRIORITY ORDER: (1) a REAL photo of a named subject → subject_entity + asset_type "photo" (FREE, strongest); (2) real stock FOOTAGE of the scene → stock_video + a concrete shot_query (FREE); (3) only if neither can show it, ai_image (capped at ~2/video). Almost every depictable subject — people, places, buildings, objects, landscapes, events, even visual metaphors that have footage — should be (1) or (2), NOT ai_image. A topic like history, a country, a company, nature, sport is ALMOST ALL real photos + stock; if your plan has more than ~2 ai_image scenes, you've done it wrong — convert them to photo/stock_video. Reserve HTML/CSS frames (asset_type "none") for scenes whose content genuinely IS information — a stat, quote, list, chart, comparison, title, or the CTA. Aim for roughly two-thirds image-backed scenes to one-third designed frames, and give each its OWN distinct subject so consecutive scenes never look alike.

2. CONTENT — the information of the beat, as a content object. Real strings, real numbers, from the research. You provide WHAT it says, never how it looks:
"content": {
  "kind": "hook | stat | quote | list | fact | chart | title | cta | none",
  "headline": "the main line, exact text",
  "subtext": "supporting line or null",
  "items": null or ["list item", ...] or [{"label": "...", "value": "..."}] for chart,
  "attribution": "for quotes, else null"
}
- Every "none" (HTML) beat MUST have real content of an information kind — that IS the frame.
- For shot beats (ai_image/photo/stock_video), content is the typographic overlay carrying the beat's fact/stat/question over the image. MOST shots carry one.

3. OVERLAY OR CLEAN — for shot beats only: content.kind "none" means a CLEAN shot — the image alone is the statement. This is the earned exception (1-3 per video), for moments of pure atmosphere or revelation. Everything else carries content.

SHOT LANGUAGE — for ai_image and photo beats you are the cinematographer. image_prompt is a SHOT, not a description:
- Frame it like film: subject + composition + lighting + atmosphere. "The Titanic's illuminated hull cutting through black North Atlantic water at night, seen from low and close" — never "titanic ship night".
- METAPHOR is your strongest tool for abstract lines: "hundreds of glowing embers rising into pitch darkness" for lives lost beats "sad people". Use it.
- State the emotional intent in the prompt ("conveys immense scale and hopelessness") — it shapes the render.
- NEVER text-bearing objects: no documents, posters, screens, signs, stamps.
For every shot beat also choose:
- "camera": slow_zoom_in | fast_zoom_in | slow_zoom_out | pan_left | pan_right | hold — chosen by EMOTION: slow zooms for awe/somber, fast zoom for impact/shock, pans for scale/journey, hold for stillness.

SUBJECT SPECIFICITY — the difference between premium and generic:
Use the research. Reference REAL entities, REAL numbers, REAL moments. image_prompts name the actual subjects ("Stephen Colbert", not "a talk show host"). artifact contents quote real facts. Generic visuals are a failure.

IMAGE PROMPT RULE — diffusion models garble any text they try to render:
image_prompts must describe scenes WITHOUT text-bearing objects. NEVER request documents, stamps, certificates, posters, billboards, newspapers, books with visible covers, screens with UI, or signs. Describe places, people, objects, atmosphere. Anything that needs words on screen belongs in an "artifact" beat where WE render the text correctly in HTML.

NARRATIVE ARC:
- DELIVER WHAT THE REQUEST PROMISES. Whatever shape the topic asks for, the video must actually be that thing — an explainer must explain, a story must tell the story, a comparison must compare both sides, a how-to must give the steps. If it names a specific quantity (e.g. "5 facts", "3 reasons", "top 7"), cover that many distinct points — the promised count and the delivered count must match, never silently fewer. This is about honoring the user's intent, not about any one format; if time is tight, make each part terser, don't drop parts.
- Beat 0: the hook — and the hook MUST FRAME THE PREMISE, not just tease. In its opening words the viewer has to understand WHAT this video is about and WHAT they're about to get — the subject named and the promise made — so they know why they're watching. A scroll-stopping question, bold claim, or number is great, but it must land ON the topic and set up what follows (e.g. "You think you know Shiva? Here are 5 things even devotees miss" — subject + promise — NOT a bare "Have you ever wondered…?" that dangles and then jumps into content). NEVER cold-open straight into explaining/listing as if the viewer already knows the context — they don't; an unframed video that just starts spitting facts loses people. The opening line must stand on its own as a complete framing thought. If the subject is at all depictable (a person, animal, place, object, or an "X vs Y"), OPEN ON AN IMAGE of it with the framing hook overlaid — e.g. a cats topic opens on actual cats, never a bare text card. A pure-typography hook is only for genuinely abstract topics with nothing to show.
- Build: alternate substance (facts, contrasts) with personality (annotations, punches) — mostly over imagery.
- Final beat: the CTA from the research's cta_idea.

SCRIPT RULES:
- Conversational, natural spoken rhythm — the way a person actually talks, in full connected sentences. NOT clipped headline phrases.
- The script_lines must concatenate into ONE natural flowing narration (this becomes the voiceover) — see the NARRATION section above; that is the priority.
- Forbidden: "delve", "dive into", "game-changing", "revolutionary", "in today's video".

PUBLISH METADATA — this video gets posted to social platforms, so also write its post copy:
- "title": a scroll-stopping, search-friendly title for the post, ≤ 95 characters, no quotes/emojis. Specific and curiosity-driven, not clickbait fluff.
- "description": a 1-3 sentence caption that summarizes the value and invites the watch/engagement (a real caption, not the script).
- "hashtags": 5-10 relevant, specific lowercase hashtags (each starts with #, no spaces), mixing broad + niche terms for this topic.

Return ONLY valid JSON:
{
  "project_name": "short title",
  "style_id": "${style ? style.id : `one of: ${STYLE_IDS.join(" | ")}`}",
  "palette": { "bg": "#hex", "accent": "#hex", "accent2": "#hex", "text": "#hex" },
  "music_mood": "upbeat | inspiring | chill | cinematic | energetic | ambient",
  "niche": "one-word content domain for asset reuse (e.g. tech, finance, business, fitness, health, history, science, nature, lifestyle, sports, food, travel)",
  "publish": { "title": "≤95-char post title", "description": "1-3 sentence caption", "hashtags": ["#tag1", "#tag2"] },
  "narration": "the COMPLETE voiceover as ONE flowing spoken paragraph (real connected sentences, natural connectors), about ${targetWords} words total (≈${targetDuration}s at 145 wpm) — every script_line below MUST be a verbatim contiguous slice of this, in order",
  "beats": [
    {
      "beat_index": 0,
      "script_line": "this beat's spoken words — a verbatim contiguous SLICE of narration that flows from the previous beat into the next (usually a fragment, NOT a standalone caption)",
      "visual_concept": "one sentence: the intent of this moment (context for the designer)",
      "asset_type": "none",
      "content": { "kind": "hook", "headline": "...", "subtext": null, "items": null, "attribution": null },
      "continues_previous": false,
      "subject_entity": null,
      "image_prompt": null,
      "camera": null,
      "shot_query": null,
      "visual_type": "for any image/video beat, one of: concept | scene | place | object | person | texture | abstract (used to reuse matching library images)",
      "keywords": ["2-4 concrete lowercase nouns describing what the visual shows — used to match/reuse library images"],
      "transition_out": "zoom"
    }
  ]
}`,
    user: `RESEARCH BRIEF:
${JSON.stringify(research, null, 2)}

TARGET DURATION: ${targetDuration} seconds of spoken narration.
OUTPUT LANGUAGE: write the narration and every script_line in ${languageName(language)} (the research above is in English — translate/retell it; do NOT output English narration unless the language IS English).

Write the flowing narration for this runtime, then direct the film scene by scene.`,
  };
}

export async function directBeats({ research, styleId, targetDuration = 45, language = "en", theme = "auto", accentColor = null, accentColor2 = null }) {
  const style = styleId && styleId !== "auto" ? STYLE_PRESETS[styleId] : null;
  const prompt = buildDirectorPrompt({ research, style, targetDuration, language, theme, accentColor, accentColor2 });

  let plan;
  try {
    plan = await runDirectorCompletion(prompt);
  } catch (e) {
    throw new Error(`beat director returned invalid JSON: ${e.message}`);
  }

  // RUNTIME SAFETY NET — only catches an EGREGIOUS overrun (roughly double the target), never
  // routine "a bit long". LLMs can't feel speaking time, so if a draft is way past the runtime we
  // re-ask ONCE or twice to TIGHTEN — but the regen keeps EVERY requested point (facts, hook, CTA)
  // and only cuts filler words, so it never drops the content the user asked for and never trims
  // the script in code (that lops off the ending). A draft within the generous band is accepted.
  const targetWords = budgetWords(targetDuration);
  const ACCEPT_WORDS = Math.round(targetWords * 1.6); // ~1.6× ≈ comfortably within the "a bit over is fine" band
  for (let attempt = 1; attempt <= 2; attempt++) {
    const words = narrationWordCount(plan);
    const estSeconds = Math.round((words / WORDS_PER_MINUTE) * 60);
    if (words <= ACCEPT_WORDS) break; // within the generous band — accept, do not meddle
    console.warn(`[ai-video/director] draft ${words}w ≈ ${estSeconds}s >> target ${targetDuration}s (band ≤ ${ACCEPT_WORDS}w) — tighten regen ${attempt}/2`);
    try {
      const tighter = await runDirectorCompletion(prompt,
        `RUNTIME — your narration is ${words} words ≈ ${estSeconds} seconds, which is far over the ~${targetDuration}-second target. TIGHTEN it (same JSON schema): keep EVERY point the topic calls for — the hook, every requested fact/item, and the CTA — but make each line punchier by cutting filler words and shortening phrasing, so the whole thing lands closer to ${targetDuration}s (≈${targetWords} words is the guide). Do NOT drop any requested point and do NOT add new ones. Keep it ONE flowing, naturally-spoken narration with real connectors — never clipped headline fragments.`);
      if (Array.isArray(tighter?.beats) && tighter.beats.length >= 3 && narrationWordCount(tighter) < words) plan = tighter;
      else break; // no usable improvement — keep the best we have
    } catch { break; }
  }

  // ── Validation — structure is code's job, not the model's ────────────────
  const resolvedStyle = STYLE_PRESETS[plan.style_id] ?? style ?? STYLE_PRESETS.editorial_retro;

  const palette = plan.palette ?? {};
  palette.bg      = normalizeHex(palette.bg, "#07080f");
  palette.accent  = ensureVividAccent(normalizeHex(palette.accent, "#f59e0b"), "#f59e0b");
  palette.accent2 = ensureVividAccent(normalizeHex(palette.accent2, "#38bdf8"), "#38bdf8");
  palette.text    = normalizeHex(palette.text, "#ffffff");

  // Deterministic theme: lock the family field + text to the chosen theme (each beat still
  // varies WITHIN the family). Accent stays GPT's unless the user pinned one.
  const themePalette = resolveThemePalette(theme, accentColor);
  if (themePalette) {
    palette.bg     = themePalette.background;
    palette.text   = themePalette.primaryText;
    if (accentColor) palette.accent = accentColor;
  }
  // A user-pinned secondary accent wins over the GPT/topic-derived accent2 (kept otherwise).
  if (accentColor2) palette.accent2 = accentColor2;
  palette.theme = themePalette ? theme : "auto"; // carried into the per-beat design prompts

  let beats = Array.isArray(plan.beats) ? plan.beats : [];
  // MIN_BEATS is a soft *target* (density is the style); only fail if there are too
  // few beats to make a video at all. A 7-beat plan is fine — don't abort the run.
  const HARD_FLOOR = 4;
  if (beats.length < HARD_FLOOR) throw new Error(`beat director planned only ${beats.length} beats (need at least ${HARD_FLOOR})`);
  if (beats.length < MIN_BEATS) console.warn(`[ai-video/director] ${beats.length} beats — under soft target ${MIN_BEATS}, accepting`);
  if (beats.length > MAX_BEATS) beats = beats.slice(0, MAX_BEATS);

  let sameTypeRun = 0;
  beats = beats.map((b, i) => {
    let assetType = ASSET_TYPES.includes(b.asset_type) ? b.asset_type : "none";
    const continues = b.continues_previous === true && i > 0;

    // Asset grounding: image-backed types need their request fields
    if (["ai_image", "photo"].includes(assetType) && !b.image_prompt && !b.subject_entity) assetType = "none";
    if (assetType === "cutout" && !b.image_prompt && !b.subject_entity) assetType = "none";
    if (assetType === "stock_video" && !b.shot_query) assetType = "none";

    // Rhythm: never more than 2 consecutive beats of the same asset type
    if (!continues && i > 0 && beats[i - 1]._assetType === assetType) {
      sameTypeRun++;
      if (sameTypeRun >= 2) {
        // Break the run with REAL imagery first, never paid generation: "photo"
        // resolves stock-first (entity→stock→library→generate), so ai_image stays a
        // true last resort and only within budget. Flipping to ai_image here would
        // force a paid conceptual render purely for rhythm — against source priority.
        assetType = assetType === "none" ? "photo" : "none";
        if (assetType === "photo" && !b.image_prompt) b.image_prompt = b.visual_concept ?? "";
        sameTypeRun = 0;
      }
    } else if (!continues) {
      sameTypeRun = 0;
    }
    b._assetType = assetType;

    // Spoken line is kept verbatim — no word cap (that flattened speech into headlines).
    // Length follows meaning; a too-long single visual is split later in the pipeline.
    const line = (b.script_line ?? "").trim();

    let transition = TRANSITIONS.includes(b.transition_out) ? b.transition_out : resolvedStyle.motion.transitions[i % resolvedStyle.motion.transitions.length];
    if (i === beats.length - 1) transition = "none";

    // Content contract: HTML beats MUST carry information content; shot
    // beats may carry overlay content or be explicitly clean (kind "none")
    const CONTENT_KINDS = ["hook", "stat", "quote", "list", "fact", "chart", "title", "cta", "none"];
    const raw = b.content ?? {};
    let content = {
      kind:        CONTENT_KINDS.includes(raw.kind) ? raw.kind : "none",
      headline:    typeof raw.headline === "string" ? raw.headline.trim().slice(0, 80) : "",
      subtext:     typeof raw.subtext === "string" && raw.subtext.trim() ? raw.subtext.trim().slice(0, 110) : null,
      items:       Array.isArray(raw.items) ? raw.items.slice(0, 6) : null,
      attribution: typeof raw.attribution === "string" && raw.attribution.trim() ? raw.attribution.trim().slice(0, 50) : null,
    };
    if (assetType === "none" && (content.kind === "none" || !content.headline)) {
      // An information frame without information — derive a title from the spoken line, UNLESS
      // that line is non-Latin (e.g. Devanagari Hindi): on-screen fonts are Latin-only, so a
      // Devanagari headline would render as boxes. In that case leave it for the design to
      // handle from whatever Latin content exists rather than create tofu.
      if (!hasNonLatinScript(line)) {
        content = { kind: "title", headline: line.replace(/[.?!]$/, "").split(/\s+/).slice(0, 7).join(" "), subtext: null, items: null, attribution: null };
      }
    }
    if (content.kind !== "none" && !content.headline) content.kind = "none";

    // Library-reuse metadata (visual_type + keywords) — GPT-supplied, with fallbacks.
    const VTYPES = ["concept", "scene", "place", "object", "person", "texture", "abstract"];
    const visual_type = VTYPES.includes(b.visual_type) ? b.visual_type
      : assetType === "ai_image" ? "concept" : assetType === "cutout" ? "person" : "scene";
    const keywords = (Array.isArray(b.keywords) && b.keywords.length)
      ? b.keywords.filter(k => typeof k === "string").map(k => k.toLowerCase().trim()).filter(Boolean).slice(0, 4)
      : `${b.shot_query ?? ""} ${b.image_prompt ?? b.visual_concept ?? ""}`
          .toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3).slice(0, 4);

    return {
      beat_index:     i,
      script_line:    line,
      asset_type:     assetType,
      content,
      continues_previous: continues,
      subject_entity: typeof b.subject_entity === "string" && b.subject_entity.trim() ? b.subject_entity.trim().slice(0, 60) : null,
      visual_concept: b.visual_concept ?? "",
      image_prompt:   ["ai_image", "photo", "cutout"].includes(assetType) ? (b.image_prompt ?? b.visual_concept ?? "") : null,
      camera:         ["ai_image", "photo", "stock_video"].includes(assetType)
        ? (CAMERAS.includes(b.camera) ? b.camera : "slow_zoom_in")
        : null,
      shot_query:     assetType === "stock_video" ? (b.shot_query ?? "") : null,
      visual_type,
      keywords,
      transition_out: transition,
    };
  });
  beats.forEach(b => delete b._assetType);

  // Re-slice the director's flowing narration verbatim across the beats so the concatenated
  // voiceover IS that narration (flowing speech, not a list of headline fragments). No-ops if
  // the model didn't return a usable narration field — then the per-beat lines stand as-is.
  reconcileNarrationToBeats(beats, plan.narration);

  // Niche — one stable domain per video, used for library-image reuse matching.
  const niche = ((typeof plan.niche === "string" && plan.niche.trim()) ? plan.niche.trim().toLowerCase().split(/\s+/)[0] : "")
    || (research.topic ? research.topic.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3)[0] : "")
    || "general";
  beats.forEach(b => { b.niche = niche; });

  const result = {
    project_name: plan.project_name || research.topic?.slice(0, 60) || "Prompt Video",
    style:        resolvedStyle,
    palette,
    niche,
    music_mood:   ["upbeat", "inspiring", "chill", "cinematic", "energetic", "ambient"].includes(plan.music_mood) ? plan.music_mood : "upbeat",
    beats,
  };

  // Publish copy for social posting — title / caption / hashtags (normalized, with fallbacks).
  const pub = plan.publish || {};
  result.publish = {
    title: String(pub.title || result.project_name || "").trim().slice(0, 95),
    description: String(pub.description || "").trim().slice(0, 4500),
    hashtags: Array.isArray(pub.hashtags)
      ? [...new Set(pub.hashtags.map((h) => "#" + String(h).replace(/^#+/, "").replace(/\s+/g, "").toLowerCase()).filter((h) => h.length > 1))].slice(0, 10)
      : [],
  };

  console.log(`[ai-video/director] ${beats.length} beats, style=${resolvedStyle.id} — assets: ${beats.map(b => b.asset_type).join(",")}`);
  return result;
}
