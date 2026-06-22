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

const DIRECTOR_MODEL = "gpt-4.1";

const ASSET_TYPES = ["none", "ai_image", "photo", "cutout", "stock_video"];
const TRANSITIONS = ["zoom", "slide-left", "slide-up", "slide-down", "fade", "none"];
const CAMERAS = ["slow_zoom_in", "fast_zoom_in", "slow_zoom_out", "pan_left", "pan_right", "hold"];

const MIN_BEATS = 8, MAX_BEATS = 32;
const MAX_BEAT_WORDS = 8;
const WORDS_PER_SECOND = 2.0; // measured from real ElevenLabs output (words ÷ seconds)

const wordsIn = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/**
 * Duration enforcement. The director reliably overshoots the word budget, and video length
 * ≈ total spoken words ÷ WORDS_PER_SECOND — so we cap total words to keep the render near
 * targetDuration. Keeps the hook + as many body beats as fit + the closing CTA, and cuts on
 * a sentence boundary so the narration never ends mid-thought. (The model can't be trusted
 * to self-limit, so this is the real guarantee; the prompt budget just reduces how much we cut.)
 */
function enforceDuration(beats, targetDuration) {
  if (!Array.isArray(beats) || beats.length <= 2) return beats;
  const budget = Math.round(targetDuration * WORDS_PER_SECOND * 1.1); // +10% tolerance
  const total = beats.reduce((n, b) => n + wordsIn(b.script_line), 0);
  if (total <= budget) return beats;

  const closer = beats[beats.length - 1];          // CTA / closing line — always kept
  const body = beats.slice(0, -1);
  const kept = [];
  let cum = wordsIn(closer.script_line);           // reserve the closer's words first
  for (const b of body) {
    const w = wordsIn(b.script_line);
    if (cum + w > budget) break;
    cum += w; kept.push(b);
  }
  // End the body on a complete sentence (don't cut mid-thought), but keep at least the hook.
  while (kept.length > 1 && !/[.!?]["')\]]?\s*$/.test((kept[kept.length - 1].script_line || "").trim())) kept.pop();
  if (!kept.length) kept.push(body[0]);
  kept.push({ ...closer, continues_previous: false });
  console.warn(`[ai-video/director] duration cap: ${total} words → ~${cum} (budget ${budget}) — kept ${kept.length}/${beats.length} beats`);
  return kept;
}

function languageBlock(language) {
  if (language === "en") return "LANGUAGE: English.";
  if (language === "hinglish" || language === "hi") {
    return `LANGUAGE — STRICT: Every script_line must be in HINGLISH — conversational Hindi written in Latin script, mixing in English nouns naturally ("Yogi ji ka bulldozer", "2017 mein sab badal gaya", "Tum decide karo"). A mostly-English script is a FAILURE. content strings may stay punchy English/Latin keywords.`;
  }
  return `LANGUAGE — STRICT: Every script_line must be written in ${language}. content strings may use short Latin-script keywords.`;
}

function buildDirectorPrompt({ research, style, targetDuration, language }) {
  const beatTarget = Math.round(targetDuration / 1.9);
  const targetWords = Math.round(targetDuration * WORDS_PER_SECOND);

  return {
    system: `You are the director of a short-form video studio that makes dense, fast-cut, subject-specific videos.
You plan the WHOLE film in one pass: the narration AND one visual per spoken beat. Script and shot list are the same artifact.

${style ? styleDirectiveBlock(style) : `## VISUAL STYLE: choose one for this video from:\n${styleMenuForDirector()}\nPick what fits the topic's tone. Lock it — every beat inherits it.`}

THE BEAT SYSTEM — NON-NEGOTIABLE:
- One beat = one spoken PHRASE = one visual moment. 3-6 words per beat, ${MAX_BEAT_WORDS} ABSOLUTE MAX. Beats are 1-2 seconds.
- A full sentence SPANS 2-3 consecutive beats. Example: "March 2017: Yogi Adityanath—monk, temple head—sworn in as Chief Minister." is THREE beats:
  beat A: "March 2017:" → a date slam (typography_punch)
  beat B: "Yogi Adityanath—monk, temple head—" → his image (cutout/photo)
  beat C: "sworn in as Chief Minister." → the oath moment (illustration/photo)
  The phrases must concatenate into natural flowing narration.
- CONTINUATION BEATS — use them GENEROUSLY: when a sentence spans multiple beats, set "continues_previous": true on the later beat(s) so the WHOLE sentence plays over ONE evolving visual (text landing piece by piece on the same backdrop). Do NOT cut to a brand-new visual for every phrase — hard cuts are for new IDEAS, not for each phrase of the same idea. One idea = one scene.
- Target ~${beatTarget} beats for ${targetDuration}s. Keep it tight — never pad with extra beats to fill time.
- LENGTH BUDGET: the ENTIRE script (all script_line words) should total about ${targetWords} words — speech runs ~${WORDS_PER_SECOND} words/sec, so ${targetWords} words ≈ ${targetDuration}s. SCOPE THE CONTENT TO FIT THIS FROM THE START: decide how much you can genuinely cover in ${targetWords} words and commit to that scope. STAY INTERNALLY CONSISTENT — if the hook promises "3 things", a countdown, or a list of N, you MUST deliver all N within the budget (make each one shorter), and the final/last item is the payoff — never drop it. NEVER promise N and show fewer, and NEVER truncate mid-structure. If the full idea can't fit ${targetWords} words, NARROW THE ANGLE (cover less, completely) rather than cutting pieces off the end. Significantly over budget = a video longer than the ${targetDuration}s requested = FAILURE.
- The viewer must never rest: every beat has motion, every cut has a transition.
- Every beat's visual_concept must be DISTINCT — different subject, different compositional idea, different energy from its neighbors. Two beats that would look alike is a failure.

NARRATION FLOW — beats are VISUAL cuts, not SPOKEN stops:
- Write the narration as flowing spoken sentences FIRST, then split each sentence across beats.
- Within a multi-beat sentence, ONLY the final beat ends with . ! or ? — earlier beats end with a comma, em-dash, or nothing, so the voiceover flows straight through the cut without pausing.
- Telegram fragments are FORBIDDEN: "Tradeoff: clarity, but more control." spoken aloud sounds robotic with dead air at every period. Write "The tradeoff is more clarity," + "but also more control." instead.
- Minimize colons and semicolons — TTS reads them as long pauses.
- Test: read the concatenated narration aloud in your head. It must sound like one person talking at a natural clip, never like bullet points being read out.

REAL SUBJECT IMAGERY:
For beats featuring a real public figure, organization, country, or landmark, set "subject_entity" to its exact Wikipedia article title (e.g. "Yogi Adityanath", "European Union", "Taj Mahal") — the pipeline fetches a REAL photo. ONLY entities that have a Wikipedia page with a photo: people, orgs, places, products. NEVER documents, laws, events, or abstract concepts. Pair it with asset_type "photo" or "cutout". Real imagery beats generated likenesses.

${languageBlock(language)}

YOU DECIDE THREE THINGS PER BEAT — source, content, and overlay-or-clean. A designer decides ALL form.

1. SOURCE (asset_type) — what raw material the beat uses:
- "none": an HTML/CSS INFORMATION FRAME. ONLY for content that IS information: a stat, a quote, a list, a title/date, a data comparison, a small chart, a CTA. NEVER for pictorial concepts — an iceberg, a ship, a crowd, a place, an animal, a person, an event are IMAGES, not HTML. If the moment can be SEEN, it is a shot, not a designed frame.
- "ai_image": a generated cinematic SHOT (full-bleed). EXPENSIVE — reserve for genuinely un-photographable / stylized concepts (a metaphor, a dramatized historical moment, an abstract idea). The pipeline caps AI generations per video, so don't lean on it.
- "photo": a realistic photo shot. With subject_entity set, a REAL photo of that person/org/landmark is fetched (free + strongest). Use this when SEEING that real person/org/place/landmark is the point of the beat — NOT merely because the line mentions a real name. If the beat is really about an idea, a number, or an argument that just references them, a designed frame beats a stock face.
- "cutout": the subject on transparency, composed by the designer inside a designed frame.
- "stock_video": real footage of a real-world moment (a city, a crowd, machinery, nature). Provide shot_query (concrete searchable phrase). PREFER this over ai_image for any real-world scene that footage could show.
LEAD WITH IMAGERY. Faceless videos are carried by VISUALS, not UI cards — most beats should SHOW something with the spoken line as a text overlay: a real photo (→ photo + subject_entity), real footage (→ stock_video + shot_query), or a generated shot (→ ai_image). Reserve HTML/CSS frames (asset_type "none") for beats whose content genuinely IS information — a stat, quote, list, chart, data comparison, title, or the CTA. If a beat can be SHOWN — a person, animal, place, object, action, scene, or visual metaphor — it is an IMAGE with overlay, NOT a designed card. Aim for roughly TWO-THIRDS image-backed beats to one-third designed frames, and never more than 2 of the same asset type in a row. SOURCE PRIORITY for cost (unchanged): real entity photo > stock footage > ai_image (≤2 ai_image in a 30s video) — so leaning visual means leaning on FREE real photos/footage first, with ai_image reserved for un-photographable concepts and comparisons.

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
- Beat 0: the hook — a question, bold claim, or striking number that stops the scroll. If the subject is at all depictable (a person, animal, place, object, or an "X vs Y"), OPEN ON AN IMAGE of it with the hook line overlaid — e.g. a cats topic opens on actual cats, never a bare text card. A pure-typography hook is only for genuinely abstract topics with nothing to show.
- Build: alternate substance (facts, contrasts) with personality (annotations, punches) — mostly over imagery.
- Final beat: the CTA from the research's cta_idea.

SCRIPT RULES:
- Conversational, punchy, spoken-word rhythm. One idea per beat.
- script lines must concatenate into ONE natural flowing narration (this becomes the voiceover).
- Forbidden: "delve", "dive into", "game-changing", "revolutionary", "in today's video".

Return ONLY valid JSON:
{
  "project_name": "short title",
  "style_id": "${style ? style.id : `one of: ${STYLE_IDS.join(" | ")}`}",
  "palette": { "bg": "#hex", "accent": "#hex", "accent2": "#hex", "text": "#hex" },
  "music_mood": "upbeat | inspiring | chill | cinematic | energetic | ambient",
  "niche": "one-word content domain for asset reuse (e.g. tech, finance, business, fitness, health, history, science, nature, lifestyle, sports, food, travel)",
  "beats": [
    {
      "beat_index": 0,
      "script_line": "the exact spoken words for this beat",
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

TARGET DURATION: ${targetDuration} seconds (~${beatTarget} beats)

Direct this film, beat by beat.`,
  };
}

export async function directBeats({ research, styleId, targetDuration = 45, language = "en" }) {
  const style = styleId && styleId !== "auto" ? STYLE_PRESETS[styleId] : null;
  const prompt = buildDirectorPrompt({ research, style, targetDuration, language });

  // Single pass — the word budget + flowing-narration rules live in the prompt; a
  // code-level word-budget cap (enforceDuration, below) then guarantees the length
  // without burning a second full-plan rewrite.
  const response = await openai.chat.completions.create({
    model: DIRECTOR_MODEL,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user",   content: prompt.user },
    ],
  });

  let plan;
  try {
    plan = JSON.parse(response.choices[0].message.content);
  } catch (e) {
    throw new Error(`beat director returned invalid JSON: ${e.message}`);
  }

  // ── Validation — structure is code's job, not the model's ────────────────
  const resolvedStyle = STYLE_PRESETS[plan.style_id] ?? style ?? STYLE_PRESETS.editorial_retro;

  const palette = plan.palette ?? {};
  palette.bg      = normalizeHex(palette.bg, "#07080f");
  palette.accent  = ensureVividAccent(normalizeHex(palette.accent, "#f59e0b"), "#f59e0b");
  palette.accent2 = ensureVividAccent(normalizeHex(palette.accent2, "#38bdf8"), "#38bdf8");
  palette.text    = normalizeHex(palette.text, "#ffffff");

  let beats = Array.isArray(plan.beats) ? plan.beats : [];
  // MIN_BEATS is a soft *target* (density is the style); only fail if there are too
  // few beats to make a video at all. A 7-beat plan is fine — don't abort the run.
  const HARD_FLOOR = 4;
  if (beats.length < HARD_FLOOR) throw new Error(`beat director planned only ${beats.length} beats (need at least ${HARD_FLOOR})`);
  if (beats.length < MIN_BEATS) console.warn(`[ai-video/director] ${beats.length} beats — under soft target ${MIN_BEATS}, accepting`);
  if (beats.length > MAX_BEATS) beats = beats.slice(0, MAX_BEATS);
  // Hard duration guarantee — trim total spoken words to the budget (model overshoots).
  beats = enforceDuration(beats, targetDuration);

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

    // Word cap — trim overlong lines at the last comfortable boundary
    let line = (b.script_line ?? "").trim();
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length > MAX_BEAT_WORDS + 3) {
      line = words.slice(0, MAX_BEAT_WORDS + 1).join(" ").replace(/[,;—-]+$/, "") + ".";
      console.warn(`[ai-video/director] beat ${i} trimmed from ${words.length} words`);
    }

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
      // An information frame without information — derive a title from the line
      content = { kind: "title", headline: line.replace(/[.?!]$/, "").split(/\s+/).slice(0, 7).join(" "), subtext: null, items: null, attribution: null };
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

  console.log(`[ai-video/director] ${beats.length} beats, style=${resolvedStyle.id} — assets: ${beats.map(b => b.asset_type).join(",")}`);
  return result;
}
