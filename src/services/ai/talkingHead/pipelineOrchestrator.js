/**
 * talkingHead/pipelineOrchestrator.js — Talking Head (standalone service).
 *
 * Turns a user-uploaded talking-head clip into an editable, EDITED timeline. The speaker's footage
 * is the continuous spine (audio always plays); an editorial director decides per beat whether to
 * stay on the speaker or CUT AWAY to an illustrative B-roll visual (real photo → stock → AI image),
 * and word-synced captions run on top. This is the variety the service is about — not just captions.
 *
 * No Remotion at generate-time — we output an editor project (source "talking_head"); the final
 * render happens only when the user exports. SaaS TH pipeline is untouched (copied from, not edited).
 *
 * Phase 1b-1: speaker + full-screen B-roll cutaways + captions. Phase 1b-2 adds designed HTML
 * fact/number/icon cards, over-speaker overlays, and transition SFX.
 */
import { supabaseAdmin } from "../../../server/middleware/shared.js";
import { transcribeVideo, segmentWords } from "./transcript.js";
import { buildCaptionLayers } from "./captionBuilder.js";
import { directTalkingHead } from "./thDirector.js";
import { resolveVisuals } from "./visualResolver.js";
import { designAllBeats } from "./beatDesigner.js";
import { measureSceneHTML, closeMeasureBrowser } from "../shared/converter.js";
import { track, easeOutCubic } from "../shared/easing.js";
import { loadSfxTracks, pickSfx } from "./sfx.js";
import { injectMusic } from "../shared/music.js";

export const TH_STATUS_STEPS = [
  "Listening to your video…",
  "Reading every word…",
  "Finding the beats…",
  "Planning the visuals…",
  "Gathering the b-roll…",
  "Styling your captions…",
  "Composing the timeline…",
  "Almost ready…",
];

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

function canvasFromDimensions(dim, reframe) {
  if (reframe === "9:16") return { width: 1080, height: 1920, orientation: "9:16" };
  if (!dim?.width || !dim?.height) return { width: 1080, height: 1920, orientation: "9:16" };
  const r = dim.width / dim.height;
  if (r > 1.2)  return { width: 1920, height: 1080, orientation: "16:9" };
  if (r < 0.85) return { width: 1080, height: 1920, orientation: "9:16" };
  return { width: 1080, height: 1080, orientation: "1:1" };
}

// Ken-Burns recipes (copied/condensed from AI Video) — chosen by the director's camera, by emotion.
function cameraKeyframes(camera, isVideo, dur) {
  switch (camera) {
    case "fast_zoom_in":  return { ...NO_KF, scale: isVideo ? [{ time: 0, value: 1.0 }, { time: dur, value: 1.16 }] : [{ time: 0, value: 1.05 }, { time: dur, value: 1.28 }] };
    case "slow_zoom_out": return { ...NO_KF, scale: isVideo ? [{ time: 0, value: 1.08 }, { time: dur, value: 1.0 }] : [{ time: 0, value: 1.2 }, { time: dur, value: 1.06 }] };
    case "pan_left":      return { ...NO_KF, scale: [{ time: 0, value: 1.16 }, { time: dur, value: 1.16 }], x: [{ time: 0, value: 50 }, { time: dur, value: -50 }] };
    case "pan_right":     return { ...NO_KF, scale: [{ time: 0, value: 1.16 }, { time: dur, value: 1.16 }], x: [{ time: 0, value: -50 }, { time: dur, value: 50 }] };
    case "hold":          return { ...NO_KF, scale: [{ time: 0, value: 1.03 }, { time: dur, value: 1.06 }] };
    default:              return { ...NO_KF, scale: isVideo ? [{ time: 0, value: 1.0 }, { time: dur, value: 1.07 }] : [{ time: 0, value: 1.06 }, { time: dur, value: 1.16 }] };
  }
}

// The speaker spine as a blurred-fill pair: a blurred, scaled-up COVER copy behind (muted) so any
// letterbox area becomes a soft blur of the same footage, and the speaker CONTAIN'd on top (audio,
// never cropped). Works for any source aspect on any canvas — no black bars, no cut-off heads.
// Punch-in scale keyframes: hold 1.0, quick-zoom to 1.12 over an emphasis window, snap back. Holds
// 1.0 between windows so distant punches don't interpolate into one slow drift.
function punchScaleKeyframes(windows, total) {
  if (!windows.length) return null;
  const kf = [{ time: 0, value: 1.0 }];
  for (const [s, e] of windows) {
    if (s > 0.05) kf.push({ time: parseFloat((s - 0.02).toFixed(3)), value: 1.0 });
    kf.push({ time: parseFloat((s + 0.18).toFixed(3)), value: 1.12 });
    kf.push({ time: parseFloat(Math.max(s + 0.2, e).toFixed(3)), value: 1.12 });
    kf.push({ time: parseFloat(Math.min(total, e + 0.12).toFixed(3)), value: 1.0 });
  }
  return kf.sort((a, b) => a.time - b.time);
}

function baseSpeakerLayers(videoUrl, totalDuration, canvas, emphasisWindows = []) {
  const common = {
    type: "video", src: videoUrl, start: 0, end: totalDuration,
    visible: true, locked: false, sfx: null, animation: null,
    trimStart: 0, trimEnd: totalDuration, fadeIn: 0, fadeOut: 0,
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
  };
  const box = (scale) => ({ x: 0, y: 0, width: canvas.width, height: canvas.height, opacity: 1, rotation: 0, scale, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" });
  const bg = { ...common, id: "th_bg_blur", trackId: "track_th_bg", name: "Speaker BG", objectFit: "cover", muted: true, volume: 0, zIndex: 0, filter: "blur(36px)", keyframes: { ...NO_KF }, transform: box(1.12) };
  const punch = punchScaleKeyframes(emphasisWindows, totalDuration);
  const fg = { ...common, id: "th_video_base", trackId: "track_th_video", name: "Speaker", objectFit: "contain", muted: false, volume: 1, zIndex: 1, filter: null, keyframes: { ...NO_KF, scale: punch || [] }, transform: box(1) };
  return [bg, fg];
}

// A B-roll cutaway over the speaker (speaker audio continues underneath). layout "full" covers the
// frame; "pip" tucks the footage into a rounded corner card while the speaker stays on screen.
function brollLayers(beat, canvas) {
  const start = beat.start, end = beat.end;
  const dur = parseFloat((end - start).toFixed(3));
  const isVideo = beat.asset.kind === "video";
  const mediaCommon = {
    id: `broll_${beat.beat_index}_media`, trackId: `broll_${beat.beat_index}_media`,
    name: isVideo ? "B-roll Clip" : "B-roll", type: isVideo ? "video" : "image",
    src: beat.asset.src, objectFit: "cover",
    start, end, zIndex: 5, visible: true, locked: false, sfx: null,
    ...(isVideo ? { muted: true, volume: 0, trimStart: 0, trimEnd: dur, playbackRate: 1 } : {}),
  };

  if (beat.layout === "pip") {
    // Corner card — speaker stays full behind; footage pops in top-right.
    const w = Math.round(canvas.width * 0.46);
    const h = Math.round(w * 9 / 16);
    const x = canvas.width - w - Math.round(canvas.width * 0.05);
    const y = Math.round(canvas.height * 0.10);
    const media = {
      ...mediaCommon,
      keyframes: { ...NO_KF, scale: [{ time: 0, value: 0.9 }, { time: 0.25, value: 1 }], opacity: [{ time: 0, value: 0 }, { time: 0.2, value: 1 }] },
      transition: { in: { type: "fade", duration: 0.18 }, out: { type: "fade", duration: 0.18 } },
      boxShadow: "rgba(0,0,0,0.45) 0px 18px 50px 0px",
      transform: { x, y, width: w, height: h, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 22, borderWidth: 4, borderColor: "#ffffff" },
    };
    return [media]; // no scrim — captions sit clear of the corner card
  }

  const media = {
    ...mediaCommon,
    keyframes: cameraKeyframes(beat.camera, isVideo, dur),
    transition: { in: { type: "fade", duration: 0.22 }, out: { type: "fade", duration: 0.22 } },
    transform: { x: 0, y: 0, width: canvas.width, height: canvas.height, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  };
  // Subtle bottom scrim so captions stay legible over full-frame footage.
  const scrim = {
    id: `broll_${beat.beat_index}_scrim`, trackId: `broll_${beat.beat_index}_scrim`,
    name: "Scrim", type: "gradient", start, end, zIndex: 6,
    visible: true, locked: false, sfx: null,
    gradient: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
    keyframes: { ...NO_KF },
    transition: { in: { type: "fade", duration: 0.22 }, out: { type: "fade", duration: 0.22 } },
    transform: { x: 0, y: 0, width: canvas.width, height: canvas.height, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  };
  return [media, scrim];
}

// Place a measured design graph (from a "card" beat) at its REAL [start,end] window, over the
// speaker. Each element gets a gentle eased entrance; backgrounds stay static. zBase keeps card
// layers above the speaker/B-roll but the card's own text above its bg.
function placeCardGraph(graph, start, end, zBase = 8) {
  return (graph || []).map((e, i) => {
    const delay = Math.min(0.5, i * 0.06);
    const y = e.y ?? 0;
    const kf = e.sceneElement === "background"
      ? { ...NO_KF }
      : { x: [], scale: [], rotation: [], blur: [],
          opacity: track(delay, delay + 0.22, 0, e.opacity ?? 1, easeOutCubic, 3),
          y:       track(delay, delay + 0.32, y + 28, y, easeOutCubic, 4) };
    const base = {
      id: `card_${e.id}`, trackId: `card_${e.id}`, name: e.role || "Layer", type: e.type,
      start, end, zIndex: zBase + (e.zIndex || 0),
      visible: true, locked: false, sfx: null,
      filter: e.filter || null, boxShadow: e.boxShadow || null, mixBlendMode: e.mixBlendMode || null, backdropFilter: e.backdropFilter || null,
      keyframes: kf,
      transition: { in: { type: "fade", duration: 0.2 }, out: { type: "fade", duration: 0.2 } },
      transform: { x: e.x, y: e.y, width: e.width, height: e.height, opacity: e.opacity ?? 1, rotation: e.rotation ?? 0, scale: 1, blur: 0, borderRadius: e.borderRadius ?? 0, borderWidth: e.borderWidth ?? 0, borderColor: e.borderColor ?? "#ffffff" },
    };
    if (e.type === "text")     return { ...base, content: e.text ?? "", style: { ...e.style, _captionStyle: null }, captionStyle: null };
    if (e.type === "gradient") return { ...base, gradient: e.background ?? ((e.borderWidth ?? 0) > 0 ? "transparent" : "rgba(0,0,0,0.3)") };
    if (e.type === "image")    return { ...base, src: e.src ?? null, objectFit: e.objectFit ?? "cover" };
    return base;
  });
}

export async function runTalkingHeadPipeline(params, onStep) {
  const {
    videoUrl, userId,
    captionStyle = "wordBlaze", captionPos = 80, reframe = "source", music = true,
  } = params;
  const step = (msg) => { console.log(`[talking-head] ${msg}`); onStep?.({ step: msg }); };
  if (!videoUrl) throw new Error("no video provided");
  const runId = `th-${userId}-${Date.now()}`;

  // ── Transcribe + segment ──────────────────────────────────────────────────
  step(TH_STATUS_STEPS[0]);
  const { words, full_transcript, language, total_duration, dimensions, videoUrl: baseVideoUrl } = await transcribeVideo(videoUrl);
  step(TH_STATUS_STEPS[1]);
  let beats = segmentWords(words);

  // ── Editorial direction: speaker vs B-roll, per beat ──────────────────────
  step(TH_STATUS_STEPS[2]);
  const canvas = canvasFromDimensions(dimensions, reframe);
  step(TH_STATUS_STEPS[3]);
  let style = null, palette = null, niche = "general", musicMood = "ambient", publish = null;
  try {
    const directed = await directTalkingHead(beats, { language });
    beats = directed.beats; style = directed.style; palette = directed.palette; niche = directed.niche;
    musicMood = directed.music_mood || "ambient"; publish = directed.publish || null;
  } catch (e) {
    console.warn("[talking-head] director failed — captions-only fallback:", e.message);
    beats = beats.map((b) => ({ ...b, visual_mode: "speaker", asset_type: "none" }));
  }

  // Long-clip guard: bound how many designed frames + cutaways we build so a multi-minute clip
  // doesn't balloon cost/time. Extras fall back to the speaker (still fully captioned).
  const MAX_DESIGN = 30, MAX_BROLL = 45;
  let dC = 0, bC = 0;
  for (const b of beats) {
    if (b.visual_mode === "card" || b.visual_mode === "overlay") { if (++dC > MAX_DESIGN) { b.visual_mode = "speaker"; b._overSpeaker = false; } }
    else if (b.visual_mode === "broll") { if (++bC > MAX_BROLL) { b.visual_mode = "speaker"; b.asset_type = "none"; } }
  }

  // ── Resolve B-roll assets (speaker beats are asset_type "none" → skipped) ──
  step(TH_STATUS_STEPS[4]);
  if (style) {
    try { await resolveVisuals(beats, style, runId, canvas.orientation); }
    catch (e) { console.warn("[talking-head] visual resolve failed:", e.message); }
  }

  // ── Designed text (cards = full cover; overlays = over the speaker) ────────
  step(TH_STATUS_STEPS[5]);
  const designOut = [];
  const designBeats = beats.filter((b) => (b.visual_mode === "card" || b.visual_mode === "overlay") && b.content?.headline);
  for (const b of designBeats) {
    b.script_line = b.spoken;                              // designPrompts reads script_line
    if (b.visual_mode === "overlay") b._overSpeaker = true; // → transparent overlay over the speaker
  }
  // Pull SFX once; cutaways get a contextual sound (broll/card), overlays stay quiet.
  const sfxByKey = await loadSfxTracks();
  let lastSfx = null, sfxCount = 0; const SFX_CAP = 12;
  const cutawaySfx = (paletteName) => {
    if (sfxCount >= SFX_CAP) return null;
    const s = pickSfx(sfxByKey, paletteName, lastSfx);
    if (!s) return null;
    lastSfx = s.key; sfxCount++;
    return { key: s.key, src: s.src, volume: 0.4, delay: -0.1 };
  };

  if (designBeats.length && style) {
    try {
      const designs = await designAllBeats(designBeats, { style, palette, canvasW: canvas.width, canvasH: canvas.height, language });
      for (const b of designBeats) {
        const html = designs.find((d) => d.beatIndex === b.beat_index)?.html;
        let graph = null;
        if (html) { try { graph = await measureSceneHTML(html, b.beat_index, canvas); } catch {} }
        if (!graph?.length) { b.visual_mode = "speaker"; continue; } // design failed → speaker shows
        const group = placeCardGraph(graph, b.start, b.end, 8);
        if (b.visual_mode === "card" && group[0]) group[0].sfx = cutawaySfx("pop"); // cards land with a pop
        designOut.push(...group);
      }
    } catch (e) { console.warn("[talking-head] design failed:", e.message); }
    finally { try { await closeMeasureBrowser(); } catch {} }
  }

  // ── Compose timeline: speaker spine + B-roll cutaways + cards/overlays + captions ──
  step(TH_STATUS_STEPS[6]);
  const totalDuration = parseFloat((total_duration + 0.3).toFixed(3));
  const brollOut = [];
  for (const b of beats) {
    if (b.visual_mode !== "broll" || !b.asset?.src) continue;
    const ls = brollLayers(b, canvas);
    if (ls[0]) ls[0].sfx = cutawaySfx(b.asset.kind === "video" ? "whoosh" : "impact");
    brollOut.push(...ls);
  }
  const brollCount = brollOut.filter((l) => l.type === "image" || l.type === "video").length;

  // Captions run on speaker + B-roll (low-text visuals); hidden where a card/overlay leads the idea.
  const textRanges = beats.filter((b) => b.visual_mode === "card" || b.visual_mode === "overlay").map((b) => [b.start, b.end]);
  const captionLayers = buildCaptionLayers(words, { captionStyle, captionPos, canvas, suppressRanges: textRanges });
  // Emphasis punch-in windows (speaker beats the director flagged + the hook).
  const emphasisWindows = beats.filter((b) => b.visual_mode === "speaker" && b.emphasis).map((b) => [b.start, b.end]);

  const timeline = {
    version: "2.0",
    format:  { width: canvas.width, height: canvas.height, fps: 30, duration: totalDuration },
    layers:  [...baseSpeakerLayers(baseVideoUrl, totalDuration, canvas, emphasisWindows), ...brollOut, ...designOut, ...captionLayers],
    meta:    { source: "talking_head", language, caption_style: captionStyle, editor_version: "timeline", publish },
  };

  // Ducked background music bed (well under the speaker's voice).
  if (music) {
    try { await injectMusic(timeline, { mood: musicMood, volume: 0.07, fadeIn: 0.8, fadeOut: 1.2, label: "talking-head" }); }
    catch (e) { console.warn("[talking-head] music skipped:", e.message); }
  }

  const cardN = beats.filter((b) => b.visual_mode === "card").length;
  const overlayN = beats.filter((b) => b.visual_mode === "overlay").length;
  const pipN = beats.filter((b) => b.visual_mode === "broll" && b.layout === "pip").length;
  console.log(`[talking-head] composed: ${brollCount} b-roll (${pipN} pip), ${cardN} cards, ${overlayN} overlays, ${captionLayers.length} captions, ${sfxCount} sfx, music=${music ? musicMood : "off"}`);

  const projectName = (full_transcript.split(/\s+/).slice(0, 8).join(" ") || "Talking Head").slice(0, 80);

  // ── Save as an editable project (no Remotion render here) ──────────────────
  step(TH_STATUS_STEPS[7]);
  let projectId = null;
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           userId,
        name:              projectName,
        safe_project_json: timeline,
        orientation:       canvas.orientation,
        mode:              "timeline",
        source:            "talking_head",
        editor_version:    "timeline",
        raw_ai_json: {
          pipeline: "talking_head_v1b", videoUrl, captionStyle, captionPos, reframe, language, niche,
          style_id: style?.id ?? null,
          beats: beats.map((b) => ({
            beat_index: b.beat_index, spoken: b.spoken, start: b.start, end: b.end, duration_seconds: b.duration_seconds,
            visual_mode: b.visual_mode, asset_type: b.asset_type,
            subject_entity: b.subject_entity ?? null, shot_query: b.shot_query ?? null,
            asset: b.asset ? { kind: b.asset.kind, src: b.asset.src } : null,
          })),
        },
      })
      .select("id").single();
    projectId = row?.id ?? null;
    console.log(`[talking-head] saved project: ${projectId}`);
  } catch (e) {
    console.warn("[talking-head] projects insert failed:", e.message);
    throw new Error("failed to save project");
  }

  return { projectId, projectName, duration_seconds: totalDuration, beatCount: beats.length, brollCount };
}
