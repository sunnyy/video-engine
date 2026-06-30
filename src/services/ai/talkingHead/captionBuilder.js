/**
 * talkingHead/captionBuilder.js
 *
 * Builds editor-compatible, word-synced caption layers from Whisper word timestamps. The layer
 * shape mirrors CaptionStudio (services/captions/generateCaptions.js) so the editor renders them
 * with the same caption-style engine. Preset DATA is copied here (plain objects) because the
 * source registry is a .jsx of React components the backend can't import — keys stay in sync with
 * core/registries/captionTimelineRegistry.jsx.
 */

export const CAPTION_PRESETS = {
  wordBlaze:      { style: { fontFamily: "'Bebas Neue',sans-serif",       fontSize: 84, fontWeight: "400", color: "#ffffff", textAlign: "center", letterSpacing: 1,        textShadow: "0 0 20px rgba(245,197,24,0.5)" },        transition: { in: { type: "zoom",        duration: 0.12, intensity: 0.7 },  out: { type: "fade",     duration: 0.08, intensity: 1 } } },
  karaokeFill:    { style: { fontFamily: "'Outfit',sans-serif",           fontSize: 70, fontWeight: "800", color: "#ffffff", textAlign: "center" },                                                                              transition: { in: { type: "slide-up",    duration: 0.12, intensity: 0.6 },  out: { type: "fade",     duration: 0.08, intensity: 1 } } },
  editorial:      { style: { fontFamily: "'Playfair Display',serif",      fontSize: 60, fontWeight: "500", color: "#ffffff", textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,0.55)" },                                     transition: { in: { type: "fade",        duration: 0.18, intensity: 1 },    out: { type: "fade",     duration: 0.1,  intensity: 1 } } },
  stackReveal:    { style: { fontFamily: "'Unbounded',sans-serif",        fontSize: 58, fontWeight: "900", color: "#ffffff", textAlign: "center" },                                                                              transition: { in: { type: "fade",        duration: 0.15, intensity: 1 },    out: { type: "fade",     duration: 0.1,  intensity: 1 } } },
  markerPen:      { style: { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 72, fontWeight: "900", color: "#ffffff", textAlign: "center", textShadow: "0 2px 0 rgba(0,0,0,0.5)" },                                       transition: { in: { type: "slide-right", duration: 0.12, intensity: 0.5 },  out: { type: "fade",     duration: 0.08, intensity: 1 } } },
  glitchStamp:    { style: { fontFamily: "'Outfit',sans-serif",           fontSize: 68, fontWeight: "800", color: "#ffffff", textAlign: "center", textShadow: "-2px 0 #ff003c, 2px 0 #00f7ff" },                                 transition: { in: { type: "zoom",        duration: 0.08, intensity: 0.9 },  out: { type: "dissolve", duration: 0.1,  intensity: 0.8 } } },
  editorialSerif: { style: { fontFamily: "'Playfair Display',serif",      fontSize: 52, fontWeight: "700", color: "#14120f", textAlign: "left",   letterSpacing: 0 },                                                            transition: { in: { type: "fade",        duration: 0.2,  intensity: 1 },    out: { type: "fade",     duration: 0.15, intensity: 1 } } },
  neonTicker:     { style: { fontFamily: "'JetBrains Mono',monospace",    fontSize: 62, fontWeight: "700", color: "#00e5c3", textAlign: "center", letterSpacing: "0.04em", textShadow: "0 0 12px rgba(0,229,195,0.7)" },        transition: { in: { type: "slide-up",    duration: 0.1,  intensity: 0.5 },  out: { type: "dissolve", duration: 0.12, intensity: 0.7 } } },
  pillDrop:       { style: { fontFamily: "'Outfit',sans-serif",           fontSize: 66, fontWeight: "800", color: "#ffffff", textAlign: "center", textShadow: "0 0 20px rgba(124,92,252,0.6)" },                                transition: { in: { type: "slide-down",  duration: 0.12, intensity: 0.6 },  out: { type: "fade",     duration: 0.08, intensity: 1 } } },
  brutalSlam:     { style: { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 92, fontWeight: "900", color: "#ff2d55", textAlign: "center", letterSpacing: -1,       textShadow: "2px 2px 0 #000, -1px -1px 0 #000" },    transition: { in: { type: "zoom",        duration: 0.07, intensity: 0.95 }, out: { type: "fade",     duration: 0.06, intensity: 1 } } },
  luxuryGold:     { style: { fontFamily: "'Outfit',sans-serif",           fontSize: 56, fontWeight: "800", color: "#ffd700", textAlign: "center", letterSpacing: -0.5,     textShadow: "0 0 16px rgba(255,215,0,0.5)" },        transition: { in: { type: "dissolve",    duration: 0.2,  intensity: 0.8 },  out: { type: "dissolve", duration: 0.15, intensity: 0.8 } } },
};

const CHUNK_PAUSE = 0.6; // start a new caption chunk after a real pause, even mid-count

/** Group words into ~N-word caption chunks, breaking on pauses, using real word timing. */
function chunkWords(words, perChunk = 3) {
  const chunks = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    chunks.push({
      text:  cur.map((w) => w.word).join(" ").replace(/\s+/g, " ").trim(),
      start: parseFloat(cur[0].start.toFixed(3)),
      end:   parseFloat(cur[cur.length - 1].end.toFixed(3)),
    });
    cur = [];
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = words[i - 1];
    if (cur.length && (cur.length >= perChunk || (prev && w.start - prev.end > CHUNK_PAUSE))) flush();
    cur.push(w);
  }
  flush();
  return chunks;
}

/**
 * buildCaptionLayers(words, { captionStyle, captionPos, canvas })
 * captionPos: 0–100 (vertical center, % of canvas height). Returns editor text layers.
 */
export function buildCaptionLayers(words, { captionStyle = "wordBlaze", captionPos = 80, canvas, suppressRanges = [] } = {}) {
  if (!words?.length || !canvas) return [];
  // Hide captions where a text-heavy visual leads the idea (e.g. designed cards): drop any
  // chunk whose midpoint falls inside a suppressed [start,end] window.
  const suppressed = (start, end) => {
    const mid = (start + end) / 2;
    return suppressRanges.some(([s, e]) => mid >= s && mid <= e);
  };
  const preset   = CAPTION_PRESETS[captionStyle] ?? CAPTION_PRESETS.wordBlaze;
  const captionW = Math.round(canvas.width * 0.9);
  const captionH = Math.round(canvas.height * 0.115);
  const captionX = Math.round((canvas.width - captionW) / 2);
  const yCenter  = (captionPos / 100) * canvas.height;
  const captionY = Math.max(0, Math.min(canvas.height - captionH, Math.round(yCenter - captionH / 2)));

  return chunkWords(words, 3).filter((c) => !suppressed(c.start, c.end)).map((chunk, i) => ({
    id: `caption_${i}`, trackId: `caption_${i}`, name: `Caption ${i + 1}`,
    type: "text", content: chunk.text,
    style: { ...preset.style, _captionStyle: captionStyle }, captionStyle,
    start: chunk.start, end: chunk.end, zIndex: 20,
    visible: true, locked: false, sfx: null, animation: null,
    keyframes:  { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
    transition: preset.transition,
    transform:  { x: captionX, y: captionY, width: captionW, height: captionH, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  }));
}
