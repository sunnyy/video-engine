/**
 * designPrompts.js
 * src/services/ai/promptVideo/designPrompts.js
 *
 * v3 — THE CONTENT CONTRACT.
 *
 * The director decides WHAT (source + content: real strings, numbers, kinds).
 * The designer decides HOW (composition, with full freedom) — but its medium
 * is typography, data, and layout. It never depicts objects or scenes with
 * shapes: pictures are the job of shots, not divs.
 *
 * Two design modes:
 *   1. CANVAS MODE  — html_ui and cutout beats: the designer owns the whole
 *      frame, building an information frame from the content object.
 *   2. OVERLAY MODE — shot beats with content: the designer builds ONLY a
 *      typographic overlay block in safe bands over pipeline-injected media
 *      (media + scrim are code-built; the overlay is never blind full-canvas
 *      composition).
 */

import { styleDirectiveBlock } from "./styleSystem.js";

// ── Content spec block — the information the frame must carry ───────────────

function contentBlock(beat) {
  const c = beat.content ?? { kind: "none" };
  const lines = [`CONTENT (render these EXACT strings — this is the frame's information):`, `- kind: ${c.kind}`];
  if (c.headline)    lines.push(`- headline: "${c.headline}"`);
  if (c.subtext)     lines.push(`- subtext: "${c.subtext}"`);
  if (c.attribution) lines.push(`- attribution: "${c.attribution}"`);
  if (Array.isArray(c.items) && c.items.length) {
    lines.push(`- items: ${JSON.stringify(c.items)}`);
    lines.push(c.items[0]?.value != null
      ? `  (chart data — render as simple bars/blocks with the labels and values shown)`
      : `  (list items — each gets its own row/element, staggered entrances)`);
  }
  lines.push(`Genre hints by kind: hook = arresting headline scale · stat = the number IS the hero · quote = the words + attribution · list = rows that land one by one · chart = clean bars with real values · title = date/name card · cta = the ask, unmissable.`);
  return lines.join("\n");
}

const PARSER_CONTRACT = (canvasW, canvasH) => `PARSER CONTRACT (mechanical — violations break the render):
- No JavaScript. No SVG. No Canvas. No external assets except image URLs given below.
- Google Fonts via @import allowed (max 2 families, matching the style's type system).
- Fixed ${canvasW}x${canvasH}px. Every element: position:absolute with explicit left/top/width in PIXELS (never %). Never nest positioned elements. Never use right/bottom/flexbox/grid.
- All styling inline (only @import lives in <style>).
- Required data attributes on every meaningful element:
  data-role: headline | subhead | kicker | label | badge | stat-number | card | icon | divider | glow | background | decoration
  data-layer: text | gradient | image | effect | decoration
  data-animation: fade-in | fade-up | scale-in | slide-left | slide-right | none
  data-scene-element: hero | background | supporting | decoration
- Icons: data-icon="lucide-kebab-name" on data-role="icon" elements.`;

const TEXT_RULES = `TEXT RULES (mechanical):
- Overflow: longest_line_chars × font_size × 0.62 ≤ element width. Single words: white-space:nowrap. Text fits FULLY inside the canvas.
- MINIMUM font size 26px. Spell every word EXACTLY as given. Use ONLY the beat text's language — never invent foreign-script characters.
- Text colors contrast HARD with what's behind them. No fixed heights on text elements. Never emit an empty shape.`;

// ── Main prompt builder ──────────────────────────────────────────────────────

export function buildBeatPrompt(beat, ctx) {
  const { style, palette, canvasW, canvasH } = ctx;
  const duration = beat.duration_seconds ?? 3;
  const isOverlay = !!beat.asset?.src && (beat.asset.kind === "image" || beat.asset.kind === "video");

  if (isOverlay) {
    // ── OVERLAY MODE ────────────────────────────────────────────────────────
    const bandTop = Math.round(canvasH * 0.52);
    const bandBottom = Math.round(canvasH * 0.94);
    const kickerBottom = Math.round(canvasH * 0.16);
    const system = `You design the TYPOGRAPHIC OVERLAY for one shot of a fast-cut video — on screen ${duration.toFixed(1)}s. A cinematic ${beat.asset.kind === "video" ? "clip" : "image"} plays full-bleed behind your overlay (pipeline-injected with a legibility scrim — you build NEITHER).

${styleDirectiveBlock(style)}
PALETTE: accent ${palette.accent} · accent2 ${palette.accent2} · text near-white over the scrim

${contentBlock(beat)}

OVERLAY CONSTRAINTS (these keep your design off the image's subject — they are absolute):
- body and html background: transparent. NO background element, NO scrim, NO images, NO full-canvas anything.
- 2-5 typographic elements total: the content above, plus optionally one kicker tag and one thin accent rule/divider.
- POSITION BANDS: main content lives between y=${bandTop} and y=${bandBottom}. A small kicker/tag may sit at the top (y ≤ ${kickerBottom}). NOTHING between those bands — the image owns the middle.
- Promo-grade typography: strong hierarchy, the style's type system, accent color on the key word/number, text-shadow for extra punch.
- At least 1 element animated (data-animation) — entrances land with the voice.

${PARSER_CONTRACT(canvasW, canvasH)}

${TEXT_RULES}

OUTPUT: only the HTML, starting at <!DOCTYPE html>. html and body: width:${canvasW}px;height:${canvasH}px;overflow:hidden;margin:0;background:transparent;`;

    const user = `BEAT ${beat.beat_index} — overlay on a shot of: ${beat.image_prompt ?? beat.shot_query ?? beat.visual_concept}
SPOKEN: "${beat.script_line}"
INTENT: ${beat.visual_concept}

Design the overlay.`;
    return { system, user };
  }

  // ── CANVAS MODE ───────────────────────────────────────────────────────────
  const maxWords = Math.max(4, Math.round(duration * 3));
  const cutoutBlock = beat.asset?.src && beat.asset.kind === "cutout"
    ? `\nRAW MATERIAL: a transparent-background cutout of the subject${beat.asset.real ? " (a REAL photo)" : ""}: ${beat.asset.src}
Embed it with <img data-layer="image" data-role="card" src="${beat.asset.src}" style="position:absolute;left:[x]px;top:[y]px;width:[w]px;height:[h]px;z-index:[z];object-fit:contain;" /> plus your data attributes. Size, placement, layering with text — your call. Cutouts shine LARGE.\n`
    : "";
  const continuation = beat.continues_previous
    ? `\nCONTINUATION: this beat EXTENDS the previous frame's moment — same background family, same composition skeleton. The previous text has landed; THIS frame advances it with the new content arriving as the next element.\n`
    : "";

  const system = `You design ONE INFORMATION FRAME of a fast-cut video — on screen ${duration.toFixed(1)}s. The director chose what it says; HOW it looks is entirely yours. No templates. Make the most striking typographic frame you can for this content, in this film's locked style.

${styleDirectiveBlock(style)}
PALETTE: bg ${palette.bg} · accent ${palette.accent} · accent2 ${palette.accent2} · text ${palette.text}

${contentBlock(beat)}

YOUR MEDIUM IS TYPOGRAPHY, DATA, AND LAYOUT — NOT PICTURES:
Massive type, stacked kinetic phrases, stat slams, quote cards, list rows, simple bar charts, recreated text artifacts, color fields, ghost numerals, rules and tags. You NEVER depict objects, scenes, or events with shapes — no div-icebergs, no gradient-ships, no abstract blobs standing in for things. If a frame seems to need a picture, it isn't your frame.

BEAT DISCIPLINE — this frame lives ${duration.toFixed(1)}s:
- 4-9 elements total including background. Total on-screen words ≤ ${maxWords}.
- The hero element must be legible INSTANTLY: maximum contrast, maximum size.
- MOTION IS MANDATORY: at least 2 elements with a non-"none" data-animation.

CRAFT TOOLBOX (furniture, not layout — use at least 2, your choice):
ghost element (oversized translucent numeral/year/word BEHIND a solid hero — never as the hero itself) · corner meta tag (topic word, year, "01" — never internal jargon) · thin accent rules or corner ticks · texture strip (dots, hatch, stepped bars) · an accent-lit glow giving the frame a light source · icon chip
Every frame needs a visible light source or accent presence — flat darkness reads as dead air.

KINETIC TEXT SYNC:
When your text mirrors the spoken line, split it into one element per phrase (spoken order, EXACT spoken words) — the pipeline lands each at the moment its words are spoken.

${PARSER_CONTRACT(canvasW, canvasH)}

${TEXT_RULES}
${cutoutBlock}${continuation}
SELF-CHECK before output: 4-9 elements, ≥2 craft elements, ≥2 animated, content strings exact, overflow math passes, ≥26px text, hard contrast, inside canvas.
OUTPUT: only the HTML, starting at <!DOCTYPE html>. html and body: width:${canvasW}px;height:${canvasH}px;overflow:hidden;margin:0;`;

  const user = `BEAT ${beat.beat_index} — ${duration.toFixed(1)}s on screen
SPOKEN: "${beat.script_line}"
INTENT: ${beat.visual_concept}

Design this information frame.`;

  return { system, user };
}
