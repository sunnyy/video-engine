/**
 * talkingHead/thDirector.js — the EDITORIAL brain.
 *
 * The speaker's clip is the spine; the transcript (with real timestamps) is FIXED. For each beat
 * the director decides: STAY on the speaker, or CUT AWAY to an illustrative visual of what's being
 * said. It does NOT write a script — the words are the user's. Output fields mirror the AI Video
 * beat schema so the existing visualResolver/designer can resolve B-roll unchanged.
 *
 * Editorial taste (the whole point — not "captions on a face"): illustrate the IDEA when it's
 * showable; keep the speaker for personal / opinion / emphasis / connective moments; never cut on
 * every beat — let the speaker carry stretches. Source priority: real entity photo > stock footage
 * > AI image (last resort, capped downstream).
 */
import { openai } from "../../../server/middleware/shared.js";
import { STYLE_IDS, STYLE_PRESETS, getStyle } from "./styleSystem.js";
import { normalizeHex, ensureVividAccent } from "./utils.js";

const MODEL = "gpt-4.1";
const ASSET_TYPES = ["none", "ai_image", "photo", "stock_video"];
const CAMERAS = ["slow_zoom_in", "fast_zoom_in", "slow_zoom_out", "pan_left", "pan_right", "hold"];
const VTYPES = ["concept", "scene", "place", "object", "person", "texture", "abstract"];

function buildPrompt(beats, language) {
  const beatList = beats.map((b) => `#${b.beat_index} [${b.duration_seconds}s]: ${b.spoken}`).join("\n");
  return {
    system: `You are the EDITOR of a short-form talking-head video. A person is speaking to camera; their clip is the spine and their words are FIXED (given below as timed beats). Your job: decide, beat by beat, when to STAY on the speaker and when to CUT AWAY to a visual that ILLUSTRATES what they're saying — the way great creators cut to B-roll.

DECIDE PER BEAT — "visual_mode":
- "speaker": keep the person on screen. Use this for personal/opinion/emphasis lines, hooks delivered to camera, transitions, reactions, and anything not worth illustrating. The speaker should carry a good share of the video — DO NOT cut away on every beat.
- "broll": cut away to a full-screen real VISUAL of what the beat is ABOUT (a place, person, object, action, scene, or a strong visual metaphor). Best when the line shows something with little inherent text.
- "card": cut away to a full-screen DESIGNED text frame — when the beat states a STAT, a NUMBER, a short LIST, a comparison, or a punchy quotable fact that lands harder as bold typography than as footage. The card replaces the speaker for that moment.
- "overlay": KEEP the speaker on screen but pop a small designed element ON TOP of them — a number, a short label, a one-line fact, a key term. Use this for a QUICK reinforcement of what they're saying when you want to stay on their face (not cut away). Lighter than a card.
Both "card" and "overlay" carry text, so captions auto-hide on those beats. Pull the real fact/number/label from the spoken words into "content".
Aim for a natural rhythm — a healthy mix of all moments (speaker carries personal/emphasis lines, broll shows real things, cards punch big numbers/facts, overlays reinforce while staying on the face). Never long monotonous stretches of one mode; avoid 4+ of the same mode in a row.

FOR "broll" BEATS — choose the SOURCE (cheapest, most real first):
- "photo" + "subject_entity" = the EXACT Wikipedia article title of a real person/org/place/landmark/product (e.g. "Roman Forum", "Elon Musk") → a real photo is fetched (free, strongest). Use whenever a real, nameable thing is the subject.
- "stock_video" + "shot_query" = a concrete searchable phrase for real footage of a real-world scene (a city street, a crowd, ocean waves, typing hands). Free. Prefer this for generic real-world scenes.
- "ai_image" + "image_prompt" = a generated cinematic shot. LAST RESORT (capped per video) — only for un-photographable concepts/metaphors. Frame it like a shot (subject + composition + light + mood), and NEVER put text/words in the image.
Also give every broll beat: "layout" — "full" (footage covers the whole frame) or "pip" (keep the SPEAKER on screen and tuck the footage into a corner; use pip for "as you can see / here / look at this" moments where the speaker's presence still matters) — plus "camera" (one of: ${CAMERAS.join(", ")}, chosen by emotion), "visual_type" (${VTYPES.join(" | ")}), and "keywords" (2–4 concrete lowercase nouns of what's shown).

EMPHASIS PUNCH — set "emphasis": true on the FEW most impactful SPEAKER beats (the hook, a bold claim, a punchline) so the camera punches in for energy. Use it sparingly (~1 in 5 speaker beats); on everything else leave it false. Only meaningful on "speaker" beats.

FOR "card" AND "overlay" BEATS — fill "content" with the real fact pulled from the spoken words: { "kind": "stat|fact|list|quote|title", "headline": "the hero line/number", "subtext": "supporting line or null", "items": ["...","..."] or null }. Make the headline punchy (a number or 3–6 words); overlays should be especially short. Real numbers/strings only.

GREAT EDITS HAVE SHAPE — when it fits, OPEN with a punchy "card" hook (the topic/promise as bold type) and CLOSE with a short "card" takeaway or call-to-action. In "overlay" beats you MAY add a single relevant emoji or icon next to the text when it reinforces the point (keep it tasteful, not every overlay).

GLOBAL: choose a "style_id" for the look from: ${STYLE_IDS.join(" | ")} (pick what fits the speaker's tone), a "palette" {bg,accent,accent2,text} grounded in the topic, a one-word "niche" (tech, finance, history, fitness, food, travel, …) for asset reuse, a "music_mood" (ambient | inspiring | upbeat | cinematic | chill) for a subtle background bed, and "publish" { "title": ≤95-char post title, "description": 1–2 sentence caption, "hashtags": [5–10 lowercase #tags] } for posting.

Captions (the spoken words) are added separately and auto-hide on "card" beats. ALL your output fields — entities, queries, image prompts, and especially card "content" text — MUST be in ENGLISH/Latin script${language && language !== "en" ? ` (the speaker talks in "${language}", but on-screen card text and search queries must be English/Latin — the design fonts can't render other scripts)` : ""}.

Return ONLY valid JSON:
{
  "style_id": "one of the list",
  "palette": { "bg": "#hex", "accent": "#hex", "accent2": "#hex", "text": "#hex" },
  "niche": "one word",
  "music_mood": "ambient | inspiring | upbeat | cinematic | chill",
  "publish": { "title": "≤95 chars", "description": "1–2 sentences", "hashtags": ["#tag1", "#tag2"] },
  "beats": [
    { "beat_index": 0, "visual_mode": "speaker|broll|card|overlay", "emphasis": false, "asset_type": "none|photo|stock_video|ai_image", "layout": "full", "subject_entity": null, "shot_query": null, "image_prompt": null, "camera": null, "visual_type": null, "keywords": [], "content": null }
  ]
}
Every input beat must appear exactly once, by beat_index.`,
    user: `TIMED BEATS (the spoken words, fixed):\n${beatList}\n\nDecide visual_mode (and B-roll source for broll beats) for every beat.`,
  };
}

// One GPT pass over a chunk of beats.
async function runChunk(beats, language) {
  const prompt = buildPrompt(beats, language);
  const res = await openai.chat.completions.create({
    model: MODEL, max_tokens: 4000, response_format: { type: "json_object" },
    messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }],
  });
  return JSON.parse(res.choices[0].message.content);
}

/**
 * directTalkingHead(beats, { language }) → { style, palette, niche, beats }
 * beats: input beats augmented with visual_mode + (for broll) AI-Video-compatible visual fields.
 */
export async function directTalkingHead(beats, { language = "en" } = {}) {
  // Chunk long transcripts so the model stays accurate and within context.
  const CHUNK = 24;
  const decisionsByIndex = new Map();
  let style_id = null, paletteRaw = null, niche = null, music_mood = null, publishRaw = null;

  for (let i = 0; i < beats.length; i += CHUNK) {
    const slice = beats.slice(i, i + CHUNK);
    let plan;
    try { plan = await runChunk(slice, language); }
    catch (e) { console.warn(`[talking-head/director] chunk ${i} failed: ${e.message}`); continue; }
    style_id   = style_id   || plan.style_id;
    paletteRaw = paletteRaw || plan.palette;
    niche      = niche      || (typeof plan.niche === "string" ? plan.niche.trim().toLowerCase().split(/\s+/)[0] : null);
    music_mood = music_mood || plan.music_mood;
    publishRaw = publishRaw || plan.publish;
    for (const d of (plan.beats || [])) {
      if (typeof d.beat_index === "number") decisionsByIndex.set(d.beat_index, d);
    }
  }

  const style = STYLE_PRESETS[style_id] ?? getStyle("clean_minimal") ?? STYLE_PRESETS[STYLE_IDS[0]];
  const palette = paletteRaw ?? {};
  palette.bg     = normalizeHex(palette.bg, "#07080f");
  palette.accent = ensureVividAccent(normalizeHex(palette.accent, "#f59e0b"), "#f59e0b");
  palette.accent2 = ensureVividAccent(normalizeHex(palette.accent2, "#38bdf8"), "#38bdf8");
  palette.text   = normalizeHex(palette.text, "#ffffff");
  palette.theme  = "auto";
  niche = niche || "general";

  // Merge decisions back onto the real (timed) beats; default to "speaker" if a beat was missed.
  let aiImageCount = 0;
  const AI_CAP = Math.max(1, Math.round(beats.length / 8)); // keep paid generation rare
  const CONTENT_KINDS = ["stat", "fact", "list", "quote", "title"];
  const out = beats.map((b) => {
    const d = decisionsByIndex.get(b.beat_index) || {};
    let visual_mode = ["broll", "card", "overlay"].includes(d.visual_mode) ? d.visual_mode : "speaker";
    let asset_type  = ASSET_TYPES.includes(d.asset_type) ? d.asset_type : "none";
    let content = { kind: "none", headline: "", subtext: null, items: null, attribution: null };

    if (visual_mode === "card" || visual_mode === "overlay") {
      // A designed text frame (card = full cover) or pop over the speaker (overlay) — needs real
      // content; with no headline there's nothing to show, so fall back to the speaker.
      asset_type = "none";
      const c = d.content || {};
      const headline = typeof c.headline === "string" ? c.headline.trim().slice(0, 80) : "";
      if (!headline) visual_mode = "speaker";
      else content = {
        kind:     CONTENT_KINDS.includes(c.kind) ? c.kind : "fact",
        headline,
        subtext:  typeof c.subtext === "string" && c.subtext.trim() ? c.subtext.trim().slice(0, 110) : null,
        items:    Array.isArray(c.items) ? c.items.filter((x) => typeof x === "string").slice(0, 6) : null,
        attribution: null,
      };
    } else if (visual_mode === "broll") {
      // Ground the source: a broll beat must have something to fetch.
      const hasSpec = d.subject_entity || d.shot_query || d.image_prompt;
      if (!hasSpec) { visual_mode = "speaker"; asset_type = "none"; }
      else {
        if (asset_type === "none") asset_type = d.subject_entity ? "photo" : (d.shot_query ? "stock_video" : "ai_image");
        if (asset_type === "ai_image") {
          if (aiImageCount >= AI_CAP) { // over the AI budget → fall back to stock, else keep speaker
            if (d.shot_query) asset_type = "stock_video";
            else if (d.subject_entity) asset_type = "photo";
            else { visual_mode = "speaker"; asset_type = "none"; }
          } else aiImageCount++;
        }
      }
    }

    return {
      ...b,
      visual_mode,
      asset_type,
      continues_previous: false,
      subject_entity: typeof d.subject_entity === "string" && d.subject_entity.trim() ? d.subject_entity.trim().slice(0, 60) : null,
      shot_query:     asset_type === "stock_video" ? (d.shot_query ?? b.spoken).toString().slice(0, 120) : (d.shot_query ?? null),
      image_prompt:   ["ai_image", "photo"].includes(asset_type) ? (d.image_prompt ?? d.shot_query ?? b.spoken).toString().slice(0, 400) : null,
      camera:         CAMERAS.includes(d.camera) ? d.camera : "slow_zoom_in",
      visual_type:    VTYPES.includes(d.visual_type) ? d.visual_type : "scene",
      keywords:       Array.isArray(d.keywords) ? d.keywords.filter((k) => typeof k === "string").map((k) => k.toLowerCase().trim()).filter(Boolean).slice(0, 4) : [],
      // Punch-in only makes sense when the speaker is on screen; the hook (beat 0) always punches.
      emphasis:       visual_mode === "speaker" && (d.emphasis === true || b.beat_index === 0),
      layout:         visual_mode === "broll" && d.layout === "pip" ? "pip" : "full",
      content,
      niche,
    };
  });

  const MOODS = ["ambient", "inspiring", "upbeat", "cinematic", "chill"];
  const mood = MOODS.includes(music_mood) ? music_mood : "ambient";
  const pub = publishRaw || {};
  const publish = {
    title:       String(pub.title || "").trim().slice(0, 95),
    description: String(pub.description || "").trim().slice(0, 600),
    hashtags:    Array.isArray(pub.hashtags)
      ? [...new Set(pub.hashtags.map((h) => "#" + String(h).replace(/^#+/, "").replace(/\s+/g, "").toLowerCase()).filter((h) => h.length > 1))].slice(0, 10)
      : [],
  };

  const n = (m) => out.filter((b) => b.visual_mode === m).length;
  console.log(`[talking-head/director] ${out.length} beats — ${n("broll")} broll, ${n("card")} card, ${n("overlay")} overlay, ${n("speaker")} speaker, style=${style.id}, niche=${niche}, music=${mood}`);
  return { style, palette, niche, music_mood: mood, publish, beats: out };
}
