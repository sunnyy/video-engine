/**
 * stitchCompiler.js
 * src/services/ai/aiVideo/stitchCompiler.js
 *
 * Turns BEATS (laid-out timeline layers) + RELATIONSHIPS (cross-beat transitions)
 * into the final timeline. All motion flows through ONE path — the intent→keyframe
 * expander in motion.js — so nothing is hardcoded:
 *
 *   - Relationships (from GPT-4.1) assign per-participant ENTER/EXIT intents with a
 *     shared anchor (explode/merge/morph/zoom-through/push/dissolve/cut).
 *   - Per-element intents (from GPT-5.4 via data-enter/-exit/-emphasis) drive any
 *     element not claimed by a relationship.
 *   - Anything left over still travels cinematically (default fly-in / fly-out).
 *
 * The expander owns the curves, the geometry math, and in-bounds safety; this file
 * only decides WHICH intent each layer gets. Output is standard timeline JSON.
 */

import {
  expandEnter, expandExit, expandEmphasis,
  ENTER_DIRS, EXIT_DIRS,
} from "./motion.js";

const FPS = 30;
const MW  = 0.7;       // default transformation window (seconds)
const STAGGER = 0.1;   // per-sibling delay on grouped transforms

const EMPTY_KF = () => ({ x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] });

const boxOf    = (l) => ({ x: l.transform.x, y: l.transform.y, width: l.transform.width, height: l.transform.height });
const centerOf = (l) => ({ cx: l.transform.x + l.transform.width / 2, cy: l.transform.y + l.transform.height / 2 });

function shiftPartial(partial, off) {
  if (!off || !partial) return partial;
  const out = {};
  for (const k of Object.keys(partial)) out[k] = partial[k].map(kf => ({ ...kf, time: parseFloat((kf.time + off).toFixed(3)) }));
  return out;
}

function mergeKeyframes(...partials) {
  const out = EMPTY_KF();
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

function clampKeyframes(kf, dur) {
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

// Translate a cross-beat relationship into per-participant ENTER/EXIT intents.
// (This is the only "transform-specific" logic; the actual motion is the vocabulary.)
function intentsForRelationship(rel, get) {
  const enter = [], exit = []; // arrays of [layerId, intent]
  switch (rel.type) {
    case "explode": {
      const src = get(rel.fromIds?.[0]);
      if (src) exit.push([src.id, { type: "punch-through" }]);
      const anchor = src ? centerOf(src) : null;
      (rel.toIds || []).forEach((id, i) => { if (get(id)) enter.push([id, { type: "fly-in", anchor, stagger: i }]); });
      break;
    }
    case "merge":
    case "collapse": {
      const tgt = get(rel.toIds?.[0]);
      const anchor = tgt ? centerOf(tgt) : null;
      (rel.fromIds || []).forEach((id, i) => { if (get(id)) exit.push([id, { type: "fly-out", anchor, stagger: -i }]); });
      if (tgt) enter.push([tgt.id, { type: "pop-in" }]);
      break;
    }
    case "morph": {
      const f = get(rel.fromIds?.[0]), t = get(rel.toIds?.[0]);
      if (f && t) { exit.push([f.id, { type: "fly-out", anchor: centerOf(t) }]); enter.push([t.id, { type: "fly-in", anchor: centerOf(f) }]); }
      break;
    }
    case "zoom-through": {
      (rel.fromIds || []).forEach((id) => { if (get(id)) exit.push([id, { type: "punch-through" }]); });
      (rel.toIds || []).forEach((id) => { if (get(id)) enter.push([id, { type: "zoom-in" }]); });
      break;
    }
    case "push": {
      (rel.fromIds || []).forEach((id) => { if (get(id)) exit.push([id, { type: "fly-out", direction: rel.direction || "left" }]); });
      const opp = { left: "right", right: "left", top: "bottom", bottom: "top" }[rel.direction || "left"];
      (rel.toIds || []).forEach((id) => { if (get(id)) enter.push([id, { type: "fly-in", direction: opp }]); });
      break;
    }
    case "dissolve": {
      (rel.fromIds || []).forEach((id) => { if (get(id)) exit.push([id, { type: "fade-out" }]); });
      (rel.toIds || []).forEach((id) => { if (get(id)) enter.push([id, { type: "fade-in" }]); });
      break;
    }
    case "cut":
    default: break; // no motion injected
  }
  return { enter, exit };
}

export function stitchBeats(beats, relationships = [], projectContext = {}) {
  const canvasW = projectContext.canvasWidth  ?? 1080;
  const canvasH = projectContext.canvasHeight ?? 1920;
  const canvas  = { width: canvasW, height: canvasH };

  const idMap = new Map();
  beats.forEach((b) => b.layers.forEach(l => idMap.set(l.id, l)));
  const get = (id) => idMap.get(id);

  // Relationship-assigned intents take precedence over a layer's own intents.
  const relEnter = new Map(), relExit = new Map();
  for (const rel of relationships) {
    const { enter, exit } = intentsForRelationship(rel, get);
    enter.forEach(([id, intent]) => relEnter.set(id, intent));
    exit.forEach(([id, intent]) => relExit.set(id, intent));
  }

  const layers = [];
  for (const b of beats) {
    b.layers.forEach((l, idx) => {
      const dur = Math.max(0.2, l.end - l.start);
      const ctx = { box: boxOf(l), canvas, dur, mw: MW };

      // ENTER: relationship > element's own intent > cinematic default (skip if persistent
      // or the layer already carries its own keyframes).
      let enterIntent = relEnter.get(l.id) || l.enter;
      if (!enterIntent && !l.persist && !(l.keyframes?.opacity?.length)) {
        enterIntent = { type: "fly-in", direction: ENTER_DIRS[idx % ENTER_DIRS.length] };
      }
      // EXIT: relationship > element's own intent > cinematic default.
      let exitIntent = relExit.get(l.id) || l.exit;
      if (!exitIntent && !l.persist) {
        exitIntent = { type: "fly-out", direction: EXIT_DIRS[idx % EXIT_DIRS.length] };
      }

      let en = expandEnter(enterIntent, ctx);
      let ex = expandExit(exitIntent, ctx);
      if (enterIntent?.stagger) en = shiftPartial(en, enterIntent.stagger * STAGGER);
      if (exitIntent?.stagger)  ex = shiftPartial(ex, exitIntent.stagger * STAGGER);

      // EMPHASIS runs in the hold window between the entrance and the exit.
      const enterMw = en && Object.keys(en).length ? MW : 0;
      const exitMw  = ex && Object.keys(ex).length ? MW : 0;
      const emphasis = l.emphasis
        ? expandEmphasis(l.emphasis, { ...ctx, holdStart: enterMw, holdEnd: dur - exitMw })
        : null;

      const keyframes = clampKeyframes(mergeKeyframes(l.keyframes, en, ex, emphasis), dur);
      layers.push({
        ...l,
        keyframes,
        transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
      });
    });
  }

  const totalDuration = beats.length ? beats[beats.length - 1].end : 0;
  return {
    version: "2.0",
    id:      projectContext.projectId ?? null,
    name:    `${projectContext.productName ?? "AI Video"} — AI Video`,
    format:  { width: canvasW, height: canvasH, fps: FPS, duration: parseFloat(totalDuration.toFixed(4)) },
    layers,
    meta: {
      source:           "ai_video",
      thumbnail:        null,
      editor_version:   "timeline",
      caption_style:    "minimal",
      transition_style: "transform",
      product_name:     projectContext.productName ?? "AI Video",
      scene_format:     "ai_video_v1",
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
    },
  };
}
