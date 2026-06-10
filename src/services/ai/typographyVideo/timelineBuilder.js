const FPS       = 30;
const W_DEFAULT = 1080;
const H_DEFAULT = 1920;

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

const ROLE_LABEL = {
  headline:   "Headline",
  subhead:    "Subhead",
  kicker:     "Kicker",
  accent:     "Accent",
  badge:      "Badge",
  background: "BG",
  glow:       "Glow",
  decoration: "Deco",
  icon:       "Icon",
  cluster:    "Text",
};

function roleToLabel(role) { return ROLE_LABEL[role] ?? role; }

function estimateDuration(voiceover) {
  const words = (voiceover ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1.5, parseFloat((words / 2.8).toFixed(2)));
}

const SPREAD_WINDOWS = {
  background: { start: 0.00, end: 0.00 },
  decoration: { start: 0.00, end: 0.05 },
  hero:       { start: 0.00, end: 0.15 },
  supporting: { start: 0.12, end: 0.65 },
};

const ROLE_PRIORITY = {
  headline:   0,
  kicker:     1,
  subhead:    2,
  badge:      3,
  icon:       4,
  decoration: 8,
  glow:       9,
  background: 10,
};

const MAX_SPREAD    = 0.50;
const ANIM_DURATION = 0.30;

function calculateElementDelay(entry, groupIndex, groupSize, sceneDuration) {
  const group  = entry.sceneElement ?? "supporting";
  const window = SPREAD_WINDOWS[group] ?? SPREAD_WINDOWS.supporting;
  const windowDuration = (window.end - window.start) * sceneDuration;
  const spacing        = groupSize > 1 ? windowDuration / groupSize : 0;
  const delay          = (window.start * sceneDuration) + (groupIndex * spacing);
  const maxDelay       = Math.max(0, (sceneDuration * MAX_SPREAD) - ANIM_DURATION);
  return parseFloat(Math.min(delay, maxDelay).toFixed(3));
}

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
    case "zoom-in":
      return {
        ...NO_KF,
        opacity: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }],
        scale:   [{ time: 0, value: 0.88 }, { time: 0.3, value: 1.0 }],
      };
    default:
      return { ...NO_KF };
  }
}

function defaultTransition(animation) {
  if (animation === "none") return { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } };
  return { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0 } };
}

function graphEntryToLayer(entry, sceneStart, sceneEnd) {
  const startOffset = entry.startOffset ?? 0;
  const layerStart  = parseFloat((sceneStart + startOffset).toFixed(4));
  const layerEnd    = sceneEnd;

  let finalKf;

  if (entry.designKeyframes) {
    // GPT provided keyframes (layer-relative times) — use directly, no conversion needed.
    // resolveTransform uses (currentTime - layer.start), which is layer-relative. ✓
    finalKf = {
      x:        entry.designKeyframes.x        ?? [],
      y:        entry.designKeyframes.y        ?? [],
      scale:    entry.designKeyframes.scale    ?? [],
      opacity:  entry.designKeyframes.opacity  ?? [],
      blur:     [],
      rotation: [],
    };
  } else {
    // Fallback: generate animation keyframes from animation type (backward compat)
    const animType    = entry.animation || "none";
    const shouldAnimate = animType !== "none" && entry.sceneElement !== "background";
    finalKf = shouldAnimate
      ? animationToKeyframes(animType, entry.x, entry.y)
      : { ...NO_KF };
  }

  // Determine transition: suppress it when GPT-designed opacity keyframes handle fade-in
  const hasOpacityKf = finalKf.opacity?.length > 0;
  const transitionConfig = hasOpacityKf
    ? { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } }
    : defaultTransition(entry.animation || "none");

  const base = {
    id:        entry.id,
    trackId:   entry.id,
    name:      roleToLabel(entry.role),
    type:      entry.type,
    start:     layerStart,
    end:       layerEnd,
    zIndex:         entry.zIndex,
    visible:        true,
    locked:         false,
    sfx:            null,
    cssAnimation:   null,
    filter:         entry.filter         || null,
    boxShadow:      entry.boxShadow      || null,
    mixBlendMode:   entry.mixBlendMode   || null,
    backdropFilter: entry.backdropFilter || null,
    keyframes:     finalKf,
    transition:    transitionConfig,
    textAnimation: entry.textAnimation ?? "none",
    wordTimestamps: entry.wordTimestamps ?? null,
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

  if (entry.type === "html_block") {
    return { ...base, html: entry.html ?? "" };
  }
  if (entry.type === "text") {
    return { ...base, content: entry.text ?? "", style: { ...entry.style, _captionStyle: null }, captionStyle: null };
  }
  if (entry.type === "gradient") {
    return { ...base, gradient: entry.background ?? ((entry.borderWidth ?? 0) > 0 ? "transparent" : "rgba(0,0,0,0.8)") };
  }
  if (entry.type === "icon") {
    return { ...base, iconName: entry.iconName ?? null, style: { color: entry.style?.color ?? "#ffffff" } };
  }
  return base;
}

/**
 * buildTypographyTimeline(sceneGraphs, sentences, projectContext)
 * @param {Array<Array>}  sceneGraphs    — one scene graph per sentence (from htmlParser)
 * @param {Array<object>} sentences      — { text, voiceover, start, end, duration_seconds }
 * @param {object}        projectContext — { projectName, accentColor, bgColor, audioUrl, audioDuration, projectId }
 */
export function buildTypographyTimeline(sceneGraphs, sentences, projectContext) {
  const { sceneKeyframesArr = [] } = projectContext;
  const canvasW = W_DEFAULT;
  const canvasH = H_DEFAULT;

  const layers = [];
  let cursor   = 0;

  const GROUP_ORDER   = { background: 0, decoration: 1, hero: 2, supporting: 3 };
  const VISIBLE_TYPES = new Set(["text", "gradient", "icon", "html_block"]);

  for (let i = 0; i < sceneGraphs.length; i++) {
    const sentence = sentences[i];
    const graph    = sceneGraphs[i] ?? [];

    let start, end;
    if (sentence.start != null && sentence.end != null) {
      // Use absolute TTS timestamps: scene starts exactly when audio starts speaking it.
      // Extend to next sentence.start so inter-sentence pauses show as a hold, not a blank.
      start = parseFloat(sentence.start.toFixed(4));
      const nextStart = sentences[i + 1]?.start;
      end = nextStart != null
        ? parseFloat(nextStart.toFixed(4))
        : parseFloat(Math.max(sentence.end, projectContext.audioDuration ?? sentence.end).toFixed(4));
    } else {
      const duration = parseFloat(estimateDuration(sentence.voiceover ?? sentence.text).toFixed(4));
      start = parseFloat(cursor.toFixed(4));
      end   = parseFloat((cursor + duration).toFixed(4));
    }
    cursor = end;

    const sorted = [...graph].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    const visible = sorted.filter(entry => {
      if (!VISIBLE_TYPES.has(entry.type)) {
        const hasBorder = (entry.borderWidth ?? 0) > 0;
        if (!hasBorder) return false;
      }
      if (entry.type === "gradient") {
        const bg = (entry.background ?? "").trim().toLowerCase();
        const hasBorder = (entry.borderWidth ?? 0) > 0;
        if (!hasBorder && (bg === "transparent" || bg === "none" || bg === "")) return false;
      }
      return true;
    });

    const prioritized = [...visible].sort((a, b) => {
      const ga = GROUP_ORDER[a.sceneElement ?? "supporting"] ?? 3;
      const gb = GROUP_ORDER[b.sceneElement ?? "supporting"] ?? 3;
      if (ga !== gb) return ga - gb;
      return (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99);
    });

    for (const entry of prioritized) {
      layers.push(graphEntryToLayer(entry, start, end)); // start=sceneStart, end=sceneEnd
    }
  }

  const totalDuration = parseFloat(Math.max(cursor, projectContext.audioDuration ?? 0).toFixed(4));

  // Add voiceover audio layer spanning full video
  if (projectContext.audioUrl) {
    const audioDur = projectContext.audioDuration ?? totalDuration;
    layers.push({
      id:        "voiceover_full",
      trackId:   "track_voiceover",
      type:      "audio",
      audioType: "voiceover",
      name:      "Voiceover",
      src:       projectContext.audioUrl,
      start:     0,
      end:       Math.max(totalDuration, audioDur),
      zIndex:    0,
      visible:   true,
      locked:    false,
      trimStart: 0,
      trimEnd:   audioDur,
      volume:    1.0,
      muted:     false,
      fadeIn:    0.05,
      fadeOut:   0.2,
      sfx:       null,
      keyframes: {},
      animation:  null,
      transition: null,
      transform:  null,
    });
  }

  const timeline = {
    version: "2.0",
    id:      projectContext.projectId ?? null,
    name:    projectContext.projectName ?? "Typography Video",
    format:  { width: canvasW, height: canvasH, fps: FPS, duration: totalDuration },
    layers,
    meta: {
      source:         "typography_video",
      thumbnail:      null,
      editor_version: "timeline",
      caption_style:  "minimal",
      sceneKeyframes: sceneKeyframesArr,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    },
  };

  return {
    timeline,
    total_frames: Math.round(totalDuration * FPS),
    fps: FPS,
  };
}
