/**
 * timelineBuilder.js
 * src/services/ai/shared/timelineBuilder.js
 *
 * Unified eased timeline builder for the headless-measure services (Prompt to
 * Video / AI Video, Social, Product). Converts scene graphs + scene objects into
 * the timeline JSON format used by the editor and Remotion, with eased per-element
 * entrances via the shared motion engine. Scene-level transitions are applied
 * separately in each orchestrator (shared/transitions.js).
 *
 * Each service gets its builder from `createTimelineBuilder(config)` — the only
 * differences between services are config (source / default name / music mood /
 * scene_format). Promo's beat-path builder is intentionally NOT unified here.
 */

import { expandEnter } from "./motion.js";

const FPS       = 30;
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
  cta:                "CTA",
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
  cta:             6,
  "image-placeholder": 7,
  card:            8,
  step:            9,
  icon:            10,
  divider:         11,
  glow:            12,
  decoration:      13,
  background:      14,
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

// ── Eased entrance motion (shared/motion.js) ───────────────────────────────────
// The designer's data-animation is just an INTENT; the eased expander turns it
// into smooth, multi-sampled keyframes (fly / pop / zoom / rise / drift). "none"
// stays static. Per-element exits + scene-level transitions are owned elsewhere.

const ENTER_MW = 0.55; // entrance window (seconds)

function enterIntentFor(animation, group) {
  const hero = group === "hero";
  switch (animation) {
    case "fade-in":     return { type: "fade-in" };
    case "fade-up":     return { type: "rise-in" };
    case "scale-in":    return { type: "pop-in" };
    case "slide-left":  return { type: hero ? "fly-in" : "drift-in", direction: "right" };
    case "slide-right": return { type: hero ? "fly-in" : "drift-in", direction: "left" };
    default:            return null; // "none" → static
  }
}

function entranceKeyframes(entry, duration, canvas) {
  if (entry.sceneElement === "background") return { ...NO_KF };
  const intent = enterIntentFor(entry.animation, entry.sceneElement ?? "supporting");
  if (!intent) return { ...NO_KF };
  const box = { x: entry.x, y: entry.y, width: entry.width, height: entry.height };
  const mw  = Math.max(0.2, Math.min(ENTER_MW, duration * 0.6));
  return { ...NO_KF, ...expandEnter(intent, { box, canvas, dur: duration, mw }) };
}

function defaultTransition() {
  return { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } };
}

// ── Scene graph entry → timeline layer ───────────────────────────────────────

function graphEntryToLayer(entry, start, end, delay = 0, canvas = { width: W_DEFAULT, height: H_DEFAULT }) {
  const duration = Math.max(0.1, end - start);
  const rawKf = entranceKeyframes(entry, duration, canvas);
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
    transition: defaultTransition(),
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
    return { ...base, content: entry.text ?? "", style: { ...entry.style, _captionStyle: null }, captionStyle: null };
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
      src:            entry.src            ?? null,
      objectFit:      entry.objectFit      ?? "cover",
      objectPosition: entry.objectPosition ?? null,
      assetType:      entry.assetType      ?? null,
      assetHint:      entry.assetHint      ?? null,
    };
  }

  if (entry.type === "video") {
    return {
      ...base,
      src:            entry.src            ?? null,
      objectFit:      entry.objectFit      ?? "cover",
      objectPosition: entry.objectPosition ?? null,
      assetType:      entry.assetType      ?? null,
      muted:          entry.muted          ?? true,
      volume:         entry.volume         ?? 0,
      trimStart:      entry.trimStart      ?? 0,
      playbackRate:   entry.playbackRate   ?? 1,
    };
  }

  if (entry.type === "icon") {
    return { ...base, iconName: entry.iconName ?? null, style: { color: entry.style?.color ?? "#ffffff" } };
  }

  return base;
}

/**
 * createTimelineBuilder(config) → buildTimeline(sceneGraphs, scenes, projectContext)
 * config: { source, defaultName, musicMoodDefault?, sceneFormat? }
 */
export function createTimelineBuilder(config) {
  const {
    source,
    defaultName      = "Video",
    musicMoodDefault = "upbeat",
    sceneFormat      = "v3",
  } = config;

  return function buildTimeline(sceneGraphs, scenes, projectContext) {
    const canvasW = projectContext.canvasWidth  ?? W_DEFAULT;
    const canvasH = projectContext.canvasHeight ?? H_DEFAULT;
    console.log(`[timelineBuilder:${source}] ${sceneGraphs.length} graphs, ${scenes.length} scenes`);

    const layers      = [];
    const asset_queue = [];
    let cursor = 0;

    for (let i = 0; i < sceneGraphs.length; i++) {
      const scene = scenes[i];
      const graph = sceneGraphs[i] ?? [];

      const duration = scene.duration_seconds != null
        ? parseFloat(scene.duration_seconds.toFixed(4))
        : parseFloat(estimateDuration(scene.spoken).toFixed(4));

      const start = parseFloat(cursor.toFixed(4));
      const end   = parseFloat((cursor + duration).toFixed(4));
      cursor = end;

      console.log(`[timelineBuilder:${source}] scene ${i} (${scene.intent}): ${graph.length} entries, ${start}–${end}`);

      const sorted = [...graph].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

      const isHook = i === 0;
      const isCTA  = i === scenes.length - 1;

      const visible = sorted.filter(entry => {
        if (entry.type === "gradient") {
          const bg = (entry.background ?? "").trim().toLowerCase();
          const hasBorder = (entry.borderWidth ?? 0) > 0;
          if (!hasBorder && (bg === "transparent" || bg === "none" || bg === "")) return false;
        }
        if (!isHook && !isCTA && entry.trackId === "track_logo") return false;
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
        const delay = (entry.animation === "none" || isBackground)
          ? 0
          : calculateElementDelay(entry, idx, groupSizes[group], duration);

        layers.push(graphEntryToLayer(entry, start, end, delay, { width: canvasW, height: canvasH }));
      }

      // Asset queue (services that request user/stock assets per scene)
      if (scene.asset_requirement === "screenshot" || scene.asset_requirement === "recording") {
        asset_queue.push({ scene_id: i + 1, asset_hint: scene.asset_hint ?? "", type: "user_upload_pending" });
      } else if (scene.asset_requirement === "image") {
        asset_queue.push({ scene_id: i + 1, asset_hint: scene.asset_hint ?? "", type: "stock" });
      }
    }

    const totalDuration = parseFloat(cursor.toFixed(4));

    const timeline = {
      version: "2.0",
      id:      projectContext.projectId ?? null,
      name:    `${projectContext.productName ?? projectContext.brandName ?? defaultName}`,
      format:  { width: canvasW, height: canvasH, fps: FPS, duration: totalDuration },
      layers,
      meta: {
        source,
        thumbnail:        null,
        editor_version:   "timeline",
        caption_style:    "minimal",
        transition_style: "cut",
        music_mood:       projectContext.musicMood ?? musicMoodDefault,
        product_name:     projectContext.productName ?? projectContext.brandName,
        scene_format:     sceneFormat,
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
  };
}
