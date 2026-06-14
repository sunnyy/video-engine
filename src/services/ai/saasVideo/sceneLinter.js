/**
 * sceneLinter.js
 * src/services/ai/saasVideo/sceneLinter.js
 *
 * Stage 5 — mechanical verification of designed scenes.
 *
 * The v2 promo pipeline policed quality with prompt instructions and hope:
 * its only gate was "does the response contain an html tag". Here, every rule
 * the prompt states is re-checked as arithmetic on the parsed scene graph,
 * and violations trigger ONE targeted repair call that fixes only what's
 * broken, then the repaired scene is re-parsed.
 *
 * Checks:
 *   - text overflow (longest line × font size vs element width)
 *   - text cut off at canvas edges
 *   - same-column vertical overlap between text elements
 *   - brand-name bleed into scenes that must not show it
 *   - near-empty scenes (design effectively failed)
 */

import { openai } from "../../../server/middleware/shared.js";

const REPAIR_MODEL = "gpt-5.4";

const CHAR_WIDTH_FACTOR = 0.62; // average glyph width as a fraction of font size
const OVERFLOW_TOLERANCE = 1.18; // allow slight estimation error before flagging

// ── Individual checks ────────────────────────────────────────────────────────

function longestLine(text) {
  return (text ?? "").split("\n").reduce((max, l) => Math.max(max, l.trim().length), 0);
}

function checkTextOverflow(entry) {
  if (entry.type !== "text" || !entry.text) return null;
  const fontSize = entry.style?.fontSize ?? 48;
  const chars    = longestLine(entry.text);
  if (chars === 0) return null;

  // Multi-word text wraps; only flag when even wrapping can't save it
  // (single longest word must fit) or when a nowrap-style single line overflows hard.
  const words = entry.text.split(/\s+/);
  const longestWord = words.reduce((m, w) => Math.max(m, w.length), 0);
  const wordWidth = longestWord * fontSize * CHAR_WIDTH_FACTOR;
  if (wordWidth > entry.width * OVERFLOW_TOLERANCE) {
    return `"${entry.id}": word of ${longestWord} chars at font-size ${fontSize}px needs ~${Math.round(wordWidth)}px but element width is ${Math.round(entry.width)}px — reduce font-size or widen the element`;
  }
  if (words.length === 1 && chars * fontSize * CHAR_WIDTH_FACTOR > entry.width * OVERFLOW_TOLERANCE) {
    return `"${entry.id}": single-line text overflows its ${Math.round(entry.width)}px width at font-size ${fontSize}px — reduce font-size`;
  }
  return null;
}

function checkCanvasEdges(entry, canvasW, canvasH) {
  if (entry.type !== "text" || !entry.text) return null;
  if (entry.x < -8 || entry.y < -8) {
    return `"${entry.id}": text positioned off-canvas (left:${Math.round(entry.x)}px, top:${Math.round(entry.y)}px) — move fully inside the canvas`;
  }
  if (entry.x + Math.min(entry.width, longestLine(entry.text) * (entry.style?.fontSize ?? 48) * CHAR_WIDTH_FACTOR) > canvasW + 12) {
    return `"${entry.id}": text extends past the right canvas edge — reduce font-size or move left`;
  }
  if (entry.y + (entry.height ?? 0) > canvasH + 12) {
    return `"${entry.id}": text extends below the bottom canvas edge — move up`;
  }
  return null;
}

function horizontalOverlapRatio(a, b) {
  const left  = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const overlap = Math.max(0, right - left);
  const narrower = Math.min(a.width, b.width) || 1;
  return overlap / narrower;
}

function checkColumnOverlaps(entries) {
  const texts = entries.filter(e => e.type === "text" && e.text);
  const violations = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      // Same column = significant horizontal overlap; side-by-side columns are exempt
      if (horizontalOverlapRatio(a, b) < 0.5) continue;
      const aBottom = a.y + (a.height ?? 0);
      const bBottom = b.y + (b.height ?? 0);
      const vOverlap = Math.min(aBottom, bBottom) - Math.max(a.y, b.y);
      if (vOverlap > 12) {
        violations.push(`"${a.id}" and "${b.id}": text elements in the same column overlap vertically by ~${Math.round(vOverlap)}px — separate them by at least 40px`);
      }
    }
  }
  return violations;
}

// Roles that are allowed to occupy any space (ambient, not content)
const AMBIENT_ROLES = new Set(["background", "glow"]);

function isContentEntry(e) {
  return !AMBIENT_ROLES.has(e.role);
}

function checkVerticalCoverage(entries, canvasH) {
  const content = entries.filter(isContentEntry);
  if (content.length === 0) return null;
  const floor = canvasH * 0.74;
  const lowestBottom = content.reduce((max, e) => Math.max(max, e.y + (e.height ?? 0)), 0);
  if (lowestBottom < floor) {
    return `composition is clustered in the top of the canvas — the lowest meaningful element ends at y≈${Math.round(lowestBottom)} but must reach y=${Math.round(floor)}. Reposition supporting elements (icon rows, labels, dividers, stats) downward to anchor the lower third. Do not add new elements`;
  }
  return null;
}

function checkCaptionZone(entries, canvasH) {
  const top    = canvasH * 0.77;
  const bottom = canvasH * 0.885;
  return entries
    .filter(isContentEntry)
    .filter(e => {
      const eBottom = e.y + (e.height ?? 0);
      return eBottom > top && e.y < bottom;
    })
    .map(e => `"${e.id}": occupies the reserved caption band (y=${Math.round(top)}–${Math.round(bottom)}) where burned-in captions render — move it fully above y=${Math.round(top - 40)} or fully below y=${Math.round(bottom + 40)}`);
}

// ── Typo detection ───────────────────────────────────────────────────────────
// The designer re-types script words as display text and occasionally drops a
// letter ("DROWING" for "drowning"). A display word that is NOT in the
// script/harvest vocabulary but is one edit away from a vocabulary word is
// almost certainly a typo.

function isEditDistanceOne(a, b) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (a === b) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la === lb) { i++; j++; }       // substitution
    else if (la > lb) { i++; }          // deletion in b
    else { j++; }                       // insertion in b
  }
  return edits + (la - i) + (lb - j) === 1;
}

function normalizeWord(w) {
  return w.toLowerCase().replace(/[^a-z]/g, "");
}

function buildVocab(vocabText) {
  const vocab = new Set();
  for (const w of (vocabText ?? "").split(/\s+/)) {
    const n = normalizeWord(w);
    if (n.length >= 2) vocab.add(n);
  }
  return vocab;
}

function checkTypos(entries, vocabText) {
  if (!vocabText) return [];
  const vocab = buildVocab(vocabText);
  if (vocab.size === 0) return [];
  const violations = [];

  for (const entry of entries) {
    if (entry.type !== "text" || !entry.text) continue;
    for (const raw of entry.text.split(/\s+/)) {
      const word = normalizeWord(raw);
      if (word.length < 5 || vocab.has(word)) continue;
      for (const v of vocab) {
        if (v.length < 5) continue;
        // plural/tense variants (clip/clips, publish/published) are not typos
        if (word.startsWith(v) || v.startsWith(word)) continue;
        if (isEditDistanceOne(word, v)) {
          violations.push(`"${entry.id}": display text contains "${raw.trim()}" — likely a typo of "${v}". Correct the spelling`);
          break;
        }
      }
    }
  }
  return violations;
}

// ── Footage-scene checks (overlays on real footage) ─────────────────────────

function checkFootageOverlays(entries) {
  const violations = [];
  const content = entries.filter(isContentEntry);

  if (content.length > 5) {
    violations.push(`footage scene has ${content.length} overlay elements — maximum is 5. Remove the least important elements; the footage carries the scene`);
  }

  const glows = entries.filter(e => e.role === "glow");
  if (glows.length > 0) {
    violations.push(`footage scene contains ${glows.length} glow element(s) (${glows.map(g => `"${g.id}"`).join(", ")}) — glow orbs are forbidden on footage. Delete them`);
  }

  const images = entries.filter(e => e.type === "image");
  if (images.length > 0) {
    violations.push(`footage scene contains image element(s) (${images.map(i => `"${i.id}"`).join(", ")}) — no images allowed; the pipeline injects the footage. Delete them`);
  }

  const scrims = entries.filter(e => e.role === "background");
  if (scrims.length === 0) {
    violations.push(`footage scene is missing its scrim — add exactly one full-canvas div with data-role="background" and a semi-transparent dark linear-gradient for text legibility`);
  } else if (scrims.length === 1 && ((scrims[0].width ?? 0) < 1000 || (scrims[0].height ?? 0) < 1700)) {
    violations.push(`"${scrims[0].id}": the scrim is only ${Math.round(scrims[0].width)}x${Math.round(scrims[0].height)}px — it must cover the full canvas. Use explicit pixels (width:1080px;height:1920px), never percentages`);
  } else if (scrims.length > 1) {
    violations.push(`footage scene has ${scrims.length} background elements — keep exactly one semi-transparent scrim, delete the rest`);
  } else {
    const bg = (scrims[0].background ?? "").toLowerCase();
    const isOpaque = !bg.includes("rgba") && !bg.includes("transparent");
    if (isOpaque && bg.length > 0) {
      violations.push(`"${scrims[0].id}": the scrim appears opaque ("${bg.slice(0, 60)}…") — it must be a semi-transparent rgba gradient so the footage shows through`);
    }
  }

  return violations;
}

// ── Mockup-scene check: the UI frame must contain actual UI ─────────────────

function checkMockupFrame(entries, canvasW, canvasH) {
  const canvasArea = canvasW * canvasH;
  // Frame candidates: large gradient/card shapes (≥22% of canvas)
  const frames = entries.filter(e =>
    (e.type === "gradient") &&
    !AMBIENT_ROLES.has(e.role) &&
    (e.width * e.height) >= canvasArea * 0.22
  );
  if (frames.length === 0) return [];
  const frame = frames.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));

  const inner = entries.filter(e => {
    if (e === frame || AMBIENT_ROLES.has(e.role)) return false;
    const cx = e.x + (e.width ?? 0) / 2;
    const cy = e.y + (e.height ?? 0) / 2;
    return cx > frame.x && cx < frame.x + frame.width && cy > frame.y && cy < frame.y + frame.height;
  });

  if (inner.length < 3) {
    return [`"${frame.id}": the mockup frame is nearly empty (${inner.length} element(s) inside it) — a UI mockup must contain visible UI: a top bar with window dots, 3+ abstract content shapes (bars, cards, chart columns), and at least one stat or label INSIDE the frame`];
  }
  return [];
}

function checkBrandBleed(entries, productName, intent) {
  if (!productName || ["solution", "cta"].includes(intent)) return [];
  const name = productName.trim().toLowerCase();
  if (name.length < 3) return [];
  return entries
    .filter(e => e.type === "text" && e.text && e.role !== "logo" && e.text.toLowerCase().includes(name))
    .map(e => `"${e.id}": contains the product name "${productName}" but this is a ${intent} scene — the brand name is only allowed in solution and cta scenes. Replace it with concept-focused copy`);
}

// ── Public: lint ─────────────────────────────────────────────────────────────

/**
 * lintSceneGraph(graph, { canvasW, canvasH, productName, intent, captionsEnabled, isFootage })
 * @returns {string[]} violations — empty when the scene is clean
 */
export function lintSceneGraph(graph, { canvasW = 1080, canvasH = 1920, productName = "", intent = "", captionsEnabled = false, isFootage = false, isMockup = false, vocabText = "" }) {
  const violations = [];

  if (!graph || graph.length < 2) {
    violations.push("scene is nearly empty — fewer than 2 renderable elements parsed");
    return violations;
  }

  for (const entry of graph) {
    const overflow = checkTextOverflow(entry);
    if (overflow) violations.push(overflow);
    const edge = checkCanvasEdges(entry, canvasW, canvasH);
    if (edge) violations.push(edge);
  }
  violations.push(...checkColumnOverlaps(graph));
  violations.push(...checkBrandBleed(graph, productName, intent));
  violations.push(...checkTypos(graph, vocabText));

  if (isFootage) {
    // Footage owns the canvas — overlay discipline instead of coverage
    violations.push(...checkFootageOverlays(graph));
  } else {
    const coverage = checkVerticalCoverage(graph, canvasH);
    if (coverage) violations.push(coverage);
  }

  if (isMockup) violations.push(...checkMockupFrame(graph, canvasW, canvasH));

  if (captionsEnabled) violations.push(...checkCaptionZone(graph, canvasH));

  return violations;
}

// ── Public: targeted repair ──────────────────────────────────────────────────

/**
 * repairSceneHTML(html, violations, sceneLabel)
 * One call that fixes ONLY the listed violations. Returns repaired HTML, or
 * the original on failure (best effort — a flawed scene beats an empty one).
 */
export async function repairSceneHTML(html, violations, sceneLabel = "scene") {
  try {
    const response = await openai.chat.completions.create({
      model: REPAIR_MODEL,
      max_completion_tokens: 16000,
      messages: [
        {
          role: "system",
          content: `You are repairing one HTML video-scene frame. You will receive the full HTML and a list of mechanical violations found by an automated checker.
Fix ONLY the listed violations — adjust font sizes, positions, widths, or text content as each violation directs.
Do NOT redesign the scene. Do NOT add or remove elements unless a violation explicitly requires it.
Keep every data attribute intact. Keep all styling inline.
Output only the corrected HTML, nothing before <!DOCTYPE html>.`,
        },
        {
          role: "user",
          content: `VIOLATIONS:\n${violations.map((v, i) => `${i + 1}. ${v}`).join("\n")}\n\nHTML:\n${html}`,
        },
      ],
    });

    const raw = (response.choices[0].message.content ?? "")
      .replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

    if (raw.toLowerCase().includes("</html>")) {
      console.log(`[saas/linter] ${sceneLabel}: repaired ${violations.length} violation(s)`);
      return raw;
    }
    console.warn(`[saas/linter] ${sceneLabel}: repair returned invalid HTML — keeping original`);
    return html;
  } catch (e) {
    console.warn(`[saas/linter] ${sceneLabel}: repair failed (${e.message}) — keeping original`);
    return html;
  }
}
