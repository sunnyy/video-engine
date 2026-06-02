/**
 * timelineBuilder.js
 * src/services/ai/promoVideo/v2/timelineBuilder.js
 *
 * Converts v2 scene graphs + scene objects into the existing timeline JSON format.
 * Output is compatible with the timeline editor and Remotion renderer.
 */

const FPS  = 30;
const W    = 1080;
const H    = 1920;

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

// ── Timing ────────────────────────────────────────────────────────────────────

function estimateDuration(spoken) {
  const words = (spoken ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3.0, parseFloat((words / 2.5).toFixed(2)));
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

// ── Transition ────────────────────────────────────────────────────────────────

function defaultTransition(animation) {
  if (animation === "none") return { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } };
  return { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0 } };
}

// ── Scene graph entry → timeline layer ───────────────────────────────────────

function graphEntryToLayer(entry, start, end) {
  const base = {
    id:        entry.id,
    trackId:   entry.trackId,
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
    keyframes: animationToKeyframes(entry.animation, entry.x, entry.y),
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
      src:       entry.src ?? null,
      objectFit: entry.objectFit ?? "cover",
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
  console.log(`[timelineBuilder] called with ${sceneGraphs.length} graphs, ${scenes.length} scenes`);
  if (sceneGraphs[0]?.length) {
    console.log(`[timelineBuilder] sceneGraphs[0] length: ${sceneGraphs[0].length}, first entry: ${(JSON.stringify(sceneGraphs[0][0]) ?? "").slice(0, 200)}`);
  } else {
    console.warn(`[timelineBuilder] sceneGraphs[0] is empty or undefined`);
  }

  const layers          = [];
  const voiceover_queue = [];
  const asset_queue     = [];

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

    // Convert each graph entry to a timeline layer
    // Skip gradient layers with no real visual (transparent background)
    for (const entry of graph) {
      if (entry.type === "gradient") {
        const bg = (entry.background ?? "").trim().toLowerCase();
        const hasBorder = (entry.borderWidth ?? 0) > 0;
        if (!hasBorder && (bg === "transparent" || bg === "none" || bg === "")) continue;
      }
      layers.push(graphEntryToLayer(entry, start, end));
    }

    // Voiceover queue
    if (scene.spoken?.trim()) {
      voiceover_queue.push({
        scene_id: i + 1,
        script:   scene.spoken.trim(),
        voice:    "nova",
      });
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
    format:  { width: W, height: H, fps: FPS, duration: totalDuration },
    layers,
    meta: {
      source:           "promo_video_v2",
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
    voiceover_queue,
    asset_queue,
    total_frames: Math.round(totalDuration * FPS),
    fps:          FPS,
  };
}
