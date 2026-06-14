/**
 * beatLinter.js
 * src/services/ai/promptVideo/beatLinter.js
 *
 * Stage 5 — mechanical verification of every designed beat, followed by one
 * targeted repair call per failing beat. Adapted from the saasVideo linter
 * (kept self-contained per service) with beat-specific gates:
 *   - element budget (beats are 2-4s frames)
 *   - motion mandate (≥2 animated elements)
 *   - scrim contract for full-bleed treatments
 *   - typo detection against script + research vocabulary
 */

import { openai } from "../../../server/middleware/shared.js";

const REPAIR_MODEL = "gpt-5.4";
const CHAR_WIDTH_FACTOR = 0.62;
const OVERFLOW_TOLERANCE = 1.18;

const AMBIENT_ROLES = new Set(["background", "glow"]);
const isContent = (e) => !AMBIENT_ROLES.has(e.role);

// ── Text checks ──────────────────────────────────────────────────────────────

function longestLine(text) {
  return (text ?? "").split("\n").reduce((m, l) => Math.max(m, l.trim().length), 0);
}

function checkTextOverflow(entry) {
  if (entry.type !== "text" || !entry.text) return null;
  const fontSize = entry.style?.fontSize ?? 48;
  const words = entry.text.split(/\s+/);
  const longestWord = words.reduce((m, w) => Math.max(m, w.length), 0);
  if (longestWord * fontSize * CHAR_WIDTH_FACTOR > entry.width * OVERFLOW_TOLERANCE) {
    return `"${entry.id}": word of ${longestWord} chars at ${fontSize}px needs ~${Math.round(longestWord * fontSize * CHAR_WIDTH_FACTOR)}px but width is ${Math.round(entry.width)}px — reduce font-size or widen`;
  }
  if (words.length === 1 && longestLine(entry.text) * fontSize * CHAR_WIDTH_FACTOR > entry.width * OVERFLOW_TOLERANCE) {
    return `"${entry.id}": single-line text overflows its ${Math.round(entry.width)}px width at ${fontSize}px`;
  }
  return null;
}

function checkCanvasEdges(entry, canvasW, canvasH) {
  if (entry.type !== "text" || !entry.text) return null;
  if (entry.x < -8 || entry.y < -8) return `"${entry.id}": positioned off-canvas (${Math.round(entry.x)}, ${Math.round(entry.y)})`;
  if (entry.y + (entry.height ?? 0) > canvasH + 12) return `"${entry.id}": extends below the canvas — move up`;
  const fontSize  = entry.style?.fontSize ?? 48;
  const textWidth = longestLine(entry.text) * fontSize * CHAR_WIDTH_FACTOR;
  if (entry.x + Math.min(entry.width ?? textWidth, textWidth) > canvasW + 12) {
    return `"${entry.id}": text extends past the RIGHT canvas edge and gets clipped — reduce font-size or move left so the full text fits inside x=0..${canvasW}`;
  }
  return null;
}

function checkInternalJargon(entries) {
  return entries
    .filter(e => e.type === "text" && e.text && /\b(beat|scene|frame)\s*\d+\b/i.test(e.text))
    .map(e => `"${e.id}": displays internal jargon "${e.text.trim()}" — viewers must never see beat/scene numbers. Replace with a content tag (topic word, year, or section numeral like "01")`);
}

function checkMinFontSize(entries) {
  return entries
    .filter(e => e.type === "text" && e.text && (e.style?.fontSize ?? 48) < 24)
    .map(e => `"${e.id}": font-size ${e.style.fontSize}px is illegible on a phone — minimum is 26px. Enlarge it or delete the element`);
}

function checkColumnOverlaps(entries) {
  const texts = entries.filter(e => e.type === "text" && e.text);
  const out = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      const hOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) / (Math.min(a.width, b.width) || 1);
      if (hOverlap < 0.5) continue;
      const vOverlap = Math.min(a.y + (a.height ?? 0), b.y + (b.height ?? 0)) - Math.max(a.y, b.y);
      if (vOverlap > 12) out.push(`"${a.id}" and "${b.id}" overlap vertically by ~${Math.round(vOverlap)}px — separate them`);
    }
  }
  return out;
}

// ── Contrast + script guards ─────────────────────────────────────────────────

function parseColor(color) {
  if (!color) return null;
  const c = color.toLowerCase().trim();
  const hex = /#([0-9a-f]{6})/.exec(c);
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?/.exec(c);
  if (hex) return { lum: 0.299 * parseInt(hex[1].slice(0, 2), 16) + 0.587 * parseInt(hex[1].slice(2, 4), 16) + 0.114 * parseInt(hex[1].slice(4, 6), 16), alpha: 1 };
  if (rgb) return { lum: 0.299 * +rgb[1] + 0.587 * +rgb[2] + 0.114 * +rgb[3], alpha: rgb[4] != null ? Math.max(0, Math.min(1, +rgb[4])) : 1 };
  if (c === "white") return { lum: 255, alpha: 1 };
  if (c === "black") return { lum: 0, alpha: 1 };
  return null;
}

function colorLuminance(color) {
  return parseColor(color)?.lum ?? null;
}

/** Effective luminance of a color as actually seen over a backdrop (alpha-blended). */
function effectiveLuminance(color, backdropLum, layerOpacity = 1) {
  const p = parseColor(color);
  if (!p) return null;
  const a = p.alpha * Math.max(0, Math.min(1, layerOpacity));
  return a * p.lum + (1 - a) * backdropLum;
}

function checkContrast(entries, paletteBg) {
  const bgLum = colorLuminance(paletteBg);
  if (bgLum == null) return [];
  const out = [];
  for (const e of entries) {
    if (e.type !== "text" || !e.text) continue;
    // Text sitting on its own chip is judged against the chip, not the canvas
    const ownBg = e.style?.background ? colorLuminance(e.style.background) : null;
    const baseLum = ownBg ?? bgLum;
    const textLum = colorLuminance(e.style?.color);
    if (textLum == null) continue;
    if (Math.abs(textLum - baseLum) < 75) {
      out.push(`"${e.id}": text color ${e.style.color} is nearly invisible against its ${ownBg != null ? "chip" : "background"} (luminance gap ${Math.round(Math.abs(textLum - baseLum))}) — use a high-contrast color (white/near-white on dark, near-black on light)`);
    }
  }
  return out;
}

const CJK_RE        = /[⺀-鿿가-힯぀-ヿ]/;
const DEVANAGARI_RE = /[ऀ-ॿ]/;

function checkForeignScript(entries, language) {
  const lang = (language ?? "en").toLowerCase();
  const cjkOk  = /^(zh|ja|ko)/.test(lang);
  const devOk  = /^(hi|hinglish|mr|ne)/.test(lang);
  const out = [];
  for (const e of entries) {
    if (e.type !== "text" || !e.text) continue;
    if (!cjkOk && CJK_RE.test(e.text)) {
      out.push(`"${e.id}": contains Chinese/Japanese/Korean characters but this video's language is ${lang} — model-invented foreign glyphs read as corruption. Replace with ${lang} text`);
    } else if (!devOk && DEVANAGARI_RE.test(e.text)) {
      out.push(`"${e.id}": contains Devanagari characters but this video's language is ${lang} — replace with ${lang} text`);
    }
  }
  return out;
}

// ── Typo detection (script + research vocabulary) ───────────────────────────

function isEditDistanceOne(a, b) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1 || a === b) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la === lb) { i++; j++; } else if (la > lb) { i++; } else { j++; }
  }
  return edits + (la - i) + (lb - j) === 1;
}

const normWord = (w) => w.toLowerCase().replace(/[^a-z]/g, "");

function checkTypos(entries, vocabText) {
  if (!vocabText) return [];
  const vocab = new Set(vocabText.split(/\s+/).map(normWord).filter(w => w.length >= 2));
  const out = [];
  for (const entry of entries) {
    if (entry.type !== "text" || !entry.text) continue;
    for (const raw of entry.text.split(/\s+/)) {
      const word = normWord(raw);
      if (word.length < 5 || vocab.has(word)) continue;
      for (const v of vocab) {
        if (v.length < 5 || word.startsWith(v) || v.startsWith(word)) continue;
        if (isEditDistanceOne(word, v)) {
          out.push(`"${entry.id}": contains "${raw.trim()}" — likely a typo of "${v}". Correct the spelling`);
          break;
        }
      }
    }
  }
  return out;
}

// ── Beat-specific gates ──────────────────────────────────────────────────────

function checkElementBudget(entries) {
  const content = entries.filter(isContent);
  return content.length > 9
    ? [`beat has ${content.length} content elements — maximum is 9. Delete the least important; this frame is on screen for ~2 seconds`]
    : [];
}

function checkSparse(entries, isFullBleed) {
  // Full-bleed beats may be sparse (the image is the content); designed
  // frames with fewer than 4 elements read as empty
  if (isFullBleed) return [];
  const content = entries.filter(isContent);
  return content.length < 4
    ? [`beat has only ${content.length} content element(s) — designed frames need at least 4 (add craft: a ghost numeral, a corner tag, an accent rule line, a texture strip). An empty frame is a failure`]
    : [];
}

function checkEmptyFrame(entries, canvasW, canvasH) {
  // A large card/frame shape with nothing inside it (the empty-poster bug)
  const canvasArea = canvasW * canvasH;
  const frames = entries.filter(e =>
    e.type === "gradient" && isContent(e) && (e.width * e.height) >= canvasArea * 0.22
  );
  if (!frames.length) return [];
  const frame = frames.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
  const inner = entries.filter(e => {
    if (e === frame || !isContent(e)) return false;
    const cx = e.x + (e.width ?? 0) / 2, cy = e.y + (e.height ?? 0) / 2;
    return cx > frame.x && cx < frame.x + frame.width && cy > frame.y && cy < frame.y + frame.height;
  });
  return inner.length < 2
    ? [`"${frame.id}": large frame/card is nearly empty (${inner.length} element(s) inside) — fill it with its content (text, bars, rows) or delete the frame`]
    : [];
}

function checkMotion(entries) {
  const animated = entries.filter(e => isContent(e) && e.animation && e.animation !== "none");
  return animated.length < 2
    ? [`only ${animated.length} element(s) have an entrance animation — at least 2 content elements need data-animation (fade-up / scale-in / slide). A static beat is a failure`]
    : [];
}

function checkScrim(entries, canvasW, canvasH) {
  const scrims = entries.filter(e => e.role === "background");
  if (scrims.length === 0) {
    return [`full-bleed beat is missing its scrim — add one full-canvas div (data-role="background", explicit pixels: width:${canvasW}px;height:${canvasH}px) with a semi-transparent dark gradient`];
  }
  const s = scrims[0];
  if ((s.width ?? 0) < canvasW * 0.92 || (s.height ?? 0) < canvasH * 0.88) {
    return [`"${s.id}": scrim is ${Math.round(s.width)}x${Math.round(s.height)}px — must cover the full ${canvasW}x${canvasH} canvas. Explicit pixels, never percentages`];
  }
  const bg = (s.background ?? "").toLowerCase();
  if (bg && !bg.includes("rgba") && !bg.includes("transparent")) {
    return [`"${s.id}": scrim looks opaque — it must be a semi-transparent rgba gradient so the visual shows through`];
  }
  return [];
}

// ── Public: lint ─────────────────────────────────────────────────────────────

function checkOverlayBands(entries, canvasW, canvasH) {
  // Overlay-mode designs may only occupy the lower band and a small top
  // kicker zone — the image owns the middle of the frame
  const bandTop = canvasH * 0.50, kickerBottom = canvasH * 0.18;
  const out = [];
  for (const e of entries) {
    if (!isContent(e) || e.type === "gradient") continue;
    const bottom = e.y + (e.height ?? 0);
    const inLower  = e.y >= bandTop;
    const inKicker = bottom <= kickerBottom;
    if (!inLower && !inKicker) {
      out.push(`"${e.id}": sits in the middle of the shot (y=${Math.round(e.y)}) — overlay elements live in the lower band (y ≥ ${Math.round(bandTop)}) or the top kicker zone (bottom ≤ ${Math.round(kickerBottom)}). The image owns the middle`);
    }
  }
  return out;
}

export function lintBeatGraph(graph, { canvasW = 1080, canvasH = 1920, isFullBleed = false, overlayMode = false, vocabText = "", paletteBg = null, language = "en" }) {
  const v = [];
  if (!graph || graph.length < (overlayMode ? 1 : 2)) {
    v.push("beat is nearly empty — too few renderable elements parsed");
    return v;
  }
  for (const entry of graph) {
    const o = checkTextOverflow(entry); if (o) v.push(o);
    const e = checkCanvasEdges(entry, canvasW, canvasH); if (e) v.push(e);
  }
  v.push(...checkColumnOverlaps(graph));
  v.push(...checkTypos(graph, vocabText));
  // Shot overlays sit on a dark scrim regardless of palette
  v.push(...checkContrast(graph, (isFullBleed || overlayMode) ? "#101418" : paletteBg));
  v.push(...checkForeignScript(graph, language));
  v.push(...checkInternalJargon(graph));
  v.push(...checkMinFontSize(graph));
  v.push(...checkElementBudget(graph));

  if (overlayMode) {
    // Overlays: small by design — band discipline instead of density rules
    v.push(...checkOverlayBands(graph, canvasW, canvasH));
    return v;
  }

  v.push(...checkSparse(graph, isFullBleed));
  v.push(...checkEmptyFrame(graph, canvasW, canvasH));
  v.push(...checkMotion(graph));
  if (isFullBleed) v.push(...checkScrim(graph, canvasW, canvasH));
  return v;
}

// ── Public: targeted repair ──────────────────────────────────────────────────

export async function repairBeatHTML(html, violations, label = "beat") {
  try {
    const response = await openai.chat.completions.create({
      model: REPAIR_MODEL,
      max_completion_tokens: 12000,
      messages: [
        {
          role: "system",
          content: `You repair one HTML video frame. Fix ONLY the listed violations — adjust sizes, positions, animations, or text as each directs. Do NOT redesign. The output must contain the SAME elements as the input (add at most 1-2 only if a violation explicitly demands it, e.g. "too sparse"). Keep all data attributes and inline styling. Output only the corrected HTML starting at <!DOCTYPE html>.`,
        },
        { role: "user", content: `VIOLATIONS:\n${violations.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nHTML:\n${html}` },
      ],
    });
    const raw = (response.choices[0].message.content ?? "")
      .replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    if (raw.toLowerCase().includes("</html>")) {
      console.log(`[prompt/lint] ${label}: repaired ${violations.length} violation(s)`);
      return raw;
    }
    return html;
  } catch (e) {
    console.warn(`[prompt/lint] ${label}: repair failed (${e.message})`);
    return html;
  }
}
