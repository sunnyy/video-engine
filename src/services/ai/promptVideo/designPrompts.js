/**
 * designPrompts.js
 * src/services/ai/promptVideo/designPrompts.js
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
import { RENDERER_CONSTRAINTS } from "../shared/designConstraints.js";

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
  lines.push(`What each kind is ABOUT (emphasis only — you choose the form): hook = stop the scroll, maximum impact · stat = the number is the point, make it dominate · quote = the words carry it, with their source · list = each item distinct and scannable · chart = the real values, honestly compared · title = the name/date as the moment · cta = the ask, unmissable.`);
  return lines.join("\n");
}

// Per-beat palette variation — the cure for "every scene is the same colour". The
// topic palette is the family; each frame picks its OWN field so consecutive scenes
// don't all look identical.
function paletteBlock(palette, beat) {
  const theme = palette.theme || "auto";
  if (theme === "light") {
    return `PALETTE (this video's family — anchor on it, but THIS frame owns its own field):
- accent ${palette.accent} · accent2 ${palette.accent2} · a LIGHT field ${palette.bg} · dark text ${palette.text}
LIGHT THEME — every frame is BRIGHT; NO dark fields and NO luminous glows. VARY THE BACKGROUND scene to scene between: a clean near-white field, a pale tint of the accent, a soft accent wash, a light card on off-white, or a subtle light gradient. Text is dark and high-contrast. Build a real palette around the accent (neutrals, a tint, a tasteful secondary) — never monochrome, never the same wash every frame.`;
  }
  if (theme === "medium") {
    return `PALETTE (this video's family — anchor on it, but THIS frame owns its own field):
- accent ${palette.accent} · accent2 ${palette.accent2} · a MID-TONE field ${palette.bg} · light text ${palette.text}
MEDIUM THEME — mid-tone fields with light high-contrast text (no pure black, no pure white). VARY THE BACKGROUND scene to scene between: a mid-tone field, a slightly deeper tonal block, a saturated accent block, a tint of the accent, or a soft gradient. Build a real palette around the accent — never monochrome, never the same wash every frame.`;
  }
  return `PALETTE (this video's family — anchor on it, but THIS frame owns its own field):
- accent ${palette.accent} · accent2 ${palette.accent2} · a deep/near-black ${palette.bg} · a light/near-white ${palette.text === "#ffffff" ? "#f4f1ea" : palette.text}
VARY THE BACKGROUND scene to scene — do NOT default every frame to the same colour. Rotate intentionally between: a deep dark field, a near-white field, a saturated accent block, a tonal tint of the accent, or (for stat/quote) a moody gradient. Pick the field that suits THIS line; the next beat should look different from this one. Build a real palette around the accent (neutrals, a tint, a tasteful secondary) — never monochrome, never the same wash every frame.`;
}

// ── Main prompt builder ──────────────────────────────────────────────────────
export function buildBeatPrompt(beat, ctx) {
  const { style, palette, canvasW, canvasH, language } = ctx;
  const duration = beat.duration_seconds ?? 3;
  // Mode follows the art-director's directive: `overlay` (text over a fetched image/video) vs `full`
  // (a self-contained designed frame). A media-backed beat defaults to overlay unless the directive
  // explicitly pinned `full`; a typographic beat has no media → always the full canvas frame.
  const hasMedia = !!beat.asset?.src && (beat.asset.kind === "image" || beat.asset.kind === "video");
  const isOverlay = hasMedia && beat.layout !== "full";
  // Hindi is Devanagari on BOTH the spoken line and the on-screen CONTENT (the renderer + measure
  // now have a Devanagari font). Render the Devanagari content as-is; keep it short so it fits.
  const latinOnScreenRule = (language === "hi" || language === "hinglish")
    ? `\nON-SCREEN SCRIPT — the CONTENT strings are Hindi in DEVANAGARI; render them EXACTLY as given (do NOT romanize/transliterate to Latin). Genuine English/brand terms or numbers in the content stay as-is. Keep on-screen Hindi SHORT (a few words) so it fits the frame.\n`
    : "";

  const dataContract = `Tag every MEANINGFUL element (these become animated layers; layout wrappers don't need tags):
- data-role: headline | subhead | kicker | label | badge | stat-number | card | divider | glow | background | icon | decoration
- data-layer: text | gradient | image | effect | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | slide-right | none  (at least 2 elements animated; entrances land with the voice)
- data-scene-element: hero | background | supporting | decoration
- Icons: data-icon="kebab-name" (Lucide) ONLY on a single standalone glyph — NEVER on something built from shapes/divs (it gets replaced by a generic icon and your design is lost; leave hand-built shapes as data-layer="decoration").
TEXT IS ONE UNIFORM STYLE PER ELEMENT — never per-word colours/gradients inside a text block. Spell every word EXACTLY as given; minimum readable font ~26px.
NO PSEUDO-ELEMENTS — our renderer DROPS ::before and ::after entirely (and any content:"" decoration). EVERY visible mark must be its OWN real tagged element: build glows, halos, ring highlights, accent arcs/sweeps, underlines, lines, dots, sparkles, and gradient overlays as actual <div>s with data-role/data-layer (e.g. a glow = a <div data-role="glow" data-layer="effect"> radial-gradient). If you draw an accent with ::before/::after it will VANISH in the render — never rely on it.
CONTENT-FIRST — NO ORPHAN DECORATION (the #1 thing that makes frames look amateur and cluttered). EVERY element must BELONG to the content: it either IS content, HOLDS content (a card / panel / chart / mockup wrapped around real content), or DIRECTLY structures content (an accent underline beneath a heading, a divider between two related blocks, the connectors/nodes of a diagram that link labels). BANNED as standalone "design" — these are exactly what makes frames look horrific: free-floating lines / bars / rules in the margins, lone outline circles / rings / dots, arrows that don't point from one labelled thing to another, scattered ticks / sparkles / confetti, corner doodads, and decorative kicker / badge / chip / "01" pills used as garnish. If a shape is not part of a content structure, it does not belong — delete it. Negative space is PREMIUM, never something to fill with shapes.
NEVER print the beat's internal kind/role as visible text — words like "Hook", "Fact", "Stat", "Quote", "List", "CTA", "Title", "Reveal" are internal direction, never on screen. Render only the real CONTENT strings.
${RENDERER_CONSTRAINTS}`;

  if (isOverlay) {
    // ── OVERLAY MODE ────────────────────────────────────────────────────────
    const bandTop = Math.round(canvasH * 0.52);
    const kickerBottom = Math.round(canvasH * 0.16);
    const system = `You design a PREMIUM KINETIC TEXT TREATMENT laid over one shot of a fast-cut video — on screen ${duration.toFixed(1)}s. A cinematic ${beat.asset.kind === "video" ? "clip" : "image"} plays full-bleed behind you (the pipeline injects the media AND a legibility scrim — you build NEITHER). Design with real CSS layout; a browser measures the result.

${styleDirectiveBlock(style)}
PALETTE: accent ${palette.accent} · accent2 ${palette.accent2} · text near-white over the scrim; the ONE key word/number in the accent colour.

${contentBlock(beat)}
${latinOnScreenRule}
MAKE IT A DESIGNED, LAYERED TREATMENT — never a single subtitle line (that flat caption is the slideshow look). Build a small typographic composition of a few elements working as one block, and VARY the composition every scene so consecutive overlays never share the same skeleton — let THIS line's content and the shot behind it choose the form. There is NO fixed recipe; draw from this toolbox as the moment needs (use SOME, not all, and a different mix each scene):
- the HEADLINE as hero — when it's more than ~3 words you MAY split it into stacked phrase-lines (exact words, spoken order, each its own element) so phrases land on the voice;
- the ONE key word/number lifted in the accent colour and a bolder/larger weight;
- optionally an eyebrow/kicker (1–3 word context label), a supporting sub-line, or a small stat/label — only when it adds real meaning;
- optionally an accent underline/rule anchored to the heading (structure, not a floating shape).
Vary the PLACEMENT too (a low band, a corner, a left-aligned stack, a centred block — different from the last scene). The bar: it must read as DESIGNED — clear hierarchy, the accent doing real work — not one flat caption.

OVERLAY CONSTRAINTS (absolute):
- html,body background: TRANSPARENT. NO background element, NO scrim, NO images, NO full-canvas anything (the pipeline already placed the photo and its scrim).
- Keep the block low — the hero between y=${bandTop} and the bottom; the eyebrow/secondary may sit up top (y ≤ ${kickerBottom}). Leave the middle clear so the image reads.
- Promo-grade type: bold hierarchy, the style's type system, text-shadow for legibility. Richness comes from typographic COMPOSITION, never from orphan ornament.

${dataContract}

OUTPUT: only the HTML, from <!DOCTYPE html>. Root: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden;background:transparent}.`;

    const user = `BEAT ${beat.beat_index} — overlay on a shot of: ${beat.image_prompt ?? beat.shot_query ?? beat.visual_concept}
SPOKEN: "${beat.script_line}"

Design a layered, DESIGNED treatment for this line — vary the composition from other scenes; never a single flat caption.`;
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
${latinOnScreenRule}
THE DESIRE: a premium, clean, instantly-readable frame with the polish of Linear / Vercel / Stripe — one dominant focal point, hard contrast. The key word/number/idea must land in under a second. Thin, timid, mid-sized type is what makes a frame feel weak — be bold.
FILL THE FRAME — there is NO photo behind this frame, so the DESIGN is the entire visual. The focal content (the hero type, the key number, the composition) must DOMINATE the canvas, set as large as it can go while still fitting edge-to-edge. A few small words floating in a big empty colour block is the #1 failure — it looks broken and empty. Negative space FRAMES a dominant element; it is never vast emptiness around a small one.
RICHNESS COMES FROM CONTENT MADE BIG, NEVER FROM ORNAMENT. Fill the frame by making the real content dominant (huge type, a large confident composition) — never by sprinkling decorative shapes. If a frame feels empty, make the content BIGGER or enrich the background field; never add orphan decoration. (The CONTENT-FIRST / no-orphan rule below is absolute.)
CONSTRAINTS: everything fits fully inside the ${canvasW}×${canvasH} frame — nothing clipped or running off the edge (a long line wraps or sizes down; never force one line wider than the frame). Use only as many elements as the content genuinely needs; on-screen words ≤ ${maxWords}. Fewer, bolder, content-bearing elements beat more-and-smaller every time.
DEPICT REAL THINGS WITH IMAGES, NOT CSS: never build a map, country, building, landmark, vehicle, animal, person/face, emblem/crest/flag/logo, or any specific real-world object/scene out of CSS shapes — it always renders as crude blobs (those moments are IMAGE beats, not this frame). NO clip-path and NO inline <svg> — our renderer drops both.

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
