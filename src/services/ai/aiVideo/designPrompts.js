/**
 * designPrompts.js
 * src/services/ai/aiVideo/designPrompts.js
 *
 * FREE design prompt (headless-measure path) — same approach as Promo Video's
 * freeDesignPrompt. GPT-5.4 designs ONE premium frame as NATURAL HTML/CSS
 * (flexbox/grid/flow/auto-sizing); a real browser lays it out and htmlMeasure
 * flattens the result into positioned layers. No flat-pixel parser contract, no
 * fixed "treatment" taxonomy, no "typography only" rule, no lint/repair scaffolding.
 *
 * De-rigidified (2026-06-16): the old version locked ONE palette and a craft
 * "toolbox" into every beat, so every scene came out the same colour (the cream/
 * orange Titanic look). Now each beat OWNS its own field — the designer varies the
 * background scene-to-scene within a topic-grounded palette — and may build shapes
 * or simple illustration when the idea calls for it, not just type.
 *
 * Two modes:
 *   CANVAS  — html/data/cutout beats: the designer owns the whole frame.
 *   OVERLAY — shot beats with content: a typographic overlay over pipeline media.
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
      ? `  (chart data — render as clean bars/blocks with the labels and values shown)`
      : `  (list items — each its own row/element, staggered entrances)`);
  }
  lines.push(`Genre by kind: hook = arresting headline scale · stat = the number IS the hero · quote = the words + attribution · list = rows that land one by one · chart = clean bars with real values · title = date/name card · cta = the ask, unmissable.`);
  return lines.join("\n");
}

// Per-beat palette variation — the cure for "every scene is the same colour". The
// topic palette is the family; each frame picks its OWN field so consecutive scenes
// don't all look identical.
function paletteBlock(palette, beat) {
  return `PALETTE (this video's family — anchor on it, but THIS frame owns its own field):
- accent ${palette.accent} · accent2 ${palette.accent2} · a deep/near-black ${palette.bg} · a light/near-white ${palette.text === "#ffffff" ? "#f4f1ea" : palette.text}
VARY THE BACKGROUND scene to scene — do NOT default every frame to the same colour. Rotate intentionally between: a deep dark field, a near-white field, a saturated accent block, a tonal tint of the accent, or (for stat/quote) a moody gradient. Pick the field that suits THIS line; the next beat should look different from this one. Build a real palette around the accent (neutrals, a tint, a tasteful secondary) — never monochrome, never the same wash every frame.`;
}

// ── Main prompt builder ──────────────────────────────────────────────────────
export function buildBeatPrompt(beat, ctx) {
  const { style, palette, canvasW, canvasH } = ctx;
  const duration = beat.duration_seconds ?? 3;
  const isOverlay = !!beat.asset?.src && (beat.asset.kind === "image" || beat.asset.kind === "video");

  const dataContract = `Tag every MEANINGFUL element (these become animated layers; layout wrappers don't need tags):
- data-role: headline | subhead | kicker | label | badge | stat-number | card | divider | glow | background | icon | decoration
- data-layer: text | gradient | image | effect | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | slide-right | none  (at least 2 elements animated; entrances land with the voice)
- data-scene-element: hero | background | supporting | decoration
- Icons: data-icon="kebab-name" (Lucide) ONLY on a single standalone glyph — NEVER on something built from shapes/divs (it gets replaced by a generic icon and your design is lost; leave hand-built shapes as data-layer="decoration").
TEXT IS ONE UNIFORM STYLE PER ELEMENT — never per-word colours/gradients inside a text block. Only REAL tagged elements render — no ::before/::after pseudo-elements. Spell every word EXACTLY as given; minimum readable font ~26px.
NEVER print the beat's intent/kind/role as visible text. Words like "Hook", "Fact", "Reveal", "Stat", "Quote", "CTA", "Title", "List" are INTERNAL direction — they must NOT appear on screen. A kicker/label/badge, if used, must be REAL content (a topic tag or short phrase), never the intent/kind keyword. Render only the CONTENT strings given.`;

  if (isOverlay) {
    // ── OVERLAY MODE ────────────────────────────────────────────────────────
    const bandTop = Math.round(canvasH * 0.52);
    const kickerBottom = Math.round(canvasH * 0.16);
    const system = `You design the TYPOGRAPHIC OVERLAY for one shot of a fast-cut video — on screen ${duration.toFixed(1)}s. A cinematic ${beat.asset.kind === "video" ? "clip" : "image"} plays full-bleed behind you (pipeline-injected with a legibility scrim — you build NEITHER). Design with real CSS layout; a browser measures the result.

${styleDirectiveBlock(style)}
PALETTE: accent ${palette.accent} · accent2 ${palette.accent2} · text near-white over the scrim.

${contentBlock(beat)}

OVERLAY CONSTRAINTS (keep your design off the image's subject — absolute):
- html,body background: TRANSPARENT. NO background element, NO scrim, NO images, NO full-canvas anything.
- 2–5 typographic elements: the content above, plus optionally one kicker tag and one thin accent rule/divider.
- Keep main content low — between y=${bandTop} and the bottom; a small kicker/tag may sit at the top (y ≤ ${kickerBottom}). Leave the middle to the image.
- Promo-grade type: strong hierarchy, the style's type system, accent colour on the key word/number, text-shadow for punch.

${dataContract}

OUTPUT: only the HTML, from <!DOCTYPE html>. Root: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden;background:transparent}.`;

    const user = `BEAT ${beat.beat_index} — overlay on a shot of: ${beat.image_prompt ?? beat.shot_query ?? beat.visual_concept}
SPOKEN: "${beat.script_line}"
INTENT (internal direction — never render as on-screen text): ${beat.visual_concept}

Design the overlay.`;
    return { system, user };
  }

  // ── CANVAS MODE ───────────────────────────────────────────────────────────
  const maxWords = Math.max(4, Math.round(duration * 3));
  const cutoutBlock = beat.asset?.src && beat.asset.kind === "cutout"
    ? `\nRAW MATERIAL: a transparent-background cutout of the subject${beat.asset.real ? " (a REAL photo)" : ""}: ${beat.asset.src}
Place it with <img data-layer="image" data-role="card" src="${beat.asset.src}" data-animation="scale-in" data-scene-element="hero" style="object-fit:contain" /> at the size/spot you choose (cutouts shine LARGE), composed with the text.\n`
    : "";
  const continuation = beat.continues_previous
    ? `\nCONTINUATION: this beat EXTENDS the previous frame — keep the same field/background family and composition skeleton; the new content arrives as the next element.\n`
    : "";

  const system = `You are a world-class motion-graphics designer making ONE premium frame of a fast-cut video — a single ${canvasW}x${canvasH}px frame, Linear / Vercel / Stripe quality, on screen ${duration.toFixed(1)}s. The director chose WHAT it says; HOW it looks is entirely yours. No templates — make every frame feel different from its neighbours.

Design like a real designer: use flexbox/grid/flow/auto-sizing; a browser lays it out and we measure it, so NEVER hand-position or compute pixel coordinates. Root: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden}.

${styleDirectiveBlock(style)}
${paletteBlock(palette, beat)}

${contentBlock(beat)}

ONE FOCAL IDEA per frame. FEWER, BIGGER elements always beat more-and-smaller. ELEMENT BUDGET: aim for 4–7 meaningful tagged elements; never exceed ~10. A viewer reads a few things in ${duration.toFixed(1)}s. Total on-screen words ≤ ${maxWords}. The hero reads INSTANTLY (max contrast, max size).
RESIST CLUTTER: no scattered dots, corner ticks, texture strips, stray rules, or oversized "ghost" background numerals/words stacked behind everything. Every element must earn its place — if it doesn't serve the one idea, delete it. A clean frame with 5 confident elements beats a busy one with 30.
VARY THE FORM beat to beat — do NOT make every canvas frame a headline-on-a-field:
- TYPE frames: a huge headline, a stacked kinetic phrase, a stat slam (the number IS the hero), a quote card.
- BUILT-GRAPHIC frames: a clean chart from the data, a comparison split (X vs Y), a labeled card/grid, a simple geometric motif. Build it from SIMPLE shapes (rectangles, rounded-rects, circles, gradients, glows, lines) as ONE composed group in its OWN zone, with text in a SEPARATE zone — minimal, confident parts, never a cluttered fake UI.
SIMPLE ABSTRACT ONLY — DO NOT DRAW REAL THINGS IN CSS: never try to depict an object, animal, person, place, map, building, product, flag, emblem, crest, or logo out of shapes — it always renders as crude blobs. Two hard rules: (1) NO clip-path and NO inline <svg> — our renderer DROPS both, so they vanish or flatten to plain rectangles (a CSS "eagle" or "map" becomes red boxes); (2) if a beat needs to SHOW a real thing, that is an IMAGE beat, not this frame — here, express the idea with bold TYPOGRAPHY (e.g. "power fractured" as cracked/split type, NOT a CSS crest) or at most ONE Lucide icon. Illustrate only SIMPLE abstract concepts; never attempt a complex representational scene.
Every frame needs a visible light source or accent presence — flat darkness reads as dead air.

${dataContract}

KINETIC TEXT SYNC: when your text mirrors the spoken line, split it into one element per phrase (spoken order, exact words) — the pipeline lands each as its words are spoken.

LAYOUT FOR THIS FRAME: ${beat.visual_concept || "the strongest premium structure for this content"}
${cutoutBlock}${continuation}
OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `BEAT ${beat.beat_index} — ${duration.toFixed(1)}s on screen
SPOKEN: "${beat.script_line}"
INTENT (internal direction — never render as on-screen text): ${beat.visual_concept}

Design this frame. Make it look different from a plain headline-on-cream card.`;

  return { system, user };
}
