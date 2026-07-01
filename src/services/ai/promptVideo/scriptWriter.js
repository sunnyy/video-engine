/**
 * scriptWriter.js
 * src/services/ai/promptVideo/scriptWriter.js
 *
 * Stage 1a — THE WRITER. Turns the research brief into the spoken narration and the per-beat
 * WORDS + on-screen CONTENT. It owns the script; it makes NO visual/asset/style decisions — that
 * is the Art-Director's job (stage 1b). Splitting the old single "director" call in two gives each
 * call one focused job, so the writing stays great AND the visual direction gets full attention.
 *
 * Output beats carry only: script_line (verbatim slice of the narration, for TTS), visual_concept
 * (free-form intent of the moment — context for the art-director), content (the exact on-screen
 * text), continues_previous. Plus project_name, niche, music_mood, publish copy.
 *
 * The narration logic (write-as-prose then re-slice verbatim across beats), the runtime-fit regen,
 * and the content normalization are lifted from the previous beatDirector.js unchanged in spirit.
 */
import { openai } from "../../../server/middleware/shared.js";

const WRITER_MODEL = "gpt-4.1";

const MIN_BEATS = 6, MAX_BEATS = 48;
const wordsIn = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

// Duration control: make GPT PLAN a word budget BEFORE writing (outline + per-section allocation, in
// the same completion) — it holds a budget far better after committing to a plan. No regen, no code
// truncation. The ceiling is EFFECTIVE, calibrated from real runs: our voice measures ~119 wpm AND
// GPT overshoots its stated ceiling ~15–20%, so the ceiling we hand it is set BELOW the raw pace-budget
// (≈105 wpm-equivalent) so the ACTUAL narration lands on the target duration, not the stated number.
const WORDS_PER_MINUTE = 105;
const budgetWords = (seconds) => Math.round(seconds * WORDS_PER_MINUTE / 60);
const sceneCount   = (seconds) => Math.max(4, Math.round(seconds / 3.75));

// The voiceover is the beats' script_lines concatenated. Author the whole narration as prose, then
// re-slice THAT verbatim across the beats (by each beat's own line length) so the joined lines ==
// the narration word-for-word — flowing speech, not headline fragments. No-ops when inconsistent.
function reconcileNarrationToBeats(beats, narration) {
  const narr = String(narration || "").trim();
  if (!narr || !beats?.length) return;
  const narrTokens = narr.split(/\s+/).filter(Boolean);
  if (narrTokens.length < 4) return;

  const beatWords = beats.map(b => wordsIn(b.script_line));
  const totalBeatWords = beatWords.reduce((a, n) => a + n, 0);
  if (totalBeatWords < 1) return;

  const ratio = narrTokens.length / totalBeatWords;
  if (ratio < 0.45 || ratio > 2.5) {
    console.warn(`[ai-video/writer] narration/beat word ratio ${ratio.toFixed(2)} out of range — keeping per-beat lines`);
    return;
  }

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

function languageName(language) {
  if (language === "hi" || language === "hinglish") return "HINDI (Devanagari script)";
  if (language === "es") return "SPANISH";
  if (language === "en") return "ENGLISH";
  return String(language || "ENGLISH").toUpperCase();
}

function languageBlock(language) {
  if (language === "en") return "LANGUAGE: English.";
  if (language === "hinglish" || language === "hi") {
    return `LANGUAGE — STRICT: HINDI in DEVANAGARI for BOTH the spoken script AND the on-screen text:
- SPOKEN — "narration" and every "script_line": conversational Hindi WRITTEN IN DEVANAGARI. Keep the natural casual flow; you MAY leave genuine English/brand/tech terms or acronyms in Latin where a speaker truly says them in English (e.g. "AI", "iPhone", "reels") — but ALL Hindi words MUST be Devanagari, never romanized. Romanized Hindi is a FAILURE (the voice mispronounces it).
- ON-SCREEN — the "content" fields (headline/subtext/items/attribution): SHORT, punchy Hindi IN DEVANAGARI (a few words, NOT full sentences). Genuine English/brand terms or numbers may stay Latin. Do NOT romanize Hindi on screen.`;
  }
  return `LANGUAGE — STRICT: Every script_line must be written in ${language}. content strings may use short Latin-script keywords.`;
}

function buildWriterPrompt({ research, targetDuration, language }) {
  const targetWords = budgetWords(targetDuration);
  const scenes      = sceneCount(targetDuration);
  return {
    system: `⚠️ OUTPUT LANGUAGE = ${languageName(language)}. The spoken "narration" and every "script_line" MUST be written in ${languageName(language)} — NOT English. These instructions are in English for you, but your OUTPUT (the narration the viewer hears) is in ${languageName(language)}. Writing it in the wrong language is a total failure.

━━━━━━ HARD CONSTRAINT #1 — RUNTIME (READ FIRST, NON-NEGOTIABLE) ━━━━━━
This video is EXACTLY ${targetDuration} SECONDS long. Spoken aloud, that is at MOST ${targetWords} words TOTAL — a hard ceiling, not a target to beat. ${targetDuration}s is SHORT: about ${scenes} quick scenes. Exceeding ${targetWords} words FAILS the task — the video would run long.
You MUST budget BEFORE you write: in the "plan" field, allocate the ${targetWords} words across your scenes (hook + each beat + CTA) so the total is ≤ ${targetWords}. Then write the narration to that plan. Do NOT write first and hope it fits.

You are the WRITER of a short-form video studio. You write the narration and break it into beats — one spoken beat per visual moment. You do NOT decide visuals, images, colors, or style — a separate art-director does that. Your job is the WORDS: the spoken script and the short on-screen text per beat.

INPUTS — IN PRIORITY ORDER:
1. THE ORIGINAL VIDEO REQUEST is the SOURCE OF TRUTH for the video's subject, framing, and promise. The hook and the narrative follow THIS.
2. THE RESEARCH BRIEF is supporting factual material ONLY — entities, facts, examples, options. It does NOT decide the hook, the opening, or the narrative order, and a detail being in the research does NOT make it the subject. If the research points to a narrower interpretation than the request, follow the REQUEST.

━━━ STEP 1 — UNDERSTAND THE REQUEST, THEN WRITE TO IT ━━━
Before writing, actually READ and INTERPRET the request the way a sharp creator would. Fill the "interpretation" object FIRST and let it drive the whole script. Don't match a template — think about THIS specific topic:

1. WHAT IS IT REALLY ASKING FOR, AND IN WHAT VOICE? Read the wording, framing, and punctuation literally. Is it a question, a bold claim, a suspenseful "what if", a countdown, a reveal, a story, a head-on explainer? Write in THAT voice and honor THAT form. Crucially, PRESERVE the topic's own register — a question stays questioning and open, suspense stays suspenseful, a claim stays bold; never flatten the framing (a question must NOT collapse into a flat declaration of the same words). And honor the form's mode of delivery: a scenario is PERFORMED as it unfolds — in scene, as if it's happening — not described from the outside; a listicle covers its items; an explainer teaches. Mismatching the topic's voice or form is the worst thing you can do.

2. WHAT DID THE TITLE PROMISE? The topic is a promise to the viewer. Deliver exactly that payoff, with its framing intact. Never debunk, soften, or argue against your own premise — that betrays the click.

3. NOW BUILD THE HOOK — reason to it in three quick steps and record them in "interpretation":
   a) subject_and_scope — in one line, what is this video REALLY about at its FULLEST scope? Name the big thing, not a sub-detail: a single specific example, place, or moment is only where the topic might START, never the whole of what it's ABOUT. And separate the SUBJECT from the METHOD: a presentation/format word in the topic (e.g. "AI simulates", "explained", "a breakdown", "ranked", "in 60 seconds") is HOW the video is shown, NOT its subject — the subject is the real thing itself. Never let the method become the subject, and never open the hook on the method ("what if an AI could simulate…") instead of the real stakes.
   b) topic_voice — what register does the request itself carry: a question, suspense, a bold claim, a countdown, a reveal? Name it.
   c) hook_line — the actual opening spoken sentence. It must be SHORT AND PUNCHY: ONE breath, roughly 5–9 words, that lands in ~2–3 seconds. Do NOT cram two questions or two clauses into it (e.g. NOT "What if WW3 started tomorrow—how would the next 30 days unfold?"; instead just "What if World War 3 started tomorrow?"). Build it on the SAME central subject the REQUEST names; do NOT swap that subject for one example, place, person, company, cause, or incident unless that specific thing is already in the request. Establish WHAT the video is about BEFORE revealing WHY or HOW it happens — grip through CURIOSITY, not premature specificity. If the request leaves something OPEN (an "if X", a secret, someone, a country, a company), PRESERVE that ambiguity in the hook; never invent a concrete detail just to make the opening feel specific. Don't merely restate the title verbatim.
   Then the narration OPENS with this hook_line as its very first sentence. The hook comes FIRST; only AFTER it do the concrete specifics begin to unfold (the timeline, the first item, the answer, the named details). Never let the first concrete detail double as the hook — the scope-setting hook precedes it. NEVER ASSUME missing information: if the request intentionally omits a detail, keep it open until it naturally unfolds later.

(Research may include a "format" directive and concrete anchors — strong raw material, but YOU judge the topic from its actual wording.)

THE BEAT SYSTEM:
- A "beat" is one spoken moment that will get its own visual. Divide the narration into beats by MEANING — a new beat wherever the idea, subject, or moment should change. Let the CONTENT decide how many beats and how long each runs; no fixed count, no per-beat word limit.
- FAST PACING — short-form cuts every ~2–4 seconds, so aim for roughly ${Math.max(3, Math.round(targetDuration / 3))} beats for this ${targetDuration}s video. Each beat is a DISTINCT moment.
- "continues_previous" is a RARE exception (two adjacent beats that are one quick moment together under ~4s, e.g. a two-line title landing). Default false.
- RUNTIME — obey HARD CONSTRAINT #1 at the top: the whole narration is ≤ ${targetWords} words (${targetDuration}s), planned via "plan.word_budget" before writing. Beat LENGTH stays natural (one beat may be 4 words, another 14 — whatever the moment needs); it's the TOTAL that's capped. A shorter runtime means fewer scenes and tighter lines, never the same script crammed. Don't UNDER-write either — use most of the ${targetWords} words.
- RESPECT THE TOPIC OVER THE CLOCK: deliver what the topic IS in full — a list covers all its items, a story reaches its ending, a comparison weighs both sides, a how-to gives every step. If it names a quantity, cover that many. NEVER silently drop a point, the hook, or the CTA to save seconds. When fuller than the time, make each part TIGHTER, don't cut it.

NARRATION — THE SINGLE MOST IMPORTANT PART. The voiceover is what the viewer HEARS; if it sounds like a list of captions read out, the whole video fails.
- FIRST write "narration": the COMPLETE voiceover as ONE flowing piece of spoken storytelling — real connected sentences with natural connective tissue, IN ${languageName(language)}. A narrator telling a story start to finish — NOT a slideshow of clipped phrases.
- Its FIRST sentence IS your interpretation.hook_line — the scope-setting hook in the topic's voice. The body (the "Day 1…" timeline / first item / answer) begins only AFTER that opening sentence, never as it.
- THEN break that exact narration into beats. Each beat's script_line is a CONTIGUOUS SLICE — copy the words verbatim, in order. Concatenating every script_line must reproduce the narration word-for-word.
- A single sentence SPANS several beats. Within a sentence, ONLY the final beat ends with . ! or ? — earlier beats end on a comma, em-dash, or nothing, so speech flows straight through each cut.
- FORBIDDEN — headline/telegram fragments as the spoken line. script_line is SPEECH, not a caption (captions live in content.headline). No "Label: value" colon strings. Use real connectors so it sounds like a person talking.
- Minimize colons/semicolons (TTS reads them as long pauses).
- FINAL TEST: read the narration aloud in your head — it must sound like one person talking naturally.

PER-BEAT ON-SCREEN CONTENT — the short text shown on screen (the art-director decides how it LOOKS; you decide WHAT it says). It MUST VARY in shape beat to beat. Stamping the SAME "Title + supporting line" on every beat is the #1 cause of a slideshow — DO NOT do it. Pick the shape that fits each moment and make it CONCRETE from the research:
"content": {
  "kind": "hook | stat | quote | list | fact | title | cta | none",
  "headline": "the main on-screen line, exact text",
  "subtext": "supporting line or null",
  "items": null or ["real item", "real item", ...],
  "attribution": "for quotes, else null"
}
- VARY THE SHAPE across the video — rotate intentionally between: a real STAT (a number/date IS the headline, e.g. "476 AD", "3 continents", "26 emperors in 50 years"); a real LIST (items[] of ≥2 real named things, e.g. ["Visigoths","Vandals","Huns"]); a QUOTE (+ attribution); a single PUNCHY word/phrase (headline only, subtext null); a clean NO-TEXT beat (kind "none", headline ""). Use 2-3 clean beats across the video — they earn impact.
- HONEST KINDS — the kind must MATCH the content: "stat" ONLY with an actual number; "list" ONLY with items[] of ≥2 real items; "quote" ONLY with a real quote. If it's none of those, use "fact"/"title"/"hook"/"cta" with a headline (+ optional subtext). Never tag "stat" or "list" without the real number/items.
- HEADLINE-ONLY is often stronger — set subtext null unless it adds real, new information. Do NOT add a supporting line to every beat.
- USE REAL SPECIFICS from the research — numbers, dates, names. Generic labels ("Political Instability") are weak; specifics ("26 emperors murdered in 50 years") are strong.
- visual_concept: ONE plain sentence naming the SUBJECT of the moment (e.g. "the Colosseum, monumental and decaying") — context for the art-director. Concrete subject; no colours/layout.

NARRATIVE ARC:
- Beat 0 carries interpretation.hook_line verbatim — the scope-setting hook in the topic's voice, the first words the viewer HEARS. It must NOT open on a narrow sub-detail (a single place/event), and the scope must live in the SPOKEN line, not only the on-screen caption. Only after it does the body begin (beat 1+ deliver the scenario/answer/first item) — no slow generic setup.
- Build: alternate substance with personality. Final beat: a closing/CTA that YOU choose to fit the topic and its ending — a question back to the viewer, a takeaway, or a follow prompt. If the topic left something open (see the research's open_questions), you may land on that intrigue rather than resolving it.

SCRIPT RULES:
- Conversational, natural spoken rhythm — full connected sentences, not clipped phrases.
- Forbidden words: "delve", "dive into", "game-changing", "revolutionary", "in today's video".

${languageBlock(language)}

PUBLISH METADATA — this gets posted to social, so also write post copy:
- "title": scroll-stopping, search-friendly, ≤ 95 chars, no quotes/emojis.
- "description": a 1-3 sentence caption (a real caption, not the script).
- "hashtags": 5-10 specific lowercase hashtags (each starts with #, no spaces).

Return ONLY valid JSON:
{
  "interpretation": {
    "subject_and_scope": "one line: what this video is REALLY about at its FULLEST scope — the big thing, never a narrow sub-detail or single example",
    "topic_voice": "the register the request itself carries — question | suspense | bold claim | countdown | reveal | explainer",
    "viewer_promise": "the exact payoff the viewer clicked for — what this script MUST deliver",
    "hook_line": "the actual opening spoken sentence — SHORT and punchy (ONE breath, ~5–9 words, lands in ~2–3s; never two clauses/questions crammed together). Expresses subject_and_scope in topic_voice, grips instantly, does NOT open on a narrow sub-detail or restate the title. The narration begins with this sentence."
  },
  "plan": {
    "runtime_seconds": ${targetDuration},
    "word_ceiling": ${targetWords},
    "word_budget": [ { "part": "hook", "words": 0 }, { "part": "beat 1", "words": 0 }, "…one entry per scene, ending with a short CTA — allocate ALL the words here BEFORE writing the narration…" ],
    "planned_total": "the SUM of word_budget — it MUST be ≤ ${targetWords} words; if your outline exceeds it, cut scenes or shorten lines until it fits"
  },
  "project_name": "short title",
  "music_mood": "upbeat | inspiring | chill | cinematic | energetic | ambient — MUST match the SUBJECT'S FEELING, not just the tone label: dramatic/serious/somber → cinematic; fun/playful/satirical → upbeat or energetic; calm/reflective/explainer → chill or ambient; motivational → inspiring. A HEAVY, TIRING, STRESSFUL or SAD subject (e.g. burnout, decline, loss) → chill/ambient or cinematic, NEVER upbeat. Do NOT default to upbeat.",
  "niche": "one-word content domain for asset reuse (e.g. tech, finance, history, science, nature, lifestyle, sports, food, travel)",
  "publish": { "title": "≤95-char post title", "description": "1-3 sentence caption", "hashtags": ["#tag1", "#tag2"] },
  "narration": "the COMPLETE voiceover as ONE flowing spoken paragraph — write it TO YOUR plan.word_budget above, so its total stays ≤ ${targetWords} words (≈${targetDuration}s). Real connected sentences, tight and punchy; every script_line below MUST be a verbatim contiguous slice of this, in order",
  "beats": [
    {
      "beat_index": 0,
      "script_line": "this beat's spoken words — a verbatim contiguous SLICE of narration (usually a fragment, NOT a standalone caption)",
      "visual_concept": "one plain sentence: what this moment is ABOUT (the subject), for the art-director",
      "content": { "kind": "hook", "headline": "...", "subtext": null, "items": null, "attribution": null },
      "continues_previous": false
    }
  ]
}`,
    user: `ORIGINAL VIDEO REQUEST (the SOURCE OF TRUTH — the hook, subject, and framing follow THIS, not the research):
"${research.request || research.topic || ""}"

RESEARCH BRIEF (supporting facts/examples/options ONLY — it does NOT dictate the hook or the opening; if it narrows the request, follow the request):
${JSON.stringify(research, null, 2)}

TARGET DURATION: ${targetDuration} seconds of spoken narration.
OUTPUT LANGUAGE: write the narration and every script_line in ${languageName(language)} (the research above is in English — translate/retell it).

Write the flowing narration for this runtime, then break it into beats with their on-screen content.`,
  };
}

async function runWriterCompletion(prompt, extraUser = "") {
  const response = await openai.chat.completions.create({
    model: WRITER_MODEL,
    max_tokens: 8000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user",   content: extraUser ? `${prompt.user}\n\n${extraUser}` : prompt.user },
    ],
  });
  return JSON.parse(response.choices[0].message.content);
}

const CONTENT_KINDS = ["hook", "stat", "quote", "list", "fact", "chart", "title", "cta", "none"];

// Fallback music mood derived from the research tone (so a dramatic topic never defaults to upbeat).
function moodFromTone(tone = "") {
  const t = String(tone).toLowerCase();
  if (/dramat|serious|somber|dark|tense|epic|tragic/.test(t)) return "cinematic";
  if (/calm|reflect|gentle|soothing|peace/.test(t))           return "chill";
  if (/inspir|motivat|uplift|hope/.test(t))                   return "inspiring";
  return "upbeat";
}

/**
 * writeScript({ research, targetDuration, language }) →
 *   { project_name, niche, music_mood, publish, narration, beats:[{ beat_index, script_line,
 *     visual_concept, content, continues_previous }] }
 */
export async function writeScript({ research, targetDuration = 45, language = "en" }) {
  const prompt = buildWriterPrompt({ research, targetDuration, language });

  let plan;
  try { plan = await runWriterCompletion(prompt); }
  catch (e) { throw new Error(`script writer returned invalid JSON: ${e.message}`); }

  // ONE pass — no word-budget, no draft/tighten/expand regen. The writer is simply told the video's
  // length and roughly how many short scenes fit, and writes to it. (Re-asking GPT to "tighten" barely
  // changed the length and burned extra calls — the clear up-front instruction is what holds duration.)
  const words = String(plan?.narration || "").trim().split(/\s+/).filter(Boolean).length;
  console.log(`[ai-video/writer] ${(plan?.beats || []).length} scenes, ${words} words for a ${targetDuration}s video`);

  let beats = Array.isArray(plan.beats) ? plan.beats : [];
  const HARD_FLOOR = 4;
  if (beats.length < HARD_FLOOR) throw new Error(`script writer planned only ${beats.length} beats (need at least ${HARD_FLOOR})`);
  if (beats.length < MIN_BEATS) console.warn(`[ai-video/writer] ${beats.length} beats — under soft target ${MIN_BEATS}, accepting`);
  if (beats.length > MAX_BEATS) beats = beats.slice(0, MAX_BEATS);

  beats = beats.map((b, i) => {
    const continues = b.continues_previous === true && i > 0;
    const line = (b.script_line ?? "").trim();

    const raw = b.content ?? {};
    let content = {
      kind:        CONTENT_KINDS.includes(raw.kind) ? raw.kind : "none",
      headline:    typeof raw.headline === "string" ? raw.headline.trim().slice(0, 80) : "",
      subtext:     typeof raw.subtext === "string" && raw.subtext.trim() ? raw.subtext.trim().slice(0, 110) : null,
      items:       Array.isArray(raw.items) ? raw.items.slice(0, 6) : null,
      attribution: typeof raw.attribution === "string" && raw.attribution.trim() ? raw.attribution.trim().slice(0, 50) : null,
    };
    if (content.kind !== "none" && !content.headline) content.kind = "none";

    return {
      beat_index:         i,
      script_line:        line,
      visual_concept:     b.visual_concept ?? "",
      content,
      continues_previous: continues,
    };
  });

  // Re-slice the flowing narration verbatim across the beats so the voiceover IS that narration.
  reconcileNarrationToBeats(beats, plan.narration);

  const niche = ((typeof plan.niche === "string" && plan.niche.trim()) ? plan.niche.trim().toLowerCase().split(/\s+/)[0] : "")
    || (research.topic ? research.topic.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3)[0] : "")
    || "general";

  const pub = plan.publish || {};
  const publish = {
    title:       String(pub.title || plan.project_name || "").trim().slice(0, 95),
    description: String(pub.description || "").trim().slice(0, 4500),
    hashtags: Array.isArray(pub.hashtags)
      ? [...new Set(pub.hashtags.map((h) => "#" + String(h).replace(/^#+/, "").replace(/\s+/g, "").toLowerCase()).filter((h) => h.length > 1))].slice(0, 10)
      : [],
  };

  const interp = (plan.interpretation && typeof plan.interpretation === "object") ? plan.interpretation : {};
  const finalWords = String(plan.narration || "").trim().split(/\s+/).filter(Boolean).length;
  console.log(`[ai-video/writer] ${beats.length} beats, ${finalWords}w narration (budget ${budgetWords(targetDuration)}w for ${targetDuration}s) — voice: ${interp.topic_voice || "?"} | hook: ${String(interp.hook_line || "").slice(0, 80)}`);
  return {
    project_name: plan.project_name || research.topic?.slice(0, 60) || "Prompt Video",
    niche,
    music_mood: ["upbeat", "inspiring", "chill", "cinematic", "energetic", "ambient"].includes(plan.music_mood) ? plan.music_mood : moodFromTone(research.tone),
    publish,
    interpretation: interp,
    narration: String(plan.narration || ""),
    beats,
  };
}
