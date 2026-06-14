/**
 * captionBuilder.js
 * src/services/ai/saasVideo/captionBuilder.js
 *
 * Builds burned-in caption text layers from the ElevenLabs word timestamps
 * the pipeline already produces for scene timing. Most short-form video is
 * watched muted — captions are a default, not an add-on.
 *
 * Strategy: group words into chunks (≤4 words, ≤1.8s, break on gaps), one
 * text layer per chunk in a dedicated caption band near the bottom of the
 * canvas, clear of the safe areas used by scene CTAs.
 */

const MAX_WORDS_PER_CHUNK = 4;
const MAX_CHUNK_SECONDS   = 1.8;
const GAP_BREAK_SECONDS   = 0.55;
const MIN_CHUNK_SECONDS   = 0.6; // chunks flashing faster than this get merged

// TTS sometimes returns fused tokens like "turnarounds—time". Split them into
// separate words, dividing the token's time span proportionally by length.
function splitFusedTokens(wordTimestamps) {
  const out = [];
  for (const w of wordTimestamps) {
    const word = (w?.word ?? "").trim();
    if (!word) continue;

    const parts = word.split(/[—–]/).map(p => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      out.push({ ...w, word });
      continue;
    }

    const span      = Math.max(0, (w.end ?? 0) - (w.start ?? 0));
    const totalLen  = parts.reduce((a, p) => a + p.length, 0) || 1;
    let cursor      = w.start ?? 0;
    parts.forEach((part, i) => {
      const slice = span * (part.length / totalLen);
      out.push({
        word:  i < parts.length - 1 ? `${part}—` : part,
        start: parseFloat(cursor.toFixed(3)),
        end:   parseFloat((cursor + slice).toFixed(3)),
      });
      cursor += slice;
    });
  }
  return out;
}

const BREAK_AFTER = /[.!?…]$|—$/;

function chunkWords(wordTimestamps) {
  const chunks = [];
  let current = [];

  for (const w of splitFusedTokens(wordTimestamps)) {
    const last = current[current.length - 1];

    const startsNewChunk =
      current.length >= MAX_WORDS_PER_CHUNK ||
      (last && (w.start - last.end) > GAP_BREAK_SECONDS) ||
      (current.length > 0 && (w.end - current[0].start) > MAX_CHUNK_SECONDS) ||
      (last && BREAK_AFTER.test(last.word.trim()));

    if (startsNewChunk && current.length > 0) {
      chunks.push(current);
      current = [];
    }
    current.push(w);
  }
  if (current.length > 0) chunks.push(current);

  return mergeTinyChunks(chunks);
}

// Merge orphan chunks (single word or sub-MIN duration) into a neighbour when
// the result stays readable. Prefer merging forward; fall back to backward.
function mergeTinyChunks(chunks) {
  const dur   = (c) => c[c.length - 1].end - c[0].start;
  const endsHard = (c) => BREAK_AFTER.test(c[c.length - 1].word.trim());

  let merged = true;
  while (merged && chunks.length > 1) {
    merged = false;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const tiny = c.length === 1 || dur(c) < MIN_CHUNK_SECONDS;
      if (!tiny) continue;

      const next = chunks[i + 1];
      const prev = chunks[i - 1];
      // Forward merge unless this chunk ends a sentence/clause
      if (next && !endsHard(c) && c.length + next.length <= MAX_WORDS_PER_CHUNK + 1) {
        chunks.splice(i, 2, [...c, ...next]);
        merged = true;
        break;
      }
      if (prev && !endsHard(prev) && prev.length + c.length <= MAX_WORDS_PER_CHUNK + 1) {
        chunks.splice(i - 1, 2, [...prev, ...c]);
        merged = true;
        break;
      }
    }
  }
  return chunks;
}

/**
 * buildCaptionLayers(wordTimestamps, opts)
 * @param {Array<{word, start, end}>} wordTimestamps
 * @param {object} opts — { canvasW, canvasH, theme, accentColor, totalDuration }
 * @returns {Array} timeline text layers
 */
export function buildCaptionLayers(wordTimestamps, { canvasW = 1080, canvasH = 1920, theme = "dark", accentColor = "#ffffff", totalDuration = 0 }) {
  if (!wordTimestamps?.length) return [];

  const chunks = chunkWords(wordTimestamps);
  const color  = theme === "light" ? "#0a0b12" : "#ffffff";
  const shadow = theme === "light"
    ? "0 2px 14px rgba(255,255,255,0.65)"
    : "0 2px 14px rgba(0,0,0,0.75)";

  const fontSize = Math.round(canvasW * 0.046); // ~50px on 1080
  const bandY    = Math.round(canvasH * 0.795); // below content, above CTA-safe bottom margin

  return chunks.map((chunk, i) => {
    const start = Math.max(0, parseFloat(chunk[0].start.toFixed(3)));
    const rawEnd = parseFloat((chunk[chunk.length - 1].end + 0.08).toFixed(3));
    const end = totalDuration > 0 ? Math.min(rawEnd, totalDuration) : rawEnd;
    const text = chunk.map(w => w.word.trim()).join(" ");

    return {
      id:      `caption_${i}`,
      trackId: "track_captions",
      name:    "Caption",
      type:    "text",
      content: text,
      start,
      end,
      zIndex:  90,
      visible: true,
      locked:  false,
      sfx:     null,
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
      transform: {
        x:            Math.round(canvasW * 0.07),
        y:            bandY,
        width:        Math.round(canvasW * 0.86),
        height:       Math.round(fontSize * 1.5),
        opacity:      1,
        scale:        1,
        blur:         0,
        rotation:     0,
        borderRadius: 0,
        borderWidth:  0,
        borderColor:  "#ffffff",
      },
      style: {
        fontSize,
        fontFamily:    "Inter, sans-serif",
        fontWeight:    800,
        color,
        textAlign:     "center",
        lineHeight:    1.25,
        letterSpacing: 0.5,
        textShadow:    shadow,
        textTransform: "none",
      },
      animation:  null,
      dataRole:   "caption",
      dataLayer:  "text",
    };
  });
}
