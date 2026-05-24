const CANVAS_W = 1080;
const CANVAS_H = 1920;

function emptyKeyframes() {
  return { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };
}

function punchKeyframes() {
  return {
    ...emptyKeyframes(),
    scale: [{ time: 0, value: 1.3 }, { time: 0.15, value: 1.0 }],
  };
}

export function convertTypographyToTimeline({
  sentences = [],
  palette = ["#000000", "#FF2F2F", "#FFFFFF"],
  audioUrl = null,
}) {
  const layers = [];

  sentences.forEach((sentence, si) => {
    const phrases = sentence.phrases || [];
    if (!phrases.length) return;

    const sentenceStart     = phrases[0].phraseStart ?? 0;
    const lastPhrase        = phrases[phrases.length - 1];
    const nextSentenceStart = sentences[si + 1]?.phrases?.[0]?.phraseStart ?? null;
    const sentenceEnd       = nextSentenceStart ?? (lastPhrase.phraseEnd ?? 0) + 0.04;

    const bgIndex      = sentence.backgroundColorIndex ?? (si % 2 === 0 ? 0 : 2);
    const bgColor      = palette[bgIndex] || "#000000";
    const textColor    = bgIndex === 0 ? (palette[2] || "#ffffff") : (palette[0] || "#000000");
    const emphasisColor = sentence.emphasisColor || palette[1] || "#ff2f2f";
    const emphasisWords = (sentence.emphasis || []).map((w) => w.toLowerCase());

    // One background layer per sentence — full canvas, instant cut
    layers.push({
      id:       `sentence_${si}_bg`,
      trackId:  "track_bg",
      type:     "gradient",
      gradient: bgColor,
      start:    sentenceStart,
      end:      sentenceEnd,
      zIndex:   0,
      visible:  true,
      locked:   false,
      sfx:      null,
      transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
      keyframes:  emptyKeyframes(),
      transform:  {
        x: 0, y: 0, width: CANVAS_W, height: CANVAS_H,
        opacity: 1, rotation: 0, scale: 1, blur: 0,
        borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
      },
    });

    // One text layer per phrase — stackLayout, shared track row
    phrases.forEach((phrase, pi) => {
      const isEmphasis = emphasisWords.some((ew) => phrase.text.toLowerCase().includes(ew));
      const fontSize   = isEmphasis ? 160 : 120;
      const color      = isEmphasis ? emphasisColor : textColor;

      const phraseStart = phrase.phraseStart ?? sentenceStart;
      // End snapped to the next phrase's start for instant cuts between phrases
      const phraseEnd = pi < phrases.length - 1
        ? (phrases[pi + 1].phraseStart ?? sentenceEnd)
        : sentenceEnd;

      const charCount = (phrase.text || "").replace(/\s+/g, "").length || 1;
      const layerW    = Math.min(960, Math.round(fontSize * charCount * 0.58));
      const layerH    = Math.round(fontSize * 1.4);

      layers.push({
        id:      `sentence_${si}_phrase_${pi}`,
        trackId: "track_wg_0",
        type:    "text",
        content:     phrase.text || "",
        style: {
          fontFamily:    "Bebas Neue",
          fontSize,
          fontWeight:    700,
          color,
          textAlign:     "center",
          lineHeight:    1.0,
          letterSpacing: 4,
          textTransform: "uppercase",
          background:    null,
          borderRadius:  0,
          padding:       0,
          textShadow:    null,
          accentWord:    null,
          accentColor:   null,
        },
        start:   phraseStart,
        end:     phraseEnd,
        zIndex:  4,
        visible: true,
        locked:  false,
        sfx:     null,
        transition: {
          in:  isEmphasis
            ? { type: "none",     duration: 0    }
            : { type: "slide-up", duration: 0.15 },
          out: { type: "none", duration: 0 },
        },
        keyframes: isEmphasis ? punchKeyframes() : emptyKeyframes(),
        transform: {
          x: 0, y: 0, width: layerW, height: layerH,
          opacity: 1, rotation: 0, scale: 1, blur: 0,
          borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
        },
      });
    });
  });

  // Voiceover audio layer
  if (audioUrl) {
    const totalDuration = layers
      .filter((l) => l.type !== "audio")
      .reduce((max, l) => Math.max(max, l.end ?? 0), 0);
    layers.push({
      id:        "voiceover_main",
      trackId:   "voiceover_main",
      type:      "audio",
      audioType: "voiceover",
      name:      "Voiceover",
      start:     0,
      end:       totalDuration,
      src:       audioUrl,
      volume:    1.0,
      visible:   false,
      locked:    false,
      muted:     false,
      fadeIn:    0,
      fadeOut:   0.15,
      sfx:       null,
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      transform: {
        x: 0, y: 0, width: 0, height: 0,
        opacity: 1, rotation: 0, scale: 1, blur: 0,
        borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
      },
    });
  }

  return layers;
}
