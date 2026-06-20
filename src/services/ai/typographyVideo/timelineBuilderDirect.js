const FPS   = 30;
const W     = 1080;
const H     = 1920;
const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

// ── Font size by beat type and word count ──────────────────────────────────────

function beatFontSize(text, type) {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  if (type === "keyword") {
    if (words === 1) return 160;
    if (words === 2) return 128;
    return 100;
  }
  // phrase
  if (words <= 2) return 108;
  if (words <= 4) return 86;
  if (words <= 6) return 70;
  return 58;
}

// ── Layer factories ─────────────────────────────────────────────────────────────

function makeBaseLayer(id, overrides) {
  return {
    id,
    trackId: id,
    name: "Layer",
    visible: true,
    locked: false,
    sfx: null,
    cssAnimation: null,
    filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
    keyframes: { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    ...overrides,
  };
}

function makeGradientLayer(id, gradient, start, end, canvas = { width: W, height: H }) {
  return makeBaseLayer(id, {
    name: "BG",
    type: "gradient",
    gradient,
    start, end,
    zIndex: 0,
    transform: {
      x: 0, y: 0, width: canvas.width, height: canvas.height,
      opacity: 1, scale: 1, blur: 0, rotation: 0,
      borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    },
  });
}

function makeTextLayer(id, opts, start, end, keyframes = {}, canvas = { width: W, height: H }) {
  const {
    content, fontSize, fontFamily, fontWeight = 700, color,
    y = 0, height = canvas.height, zIndex = 2,
    textAnimation = "none", wordTimestamps = null,
    letterSpacing = 0, name = "Text",
  } = opts;

  return makeBaseLayer(id, {
    name,
    type: "text",
    content,
    start, end,
    zIndex,
    textAnimation,
    wordTimestamps,
    keyframes: { ...NO_KF, ...keyframes },
    transform: {
      x: 0, y, width: canvas.width, height,
      opacity: 1, scale: 1, blur: 0, rotation: 0,
      borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    },
    style: {
      fontSize, fontFamily, fontWeight, color,
      textAlign: "center", lineHeight: 1.15, letterSpacing,
    },
  });
}

// ── Per-beat layer builder ──────────────────────────────────────────────────────

function buildBeatLayer(beat, index, total, palette, fontPair, start, textEnd, bgEnd, keywordIdx, canvas = { width: W, height: H }) {
  const result   = [];
  const heroFont = fontPair?.hero ?? "Inter";

  // Background stretches to next beat so there's no black flash
  const bgGradient = `linear-gradient(165deg, ${palette.background} 0%, ${palette.backgroundSecondary} 100%)`;
  result.push(makeGradientLayer(`b${index}_bg`, bgGradient, start, bgEnd, canvas));

  const isFirst   = index === 0;
  const isLast    = index === total - 1;
  const isKeyword = beat.type === "keyword";
  const fSize     = beatFontSize(beat.text, beat.type);

  // Color — hook/closer: gradient; keywords: alternating; phrases: white
  let color;
  if (isFirst || isLast) {
    color = `linear-gradient(135deg, ${palette.accent} 0%, ${palette.highlight} 100%)`;
  } else if (isKeyword) {
    color = keywordIdx % 2 === 0 ? palette.accent : palette.highlight;
  } else {
    color = palette.primaryText;
  }

  let kf             = {};
  let textAnimation  = "none";
  let wordTimestamps = null;
  const fontWeight   = isKeyword ? 700 : 500;

  if (isFirst) {
    // Hook: blur-to-sharp — draws viewer in
    kf = {
      blur:    [{ time: 0, value: 14 }, { time: 0.24, value: 0 }],
      opacity: [{ time: 0, value: 0.1 }, { time: 0.24, value: 1 }],
      scale:   [{ time: 0, value: 1.06 }, { time: 0.24, value: 1 }],
    };
  } else if (isLast) {
    // Closer: scale-in — expansive finish
    kf = {
      scale:   [{ time: 0, value: 1.14 }, { time: 0.28, value: 1 }],
      opacity: [{ time: 0, value: 0 },    { time: 0.28, value: 1 }],
    };
  } else if (isKeyword) {
    // Keywords: cycle through 4 animations
    const animIdx = keywordIdx % 4;
    if (animIdx === 0) {
      kf = {
        scale:   [{ time: 0, value: 1.14 }, { time: 0.18, value: 1 }],
        opacity: [{ time: 0, value: 0 },    { time: 0.18, value: 1 }],
      };
    } else if (animIdx === 1) {
      // snap-in: instant, no kf
    } else if (animIdx === 2) {
      kf = {
        opacity: [{ time: 0, value: 0 }, { time: 0.18, value: 1 }],
        y:       [{ time: 0, value: 36 }, { time: 0.18, value: 0 }],
      };
    } else {
      kf = {
        blur:    [{ time: 0, value: 10 }, { time: 0.18, value: 0 }],
        opacity: [{ time: 0, value: 0.2 }, { time: 0.18, value: 1 }],
        scale:   [{ time: 0, value: 1.04 }, { time: 0.18, value: 1 }],
      };
    }
  } else {
    // Phrase: blur-to-sharp; long phrases use word-by-word
    const words = beat.text.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      textAnimation = "word-by-word";
      const dur = beat.duration_seconds ?? 1;
      wordTimestamps = words.map((word, i) => ({
        word,
        time: parseFloat((i * dur / words.length).toFixed(3)),
      }));
      kf = { opacity: [{ time: 0, value: 0 }, { time: 0.10, value: 1 }] };
    } else {
      kf = {
        blur:    [{ time: 0, value: 8 }, { time: 0.20, value: 0 }],
        opacity: [{ time: 0, value: 0.2 }, { time: 0.20, value: 1 }],
        scale:   [{ time: 0, value: 1.03 }, { time: 0.20, value: 1 }],
      };
    }
  }

  result.push(makeTextLayer(
    `b${index}_text`,
    {
      name: "Text", content: beat.text,
      fontSize: fSize, fontFamily: heroFont, fontWeight,
      color, y: 0, height: canvas.height, zIndex: 2,
      textAnimation, wordTimestamps,
    },
    start, textEnd, kf, canvas
  ));

  return result;
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function buildTypographyTimelineDirect(timedBeats, options = {}) {
  const {
    projectName          = "Typography Video",
    palette,
    fontPair,
    audioUrl             = null,
    audioDuration        = 0,
    canvas               = { width: W, height: H },
  } = options;

  const layers = [];
  const total  = timedBeats.length;
  let keywordIdx = 0;

  for (let i = 0; i < total; i++) {
    const beat      = timedBeats[i];
    const start     = parseFloat(beat.start.toFixed(4));
    const nextStart = timedBeats[i + 1]?.start;
    const bgEnd     = nextStart != null
      ? parseFloat(nextStart.toFixed(4))
      : parseFloat(Math.max(beat.end, audioDuration).toFixed(4));

    // Text cuts right after speech ends; background fills to next beat
    const HOLD    = 0.08;
    const textEnd = parseFloat(Math.min((beat.end ?? bgEnd) + HOLD, bgEnd).toFixed(4));

    const isKeyword = beat.type === "keyword";
    layers.push(...buildBeatLayer(
      beat, i, total, palette, fontPair, start, textEnd, bgEnd,
      isKeyword ? keywordIdx : -1, canvas
    ));
    if (isKeyword) keywordIdx++;
  }

  const lastBeat      = timedBeats[timedBeats.length - 1];
  const totalDuration = parseFloat(Math.max(lastBeat?.end ?? 0, audioDuration).toFixed(4));

  if (audioUrl) {
    layers.push({
      id: "voiceover_full", trackId: "track_voiceover",
      type: "audio", audioType: "voiceover", name: "Voiceover",
      src: audioUrl,
      start: 0, end: Math.max(totalDuration, audioDuration),
      zIndex: 0, visible: true, locked: false,
      trimStart: 0, trimEnd: audioDuration || totalDuration,
      volume: 1.0, muted: false, fadeIn: 0.05, fadeOut: 0.2,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
  }

  const timeline = {
    version: "2.0",
    id: null,
    name: projectName,
    format: { width: canvas.width, height: canvas.height, fps: FPS, duration: totalDuration },
    layers,
    meta: {
      source:         "typography_video",
      thumbnail:      null,
      editor_version: "timeline",
      caption_style:  "minimal",
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    },
  };

  return { timeline, total_frames: Math.round(totalDuration * FPS), fps: FPS };
}
