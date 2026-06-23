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
import { researchTopic }         from "./researcher.js";
import { directBeats }           from "./beatDirector.js";
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
function buildShotScrim(beat, start, end, canvas = CANVAS) {
  const strong = !!(beat.content?.kind && beat.content.kind !== "none");
  return {
    id: `s${beat.beat_index}_scrim`, trackId: `s${beat.beat_index}_scrim`,
    name: "Scrim", type: "gradient", start, end, zIndex: 1,
    visible: true, locked: false, sfx: null,
    gradient: strong
      ? "linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.62) 100%)"
      : "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.28) 100%)",
    keyframes: { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { x: 0, y: 0, width: canvas.width, height: canvas.height, opacity: 1, scale: 1, blur: 0, rotation: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  };
}

function buildShotOverlay(beat, start, end, style, canvas = CANVAS) {
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
 * runPromptPlan — the cheap half: research + direction only. Shown to the
 * user for review/revision BEFORE any production money is spent.
 */
export async function runPromptPlan({ prompt, styleId = "auto", targetDuration = 45, language = "en" }) {
  await moderateInput(prompt, { label: "prompt-to-video input" });
  const research = await researchTopic(prompt);
  const film = await directBeats({ research, styleId, targetDuration, language });
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
      shotCount:   film.beats.filter(b => ["ai_image", "photo", "stock_video"].includes(b.asset_type)).length,
      references:  (research.entities ?? []).slice(0, 5).map(e => e.name),
    },
  };
}

export async function runPromptPipeline(params, onStep) {
  const {
    prompt, userId,
    styleId = "auto", targetDuration = 45, language = "en", voiceId = null,
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

    // ── Stage 1: Beat direction (script + shot list, one call) ─────────────
    step(PROMPT_STATUS_STEPS[1]);
    film = await directBeats({ research, styleId, targetDuration, language });
  }
  const { style, palette } = film;
  let beats = film.beats;

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
  const designCtx = { style, palette, canvasW: canvas.width, canvasH: canvas.height };
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
      shotLayers.push(buildShotOverlay(beat, win.start, win.end, style, canvas));
    }
  }
  if (shotLayers.length) finalTimeline.layers = [...shotLayers, ...finalTimeline.layers];

  // Kinetic text: phrase elements land exactly when their words are spoken
  syncTextToSpeech(finalTimeline.layers, beats);

  // A transition on every cut, selective whoosh, voiceover, music
  applyTransitions(finalTimeline.layers, beats);
  await attachTransitionSfx(finalTimeline.layers, beats, { label: "ai-video" });

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
  // button can detect Prompt-to-Video and pre-fill the title/caption/hashtags.
  finalTimeline.meta = { ...(finalTimeline.meta || {}), source: "ai_video", publish: film.publish || null };

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
            beat_index: b.beat_index, asset_type: b.asset_type, script_line: b.script_line,
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
    console.log(`[ai-video] saved project: ${editorProjectId}`);
  } catch (e) {
    console.warn("[ai-video] projects insert failed (non-fatal):", e.message);
  }

  return {
    projectId:        editorProjectId,
    projectName:      film.project_name,
    beatCount:        beats.length,
    duration_seconds: parseFloat(totalDur.toFixed(2)),
    publish:          film.publish || null, // social post copy: { title, description, hashtags }
  };
}
