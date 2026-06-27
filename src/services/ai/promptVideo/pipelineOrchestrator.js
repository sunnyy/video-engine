/**
 * pipelineOrchestrator.js
 * src/services/ai/promptVideo/pipelineOrchestrator.js
 *
 * Prompt to Video — the beat-level engine. Self-contained service.
 *
 *   0. Research the subject (entities, facts, artifacts)
 *   1. Beat director — script + one visual per beat, style locked, one call
 *   2. TTS FIRST — word timestamps slice exact beat windows
 *   3. Visual resolution — styled AI images, cutouts, stock (parallel)
 *   4. Beat design — GPT-5.4 per beat, fully parallel
 *   5. Mechanical lint → targeted repair → re-parse
 *   6. Assembly — full-bleed injection, motion, a transition on EVERY cut,
 *      SFX, music
 *   7. Save with complete per-beat regen context
 */

import { supabaseAdmin }         from "../../../server/middleware/shared.js";
import { simplifyTimelineKeyframes } from "../shared/motion.js";
import { researchTopic }         from "./researcher.js";
import { writeScript }           from "./scriptWriter.js";
import { directVisuals }         from "./artDirector.js";
import { resolveVisuals }        from "./visualResolver.js";
import { designAllBeats }        from "./beatDesigner.js";
import { measureSceneHTML, closeMeasureBrowser } from "../shared/converter.js";
import { buildTimeline }         from "./timelineBuilder.js";
import { generateFullVoiceover } from "./ttsGenerator.js";
import { track, easeOutCubic }   from "../shared/easing.js";
import { injectMusic }           from "../shared/music.js";
import { attachTransitionSfx }   from "../shared/sfx.js";
import { moderateInput }         from "../shared/moderation.js";

const CANVAS = { width: 1080, height: 1920 }; // default (9:16)
// Map the chosen orientation to canvas dimensions — drives design, measure, timeline + saved format.
function orientationToCanvas(orientation) {
  switch (orientation) {
    case "16:9": return { width: 1920, height: 1080 };
    case "1:1":  return { width: 1080, height: 1080 };
    case "4:5":  return { width: 1080, height: 1350 };
    default:     return { width: 1080, height: 1920 }; // 9:16
  }
}
const FPS    = 30;

// Stylish, non-revealing progress labels — deliberately vague so our pipeline
// (the "formula") is never narrated to the user or leaked over the SSE stream.
export const PROMPT_STATUS_STEPS = [
  "Warming up the studio…",
  "Shaping your vision…",
  "Finding the angle…",
  "Bringing it to life…",
  "Adding the spark…",
  "Polishing every frame…",
  "Composing the final cut…",
  "Almost ready…",
];

// A beat is full-bleed when its asset plays behind the design (cutouts are
// embedded by the designer instead)
const isFullBleedBeat = (beat) =>
  !!beat.asset?.src && (beat.asset.kind === "image" || beat.asset.kind === "video");
const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

// ── Timing ───────────────────────────────────────────────────────────────────

function assignWordTimestamps(beats, wordTimestamps) {
  if (!wordTimestamps?.length) return;
  let idx = 0;
  for (const beat of beats) {
    const n = (beat.script_line ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (n === 0 || idx >= wordTimestamps.length) continue;
    const startW = wordTimestamps[idx];
    const endW   = wordTimestamps[Math.min(idx + n - 1, wordTimestamps.length - 1)];
    beat.vo_start = parseFloat((startW?.start ?? 0).toFixed(3));
    beat.vo_end   = parseFloat((endW?.end ?? beat.vo_start + 3).toFixed(3));
    // Per-word timing kept for kinetic text sync (phrase reveals land on speech)
    beat.words = wordTimestamps.slice(idx, Math.min(idx + n, wordTimestamps.length))
      .map(w => ({ start: w.start, end: w.end }));
    idx = Math.min(idx + n, wordTimestamps.length);
  }

  // CRITICAL SYNC RULE: a beat lasts until the NEXT beat's first spoken word,
  // so every inter-beat pause belongs to the beat before it. Measuring only
  // first-word→last-word leaks the pauses, and the visual timeline (which
  // stacks beats contiguously) drifts seconds ahead of the audio by the end.
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].vo_start == null) continue;
    let nextStart = null;
    for (let j = i + 1; j < beats.length; j++) {
      if (beats[j].vo_start != null) { nextStart = beats[j].vo_start; break; }
    }
    const end = nextStart ?? beats[i].vo_end;
    beats[i].duration_seconds = parseFloat(Math.max(1.1, end - beats[i].vo_start).toFixed(3));
  }
}

// ── Kinetic text sync: phrase elements land when their words are spoken ─────

const normToken = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

// TTS tokens follow whitespace splits, so em-dash fusions ("china—not") hold
// two phrase-boundary words — match a phrase token to a fused token's edges.
function tokenMatches(beatTok, phraseTok) {
  return beatTok === phraseTok || (beatTok.length > phraseTok.length && (beatTok.startsWith(phraseTok) || beatTok.endsWith(phraseTok)));
}

function revealKeyframes(layer, delay) {
  const d = Math.max(0, parseFloat(delay.toFixed(3)));
  const y = layer.transform?.y ?? 0;
  // Eased rise-in (shared/easing) landing at the moment the words are spoken —
  // matches the eased entrance vocabulary instead of a flat 2-point linear tween.
  layer.keyframes = {
    x: [], scale: [], rotation: [], blur: [],
    opacity: track(d, d + 0.22, 0, 1, easeOutCubic, 3),
    y:       track(d, d + 0.32, y + 40, y, easeOutCubic, 4),
  };
}

function syncTextToSpeech(layers, beats) {
  for (const beat of beats) {
    const dur = beat.duration_seconds ?? 0;
    const textLayers = layers.filter(l =>
      l.type === "text" && l.id?.startsWith(`s${beat.beat_index}_`) && (l.content ?? "").trim());
    if (textLayers.length < 2) continue;

    // ── Plan A: word-sync — layers whose words mirror the spoken line ───────
    let synced = false;
    if (beat.words && beat.words.length >= 3) {
      const beatToks = (beat.script_line ?? "").trim().split(/\s+/).map(normToken);
      const matches = [];
      for (const layer of textLayers) {
        const toks = layer.content.trim().split(/\s+/).map(normToken).filter(Boolean);
        if (!toks.length) continue;
        let pos = -1;
        for (let i = 0; i + toks.length <= beatToks.length; i++) {
          let ok = true;
          for (let j = 0; j < toks.length; j++) {
            if (!tokenMatches(beatToks[i + j], toks[j])) { ok = false; break; }
          }
          if (ok) { pos = i; break; }
        }
        if (pos >= 0) matches.push({ layer, pos });
      }
      matches.sort((a, b) => a.pos - b.pos);
      const increasing = matches.length >= 2 && matches.every((m, i) => i === 0 || m.pos > matches[i - 1].pos);
      if (increasing) {
        const t0 = beat.words[0].start;
        for (const m of matches) {
          const w = beat.words[Math.min(m.pos, beat.words.length - 1)];
          revealKeyframes(m.layer, w.start - t0 - 0.08);
        }
        console.log(`[ai-video] kinetic sync: beat ${beat.beat_index} — ${matches.length} phrase reveals on speech`);
        synced = true;
      }
    }
    if (synced) continue;

    // ── Plan B: even-spread reveals — guaranteed motion on long beats even
    // when the designer paraphrased and word-matching can't engage ──────────
    if (dur < 2.2) continue;
    const heroes = textLayers
      .filter(l => (l.style?.fontSize ?? 0) >= 40)
      .sort((a, b) => (a.transform?.y ?? 0) - (b.transform?.y ?? 0));
    if (heroes.length < 2) continue;

    const window = Math.min(dur * 0.55, dur - 0.7);
    heroes.forEach((layer, i) => revealKeyframes(layer, (i * window) / (heroes.length - 1) * 0.9));
    console.log(`[ai-video] kinetic sync: beat ${beat.beat_index} — ${heroes.length} even-spread reveals (no word match)`);
  }
}

function estimateDurations(beats) {
  for (const beat of beats) {
    if (beat.duration_seconds == null) {
      const n = (beat.script_line ?? "").trim().split(/\s+/).filter(Boolean).length;
      beat.duration_seconds = Math.max(1.2, parseFloat((n / 2.1).toFixed(2)));
    }
  }
}

// ── Deterministic densifier: no beat may run long ────────────────────────────
// The director keeps occasionally packing a full sentence into one beat
// despite the rules. Code fixes what prompts can't: any beat longer than
// MAX_BEAT_SECONDS splits at the speech boundary nearest its midpoint, the
// second half becoming a continuation beat (same visual family, new text).

const MAX_BEAT_SECONDS = 4.2;
// No single backdrop may hold longer than this — short-form needs a fresh visual every few
// seconds. A held visual = a full-bleed beat plus its continues_previous followers sharing one
// asset; capVisualHold() breaks any run that would exceed it into distinct visuals.
const MAX_VISUAL_HOLD = 4.0;
const FULL_BLEED_TYPES = new Set(["ai_image", "photo", "stock_video"]);

function splitLongBeats(beats) {
  const out = [];
  for (const beat of beats) {
    const tokens = (beat.script_line ?? "").trim().split(/\s+/).filter(Boolean);
    const dur = beat.duration_seconds ?? 0;

    const splittable = !beat.continues_previous && dur > MAX_BEAT_SECONDS && tokens.length >= 6
      && beat.words && beat.words.length === tokens.length;
    if (!splittable) { out.push(beat); continue; }

    // Split index: nearest to the time midpoint, preferring a punctuation boundary
    const midTime = beat.vo_start + dur / 2;
    let k = -1, bestScore = Infinity;
    for (let i = 2; i <= tokens.length - 2; i++) {
      const gap = Math.abs(beat.words[i].start - midTime);
      const punctBonus = /[,—–;:]$/.test(tokens[i - 1]) || /—/.test(tokens[i - 1]) ? -0.6 : 0;
      const score = gap + punctBonus;
      if (score < bestScore) { bestScore = score; k = i; }
    }
    if (k < 2) { out.push(beat); continue; }

    const partA = tokens.slice(0, k).join(" ");
    const partB = tokens.slice(k).join(" ");
    const wordsA = beat.words.slice(0, k);
    const wordsB = beat.words.slice(k);

    const beatA = {
      ...beat,
      script_line: partA,
      words: wordsA,
      vo_end: wordsA[wordsA.length - 1].end,
      duration_seconds: parseFloat(Math.max(1.1, wordsB[0].start - beat.vo_start).toFixed(3)),
      transition_out: "fade",
    };
    const beatB = {
      ...beat,
      script_line: partB,
      words: wordsB,
      vo_start: wordsB[0].start,
      duration_seconds: parseFloat(Math.max(1.1, beat.vo_end - wordsB[0].start).toFixed(3)),
      continues_previous: true,
      content: {
        kind: beat.content?.kind === "none" ? "none" : (beat.content?.kind ?? "title"),
        headline: partB.replace(/[.?!]$/, "").slice(0, 80),
        subtext: null, items: null, attribution: null,
      },
      subject_entity: null,
    };
    out.push(beatA, beatB);
    console.log(`[ai-video] split long beat ${beat.beat_index} (${dur.toFixed(1)}s) → "${partA}" + "${partB}"`);
  }
  out.forEach((b, i) => { b.beat_index = i; });
  return out;
}

/**
 * Visual-variety guard. The director sometimes chains many beats onto ONE held visual via
 * continues_previous (e.g. 3 beats on a single image for 8s). Short-form needs a fresh visual
 * every few seconds, so any continuation run of a full-bleed visual that would exceed
 * MAX_VISUAL_HOLD is broken into a new, DISTINCT visual. The broken beat is given its own stock
 * query (continuation beats usually carry none) so the resolver fetches a different asset rather
 * than inheriting the same one. Runs BEFORE resolveVisuals so the new beats get real assets.
 */
function capVisualHold(beats) {
  let runDur = 0, runIsVisual = false;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const dur = b.duration_seconds ?? 0;
    const visual = FULL_BLEED_TYPES.has(b.asset_type);
    if (i === 0 || !b.continues_previous) { runDur = dur; runIsVisual = visual; continue; }

    if (runIsVisual && visual && runDur + dur > MAX_VISUAL_HOLD + 0.05) {
      b.continues_previous = false; // cut to a fresh, distinct visual here
      if (!b.image_prompt && !b.subject_entity && !b.shot_query) {
        const q = (Array.isArray(b.keywords) && b.keywords.length
          ? b.keywords.join(" ")
          : (b.visual_concept || b.script_line || "")).trim().slice(0, 120);
        b.shot_query = q;
        // free + distinct beats a capped gen — flip the directive's source too (the executor keys on it)
        if (b.source === "ai_image") { b.source = "stock_video"; b.asset_type = "stock_video"; }
      }
      console.log(`[ai-video] cap visual hold: broke continuation at beat ${b.beat_index} (held ${runDur.toFixed(1)}s)`);
      runDur = dur; runIsVisual = visual;
    } else {
      runDur += dur;
    }
  }
  return beats;
}

// ── Full-bleed asset layers + motion ─────────────────────────────────────────

/**
 * Camera recipes — the director chooses by emotion, code renders the move.
 * Images keep a base zoom margin so pans never reveal edges.
 */
function cameraKeyframes(camera, kind, dur) {
  const isVideo = kind === "video";
  switch (camera) {
    case "fast_zoom_in":
      return { ...NO_KF, scale: isVideo
        ? [{ time: 0, value: 1.0 }, { time: dur, value: 1.16 }]
        : [{ time: 0, value: 1.05 }, { time: dur, value: 1.28 }] };
    case "slow_zoom_out":
      return { ...NO_KF, scale: isVideo
        ? [{ time: 0, value: 1.08 }, { time: dur, value: 1.0 }]
        : [{ time: 0, value: 1.2 }, { time: dur, value: 1.06 }] };
    case "pan_left":
      return { ...NO_KF, scale: [{ time: 0, value: 1.16 }, { time: dur, value: 1.16 }],
        x: [{ time: 0, value: 50 }, { time: dur, value: -50 }] };
    case "pan_right":
      return { ...NO_KF, scale: [{ time: 0, value: 1.16 }, { time: dur, value: 1.16 }],
        x: [{ time: 0, value: -50 }, { time: dur, value: 50 }] };
    case "hold":
      return { ...NO_KF, scale: [{ time: 0, value: 1.03 }, { time: dur, value: 1.06 }] };
    case "slow_zoom_in":
    default:
      return { ...NO_KF, scale: isVideo
        ? [{ time: 0, value: 1.0 }, { time: dur, value: 1.07 }]
        : [{ time: 0, value: 1.06 }, { time: dur, value: 1.16 }] };
  }
}

function buildAssetLayer(beat, start, end, canvas = CANVAS) {
  const dur = parseFloat((end - start).toFixed(3));
  const isVideo = beat.asset.kind === "video";
  return {
    id:      `s${beat.beat_index}_media`,
    trackId: `s${beat.beat_index}_media`,
    name:    isVideo ? "Clip" : "Visual",
    type:    isVideo ? "video" : "image",
    src:     beat.asset.src,
    start, end,
    zIndex:  0,
    visible: true, locked: false, sfx: null,
    ...(isVideo ? { muted: true, volume: 0, trimStart: 0, trimEnd: dur, playbackRate: 1 } : {}),
    objectFit: "cover",
    keyframes: cameraKeyframes(beat.camera, beat.asset.kind, dur),
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: {
      x: 0, y: 0, width: canvas.width, height: canvas.height,
      opacity: 1, scale: 1, blur: 0, rotation: 0,
      borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    },
  };
}

/**
 * Template furniture for shot beats — deterministic, code-built, never
 * GPT-composed over imagery it can't see.
 */
// Legibility scrims for content-bearing shots. EVERY variant darkens the lower region (where
// the hero text lives) so readability is guaranteed; they differ in their secondary character
// so the overlay furniture isn't identical every scene. Chosen by beat index → adjacent shots
// always differ. Clean shots (no overlay) get a soft cinematic wash instead.
const SCRIM_VARIANTS = [
  // bottom band — the classic
  "linear-gradient(180deg, rgba(0,0,0,0) 38%, rgba(0,0,0,0.34) 72%, rgba(0,0,0,0.66) 100%)",
  // both ends — also protects a top eyebrow, clear middle for the image
  "linear-gradient(180deg, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.06) 26%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0.40) 72%, rgba(0,0,0,0.68) 100%)",
  // diagonal lean toward the bottom-left — suits a left-aligned stack
  "linear-gradient(155deg, rgba(0,0,0,0) 42%, rgba(0,0,0,0.30) 74%, rgba(0,0,0,0.68) 100%)",
  // vignette + base — darkens edges and floor, keeps the centre clear
  "radial-gradient(125% 85% at 50% 16%, rgba(0,0,0,0) 44%, rgba(0,0,0,0.42) 100%), linear-gradient(180deg, rgba(0,0,0,0) 56%, rgba(0,0,0,0.52) 100%)",
];

function buildShotScrim(beat, start, end, canvas = CANVAS) {
  const strong = !!(beat.content?.kind && beat.content.kind !== "none");
  return {
    id: `s${beat.beat_index}_scrim`, trackId: `s${beat.beat_index}_scrim`,
    name: "Scrim", type: "gradient", start, end, zIndex: 1,
    visible: true, locked: false, sfx: null,
    gradient: strong
      ? SCRIM_VARIANTS[beat.beat_index % SCRIM_VARIANTS.length]
      : "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.28) 100%)",
    keyframes: { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { x: 0, y: 0, width: canvas.width, height: canvas.height, opacity: 1, scale: 1, blur: 0, rotation: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  };
}

function buildShotOverlay(beat, start, end, canvas = CANVAS) {
  const dur = parseFloat((end - start).toFixed(3));
  const d = Math.min(0.35 * dur, 0.9); // the stark line lands shortly after the cut
  const y = Math.round(canvas.height * 0.74);
  return {
    id: `s${beat.beat_index}_overlay`, trackId: `s${beat.beat_index}_overlay`,
    name: "Overlay", type: "text", content: beat.content?.headline ?? "",
    start, end, zIndex: 10,
    visible: true, locked: false, sfx: null,
    keyframes: {
      ...NO_KF,
      opacity: [{ time: d, value: 0 }, { time: parseFloat((d + 0.3).toFixed(3)), value: 1 }],
      y:       [{ time: d, value: y + 30 }, { time: parseFloat((d + 0.3).toFixed(3)), value: y }],
    },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { x: Math.round(canvas.width * 0.08), y, width: Math.round(canvas.width * 0.84), height: 120, opacity: 1, scale: 1, blur: 0, rotation: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
    style: {
      fontSize: 60, fontFamily: "Inter, sans-serif", fontWeight: 800,
      color: "#ffffff", textAlign: "center", lineHeight: 1.15, letterSpacing: 0.5,
      textShadow: "0 2px 26px rgba(0,0,0,0.8)", textTransform: "none",
    },
    animation: null, dataRole: "overlay", dataLayer: "text",
  };
}

/** Beat windows from cumulative durations — independent of designed layers. */
function windowsFromDurations(beats) {
  const windows = [];
  let cursor = 0;
  for (const b of beats) {
    const dur = parseFloat((b.duration_seconds ?? 2).toFixed(4));
    windows.push({ start: parseFloat(cursor.toFixed(4)), end: parseFloat((cursor + dur).toFixed(4)) });
    cursor += dur;
  }
  return windows;
}

// ── Transitions on every cut + selective SFX ─────────────────────────────────

const TRANSITION_DURATION = 0.28;
// Beats occupy sequential windows — they can't overlap, so fading the OUTGOING
// beat to transparent produces a dip to black at every cut (the "black flash"
// problem). Only slides may animate the out side (they move, staying opaque);
// fades and zooms act on the INCOMING side only.
const TRANSITION_MAP = {
  zoom:         { out: "none",       in: "zoom-in" },
  "slide-left": { out: "slide-left", in: "slide-left" },
  "slide-up":   { out: "slide-up",   in: "slide-up" },
  "slide-down": { out: "slide-down", in: "slide-down" },
  fade:         { out: "none",       in: "fade" },
};

function applyTransitions(layers, beats) {
  for (let i = 0; i < beats.length - 1; i++) {
    // Cuts into a continuation beat read as a BUILD, not a scene change:
    // incoming quick-fades over a hard cut, never a whole-scene move
    const t = beats[i + 1]?.continues_previous
      ? { out: "none", in: "fade" }
      : TRANSITION_MAP[beats[i].transition_out];
    if (!t) continue;
    for (const layer of layers) {
      if (!layer.id?.startsWith(`s${i}_`) || layer.type === "audio") continue;
      layer.transition = {
        in:  layer.transition?.in ?? { type: "none", duration: 0 },
        out: { type: t.out, duration: TRANSITION_DURATION },
      };
    }
    for (const layer of layers) {
      const isNextBase = layer.id === `s${i + 1}_media` || (layer.id?.startsWith(`s${i + 1}_`) && /background/.test(layer.id));
      if (!isNextBase) continue;
      layer.transition = {
        in:  { type: t.in, duration: TRANSITION_DURATION },
        out: layer.transition?.out ?? { type: "none", duration: 0 },
      };
    }
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * composeFilm — plan the whole film: WRITER (script + on-screen content) then ART-DIRECTOR
 * (every per-scene visual decision + style + palette). Replaces the old single directBeats() call;
 * both the cheap plan/review path and the full pipeline call this, so a film is planned ONE way.
 */
async function composeFilm({ research, styleId = "auto", targetDuration = 45, language = "en", theme = "auto", accentColor = null, accentColor2 = null, orientation = "9:16" }) {
  const script = await writeScript({ research, targetDuration, language });
  const dir    = await directVisuals({ research, beats: script.beats, targetDuration, styleId, theme, accentColor, accentColor2, orientation });
  const beats  = dir.beats.map(b => ({ ...b, niche: script.niche }));
  return {
    project_name: script.project_name,
    style:        dir.style,
    palette:      dir.palette,
    niche:        script.niche,
    music_mood:   script.music_mood,
    publish:      script.publish,
    narration:    script.narration,
    beats,
  };
}

/**
 * runPromptPlan — the cheap half: research + direction only. Shown to the
 * user for review/revision BEFORE any production money is spent.
 */
export async function runPromptPlan({ prompt, styleId = "auto", targetDuration = 45, language = "en", theme = "auto", accentColor = null, accentColor2 = null, orientation = "9:16" }) {
  await moderateInput(prompt, { label: "prompt-to-video input" });
  const research = await researchTopic(prompt);
  const film = await composeFilm({ research, styleId, targetDuration, language, theme, accentColor, accentColor2, orientation });
  const words = film.beats.reduce((a, b) => a + b.script_line.trim().split(/\s+/).filter(Boolean).length, 0);
  return {
    plan: { research, film },
    summary: {
      projectName: film.project_name,
      styleId:     film.style.id,
      musicMood:   film.music_mood,
      script:      film.beats.map(b => b.script_line).join(" "),
      words,
      estSeconds:  Math.round(words / 2.1),
      beatCount:   film.beats.length,
      shotCount:   film.beats.filter(b => b.source && b.source !== "typographic").length,
      references:  (research.entities ?? []).slice(0, 5).map(e => e.name),
    },
  };
}

export async function runPromptPipeline(params, onStep) {
  const {
    prompt, userId,
    styleId = "auto", targetDuration = 45, language = "en", voiceId = null,
    theme = "auto", accentColor = null, accentColor2 = null,
    plan = null,
  } = params;

  const runId = `prompt-${userId}-${Date.now()}`;
  const orientation = params.orientation ?? "9:16"; // drives canvas, stock search + saved project
  const canvas = orientationToCanvas(orientation);
  const step  = (msg) => { console.log(`[ai-video] ${msg}`); onStep?.({ step: msg }); };

  let research, film;
  if (plan?.research && plan?.film?.beats?.length) {
    // Pre-approved plan from the review step — skip straight to production
    research = plan.research;
    film     = plan.film;
    console.log(`[ai-video] using approved plan: ${film.beats.length} beats, style=${film.style?.id}`);
  } else {
    await moderateInput(prompt, { label: "prompt-to-video input" });
    // ── Stage 0: Research ───────────────────────────────────────────────────
    step(PROMPT_STATUS_STEPS[0]);
    research = await researchTopic(prompt);

    // ── Stage 1: Writer (script + content) → Art-Director (visuals + style) ──
    step(PROMPT_STATUS_STEPS[1]);
    film = await composeFilm({ research, styleId, targetDuration, language, theme, accentColor, accentColor2, orientation });
  }
  const { style, palette } = film;
  let beats = film.beats;

  // ── Safety: moderate the EFFECTIVE production content before synthesis ─────
  // A plan from the review step is client-editable and skips the prompt moderation above, so a
  // user could smuggle arbitrary script_line / image_prompt straight into TTS and image-gen.
  // Moderate the actual text we're about to synthesize (script + image prompts + stock queries +
  // on-screen copy) regardless of how we got here. Throws CONTENT_BLOCKED → route refunds.
  const moderationText = beats.map((b) => {
    const contentText = b.content && typeof b.content === "object"
      ? Object.values(b.content).filter((v) => typeof v === "string").join(" ") : "";
    return [b.script_line, b.image_prompt, b.shot_query, contentText].filter(Boolean).join(" ");
  }).join("\n").trim();
  if (moderationText) await moderateInput(moderationText, { label: "ai-video production content (script + prompts)" });

  // ── Stage 2: TTS FIRST — beat windows from real speech ───────────────────
  step(PROMPT_STATUS_STEPS[2]);
  let voiceoverUrl = null, voiceoverDuration = 0;
  const fullScript = beats.map(b => b.script_line).join(" ").trim();
  // TTS-only punctuation softening: colons/semicolons read as long pauses.
  // Word count and order are unchanged, so timestamp alignment is unaffected.
  const ttsScript = fullScript.replace(/(\w):\s/g, "$1, ").replace(/;\s/g, ", ");
  try {
    const tts = await generateFullVoiceover(ttsScript, runId, voiceId, 1.05);
    voiceoverUrl      = tts.audio_url;
    voiceoverDuration = tts.duration_seconds ?? 0;
    if (tts.wordTimestamps?.length) assignWordTimestamps(beats, tts.wordTimestamps);
  } catch (e) {
    console.warn("[ai-video] TTS failed (non-fatal):", e.message);
  }
  estimateDurations(beats);
  beats = splitLongBeats(beats);
  beats = capVisualHold(beats); // enforce a fresh, distinct visual every ≤4s (before assets resolve)
  if (beats.length > 0) {
    const sum  = beats.reduce((a, b) => a + b.duration_seconds, 0);
    const last = beats[beats.length - 1];
    // Cover trailing audio, but never balloon the final beat — anything beyond
    // 1.5s of overshoot is audio-tail estimation noise, not content.
    const overshoot = Math.max(0, voiceoverDuration - sum);
    if (overshoot > 0) {
      last.duration_seconds = parseFloat((last.duration_seconds + Math.min(overshoot, 1.5)).toFixed(3));
      if (overshoot > 1.5) console.warn(`[ai-video] voiceover overshoot ${overshoot.toFixed(1)}s — capped last-beat pad at 1.5s`);
    }
    last.duration_seconds = parseFloat((last.duration_seconds + 0.5).toFixed(3));
  }

  // ── Stage 3: Visual resolution (parallel) ─────────────────────────────────
  step(PROMPT_STATUS_STEPS[3]);
  await resolveVisuals(beats, style, runId, orientation);

  // ── Stage 4: Beat design (parallel) ───────────────────────────────────────
  step(PROMPT_STATUS_STEPS[4]);
  const designCtx = { style, palette, canvasW: canvas.width, canvasH: canvas.height, language };
  // Canvas-mode design for HTML/cutout beats; overlay-mode design for shot
  // beats carrying content. Clean shots (content.kind "none") get no design.
  const hasOverlayContent = (b) => b.content?.kind && b.content.kind !== "none";
  const designedBeats = beats.filter(b => !isFullBleedBeat(b) || hasOverlayContent(b));
  console.log(`[ai-video] designing ${designedBeats.length}/${beats.length} beats (${beats.filter(b => isFullBleedBeat(b) && !hasOverlayContent(b)).length} clean shots)`);
  const designs = await designAllBeats(designedBeats, designCtx);
  const beatHTMLs = beats.map(b => designs.find(d => d.beatIndex === b.beat_index)?.html ?? "");

  // ── Stage 5: Measure (headless browser lays out the natural HTML/CSS) ─────
  // Replaces the old flat-pixel parser + lint/repair scaffolding: GPT writes free
  // HTML, a real browser renders it, htmlMeasure flattens it to positioned layers.
  step(PROMPT_STATUS_STEPS[5]);
  const beatGraphs = await Promise.all(beats.map(async (beat, i) => {
    const overlayMode = isFullBleedBeat(beat);
    if (overlayMode && !hasOverlayContent(beat)) return []; // clean shots carry no designed layers
    const html = beatHTMLs[i];
    if (!html) return [];
    try {
      return await measureSceneHTML(html, beat.beat_index, canvas);
    } catch (err) {
      console.warn(`[ai-video/measure] beat ${beat.beat_index} measure failed: ${err.message}`);
      return [];
    }
  }));
  try { await closeMeasureBrowser(); } catch {}

  // ── Stage 6: Assembly ─────────────────────────────────────────────────────
  step(PROMPT_STATUS_STEPS[6]);
  const scenesForBuilder = beats.map(b => ({
    scene_index: b.beat_index,
    intent:      b.asset_type,
    script_segment: b.script_line,
    duration_seconds: b.duration_seconds,
  }));
  const projectContext = {
    productName: film.project_name,
    niche:       research.topic,
    accentColor: palette.accent,
    musicMood:   film.music_mood,
    canvasWidth: canvas.width, canvasHeight: canvas.height, fps: FPS,
  };
  const { timeline } = buildTimeline(beatGraphs, scenesForBuilder, projectContext);
  const finalTimeline = timeline;
  const totalDur = finalTimeline.format.duration;

  // Shot-beat assembly: code-built media + scrim + optional stark overlay.
  // Consecutive continuation beats sharing the same asset get ONE media layer
  // spanning all of them — the backdrop plays through the cuts continuously.
  const windows = windowsFromDurations(beats);
  const shotLayers = [];
  let lastMedia = null; // { layer, src, beatIndex }
  for (const beat of beats) {
    if (!isFullBleedBeat(beat)) { lastMedia = null; continue; }
    const win = windows[beat.beat_index];

    if (beat.continues_previous && lastMedia && lastMedia.src === beat.asset.src && lastMedia.beatIndex === beat.beat_index - 1) {
      // Extend the previous media layer across this beat's window
      const layer = lastMedia.layer;
      layer.end = win.end;
      const dur = parseFloat((layer.end - layer.start).toFixed(3));
      if (layer.type === "video") layer.trimEnd = dur;
      layer.keyframes = cameraKeyframes(beat.camera ?? "slow_zoom_in", beat.asset.kind, dur);
      lastMedia.beatIndex = beat.beat_index;
    } else {
      const layer = buildAssetLayer(beat, win.start, win.end, canvas);
      shotLayers.push(layer);
      lastMedia = { layer, src: beat.asset.src, beatIndex: beat.beat_index };
    }

    shotLayers.push(buildShotScrim(beat, win.start, win.end, canvas));
    // Fallback stark line only if overlay content exists but its design failed
    const hasDesignedOverlay = finalTimeline.layers.some(l => l.id?.startsWith(`s${beat.beat_index}_`) && l.type === "text");
    if (beat.content?.kind && beat.content.kind !== "none" && beat.content.headline && !hasDesignedOverlay) {
      shotLayers.push(buildShotOverlay(beat, win.start, win.end, canvas));
    }
  }
  if (shotLayers.length) finalTimeline.layers = [...shotLayers, ...finalTimeline.layers];

  // Self-audit visual variety so a too-static video is caught in logs, not by eye.
  const distinctMedia = new Set(shotLayers.filter(l => l.type === "image" || l.type === "video").map(l => l.src)).size;
  const htmlScenes    = beats.filter(b => !isFullBleedBeat(b)).length;
  const variety       = distinctMedia + htmlScenes;
  const expected      = Math.max(2, Math.round(totalDur / 4));
  if (totalDur > 8 && variety < Math.round(expected * 0.7)) {
    console.warn(`[ai-video] LOW VISUAL VARIETY: only ${variety} distinct visuals across ${totalDur.toFixed(0)}s (${distinctMedia} media + ${htmlScenes} html) — expected ~${expected}.`);
  } else {
    console.log(`[ai-video] visual variety: ${variety} distinct visuals across ${totalDur.toFixed(0)}s (${distinctMedia} media + ${htmlScenes} html)`);
  }

  // Kinetic text: phrase elements land exactly when their words are spoken
  syncTextToSpeech(finalTimeline.layers, beats);

  // A transition on every cut, selective whoosh, voiceover, music
  applyTransitions(finalTimeline.layers, beats);
  await attachTransitionSfx(finalTimeline.layers, beats, { label: "ai-video" });

  // ── Backdrop continuity — NEVER show black ────────────────────────────────
  // The opaque scene media is the full-canvas image/video at z0; the gradients are scrims (mostly
  // transparent), so a gap in media = black frames. Gaps happen when a beat's asset/design fails
  // (a hole between scenes) or when the audio runs longer than the beats (a black tail — common
  // with Hindi TTS, where speech is longer than the estimated windows). Fill every gap in [0,
  // totalDur] by HOLDING the previous scene's image over it (or an opaque palette backdrop if the
  // preceding media is a video / there's none yet).
  {
    const fullCanvas = (l) => (l.transform?.width ?? 0) >= canvas.width * 0.95 && (l.transform?.height ?? 0) >= canvas.height * 0.95;
    const isMedia = (l) => (l.type === "image" || l.type === "video") && fullCanvas(l);
    const media = finalTimeline.layers.filter(isMedia).sort((a, b) => (a.start || 0) - (b.start || 0));
    const opaqueBg = palette?.bg || palette?.background || palette?.base || "#0b0b12";
    const gradFill = `linear-gradient(160deg, ${opaqueBg} 0%, #000 100%)`;
    const fills = [];
    let cursor = 0, prevImg = null;
    const fill = (s, e) => {
      if (e - s < 0.08) return;
      if (prevImg) {
        fills.push({ ...JSON.parse(JSON.stringify(prevImg)), id: `hold_${s.toFixed(2)}`, trackId: "track_backdrop_fill", start: s, end: e, zIndex: 0, keyframes: {}, transition: null, sfx: null });
      } else {
        fills.push({ id: `bgfill_${s.toFixed(2)}`, trackId: "track_backdrop_fill", type: "gradient", name: "Backdrop", start: s, end: e, zIndex: 0, visible: true, locked: false, gradient: gradFill, keyframes: {}, transition: null, sfx: null,
          transform: { x: 0, y: 0, width: canvas.width, height: canvas.height, opacity: 1, scale: 1, blur: 0, rotation: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" } });
      }
    };
    for (const m of media) {
      const s = m.start || 0, e = m.end || 0;
      if (s > cursor + 0.08) fill(cursor, s);
      if (m.type === "image") prevImg = m; // only images are safe to freeze-hold over a gap
      cursor = Math.max(cursor, e);
    }
    if (cursor < totalDur - 0.08) fill(cursor, totalDur);
    if (fills.length) {
      console.log(`[ai-video] backdrop continuity: filled ${fills.length} gap(s) (no black frames)`);
      finalTimeline.layers.unshift(...fills);
    }
  }

  if (voiceoverUrl) {
    finalTimeline.layers.push({
      id: "voiceover_full", trackId: "track_voiceover",
      type: "audio", audioType: "voiceover", src: voiceoverUrl,
      start: 0, end: totalDur, zIndex: 0,
      visible: true, locked: false, trimStart: 0, trimEnd: totalDur,
      volume: 1.0, muted: false, fadeIn: 0.1, fadeOut: 0.3,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
  }
  await injectMusic(finalTimeline, { mood: film.music_mood, volume: 0.2, fadeIn: 0.8, fadeOut: 1.5, label: "ai-video" });

  finalTimeline.full_script = fullScript;
  // Persist source + generated publish copy in the project meta so the editor's Publish
  // button can detect Prompt-to-Video and pre-fill the title/caption/hashtags. Also persist the
  // exact user prompt + the resolved visual style (incl. "auto" picks) so they're visible/traceable
  // in the saved project (previously only in raw_ai_json, which isn't in the exported timeline).
  finalTimeline.meta = {
    ...(finalTimeline.meta || {}),
    source: "ai_video",
    publish: film.publish || null,
    user_prompt: prompt || null,
    visual_style: style?.id || null,
    visual_style_label: style?.label || null,
  };

  // Strip redundant keyframes (constant tracks, plain fades) — motion identical, far less bloat.
  simplifyTimelineKeyframes(finalTimeline);

  // ── Stage 7: Save with regen context ──────────────────────────────────────
  step(PROMPT_STATUS_STEPS[7]);
  let editorProjectId = null;
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           userId,
        name:              film.project_name,
        safe_project_json: finalTimeline,
        orientation:       orientation,
        mode:              "timeline",
        source:            "ai_video",
        editor_version:    "timeline",
        raw_ai_json: {
          pipeline: "ai_video_v1",
          prompt,
          style_id: style.id,
          palette,
          research: { topic: research.topic, angle: research.angle, entities: research.entities, facts: research.facts, artifacts: research.artifacts },
          beats: beats.map(b => ({
            beat_index: b.beat_index, asset_type: b.asset_type,
            source: b.source ?? null, layout: b.layout ?? null, fallback: b.fallback ?? null,
            script_line: b.script_line,
            content: b.content, visual_concept: b.visual_concept, camera: b.camera ?? null,
            image_prompt: b.image_prompt, shot_query: b.shot_query,
            transition_out: b.transition_out, duration_seconds: b.duration_seconds,
            asset: b.asset ? { kind: b.asset.kind, src: b.asset.src } : null,
          })),
          beatHTMLs,
        },
      })
      .select("id").single();
    editorProjectId = row?.id ?? null;
    if (!editorProjectId) throw new Error("projects insert returned no id");
    console.log(`[ai-video] saved project: ${editorProjectId}`);
  } catch (e) {
    // FATAL: the user paid for a deliverable. If we can't persist it there's nothing to open,
    // so throw → the route's catch refunds the credits (instead of returning projectId:null
    // with a misleading "done"). The render artifacts are cheap to regenerate on retry.
    console.error("[ai-video] projects insert failed (fatal — refunding):", e.message);
    throw new Error(`Save failed — your credits were refunded: ${e.message}`);
  }

  return {
    projectId:        editorProjectId,
    projectName:      film.project_name,
    beatCount:        beats.length,
    duration_seconds: parseFloat(totalDur.toFixed(2)),
    publish:          film.publish || null, // social post copy: { title, description, hashtags }
  };
}
