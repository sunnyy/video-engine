/**
 * timelineBuilder.js
 * src/services/ai/saasVideo/v2/timelineBuilder.js
 *
 * Converts v2 scene graphs + scene objects into the existing timeline JSON format.
 * Output is compatible with the timeline editor and Remotion renderer.
 */

import { expandEnter, expandExit, expandEmphasis } from "../shared/motion.js";

const FPS      = 30;
const W_DEFAULT = 1080;
const H_DEFAULT = 1920;

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

const ROLE_LABEL = {
  headline:           "Headline",
  subhead:            "Subhead",
  body:               "Body",
  kicker:             "Kicker",
  badge:              "Badge",
  label:              "Label",
  "stat-number":      "Stat",
  background:         "BG",
  glow:               "Glow",
  card:               "Card",
  decoration:         "Deco",
  divider:            "Divider",
  step:               "Step",
  icon:               "Icon",
  logo:               "Logo",
  "image-placeholder": "Image",
};

function roleToLabel(role) { return ROLE_LABEL[role] ?? role; }

// ── Timing ────────────────────────────────────────────────────────────────────

function estimateDuration(spoken) {
  const words = (spoken ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.0, parseFloat((words / 2.8).toFixed(2)));
}

// ── Proportional element spread across scene duration ────────────────────────

const SPREAD_WINDOWS = {
  background: { start: 0.00, end: 0.00 },
  decoration: { start: 0.00, end: 0.04 },
  hero:       { start: 0.00, end: 0.25 }, // headline at t=0
  supporting: { start: 0.15, end: 0.40 },
  workflow:   { start: 0.25, end: 0.50 },
};

// Within each group, higher-priority roles appear first
const ROLE_PRIORITY = {
  headline:        0,
  kicker:          1,
  subhead:         2,
  "stat-number":   3,
  badge:           4,
  label:           5,
  "image-placeholder": 6,
  card:            7,
  step:            8,
  icon:            9,
  divider:         10,
  glow:            11,
  decoration:      12,
  background:      13,
};

const MAX_SPREAD    = 0.50; // all elements fully visible by 50% of scene duration
const ANIM_DURATION = 0.30; // time the animation itself takes (fade/slide)

function calculateElementDelay(entry, groupIndex, groupSize, sceneDuration) {
  const group  = entry.sceneElement ?? "supporting";
  const window = SPREAD_WINDOWS[group] ?? SPREAD_WINDOWS.supporting;

  const windowDuration = (window.end - window.start) * sceneDuration;
  const spacing        = groupSize > 1 ? windowDuration / groupSize : 0;
  const delay          = (window.start * sceneDuration) + (groupIndex * spacing);

  const maxDelay = Math.max(0, (sceneDuration * MAX_SPREAD) - ANIM_DURATION);
  return parseFloat(Math.min(delay, maxDelay).toFixed(3));
}

// Shift every keyframe time value forward by `delay` seconds.
function applyDelay(keyframes, delay) {
  if (!delay) return keyframes;
  const result = {};
  for (const [prop, kfs] of Object.entries(keyframes)) {
    result[prop] = Array.isArray(kfs)
      ? kfs.map(kf => ({ ...kf, time: parseFloat((kf.time + delay).toFixed(3)) }))
      : kfs;
  }
  return result;
}

// ── Animation → keyframes ─────────────────────────────────────────────────────
// bx/by are the element's base top-left position so keyframes animate FROM an
// offset and land exactly on the final position (no permanent override of base).

function animationToKeyframes(animation, bx = 0, by = 0) {
  switch (animation) {
    case "fade-in":
      return { ...NO_KF, opacity: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }] };

    case "fade-up":
      return {
        ...NO_KF,
        opacity: [{ time: 0, value: 0 }, { time: 0.35, value: 1 }],
        y:       [{ time: 0, value: by + 40 }, { time: 0.35, value: by }],
      };

    case "scale-in":
      return {
        ...NO_KF,
        opacity: [{ time: 0, value: 0 }, { time: 0.35, value: 1 }],
        scale:   [{ time: 0, value: 0.88 }, { time: 0.35, value: 1.0 }],
      };

    case "slide-left":
      return {
        ...NO_KF,
        opacity: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }],
        x:       [{ time: 0, value: bx + 60 }, { time: 0.3, value: bx }],
      };

    case "slide-right":
      return {
        ...NO_KF,
        opacity: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }],
        x:       [{ time: 0, value: bx - 60 }, { time: 0.3, value: bx }],
      };

    case "none":
    default:
      return { ...NO_KF };
  }
}

// ── Ambient pulse ───────────────────────────────────────────────────────────────
// GPT-5.4 puts continuous CSS @keyframes (flicker/pulse/glow) on decorative elements.
// We can't replay arbitrary keyframes, so for any flagged element we synthesize a
// gentle looping opacity oscillation across the whole beat — generalized "life", not
// the exact curve. Staggered per element (phase from id) so they don't pulse in sync.
const PULSE_MIN    = 0.5;  // dimmest opacity multiplier (× the layer's base opacity)
const PULSE_PERIOD = 1.8;  // seconds per cycle
const PULSE_STEP   = 0.3;  // sampling interval (linearly interpolated between)

function phaseFromId(id) {
  let h = 0;
  for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (h % 100) / 100;
}

function ambientPulseKeyframes(baseKf, duration, phase) {
  const op = Array.isArray(baseKf.opacity) ? [...baseKf.opacity] : [];
  const entranceEnd = op.length ? op[op.length - 1].time : 0;
  const startAt = Math.max(entranceEnd + PULSE_STEP, PULSE_STEP);
  const out = op.filter(k => k.time < startAt); // keep the entrance fade
  for (let t = startAt; t <= duration + 1e-6; t += PULSE_STEP) {
    const ph = ((t / PULSE_PERIOD) + phase) * 2 * Math.PI;
    const v  = PULSE_MIN + (1 - PULSE_MIN) * (0.5 + 0.5 * Math.sin(ph));
    out.push({ time: parseFloat(t.toFixed(3)), value: parseFloat(v.toFixed(3)) });
  }
  return { ...baseKf, opacity: out };
}

// ── Transition ────────────────────────────────────────────────────────────────

function defaultTransition(animation) {
  if (animation === "none") return { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } };
  return { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0 } };
}

// ── Beat motion (ported from the AI Video transformation engine) ────────────────
// The beat pipeline drives ALL element motion through the eased intent→keyframe
// expander in shared/motion.js — the same flying/popping/zooming vocabulary, with
// real easing curves baked into keyframes (the renderer interpolates linearly).
// Intent precedence per element: GPT-authored data-enter/-exit/-emphasis → the
// legacy data-animation word mapped into the new palette → a hierarchy default
// (hero expressive, supporting calm, decoration fades, background static).
// Whole-scene pushes (one scene slides out as the next slides in) are layered on
// top at beat boundaries — they override per-element enter/exit for that scene.

const BEAT_MW = 0.6;   // per-element enter/exit window (s)
const PUSH_MW = 0.55;  // whole-scene slide window (s)

// Legacy data-animation → enter palette, so existing GPT output still gets eased.
const LEGACY_ENTER = {
  "fade-in":     { type: "fade-in" },
  "fade-up":     { type: "rise-in" },
  "scale-in":    { type: "pop-in" },
  "slide-left":  { type: "fly-in", direction: "right" }, // enters from the right
  "slide-right": { type: "fly-in", direction: "left" },
};

// Hierarchy default when GPT authored no motion at all.
function defaultEnterFor(group) {
  switch (group) {
    case "hero":       return { type: "pop-in" };
    case "supporting": return { type: "rise-in" };
    case "workflow":   return { type: "rise-in" };
    case "decoration": return { type: "fade-in" };
    case "background": return { type: "none" };
    default:           return { type: "fade-in" };
  }
}

function mergeKf(...partials) {
  const out = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };
  for (const p of partials) {
    if (!p) continue;
    for (const key of Object.keys(out)) if (Array.isArray(p[key]) && p[key].length) out[key].push(...p[key]);
  }
  for (const key of Object.keys(out)) {
    const byTime = new Map();
    for (const kf of out[key]) byTime.set(kf.time, kf);
    out[key] = [...byTime.values()].sort((a, b) => a.time - b.time);
  }
  return out;
}

function clampKf(kf, dur) {
  const out = {};
  for (const key of Object.keys(kf)) {
    const byTime = new Map();
    for (const k of kf[key]) {
      const time = Math.max(0, Math.min(dur, parseFloat(k.time.toFixed(3))));
      byTime.set(time, { ...k, time });
    }
    out[key] = [...byTime.values()].sort((a, b) => a.time - b.time);
  }
  return out;
}

/**
 * beatMotionKeyframes(entry, layer, duration, canvas, delay, push)
 * Builds the full eased keyframe set for one beat layer.
 * @param push { enter: dir|null, exit: dir|null } — whole-scene slide directions.
 */
function beatMotionKeyframes(entry, layer, duration, canvas, delay, push) {
  const t = layer.transform;
  const box = { x: t.x, y: t.y, width: t.width, height: t.height };
  const ctx = { box, canvas, dur: duration, mw: BEAT_MW };
  const group = entry.sceneElement ?? "supporting";

  // ENTER: scene push wins; else GPT intent; else legacy animation; else hierarchy default.
  let enterIntent;
  if (push.enter) {
    enterIntent = { type: "fly-in", direction: push.enter, win: PUSH_MW };
  } else {
    enterIntent = entry.enter
      || (entry.animation && entry.animation !== "none" ? LEGACY_ENTER[entry.animation] : null)
      || defaultEnterFor(group);
  }

  // EXIT: scene push wins; else GPT intent; else hold (no exit).
  let exitIntent = push.exit
    ? { type: "fly-out", direction: push.exit, win: PUSH_MW }
    : (entry.exit || { type: "none" });

  let en = expandEnter(enterIntent, ctx);
  const ex = expandExit(exitIntent, ctx);

  // Stagger only the entrance (so a scene reads in waves); a scene push moves as one block.
  if (delay && !push.enter) en = applyDelay(en, delay);

  // EMPHASIS runs in the hold window between the entrance and the exit.
  const enterMw = Object.keys(en).length ? ((enterIntent.win ?? BEAT_MW) + (push.enter ? 0 : (delay || 0))) : 0;
  const exitMw  = Object.keys(ex).length ? (exitIntent.win ?? BEAT_MW) : 0;
  const emphasisIntent = entry.emphasis || (entry.ambientPulse ? { type: "breathe" } : null);
  const emphasis = (emphasisIntent && duration - enterMw - exitMw > 0.3)
    ? expandEmphasis(emphasisIntent, { ...ctx, holdStart: enterMw, holdEnd: duration - exitMw })
    : null;

  return clampKf(mergeKf(en, ex, emphasis), duration);
}

// Push schedule: a whole-scene slide on every other beat boundary, alternating side.
// boundary k sits between beat k and beat k+1.
function pushForBoundary(k) {
  if (k < 0 || k % 2 === 0) return null;
  const idx = (k - 1) / 2;
  return idx % 2 === 0 ? { exit: "left", enter: "right" } : { exit: "right", enter: "left" };
}

// ── Scene graph entry → timeline layer ───────────────────────────────────────

function graphEntryToLayer(entry, start, end, delay = 0) {
  const shouldAnimate =
    entry.animation !== "none" &&
    entry.sceneElement !== "background";
  let rawKf = shouldAnimate
    ? animationToKeyframes(entry.animation, entry.x, entry.y)
    : { ...NO_KF };
  // Ambient life for decorative elements that had a CSS animation in the source.
  if (entry.ambientPulse) {
    rawKf = ambientPulseKeyframes(rawKf, Math.max(0.1, end - start), phaseFromId(entry.id));
  }
  const base = {
    id:        entry.id,
    trackId:   entry.id,
    name:      roleToLabel(entry.role),
    type:      entry.type,
    start,
    end,
    zIndex:         entry.zIndex,
    visible:        true,
    locked:         false,
    sfx:            null,
    filter:         entry.filter         || null,
    boxShadow:      entry.boxShadow      || null,
    mixBlendMode:   entry.mixBlendMode   || null,
    backdropFilter: entry.backdropFilter || null,
    keyframes: applyDelay(rawKf, delay),
    transition: defaultTransition(entry.animation),
    transform: {
      x:            entry.x,
      y:            entry.y,
      width:        entry.width,
      height:       entry.height,
      opacity:      entry.opacity,
      rotation:     entry.rotation ?? 0,
      scale:        1,
      blur:         0,
      borderRadius: entry.borderRadius,
      borderWidth:  entry.borderWidth ?? 0,
      borderColor:  entry.borderColor ?? "#ffffff",
    },
  };

  if (entry.type === "text") {
    return {
      ...base,
      content:      entry.text ?? "",
      style:        {
        ...entry.style,
        _captionStyle: null,
      },
      captionStyle: null,
    };
  }

  if (entry.type === "gradient") {
    return {
      ...base,
      // Border-only elements (rings, outlines) have no background — use transparent
      // so the ring shows as an outline only, not a filled dark circle.
      gradient: entry.background ?? ((entry.borderWidth ?? 0) > 0 ? "transparent" : "rgba(0,0,0,0.3)"),
    };
  }

  if (entry.type === "image") {
    return {
      ...base,
      src:       entry.src       ?? null,
      objectFit: entry.objectFit ?? "cover",
      assetType: entry.assetType ?? null,
      assetHint: entry.assetHint ?? null,
    };
  }

  if (entry.type === "icon") {
    return {
      ...base,
      iconName: entry.iconName ?? null,
      style:    { color: entry.style?.color ?? "#ffffff" },
    };
  }

  return base;
}

// ── Public entry point ─────────────────────────────────────────────────────────

/**
 * buildTimeline(sceneGraphs, scenes, projectContext)
 *
 * @param {Array<Array>} sceneGraphs   — one scene graph per scene (from htmlParser)
 * @param {Array<object>} scenes       — original scene objects (for spoken/timing)
 * @param {object} projectContext      — { productName, niche, accentColor, fps }
 * @returns {object}                   — complete timeline JSON
 */
export function buildTimeline(sceneGraphs, scenes, projectContext) {
  const canvasW = projectContext.canvasWidth  ?? W_DEFAULT;
  const canvasH = projectContext.canvasHeight ?? H_DEFAULT;
  console.log(`[timelineBuilder] called with ${sceneGraphs.length} graphs, ${scenes.length} scenes`);
  if (sceneGraphs[0]?.length) {
    console.log(`[timelineBuilder] sceneGraphs[0] length: ${sceneGraphs[0].length}, first entry: ${(JSON.stringify(sceneGraphs[0][0]) ?? "").slice(0, 200)}`);
  } else {
    console.warn(`[timelineBuilder] sceneGraphs[0] is empty or undefined`);
  }

  const layers      = [];
  const asset_queue = [];

  let cursor = 0;

  for (let i = 0; i < sceneGraphs.length; i++) {
    const scene = scenes[i];
    const graph = sceneGraphs[i] ?? [];

    // Duration: use TTS-measured if available, else estimate from word count
    const duration = scene.duration_seconds != null
      ? parseFloat(scene.duration_seconds.toFixed(4))
      : parseFloat(estimateDuration(scene.spoken).toFixed(4));

    const start = parseFloat(cursor.toFixed(4));
    const end   = parseFloat((cursor + duration).toFixed(4));
    cursor = end;

    console.log(`[timelineBuilder] scene ${i} (${scene.intent}): ${graph.length} graph entries, start=${start} end=${end}`);

    // Sort by zIndex so stagger order matches visual depth (background first)
    const sorted = [...graph].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    const isHook = i === 0;
    const isCTA  = i === scenes.length - 1;

    // Pre-filter to match what will actually be pushed, so group sizes are accurate
    const visible = sorted.filter(entry => {
      if (entry.type === "gradient") {
        const bg = (entry.background ?? "").trim().toLowerCase();
        const hasBorder = (entry.borderWidth ?? 0) > 0;
        if (!hasBorder && (bg === "transparent" || bg === "none" || bg === "")) return false;
      }
      if (!isHook && !isCTA && entry.trackId === "track_logo") return false;
      return true;
    });

    // Sort within each sceneElement group by role priority so headline
    // always gets groupIndex=0 regardless of HTML DOM order
    const GROUP_ORDER = { background: 0, decoration: 1, hero: 2, supporting: 3, workflow: 4 };
    const prioritized = [...visible].sort((a, b) => {
      const ga = GROUP_ORDER[a.sceneElement ?? "supporting"] ?? 3;
      const gb = GROUP_ORDER[b.sceneElement ?? "supporting"] ?? 3;
      if (ga !== gb) return ga - gb;
      const pa = ROLE_PRIORITY[a.role] ?? 99;
      const pb = ROLE_PRIORITY[b.role] ?? 99;
      return pa - pb;
    });

    // Count elements per sceneElement group for proportional spacing
    const groupSizes  = {};
    const groupIndex  = {};
    for (const entry of prioritized) {
      const g = entry.sceneElement ?? "supporting";
      groupSizes[g] = (groupSizes[g] ?? 0) + 1;
    }

    for (const entry of prioritized) {
      const group = entry.sceneElement ?? "supporting";
      const idx   = groupIndex[group] ?? 0;
      groupIndex[group] = idx + 1;

      const isBackground = group === "background";
      const delay = (entry.animation === "none" || isBackground)
        ? 0
        : calculateElementDelay(entry, idx, groupSizes[group], duration);

      layers.push(graphEntryToLayer(entry, start, end, delay));
    }

    // Asset queue
    if (scene.asset_requirement === "screenshot" || scene.asset_requirement === "recording") {
      asset_queue.push({
        scene_id:   i + 1,
        asset_hint: scene.asset_hint ?? "",
        type:       "user_upload_pending",
      });
    } else if (scene.asset_requirement === "image") {
      asset_queue.push({
        scene_id:   i + 1,
        asset_hint: scene.asset_hint ?? "",
        type:       "stock",
      });
    }
  }

  const totalDuration = parseFloat(cursor.toFixed(4));

  const timeline = {
    version: "2.0",
    id:      projectContext.projectId ?? null,
    name:    `${projectContext.productName ?? "Promo Video"} — Promo`,
    format:  { width: canvasW, height: canvasH, fps: FPS, duration: totalDuration },
    layers,
    meta: {
      source:           "promo_video",
      thumbnail:        null,
      editor_version:   "timeline",
      caption_style:    "minimal",
      transition_style: "cut",
      music_mood:       projectContext.musicMood ?? "upbeat",
      product_name:     projectContext.productName,
      scene_format:     "v2",
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
    },
  };

  return {
    timeline,
    asset_queue,
    total_frames: Math.round(totalDuration * FPS),
    fps:          FPS,
  };
}

// ── Beat pipeline ──────────────────────────────────────────────────────────────
// Builds a timeline from timed visual beats (visualDirector) instead of
// sequential scenes. Each beat has an explicit start/end derived from the
// voiceover word timestamps, continuous Ken Burns motion on media, and a varied
// cut into the next beat (no fixed transition).

// Cut variety pool — verified against the renderer's supported transition types.
const BEAT_TRANSITIONS = ["none", "fade", "slide-left", "slide-right", "slide-up", "zoom"];

function pickTransition(prev) {
  const pool = BEAT_TRANSITIONS.filter(t => t !== prev);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Continuous camera motion for media layers. Pans use overscan so the image
// edge is never revealed. Every beat moves — nothing is ever static.
function mediaKenBurns(motion, dur, w, h, bx = 0, by = 0) {
  const t = parseFloat(dur.toFixed(3));
  const panX = Math.round(w * 0.05);
  const panY = Math.round(h * 0.05);
  switch (motion) {
    case "pull_out":
      return { ...NO_KF, scale: [{ time: 0, value: 1.12 }, { time: t, value: 1.0 }] };
    case "pan_left":
      return { ...NO_KF, scale: [{ time: 0, value: 1.12 }, { time: t, value: 1.12 }], x: [{ time: 0, value: bx }, { time: t, value: bx - panX }] };
    case "pan_right":
      return { ...NO_KF, scale: [{ time: 0, value: 1.12 }, { time: t, value: 1.12 }], x: [{ time: 0, value: bx }, { time: t, value: bx + panX }] };
    case "drift_up":
      return { ...NO_KF, scale: [{ time: 0, value: 1.12 }, { time: t, value: 1.12 }], y: [{ time: 0, value: by }, { time: t, value: by - panY }] };
    case "drift_down":
      return { ...NO_KF, scale: [{ time: 0, value: 1.12 }, { time: t, value: 1.12 }], y: [{ time: 0, value: by }, { time: t, value: by + panY }] };
    case "push_in":
    default:
      return { ...NO_KF, scale: [{ time: 0, value: 1.0 }, { time: t, value: 1.12 }] };
  }
}

// Lay out one parsed HTML graph (a beat's overlay/full design) into timeline
// layers between start and end, with staggered entrance delays + eased motion.
// canvas = { width, height }; push = { enter: dir|null, exit: dir|null } for the
// whole-scene slide at this beat's boundaries.
function layoutGraph(graph, start, end, duration, canvas, push = { enter: null, exit: null }) {
  const out = [];
  const sorted = [...graph].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const visible = sorted.filter(entry => {
    if (entry.type === "gradient") {
      const bg = (entry.background ?? "").trim().toLowerCase();
      const hasBorder = (entry.borderWidth ?? 0) > 0;
      if (!hasBorder && (bg === "transparent" || bg === "none" || bg === "")) return false;
    }
    return true;
  });

  const GROUP_ORDER = { background: 0, decoration: 1, hero: 2, supporting: 3, workflow: 4 };
  const prioritized = [...visible].sort((a, b) => {
    const ga = GROUP_ORDER[a.sceneElement ?? "supporting"] ?? 3;
    const gb = GROUP_ORDER[b.sceneElement ?? "supporting"] ?? 3;
    if (ga !== gb) return ga - gb;
    const pa = ROLE_PRIORITY[a.role] ?? 99;
    const pb = ROLE_PRIORITY[b.role] ?? 99;
    return pa - pb;
  });

  const groupSizes = {};
  const groupIndex = {};
  for (const entry of prioritized) {
    const g = entry.sceneElement ?? "supporting";
    groupSizes[g] = (groupSizes[g] ?? 0) + 1;
  }

  for (const entry of prioritized) {
    const group = entry.sceneElement ?? "supporting";
    const idx   = groupIndex[group] ?? 0;
    groupIndex[group] = idx + 1;
    const isBackground = group === "background";
    const delay = isBackground
      ? 0
      : calculateElementDelay(entry, idx, groupSizes[group], duration);

    const layer = graphEntryToLayer(entry, start, end, 0);
    // The eased intent→keyframe expander owns ALL beat motion; replace the simple
    // entrance keyframes and clear the renderer transition (background is the only
    // layer that may carry a scene transition, set by the caller).
    layer.keyframes  = beatMotionKeyframes(entry, layer, duration, canvas, delay, push);
    layer.transition = { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } };
    out.push(layer);
  }
  return out;
}

/**
 * buildTimelineFromBeats(beats, beatResults, projectContext)
 *
 * @param {Array<object>} beats        — timed beats from visualDirector
 * @param {Array<object>} beatResults  — aligned 1:1 with beats: { graph, media }
 *                                        media = { assetType, assetHint, region } | null
 * @param {object} projectContext
 */
export function buildTimelineFromBeats(beats, beatResults, projectContext) {
  const canvasW = projectContext.canvasWidth  ?? W_DEFAULT;
  const canvasH = projectContext.canvasHeight ?? H_DEFAULT;
  console.log(`[timelineBuilder] beat pipeline — ${beats.length} beats`);

  const canvas = { width: canvasW, height: canvasH };
  const layers = [];

  for (let i = 0; i < beats.length; i++) {
    const beat   = beats[i];
    const result = beatResults[i] ?? {};
    const start  = parseFloat((beat.start ?? 0).toFixed(4));
    const end    = parseFloat((beat.end ?? (beat.start ?? 0)).toFixed(4));
    const duration = Math.max(0.1, parseFloat((end - start).toFixed(4)));

    // Whole-scene push: this beat enters via the previous boundary, exits via its own.
    const push = {
      enter: pushForBoundary(i - 1)?.enter ?? null,
      exit:  pushForBoundary(i)?.exit       ?? null,
    };

    // Media (full-bleed) slides as one block via the renderer transition field —
    // a slide of 100% of a full-canvas layer is exactly a whole-scene push. Content
    // layers slide via baked keyframes (handled in layoutGraph). Non-push media gets
    // a soft fade so the cut isn't abrupt.
    const mediaTransition = {
      in: push.enter
        ? { type: push.enter === "right" ? "slide-left" : "slide-right", duration: PUSH_MW }
        : { type: "fade", duration: 0.3 },
      out: push.exit
        ? { type: push.exit === "left" ? "slide-left" : "slide-right", duration: PUSH_MW }
        : { type: "none", duration: 0 },
    };

    // Media background layer. Images get Ken Burns motion; video clips carry their
    // own motion so they get a static transform (and play muted).
    if (result.media) {
      const region   = result.media.region ?? { y: 0, height: canvasH };
      const mediaH   = region.height ?? canvasH;
      const mediaY   = region.y ?? 0;
      const isVideo  = result.media.kind === "video";
      layers.push({
        id:        `s${i}_media`,
        trackId:   `s${i}_media`,
        name:      isVideo ? "Video" : "Media",
        type:      isVideo ? "video" : "image",
        start, end,
        zIndex:    0,
        visible:   true,
        locked:    false,
        sfx:       null,
        filter:    null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
        keyframes: isVideo ? { ...NO_KF } : mediaKenBurns(beat.motion, duration, canvasW, mediaH, 0, mediaY),
        transition: mediaTransition,
        transform: {
          x: 0, y: mediaY, width: canvasW, height: mediaH,
          opacity: 1, rotation: 0, scale: 1,
          borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
        },
        src:       null,
        objectFit: "cover",
        assetType: result.media.assetType ?? "stock",
        assetHint: result.media.assetHint ?? null,
        ...(isVideo ? { trimStart: 0, trimEnd: duration, muted: true, volume: 0 } : {}),
      });
    }

    // Designed HTML layers (full frame, or overlay/region text) — eased per-element
    // motion + whole-scene push baked into keyframes.
    const graphLayers = layoutGraph(result.graph ?? [], start, end, duration, canvas, push);
    layers.push(...graphLayers);
  }

  const totalDuration = parseFloat((beats.length ? beats[beats.length - 1].end : 0).toFixed(4));

  const timeline = {
    version: "2.0",
    id:      projectContext.projectId ?? null,
    name:    `${projectContext.productName ?? "Promo Video"} — Promo`,
    format:  { width: canvasW, height: canvasH, fps: FPS, duration: totalDuration },
    layers,
    meta: {
      source:           "promo_video",
      thumbnail:        null,
      editor_version:   "timeline",
      caption_style:    "minimal",
      transition_style: "mixed",
      music_mood:       projectContext.musicMood ?? "upbeat",
      product_name:     projectContext.productName,
      scene_format:     "v2_beats",
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
    },
  };

  return { timeline, asset_queue: [], total_frames: Math.round(totalDuration * FPS), fps: FPS };
}
