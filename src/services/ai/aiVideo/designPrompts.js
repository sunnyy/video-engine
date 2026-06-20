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
TEXT IS ONE UNIFORM STYLE PER ELEMENT — never per-word colours/gradients inside a text block. Spell every word EXACTLY as given; minimum readable font ~26px.
NO PSEUDO-ELEMENTS — our renderer DROPS ::before and ::after entirely (and any content:"" decoration). EVERY visible mark must be its OWN real tagged element: build glows, halos, ring highlights, accent arcs/sweeps, underlines, lines, dots, sparkles, and gradient overlays as actual <div>s with data-role/data-layer (e.g. a glow = a <div data-role="glow" data-layer="effect"> radial-gradient). If you draw an accent with ::before/::after it will VANISH in the render — never rely on it.
NO FILLER CHROME — this is the #1 thing that makes frames look generic and bloated: do NOT add a kicker, badge, label, tag, chip, "01"/number pill, or rounded mini-pill unless it carries ESSENTIAL real content the frame genuinely cannot say otherwise. Default to NONE of them. No scattered dots, corner ticks, stray rules, or decorative pills. A bold frame is the hero + at most one supporting element — nothing else.
NEVER print the beat's internal kind/role as visible text — words like "Hook", "Fact", "Stat", "Quote", "List", "CTA", "Title", "Reveal" are internal direction, never on screen. Render only the real CONTENT strings.`;

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

ONE FOCAL IDEA per frame, set BIG and confident — but it MUST FIT fully inside the ${canvasW}×${canvasH} frame. Size the hero as large as FITS: a short 1–3 word line can be enormous; a longer headline must WRAP across 2–3 lines (let it wrap naturally — NEVER white-space:nowrap a line wider than the frame) or be sized down so every word sits fully on-screen. Big type is great; type CLIPPED at the edge is broken. Maximum contrast, readable in under a second. (Thin, timid, mid-size type is the main reason a frame feels weak and empty.)
MATCH RICHNESS TO THE IDEA. A pure-type frame stays lean and bold (a commanding hero + maybe one supporting line). But when the idea calls for a BUILT GRAPHIC, build it fully and make it feel premium and designed — these can have many parts, and that is GOOD: a UI / app / browser mockup, a device or phone screen, a dashboard, a composed multi-part card, panels, a progress bar, an abstract diagram, a geometric motif, a chart from real values. Emptiness reads as a plain slideshow; a richly built graphic does not. Total on-screen words ≤ ${maxWords}.
NO FILLER (this is different from richness): every element must SERVE the idea. Cut decorative noise — scattered dots, corner ticks, texture strips, stray rules, loose "kicker/badge" pills used as garnish, or oversized "ghost" numerals/words stacked behind everything. A purposeful 12-part mockup is great; 12 random decorations are not.
VARY THE FORM beat to beat — do NOT make every canvas frame a headline-on-a-field. Reach for: a huge headline · a stacked kinetic phrase · a stat slam · a quote card · a two-side split · a chart from real values · a UI/app mockup · a labeled diagram.
ILLUSTRATE FREELY — WITH LIMITS. You MAY build rich CSS illustrations and they look great: UI/app/browser mockups, device screens, dashboards, cards, panels, progress bars, abstract diagrams, geometric motifs, charts. Build those richly.
But DO NOT try to depict these in CSS — they ALWAYS come out as crude grey blobs, so they belong in an IMAGE beat (or carry the idea with bold TYPOGRAPHY) instead: a map / country / geography, a building / architecture / landmark, a vehicle, an animal, a person or face, an emblem / crest / flag / logo, or any specific real-world object or scene.
TECH LIMIT: NO clip-path and NO inline <svg> — our renderer drops both (a CSS "eagle" or "map" becomes plain rectangles).
Every frame needs a visible light source or accent presence — flat darkness reads as dead air.

${dataContract}

KINETIC TEXT SYNC: when your text mirrors the spoken line, split it into one element per phrase (spoken order, exact words) — the pipeline lands each as its words are spoken.

LAYOUT: entirely yours — invent the strongest, boldest composition for THIS line's content and this film's style. Don't reach for a default; let the words decide the form.
${cutoutBlock}${continuation}
OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `BEAT ${beat.beat_index} — ${duration.toFixed(1)}s on screen
SPOKEN: "${beat.script_line}"

Design this frame. Make it look different from a plain headline-on-cream card.`;

  return { system, user };
}
