/**
 * visualDirector.js
 * src/services/ai/saasVideo/visualDirector.js
 *
 * Phase 1 of the beat pipeline. Runs AFTER the voiceover exists.
 * Takes the continuous narration + word-level timestamps and segments it into
 * timed VISUAL BEATS — driven by visual opportunity, not by a narrative funnel.
 *
 * Each beat is a consecutive span of the script (no gaps), so its timing can be
 * derived precisely from the word timestamps. Beats are finer-grained than the
 * old "scenes" (sub-sentence allowed) and each gets its own presentation type +
 * motion, which is what breaks the static-slideshow feel.
 *
 * Adapted from the talking-head normalizeTHTranscript brain, minus talking-head
 * treatments and minus any video (image-to-video) option.
 */

import { openai } from "../../../server/middleware/shared.js";

const MIN_BEAT_SEC = 1.5;
const MAX_BEAT_SEC = 4.0;
// Safety net: any beat shorter than this is folded into a neighbor (catches the
// model over-splitting a lone word like "Preview." into its own scene).
const MERGE_FLOOR_SEC = 1.2;

// Presentation types the renderer can produce.
const PRESENTATIONS  = new Set(["html", "media_only", "media_full", "media_split"]);
// Media sources: Pixabay stock (image / video b-roll), or an AI-generated image
// ONLY when the idea can't be shown with stock. AI video is deferred for later.
const MEDIA_SOURCES  = new Set(["stock_image", "stock_video", "ai_image", "product_shot"]);
const MOTIONS        = new Set(["push_in", "pull_out", "pan_left", "pan_right", "drift_up", "drift_down"]);
// LAYOUT is a FREE-TEXT structural description the director invents per beat (no
// fixed taxonomy). It's what stops every parallel GPT-5.4 call from defaulting to
// the same kicker+headline+subhead stack — and it lives here, in the one call that
// sees the whole script, so structures can be kept distinct across beats.

const SYSTEM = `You are a visual director for short-form promo videos. You are given a finished voiceover narration. Your job is to break it into a sequence of VISUAL BEATS — what the viewer SEES, moment to moment, synced to what is being said.

CORE PRINCIPLES:
- THE UNIT IS ONE DISTINCT VISUAL IDEA — the single thing the viewer SEES at that moment. It can be SMALLER than a sentence. Decide beats by idea, not by sentences or punctuation.
- SPLIT a sentence whenever it moves to a DIFFERENT thing to show. If a line walks through an action, then a product/output, then a list of named things, that is 2–3 SEPARATE beats — one per idea, each with its own visual and its own cut. e.g. "Drop your topic" → one beat (the input action); "Vidquence turns it into a polished video" → one beat (the product output); "ready for TikTok, Reels, and Shorts" → one beat (the platform list).
- GROUP only when consecutive fragments express the SAME idea. A list of similar items — negations ("No X. No Y."), features, or named things ("TikTok, Reels, Shorts") — is ONE beat shown as a kinetic listicle (icon + label per item), NOT one beat per item.
- RULE OF THUMB: a LIST of similar items = ONE beat; a SEQUENCE of different ideas = SEPARATE beats.
- PACING / NO LONG STATIC HOLDS: aim ${MIN_BEAT_SEC}–${MAX_BEAT_SEC}s per beat. No beat should hold a near-static frame longer than ~4s — nobody watches a dense screen for 7–8 seconds. If an idea's speech runs longer than ~${MAX_BEAT_SEC}s it almost always contains multiple ideas → SPLIT it. A genuine single list may run a bit longer ONLY if it reveals progressively (kinetic), never static.
- NEVER give a lone connective/emphatic word its own beat ("and", "Preview.") unless it's a deliberate dramatic full-screen hit, used very sparingly.
- The beats together cover the ENTIRE script in order. Each beat's "spoken" is an EXACT, CONSECUTIVE substring of the narration, verbatim — no gaps, no overlaps, no paraphrasing.
- SANITY CHECK: a content-rich ~25–30s script is typically 7–10 beats. Too few long, dense, static beats is as bad as too many tiny ones — if any beat is long AND dense, split it.
- THE HOOK (the FIRST beat) is special: it MUST show the opening line on screen — as kinetic "html" (preferred), or "media_full" / "media_split" with the hook text overlaid. NEVER use "media_only" for the hook; a bare image with no words is a weak, confusing open. The viewer must be able to read the hook.
- MATCH COMPLEXITY TO TIME. A beat's spoken length is roughly its screen time (about N words ÷ 2.5 ≈ seconds). A genuinely short beat must stay SIMPLE (one bold line or a media shot), but the answer to "this is too short for a built UI" is usually to GROUP it with its neighbors into a richer beat — not to leave it as a lone scene.

PRESENTATION TYPES (pick one per beat — VARY them, see "TREATMENT MIX" below):
- "html"        → a fully designed, ANIMATED motion-graphics frame: kinetic typography, stats, lists revealed item-by-item, cards, UI mockups (the Linear / Vercel / Stripe look). For a short punchy idea use one bold animated line; for a grouped list reveal the items progressively. Keep it KINETIC — never a static slide.
- "media_only"  → a full-bleed photo / illustration / video with NO text at all. The voiceover carries the idea while the image breathes. Best for emotional, atmospheric, or transitional moments. Use this often — not every beat needs words on screen.
- "media_full"  → a full-bleed photo/illustration/video with ONE short text line overlaid. Use only when a few words genuinely reinforce the image.
- "media_split" → a photo/illustration/video in one half and a designed text block in the other half. Best for pairing one concrete visual with one message.

MEDIA SOURCE (for media_only / media_full / media_split) — PREFER STOCK:
- "stock_image" → a real photograph from a stock library (a person, a place, a real situation). Your default for real-world moments.
- "stock_video" → a short real stock VIDEO clip / b-roll with real motion. Great for dynamic, lively, or atmospheric moments. Prefer this over a static image when motion suits the beat.
- "ai_image"    → an AI-generated concept image. Use for hero / atmosphere / abstract or impossible-to-photograph moments — and whenever real stock would look generic or cliché for THIS product (common for software). Don't make it the default for everything, but don't treat it as a rare last resort either.

CHOOSING THE TREATMENT MIX — FIT IT TO THE PRODUCT (no fixed ratio):
First judge what KIND of product/idea this is, then pick the mix that genuinely suits it:
- Abstract / software / digital / dev tools (anything best explained by motion, not by a photo): LEAN HEAVILY on "html" — kinetic typography, motion graphics, and product-UI mockups. Use ai_image for the few hero / transition / atmosphere moments (a launch-control vibe, a solo builder at night). AVOID generic stock clichés — no developers typing, no server rooms, no coffee-and-code; for these products stock usually looks cheap, so use little or none.
- Physical / real-world / human / lifestyle products: real stock photo/video can shine — use it where a genuine real-world moment beats graphics.
This is a JUDGMENT, not a quota — choose what makes THIS product look its best.

AVOID THE SLIDESHOW FEEL — but the fix is MOTION, not a media quota:
- Heavy use of "html" is great (and usually right for software) AS LONG AS every html beat is kinetic — staggered, animated reveals — and you VARY the treatment so two beats never look like the same template recolored.
- Let some beats breathe (a clean single statement, or an atmosphere shot) for rhythm.
- media_only / media_full / media_split beats must NOT carry a specific stat, feature list, or precise claim that must be READ — those belong in kinetic html. Use media beats for feeling, scene, and atmosphere the voiceover explains.

LAYOUT (required for every beat) — INVENT the structural shape of this specific frame and describe it in one short phrase. Describe ONLY the skeleton/composition: how the elements are arranged in the frame — NOT colors, fonts, pixel sizes, or animation (the designer owns those). You are the art director; GPT designs exactly the structure you describe. There is NO fixed list of layouts — make one up that fits THIS idea.
This is the single most important field for VARIETY: each scene is designed by a separate call that can't see the others, so without a distinct structure they ALL collapse into the same "kicker + headline + subhead" stack. Because you see the whole script at once, make every beat's structure genuinely different from its neighbours, and don't reuse a structure you already used. Avoid the default headline-over-subhead stack unless it's truly the best shape for that one beat.
Write the KIND of thing below — but INVENT your own per beat, never copy these: "one giant word filling the frame with a faint oversized echo of it behind", "a vertical list, each row an icon then a few words, revealed top to bottom", "a single huge metric centered with a thin caption beneath", "two stacked panels — before on top, after below — split by a hairline rule", "one clean device/window frame, nothing floating around it".
For media beats the image carries the frame — describe at most where a single overlaid line sits.

ASSET HINT (required for every media beat — media_only / media_full / media_split): one line describing what the image or video shows — subject + context + lighting (and the motion for stock_video). Max 15 words. Describe what the camera sees, never emotions. No people's faces required.

PRODUCT VISUAL (only for "html" beats): set "wants_product_visual": true ONLY when this beat should show the actual product UI / screenshot (a reveal, a feature, a demo). Otherwise false.

MOTION (every beat): pick the camera motion — "push_in", "pull_out", "pan_left", "pan_right", "drift_up", or "drift_down". Vary it between consecutive beats. No beat is ever static.

CREATIVE BRIEF (every beat): 1–2 sentences — what this beat shows and how it should look and feel (focal point, energy). Be specific.

OUTPUT — valid JSON only:
{
  "beats": [
    {
      "beat_index": 0,
      "spoken": "exact consecutive words from the narration for this beat",
      "presentation": "html | media_only | media_full | media_split",
      "layout": "one short phrase describing THIS frame's invented structure — make it different from every other beat",
      "media_source": "stock_image | stock_video | ai_image | null",
      "asset_hint": "image/video description or null",
      "wants_product_visual": false,
      "motion": "push_in",
      "creative_brief": "what this beat shows + how it looks and feels"
    }
  ]
}`;

/**
 * Align beats to word timestamps by walking the word list in order, consuming
 * one beat's word-count at a time. Sets start/end/duration on each beat.
 * end is pinned to the next beat's start so coverage is gap-free.
 */
function alignBeatsToWords(beats, wordTimestamps, audioDuration) {
  const TRAIL = 0.4;
  const totalEnd = (audioDuration || 0) + TRAIL;

  if (!wordTimestamps?.length) {
    // No timestamps — fall back to even division of the audio duration.
    const each = totalEnd / Math.max(1, beats.length);
    beats.forEach((b, i) => {
      b.start    = parseFloat((i * each).toFixed(3));
      b.end      = parseFloat(((i + 1) * each).toFixed(3));
      b.duration = parseFloat((b.end - b.start).toFixed(3));
    });
    return beats;
  }

  let wordIdx = 0;
  for (const beat of beats) {
    const segWords = (beat.spoken ?? "").trim().split(/\s+/).filter(Boolean).length;
    const startWord = wordTimestamps[Math.min(wordIdx, wordTimestamps.length - 1)];
    beat.start = parseFloat((startWord?.start ?? 0).toFixed(3));
    wordIdx = Math.min(wordIdx + Math.max(1, segWords), wordTimestamps.length);
  }

  // Pin each beat's end to the next beat's start; last beat runs to audio end + trail.
  for (let i = 0; i < beats.length; i++) {
    const next = beats[i + 1];
    beats[i].end = parseFloat((next ? next.start : totalEnd).toFixed(3));
    // Guard against zero/negative durations from imperfect alignment.
    if (beats[i].end <= beats[i].start) beats[i].end = parseFloat((beats[i].start + MIN_BEAT_SEC).toFixed(3));
    beats[i].duration = parseFloat((beats[i].end - beats[i].start).toFixed(3));
  }

  return beats;
}

// Safety net for over-splitting: fold any beat shorter than MERGE_FLOOR_SEC into a
// neighbor (keeping the neighbor's presentation), so a lone word never becomes its
// own scene even if the director ignores the grouping rules.
function mergeShortBeats(beats) {
  if (beats.length <= 1) return beats;

  const out = [];
  for (const beat of beats) {
    const prev = out[out.length - 1];
    if (prev && (beat.duration ?? 0) < MERGE_FLOOR_SEC) {
      prev.spoken   = `${prev.spoken} ${beat.spoken}`.trim();
      prev.end      = beat.end;
      prev.duration = parseFloat((prev.end - prev.start).toFixed(3));
    } else {
      out.push({ ...beat });
    }
  }

  // If the first beat is still too short, fold the second back into it.
  if (out.length > 1 && (out[0].duration ?? 0) < MERGE_FLOOR_SEC) {
    out[1].spoken   = `${out[0].spoken} ${out[1].spoken}`.trim();
    out[1].start    = out[0].start;
    out[1].duration = parseFloat((out[1].end - out[1].start).toFixed(3));
    out.shift();
  }

  return out.map((b, i) => ({ ...b, beat_index: i }));
}

// Split a too-long text beat into clause-sized sub-beats so html scenes don't sit
// static for 5–8s. Runs BEFORE timing alignment, using a word-count estimate.
// Only html beats are split — media beats have continuous Ken Burns motion.
const WORDS_PER_SEC  = 2.5;
const SPLIT_OVER_SEC = 3.8;
const ALT_MOTION = { push_in: "pull_out", pull_out: "push_in", pan_left: "pan_right", pan_right: "pan_left", drift_up: "drift_down", drift_down: "drift_up" };

function clauseSplit(text) {
  const words = text.trim().split(/\s+/);
  const mid = Math.floor(words.length / 2);
  let best = -1, bestDist = 1e9;
  for (let i = 2; i < words.length - 2; i++) {
    const w = words[i], next = words[i + 1] || "";
    if (/[,—:;.]$/.test(w) || /^(and|or|but|so|then|because|when|while)$/i.test(next)) {
      const d = Math.abs(i - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    }
  }
  const cut = best >= 0 ? best + 1 : mid;
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

function splitLongBeats(beats) {
  let cur = beats, changed = true;
  for (let pass = 0; pass < 3 && changed; pass++) {
    changed = false;
    const out = [];
    for (const b of cur) {
      const words = b.spoken.trim().split(/\s+/).filter(Boolean).length;
      if (b.presentation === "html" && words >= 8 && words / WORDS_PER_SEC > SPLIT_OVER_SEC) {
        const [a, c] = clauseSplit(b.spoken);
        if (a && c) {
          // A split is a PROGRESSION, not a clone. The first half keeps the beat's
          // brief/layout (the setup); the second half is the PAYOFF and must look
          // different — so we clear its layout (the designer invents a fresh shape)
          // and rewrite its brief to ask for a distinct, simpler resolving frame.
          // Without this, both halves got the identical brief → twin scenes.
          out.push({ ...b, spoken: a });
          out.push({
            ...b,
            spoken: c,
            motion: ALT_MOTION[b.motion] || b.motion,
            layout: "",
            creative_brief: `The PAYOFF frame that resolves the previous beat — design a DIFFERENT, simpler structure (e.g. the finished result, or a punchy closing line), NOT a repeat of the previous frame's layout. Show only: "${c.trim()}".`,
          });
          changed = true;
          continue;
        }
      }
      out.push(b);
    }
    cur = out;
  }
  return cur;
}

// User-asset upload slots are deferred (user_assets ships later). Until then,
// product-asset placeholders only HURT — GPT tags designed preview/UI panels as
// data-asset-type="asset", and the pipeline replaces those whole designed areas
// with the "MISSING ASSET" box. Disabled for now; flip to true when uploads land.
const ASSET_PLACEHOLDERS_ENABLED = false;

function sanitizeBeat(b, i) {
  const presentation = PRESENTATIONS.has(b.presentation) ? b.presentation : "html";
  const isMedia = presentation !== "html";
  const motion  = MOTIONS.has(b.motion) ? b.motion : "push_in";
  // Free-text structural description invented by the director — no validation, just trim.
  const layout  = typeof b.layout === "string" ? b.layout.trim() : "";
  return {
    beat_index:          i,
    spoken:              typeof b.spoken === "string" ? b.spoken.trim() : "",
    presentation,
    layout,
    media_source:        isMedia ? (MEDIA_SOURCES.has(b.media_source) ? b.media_source : "stock_image") : null,
    asset_hint:          isMedia ? (typeof b.asset_hint === "string" ? b.asset_hint.trim() : null) : null,
    wants_product_visual: ASSET_PLACEHOLDERS_ENABLED && !isMedia && b.wants_product_visual === true,
    motion,
    creative_brief:      typeof b.creative_brief === "string" ? b.creative_brief.trim() : "",
  };
}

/**
 * planVisualBeats({ full_script, wordTimestamps, audioDuration, projectContext })
 * Returns an array of timed, sanitized beats.
 */
export async function planVisualBeats({ full_script, wordTimestamps = [], audioDuration = 0, projectContext = {} }) {
  if (!full_script?.trim()) return [];

  const hasShots = (projectContext.screenshotCount ?? 0) > 0;
  const shotNote = hasShots
    ? `\n\nREAL PRODUCT SCREENSHOTS AVAILABLE (${projectContext.screenshotCount}): for beats that SHOW the actual product, its UI, a feature, or a demo, set media_source "product_shot" (presentation media_full or media_split) — these render the real captured product screenshots. Prefer "product_shot" over stock/ai for any genuine product/demo moment; use stock/ai/html for everything else.`
    : "";
  const userPrompt = `PRODUCT: ${projectContext.productName ?? "Product"}
TOTAL VOICEOVER DURATION: ~${(audioDuration || 0).toFixed(1)}s${shotNote}
NARRATION (segment this exactly, verbatim, in order):
"${full_script.trim()}"`;

  const response = await openai.chat.completions.create({
    model:           "gpt-4.1",
    temperature:     0.6,
    max_tokens:      8000, // beats JSON segmented from the full narration — grows with duration; headroom
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user",   content: userPrompt },
    ],
  });

  const raw = (response.choices[0].message.content ?? "").trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`planVisualBeats: JSON parse failed\n${raw.slice(0, 300)}`);
  }

  const rawBeats = Array.isArray(parsed.beats) ? parsed.beats : [];
  if (!rawBeats.length) throw new Error("planVisualBeats: no beats returned");

  let beats = rawBeats.map(sanitizeBeat).filter(b => b.spoken);
  beats = splitLongBeats(beats).map((b, i) => ({ ...b, beat_index: i }));
  alignBeatsToWords(beats, wordTimestamps, audioDuration);
  const before = beats.length;
  beats = mergeShortBeats(beats);
  if (beats.length !== before) console.log(`[visualDirector] merged ${before - beats.length} too-short beat(s)`);

  // The hook must never be a bare media shot — ensure the opening line is on screen.
  if (beats[0] && beats[0].presentation === "media_only") {
    beats[0].presentation = "media_full";
    console.log("[visualDirector] hook was media_only — promoted to media_full so the hook line shows");
  }

  const counts = beats.reduce((acc, b) => { acc[b.presentation] = (acc[b.presentation] ?? 0) + 1; return acc; }, {});
  console.log(`[visualDirector] ${beats.length} beats — ${JSON.stringify(counts)} — layouts: ${beats.map(b => b.layout).join(", ")}`);
  return beats;
}
