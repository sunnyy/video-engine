/**
 * pipelineOrchestrator.js
 * src/services/ai/aiVideo/pipelineOrchestrator.js
 *
 * AI Video service — the transformation engine (objects persist and transform
 * across beats instead of cutting between independent scenes).
 *
 * SLICE 1 (this file): no AI yet. It hand-authors a short multi-beat sequence and
 * runs it through the stitch compiler so we can SEE the transformations play in the
 * real editor/renderer before wiring GPT to it. The output is a standard timeline
 * `safe_project_json`, saved to the projects table with source "ai_video", so the
 * existing editor + Remotion render it unchanged.
 *
 * Demo storyboard:
 *   hours   ──explode──▶   TikTok / Reels / Shorts   ──merge──▶   one video.
 * with a persistent background that drifts across the whole clip.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";
import { stitchBeats } from "./stitchCompiler.js";
import { planAiVideo } from "./director.js";
import { designBeat } from "./sceneDesigner.js";
import { entriesToLayers } from "./adapter.js";
import { measureSceneHTML, closeMeasureBrowser } from "../promoVideo/htmlMeasure.js";
import { generateFullVoiceover } from "../promoVideo/ttsGenerator.js";
import { pickAutoMood } from "../../../core/registries/musicRegistry.js";

const CANVAS = { width: 1080, height: 1920 };

// A persistent background for the whole clip — one layer, gently drifting, so the
// frame never cuts to black between beats (scenes are designed transparent over it).
function persistentBackground(totalDur, accent = "#8b5cf6") {
  return {
    id: "bg", trackId: "bg", name: "BG", type: "gradient",
    start: 0, end: totalDur, zIndex: 0,
    visible: true, locked: false, sfx: null,
    filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
    persist: true,
    keyframes: { x: [], y: [], scale: [{ time: 0, value: 1 }, { time: totalDur, value: 1.1 }], rotation: [], opacity: [], blur: [] },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { x: 0, y: 0, width: CANVAS.width, height: CANVAS.height, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
    gradient: `radial-gradient(900px 720px at 50% 30%, ${accent}38, transparent 62%), linear-gradient(180deg, #0c0a18 0%, #07060f 100%)`,
  };
}

// MOTION HIERARCHY — the fix for "random/noisy" motion. One star per scene; everything
// else supports quietly. Without this, decorations spin, dividers drift, and every
// element pulses, which reads as chaos.
//   hero        → the director's meaning-driven enter/exit; at most one subtle emphasis
//   supporting  → keep its entrance but no emphasis (it must not compete with the hero)
//   decoration  → fade only; never travels, spins, or pulses
const CALM_SUPPORTING_EXIT = new Set(["fade-out", "drift-out", "blur-out", "fly-out", "rise-out", "pop-out"]);

function applyMotionPolicy(layers, beatMotion) {
  for (const l of layers) {
    const role = l.sceneElement;
    if (role === "hero") {
      if (beatMotion?.enter) l.enter = { type: beatMotion.enter, direction: l.enter?.direction };
      if (beatMotion?.exit)  l.exit  = { type: beatMotion.exit,  direction: l.exit?.direction };
    } else if (role === "decoration" || role === "background") {
      l.enter = { type: "fade-in" };
      l.exit  = { type: "fade-out" };
      l.emphasis = null;
    } else { // supporting — keep its entrance, calm exit, no in-place dancing
      l.emphasis = null;
      if (l.exit && !CALM_SUPPORTING_EXIT.has(l.exit.type)) l.exit = { type: "fade-out" };
    }
  }
  // Emphasis: at most ONE element (a hero), so the scene never vibrates.
  let kept = false;
  for (const l of layers) {
    if (l.sceneElement === "hero" && l.emphasis) { if (kept) l.emphasis = null; else kept = true; }
    else if (l.sceneElement !== "hero") l.emphasis = null;
  }
  return layers;
}

// Fallback layer if a beat's design/measure produced nothing — never ship an empty beat.
function fallbackText(beatIndex, beat, start, end) {
  return {
    id: `b${beatIndex}_text`, trackId: `b${beatIndex}_text`, name: "Headline", type: "text",
    start, end, zIndex: 10, visible: true, locked: false, sfx: null,
    filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
    persist: false, sceneElement: "hero",
    enter: { type: "zoom-in" }, exit: { type: "fly-out" }, emphasis: null,
    keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { x: 90, y: 820, width: 900, height: 280, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#fff" },
    content: beat.text,
    style: { fontFamily: "Inter", fontSize: 120, fontWeight: 900, color: "#ffffff", textAlign: "center", lineHeight: 1.0, letterSpacing: -3, textTransform: "none", background: null, borderRadius: 0, padding: 0, _captionStyle: null },
    captionStyle: null,
  };
}

// ── Audio ───────────────────────────────────────────────────────────────────────

// Voiceover-first timing: place each beat at the moment its words are spoken, so the
// motion lands on the narration. Falls back to the director's durations if there are
// no word timestamps (TTS unavailable).
function retimeBeats(beats, words, audioDur) {
  if (!words?.length) {
    let c = 0;
    return beats.map((b) => { const s = c; c += b.duration_seconds; return { ...b, start: parseFloat(s.toFixed(3)), end: parseFloat(c.toFixed(3)) }; });
  }
  let wi = 0;
  const out = beats.map((b) => {
    const n = b.text.trim().split(/\s+/).filter(Boolean).length;
    const start = words[Math.min(wi, words.length - 1)]?.start ?? 0;
    wi = Math.min(wi + Math.max(1, n), words.length);
    return { ...b, start };
  });
  for (let i = 0; i < out.length; i++) {
    out[i].end = i < out.length - 1 ? out[i + 1].start : (audioDur + 0.4);
    if (out[i].end <= out[i].start) out[i].end = out[i].start + 1.2;
    out[i].start = parseFloat(out[i].start.toFixed(3));
    out[i].end   = parseFloat(out[i].end.toFixed(3));
  }
  return out;
}

function voiceoverLayer(src, totalDur) {
  return {
    id: "voiceover_full", trackId: "track_voiceover", type: "audio", audioType: "voiceover", name: "Voiceover",
    src, start: 0, end: totalDur, zIndex: 0, visible: true, locked: false,
    trimStart: 0, trimEnd: totalDur, volume: 1.0, muted: false, fadeIn: 0.1, fadeOut: 0.3,
    sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
  };
}

async function injectMusic(timeline, totalDur) {
  try {
    const mood = pickAutoMood("viral", "bold", "high");
    const { data } = await supabaseAdmin.from("music_tracks").select("public_url, title, mood").eq("is_active", true);
    if (!data?.length) return;
    const pool  = data.filter((t) => t.mood === mood);
    const track = (pool.length ? pool : data)[Math.floor(Math.random() * (pool.length ? pool.length : data.length))];
    timeline.layers.push({
      id: "music_global", trackId: "track_music", type: "audio", audioType: "music", name: "Music",
      src: track.public_url, start: 0, end: totalDur, zIndex: 0, visible: true, locked: false,
      trimStart: 0, trimEnd: totalDur, volume: 0.18, muted: false, fadeIn: 1, fadeOut: 1.2,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
    console.log(`[ai-video] music: "${track.title}" (${mood})`);
  } catch (e) {
    console.warn("[ai-video] music skipped:", e.message);
  }
}

// Attach a transition/whoosh SFX to each scene's hero so its entrance has a beat.
// Rendered via the layer's `sfx` field (fired at the layer's start).
async function attachSfx(timeline) {
  try {
    const { data } = await supabaseAdmin.from("sfx_tracks").select("key, public_url, title").eq("is_active", true);
    if (!data?.length) return;
    const movey = data.filter((s) => /whoosh|swoosh|woosh|swish|swipe|transition|riser|impact|pop/i.test(`${s.key} ${s.title}`));
    const pool  = movey.length ? movey : data;
    let i = 0;
    for (const l of timeline.layers) {
      if (l.sceneElement === "hero" && !l.sfx) {
        const s = pool[i % pool.length];
        l.sfx = { key: s.key, src: s.public_url, volume: 0.5, delay: 0.02 };
        i++;
      }
    }
    console.log(`[ai-video] sfx attached to ${i} hero entrances (pool ${pool.length})`);
  } catch (e) {
    console.warn("[ai-video] sfx skipped:", e.message);
  }
}

/**
 * runAiVideo({ userId, topic }) — full AI-driven build:
 *   topic → director beats → GPT-5.4 motion-tagged scenes → measure → adapt →
 *   persistent bg → stitch (per-element motion) → save.
 */
export async function runAiVideo({ userId, topic, voiceId = null }) {
  const W = CANVAS.width, H = CANVAS.height;
  const accent = "#8b5cf6";
  const ctx = { canvasWidth: W, canvasHeight: H, accentColor: accent, theme: "dark" };

  // 1) Director: topic → beats
  const plan = await planAiVideo(topic);

  // 2) Voiceover FIRST — narrate the beats, then time the visuals to the speech.
  const full_script = plan.beats.map(b => b.text.trim().replace(/[.?!]+$/, "")).join(". ") + ".";
  let tts = { audio_url: null, duration_seconds: 0, wordTimestamps: [] };
  try {
    tts = await generateFullVoiceover(full_script, `aivideo-${Date.now()}`, voiceId);
  } catch (e) {
    console.warn("[ai-video] TTS failed (continuing silent):", e.message);
  }

  // 3) Timing — from the voiceover word timestamps (fallback: director durations)
  const timed    = retimeBeats(plan.beats, tts.wordTimestamps, tts.duration_seconds);
  const totalDur = parseFloat((timed.length ? timed[timed.length - 1].end : 0).toFixed(3));

  // 4) Design + measure each beat in parallel
  const beatLayerSets = await Promise.all(timed.map(async (b, i) => {
    try {
      const html    = await designBeat(b, ctx);
      const entries = await measureSceneHTML(html || "", i, { width: W, height: H });
      const layers  = entriesToLayers(entries, b.start, b.end);
      console.log(`[ai-video] beat ${i} "${b.text.slice(0, 30)}" — ${layers.length} layers`);
      return layers.length ? applyMotionPolicy(layers, b.motion) : [fallbackText(i, b, b.start, b.end)];
    } catch (err) {
      console.error(`[ai-video] beat ${i} failed:`, err.message);
      return [fallbackText(i, b, b.start, b.end)];
    }
  }));
  try { await closeMeasureBrowser(); } catch {}

  // 5) Assemble beats (persistent bg lives in beat 0, spanning the whole clip)
  const beats = timed.map((b, i) => ({ start: b.start, end: b.end, layers: beatLayerSets[i] }));
  if (beats[0]) beats[0].layers.unshift(persistentBackground(totalDur, accent));

  // 6) Stitch — no relationships; per-element motion (GPT intents + cinematic defaults)
  const timeline = stitchBeats(beats, [], { canvasWidth: W, canvasHeight: H, productName: plan.title });
  timeline.full_script = full_script;

  // 7) Audio — voiceover (timed to the visuals), background music, per-scene SFX
  if (tts.audio_url) timeline.layers.push(voiceoverLayer(tts.audio_url, totalDur));
  await injectMusic(timeline, totalDur);
  await attachSfx(timeline);

  // 8) Save
  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      user_id: userId,
      name: `${plan.title} — AI Video`,
      safe_project_json: timeline,
      orientation: "9:16",
      mode: "timeline",
      source: "ai_video",
      editor_version: "timeline",
      raw_ai_json: { topic, title: plan.title, beats: timed },
    })
    .select("id")
    .single();
  if (error) throw new Error(`Save failed: ${error.message}`);
  console.log(`[ai-video] saved "${plan.title}" (${beats.length} beats, project ${data?.id})`);
  return { projectId: data?.id ?? null, projectName: `${plan.title} — AI Video` };
}

const EMPTY_KF = () => ({ x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] });

function baseLayer(id, type, { x, y, w, h, start, end, z = 10, persist = false }) {
  return {
    id, trackId: id, name: id, type,
    start, end, zIndex: z,
    visible: true, locked: false, sfx: null,
    filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
    persist,
    keyframes: EMPTY_KF(),
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: {
      x, y, width: w, height: h,
      opacity: 1, rotation: 0, scale: 1, blur: 0,
      borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    },
  };
}

function text(id, opts) {
  const { content, fontSize, color = "#ffffff", weight = 800, align = "center" } = opts;
  return {
    ...baseLayer(id, "text", opts),
    content,
    style: {
      fontFamily: "Inter", fontSize, fontWeight: weight, color,
      textAlign: align, lineHeight: 1.0, letterSpacing: -2,
      textTransform: "none", textShadow: null, background: null,
      borderRadius: 0, padding: 0,
    },
    captionStyle: null,
  };
}

function gradient(id, opts) {
  return { ...baseLayer(id, "gradient", opts), gradient: opts.gradient };
}

/**
 * runAiVideoDemo({ userId, productName }) — build + save the demo transformation video.
 */
export async function runAiVideoDemo({ userId, productName = "AI Video" }) {
  const W = CANVAS.width, H = CANVAS.height;
  const cx = W / 2;                    // 540 — every hero is centered here
  const T1 = 2.6, T2 = 5.2, T3 = 7.8;  // beat boundaries

  // Persistent background — ONE layer for the whole clip, gently drifting (proves
  // object persistence: it never cuts). `persist` keeps the compiler from fading it.
  const bg = gradient("bg", {
    x: 0, y: 0, w: W, h: H, start: 0, end: T3, z: 0, persist: true,
    gradient: "radial-gradient(900px 720px at 50% 32%, rgba(139,92,246,0.28), transparent 62%), linear-gradient(180deg, #0c0a18 0%, #07060f 100%)",
  });
  bg.keyframes = { ...EMPTY_KF(), scale: [{ time: 0, value: 1 }, { time: T3, value: 1.08 }] };

  // Beat 1 — one giant word, centered. Enters with a zoom-in (per-element intent);
  // its EXIT is set by the explode relationship (punch-through).
  const hours = text("hours", { content: "hours", x: 140, y: 790, w: 800, h: 340, fontSize: 240, weight: 900, start: 0, end: T1 });
  hours.enter = { type: "zoom-in" };

  // Beat 2 — the word explodes into three platform labels, stacked & centered.
  const tiktok = text("tiktok", { content: "TikTok", x: 140, y: 560,  w: 800, h: 170, fontSize: 132, weight: 800, start: T1, end: T2 });
  const reels  = text("reels",  { content: "Reels",  x: 140, y: 870,  w: 800, h: 170, fontSize: 132, weight: 800, start: T1, end: T2 });
  const shorts = text("shorts", { content: "Shorts", x: 140, y: 1180, w: 800, h: 170, fontSize: 132, weight: 800, start: T1, end: T2 });

  // Beat 3 — the three merge into one statement. Enter is set by the merge
  // relationship (pop-in); it breathes while held, then flies off (default exit).
  const onevideo = text("onevideo", { content: "one video.", x: 120, y: 850, w: 840, h: 220, fontSize: 188, weight: 900, start: T2, end: T3 });
  onevideo.emphasis = { type: "breathe" };

  const beats = [
    { start: 0,  end: T1, layers: [bg, hours] },
    { start: T1, end: T2, layers: [tiktok, reels, shorts] },
    { start: T2, end: T3, layers: [onevideo] },
  ];

  const relationships = [
    { type: "explode", fromIds: ["hours"],                       toIds: ["tiktok", "reels", "shorts"] },
    { type: "merge",   fromIds: ["tiktok", "reels", "shorts"],   toIds: ["onevideo"] },
  ];

  const timeline = stitchBeats(beats, relationships, {
    canvasWidth: W, canvasHeight: H, productName, projectId: null,
  });
  timeline.full_script = "hours → TikTok, Reels, Shorts → one video.";

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      user_id:           userId,
      name:              `${productName} — AI Video`,
      safe_project_json: timeline,
      orientation:       "9:16",
      mode:              "timeline",
      source:            "ai_video",
      editor_version:    "timeline",
      raw_ai_json:       { demo: true, relationships },
    })
    .select("id")
    .single();

  if (error) throw new Error(`Save failed: ${error.message}`);
  console.log(`[ai-video] demo transformation saved (project ${data?.id})`);
  return { projectId: data?.id ?? null, projectName: `${productName} — AI Video` };
}
