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

// Fixed assumed speaking pace → a TOTAL word budget per runtime (the lever that holds duration).
const WORDS_PER_MINUTE = 145;
const budgetWords = (seconds) => Math.round(seconds * WORDS_PER_MINUTE / 60);
const narrationWordCount = (plan) =>
  wordsIn(plan?.narration) ||
  (Array.isArray(plan?.beats) ? plan.beats.reduce((n, b) => n + wordsIn(b.script_line), 0) : 0);

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
  return {
    system: `⚠️ OUTPUT LANGUAGE = ${languageName(language)}. The spoken "narration" and every "script_line" MUST be written in ${languageName(language)} — NOT English. These instructions are in English for you, but your OUTPUT (the narration the viewer hears) is in ${languageName(language)}. Writing it in the wrong language is a total failure.

You are the WRITER of a short-form video studio. You write the narration and break it into beats — one spoken beat per visual moment. You do NOT decide visuals, images, colors, or style — a separate art-director does that. Your job is the WORDS: the spoken script and the short on-screen text per beat.

THE BEAT SYSTEM:
- A "beat" is one spoken moment that will get its own visual. Divide the narration into beats by MEANING — a new beat wherever the idea, subject, or moment should change. Let the CONTENT decide how many beats and how long each runs; no fixed count, no per-beat word limit.
- FAST PACING — short-form cuts every ~2–4 seconds, so aim for roughly ${Math.max(3, Math.round(targetDuration / 3))} beats for this ${targetDuration}s video. Each beat is a DISTINCT moment.
- "continues_previous" is a RARE exception (two adjacent beats that are one quick moment together under ~4s, e.g. a two-line title landing). Default false.
- TARGET RUNTIME ≈ ${targetDuration}s — a goal to PACE toward, not a hard cap. Narration runs ~145 wpm, so ${targetDuration}s ≈ ${targetWords} words. A little over is fine (happy up to ~${Math.round(targetDuration * 1.4)}s); don't drift to ~double.
- RESPECT THE TOPIC OVER THE CLOCK: deliver what the topic IS in full — a list covers all its items, a story reaches its ending, a comparison weighs both sides, a how-to gives every step. If it names a quantity, cover that many. NEVER silently drop a point, the hook, or the CTA to save seconds. When fuller than the time, make each part TIGHTER, don't cut it.

NARRATION — THE SINGLE MOST IMPORTANT PART. The voiceover is what the viewer HEARS; if it sounds like a list of captions read out, the whole video fails.
- FIRST write "narration": the COMPLETE voiceover as ONE flowing piece of spoken storytelling — real connected sentences with natural connective tissue, IN ${languageName(language)}. A narrator telling a story start to finish — NOT a slideshow of clipped phrases.
- THEN break that exact narration into beats. Each beat's script_line is a CONTIGUOUS SLICE — copy the words verbatim, in order. Concatenating every script_line must reproduce the narration word-for-word.
- A single sentence SPANS several beats. Within a sentence, ONLY the final beat ends with . ! or ? — earlier beats end on a comma, em-dash, or nothing, so speech flows straight through each cut.
- FORBIDDEN — headline/telegram fragments as the spoken line. script_line is SPEECH, not a caption (captions live in content.headline). No "Label: value" colon strings. Use real connectors so it sounds like a person talking.
- Minimize colons/semicolons (TTS reads them as long pauses).
- FINAL TEST: read the narration aloud in your head — it must sound like one person talking naturally.

PER-BEAT ON-SCREEN CONTENT — the short text shown on screen for the beat (the art-director decides how it looks). Real strings, real numbers, from the research:
"content": {
  "kind": "hook | stat | quote | list | fact | chart | title | cta | none",
  "headline": "the main on-screen line, exact text (a few words, not a sentence)",
  "subtext": "supporting line or null",
  "items": null or ["list item", ...] or [{"label":"...","value":"..."}] for a chart,
  "attribution": "for quotes, else null"
}
- kind "none" = a clean moment with no on-screen text (pure atmosphere) — use sparingly.
- visual_concept: ONE plain sentence naming what this moment is ABOUT (e.g. "the Aries sign, fiery and impulsive") — this is context the art-director will turn into a visual. Be concrete about the SUBJECT; do not describe colors/layout.

NARRATIVE ARC:
- Beat 0 is the HOOK and must FRAME THE PREMISE: name the subject and the promise so the viewer knows what they're getting (e.g. "You think you know Shiva? Here are 5 things even devotees miss"). Never cold-open into facts with no framing.
- Build: alternate substance with personality. Final beat: the CTA from the research's cta_idea.

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
  "project_name": "short title",
  "music_mood": "upbeat | inspiring | chill | cinematic | energetic | ambient",
  "niche": "one-word content domain for asset reuse (e.g. tech, finance, history, science, nature, lifestyle, sports, food, travel)",
  "publish": { "title": "≤95-char post title", "description": "1-3 sentence caption", "hashtags": ["#tag1", "#tag2"] },
  "narration": "the COMPLETE voiceover as ONE flowing spoken paragraph (real connected sentences), about ${targetWords} words (≈${targetDuration}s at 145 wpm) — every script_line below MUST be a verbatim contiguous slice of this, in order",
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
    user: `RESEARCH BRIEF:
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

  // RUNTIME SAFETY NET — only catches an EGREGIOUS overrun (~1.6× target); re-ask to TIGHTEN while
  // keeping every point (hook, items, CTA), never trimming the script in code.
  const targetWords = budgetWords(targetDuration);
  const ACCEPT_WORDS = Math.round(targetWords * 1.6);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const words = narrationWordCount(plan);
    if (words <= ACCEPT_WORDS) break;
    const estSeconds = Math.round((words / WORDS_PER_MINUTE) * 60);
    console.warn(`[ai-video/writer] draft ${words}w ≈ ${estSeconds}s >> target ${targetDuration}s (band ≤ ${ACCEPT_WORDS}w) — tighten regen ${attempt}/2`);
    try {
      const tighter = await runWriterCompletion(prompt,
        `RUNTIME — your narration is ${words} words ≈ ${estSeconds} seconds, far over the ~${targetDuration}-second target. TIGHTEN it (same JSON schema): keep EVERY point (hook, every requested fact/item, the CTA) but make each line punchier by cutting filler, landing closer to ${targetDuration}s (≈${targetWords} words). Do NOT drop or add points. Keep it ONE flowing, naturally-spoken narration.`);
      if (Array.isArray(tighter?.beats) && tighter.beats.length >= 3 && narrationWordCount(tighter) < words) plan = tighter;
      else break;
    } catch { break; }
  }

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

  console.log(`[ai-video/writer] ${beats.length} beats, ${narrationWordCount(plan)}w narration`);
  return {
    project_name: plan.project_name || research.topic?.slice(0, 60) || "Prompt Video",
    niche,
    music_mood: ["upbeat", "inspiring", "chill", "cinematic", "energetic", "ambient"].includes(plan.music_mood) ? plan.music_mood : "upbeat",
    publish,
    narration: String(plan.narration || ""),
    beats,
  };
}
