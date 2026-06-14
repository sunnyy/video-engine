/**
 * visualDirector.js
 * src/services/ai/promoVideo/visualDirector.js
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

const MIN_BEAT_SEC = 2.0;
const MAX_BEAT_SEC = 6.0;
// Safety net: any beat shorter than this is folded into a neighbor (catches the
// model over-splitting a lone word like "Preview." into its own scene).
const MERGE_FLOOR_SEC = 1.2;

// Presentation types the renderer can produce.
const PRESENTATIONS  = new Set(["html", "media_only", "media_full", "media_split"]);
// Media sources: Pixabay stock (image / video b-roll), or an AI-generated image
// ONLY when the idea can't be shown with stock. AI video is deferred for later.
const MEDIA_SOURCES  = new Set(["stock_image", "stock_video", "ai_image"]);
const MOTIONS        = new Set(["push_in", "pull_out", "pan_left", "pan_right", "drift_up", "drift_down"]);

const SYSTEM = `You are a visual director for short-form promo videos. You are given a finished voiceover narration. Your job is to break it into a sequence of VISUAL BEATS — what the viewer SEES, moment to moment, synced to what is being said.

CORE PRINCIPLES:
- A BEAT IS ONE COMPLETE VISUAL IDEA — never one stray word, never one line pulled out of a group. Decide beats by IDEA, not by sentence or punctuation.
- GROUP related consecutive lines into ONE beat. A rapid-fire run — a list of pains, a list of features, "No X. No Y. No Z." negations, or a trio like "Preview. Rollback. Ship again." — is a SINGLE beat that reveals its items one-by-one (kinetic), NOT one beat per item.
- NEVER give a lone short word or phrase its own beat (e.g. "No servers.", "Preview.", "Rollback."). Fold it into the idea it belongs to. The ONLY exception is one deliberate, dramatic full-screen word, used very sparingly.
- Do NOT split a single continuous thought across beats.
- Target ${MIN_BEAT_SEC}–${MAX_BEAT_SEC}s per beat. If a coherent list or idea runs longer than ${MAX_BEAT_SEC}s, KEEP IT AS ONE BEAT and reveal it progressively — never chop a list to satisfy a limit.
- The beats together cover the ENTIRE script in order. Each beat's "spoken" is an EXACT, CONSECUTIVE substring of the narration, verbatim — no gaps, no overlaps, no paraphrasing.
- SANITY CHECK: a ~30s script should be roughly 5–8 beats. If you have more than ~10, you are over-segmenting — merge related lines into shared beats.
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
- "ai_image"    → an AI-generated illustration / concept image. Use ONLY when the idea genuinely CANNOT be shown with a stock photo or video (an abstract concept, an impossible or highly specific scene). Do not default to it.

CHOOSING THE TREATMENT MIX — FIT IT TO THE PRODUCT (no fixed ratio):
First judge what KIND of product/idea this is, then pick the mix that genuinely suits it:
- Abstract / software / digital / dev tools (anything best explained by motion, not by a photo): LEAN HEAVILY on "html" — kinetic typography, motion graphics, and product-UI mockups. Use ai_image for the few hero / transition / atmosphere moments (a launch-control vibe, a solo builder at night). AVOID generic stock clichés — no developers typing, no server rooms, no coffee-and-code; for these products stock usually looks cheap, so use little or none.
- Physical / real-world / human / lifestyle products: real stock photo/video can shine — use it where a genuine real-world moment beats graphics.
This is a JUDGMENT, not a quota — choose what makes THIS product look its best.

AVOID THE SLIDESHOW FEEL — but the fix is MOTION, not a media quota:
- Heavy use of "html" is great (and usually right for software) AS LONG AS every html beat is kinetic — staggered, animated reveals — and you VARY the treatment so two beats never look like the same template recolored.
- Let some beats breathe (a clean single statement, or an atmosphere shot) for rhythm.
- media_only / media_full / media_split beats must NOT carry a specific stat, feature list, or precise claim that must be READ — those belong in kinetic html. Use media beats for feeling, scene, and atmosphere the voiceover explains.

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

function sanitizeBeat(b, i) {
  const presentation = PRESENTATIONS.has(b.presentation) ? b.presentation : "html";
  const isMedia = presentation !== "html";
  const motion  = MOTIONS.has(b.motion) ? b.motion : "push_in";
  return {
    beat_index:          i,
    spoken:              typeof b.spoken === "string" ? b.spoken.trim() : "",
    presentation,
    media_source:        isMedia ? (MEDIA_SOURCES.has(b.media_source) ? b.media_source : "stock_image") : null,
    asset_hint:          isMedia ? (typeof b.asset_hint === "string" ? b.asset_hint.trim() : null) : null,
    wants_product_visual: !isMedia && b.wants_product_visual === true,
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

  const userPrompt = `PRODUCT: ${projectContext.productName ?? "Product"}
TOTAL VOICEOVER DURATION: ~${(audioDuration || 0).toFixed(1)}s
NARRATION (segment this exactly, verbatim, in order):
"${full_script.trim()}"`;

  const response = await openai.chat.completions.create({
    model:           "gpt-4.1",
    temperature:     0.6,
    max_tokens:      2500,
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
  console.log(`[visualDirector] ${beats.length} beats — ${JSON.stringify(counts)}`);
  return beats;
}
