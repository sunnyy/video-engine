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
  const isPortrait = canvasH > canvasW; // vertical video → splits must be horizontal (stacked bands), not side columns
  // Three modes: a VIDEO beat (type over the full-bleed clip the pipeline injects); an IMAGE beat
  // (the designer COMPOSES the fetched image(s) into the frame — full-bleed / framed / split, or a
  // row/grid/triptych for several images); a TYPOGRAPHIC beat (no asset → full designed frame).
  const assets = Array.isArray(beat.resolvedAssets) ? beat.resolvedAssets.filter(a => a?.src) : (beat.asset?.src ? [beat.asset] : []);
  const video  = assets.find(a => a.kind === "video") || null;
  const images = assets.filter(a => a.kind === "image");
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
CONTENT-FIRST — NO ORPHAN DECORATION (the #1 thing that makes frames look amateur and cluttered). EVERY element must BELONG to the content: it either IS content, HOLDS content (a card / panel / chart / mockup wrapped around real content), or DIRECTLY structures content (an accent underline beneath a heading, a divider between two related blocks, the connectors/nodes of a diagram that link labels). BANNED as standalone "design" — these are exactly what makes frames look horrific: free-floating lines / bars / rules in the margins, lone outline circles / rings / dots, arrows that don't point from one labelled thing to another, scattered ticks / sparkles / confetti, corner doodads, and decorative kicker / badge / chip / "01" pills used as garnish. If a shape is not part of a content structure, it does not belong — delete it. Negative space is PREMIUM, never something to fill with shapes. NEVER draw an empty box, input, search bar, comment field, progress bar, or hollow placeholder container — if a container holds no real content, delete it (an empty "type a comment" pill or a hollow card is exactly this failure).
NEVER print the beat's internal kind/role as visible text — words like "Hook", "Fact", "Stat", "Quote", "List", "CTA", "Title", "Reveal" are internal direction, never on screen. Render only the real CONTENT strings.
NEVER FABRICATE NUMBERS OR FACTS — do not invent a statistic, number, date, percentage, or claim that isn't in the CONTENT (e.g. don't turn "sedentary days" into "8+ HOURS SEATED"). You may add a SHORT non-factual eyebrow/label drawn from the content's topic (e.g. "SOCIAL MEDIA"), but never a made-up figure.
${RENDERER_CONSTRAINTS}`;

  if (video) {
    // ── VIDEO OVERLAY MODE (type over the full-bleed clip the pipeline injects) ──
    const system = `You art-direct ONE frame of a fast-cut video — a cinematic clip plays full-bleed behind you (the pipeline injects the media AND a legibility scrim — you build NEITHER). On screen ${duration.toFixed(1)}s. Design real CSS; a browser measures it.

${styleDirectiveBlock(style)}
PALETTE: accent ${palette.accent} · accent2 ${palette.accent2} · text near-white over the scrim; lift the ONE key word/number in a BRIGHT, vivid accent that POPS on a dark photo — never a dark/muddy accent that disappears.

${contentBlock(beat)}
${latinOnScreenRule}
THE TYPE IS THE DESIGN — and it MUST look different every scene, or the video becomes a slideshow of identical captions (THE failure you must avoid). This is NOT a subtitle and NOT a fixed lower-third caption:
- GO BIG. The hero line is large and confident — often filling a THIRD TO HALF the frame, type as a graphic. Timid mid-sized text pinned at the bottom is exactly the caption look that is forbidden.
- VARY EVERY SCENE — change the scale, the placement, and the structure scene to scene so no two share a skeleton: one scene a single GIANT word; the next a tall stacked phrase; another a huge number; another a centred statement; another hugged to a top or side edge; another a tight block low. PLACE the type anywhere that composes with the shot — read the shot description and put the words where the image is calm/empty (sky, shadow, negative space), in a DIFFERENT region than the previous scene. Use the full canvas — top, centre, side, low — not always the bottom.
- HERO-ONLY BY DEFAULT. Most scenes are JUST the big hero line. Do NOT staple a kicker + sub-line + underline onto every scene — that repeated label / heading / divider trio IS the slideshow. Add an eyebrow, a supporting line, or an accent rule ONLY on the rare scene that truly needs it, never as a default garnish.
- Split a multi-word hero into phrase-lines (exact words, spoken order, each its own element) so they land on the voice; the ONE key word in the bright accent + a heavier/bigger weight.

OVERLAY CONSTRAINTS (absolute):
- html,body background: TRANSPARENT. NO background element, NO scrim, NO images, NO full-canvas anything (the pipeline already placed the photo and its scrim).
- Bold promo type with text-shadow for legibility. Richness is the typographic COMPOSITION and SCALE — never orphan ornament.

${dataContract}

OUTPUT: only the HTML, from <!DOCTYPE html>. Root: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden;background:transparent}.`;

    const user = `BEAT ${beat.beat_index} — type over a shot of: ${beat.image_prompt ?? beat.shot_query ?? beat.visual_concept}
SPOKEN: "${beat.script_line}"

Design a BOLD, BIG typographic treatment for this line — a different scale/placement/structure than other scenes; never a small flat caption, never the same skeleton twice.`;
    return { system, user };
  }

  if (images.length) {
    // ── COMPOSE MODE (the designer PLACES the fetched image(s) and composes the whole frame) ──
    const isMulti = images.length > 1;
    const imgList = images.map((im, k) => `  - image ${k + 1}${im.label ? ` "${im.label}"` : ""}: ${im.src}`).join("\n");
    const system = `You are a world-class motion-graphics ART DIRECTOR composing ONE frame of a fast-cut video — ${canvasW}x${canvasH}px, on screen ${duration.toFixed(1)}s, Linear/Vercel/Stripe quality. You are given ${images.length} real image${isMulti ? "s" : ""}, and you COMPOSE the whole frame WITH ${isMulti ? "them" : "it"} plus the text. There is NO fixed layout — make this frame structurally DIFFERENT from a plain "photo with a caption" AND different from neighbouring scenes. Design real CSS (flex/grid/absolute); a browser lays it out and we measure it.

${styleDirectiveBlock(style)}
PALETTE: accent ${palette.accent} · accent2 ${palette.accent2} · text near-white; lift the ONE key word/number in a BRIGHT accent that POPS.

IMAGE(S) — use ALL of them, placed as real <img> elements:
${imgList}

${contentBlock(beat)}
${latinOnScreenRule}
HOW TO COMPOSE — ${isMulti
  ? `this is a MULTI-IMAGE scene (a list / comparison / trio). The images are LANDSCAPE — stack them as full-width HORIZONTAL BANDS (one above the next), or a clean grid. Do NOT slice them into tall vertical columns (thin vertical strips look broken in a vertical video). Each image its OWN large <img> (object-fit:cover), optionally with its short label beside/under it. Use ALL ${images.length}; never drop or duplicate one. THIS is how a list becomes real images instead of a text list.`
  : `you have ONE image — pick a composition that fits THIS moment and differs from other scenes: full-bleed with bold type over it; OR a HORIZONTAL BAND split (the image as a wide band across the TOP or BOTTOM, the type in the other band); OR the image bleeding off the top or bottom edge with type in the cleared area. VARY it scene to scene — do NOT default to full-bleed-with-a-caption every time.`}
${isPortrait ? `- THIS IS A TALL / PORTRAIT FRAME: do NOT split it LEFT/RIGHT into side-by-side columns — a side panel squeezes the image (and the text) into a thin vertical strip. Split TOP/BOTTOM (horizontal bands) or go full-bleed. Multi-image scenes stack as horizontal bands, never side-by-side columns.` : ""}
- Place each image as <img data-layer="image" data-role="card" src="..." data-animation="scale-in" data-scene-element="hero" style="object-fit:cover; (your size + position)" />. The images ARE the visual — size them LARGE.
- TYPE is bold and varied (a different scale/placement than other scenes).
- LEGIBILITY IS YOURS HERE — the pipeline adds NO scrim. Wherever text sits over an image, guarantee contrast: place it over a darker region, use strong text-shadow, OR add a real gradient scrim as a <div data-role="glow" data-layer="effect" style="position:absolute; ...linear-gradient..."> behind the text.
- FIT: everything fully inside ${canvasW}x${canvasH}; size the largest headline word so it fits the width — never let it overflow.

${dataContract}

OUTPUT: only the HTML, from <!DOCTYPE html>. Root: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden;background:${palette.bg}}.`;

    const user = `BEAT ${beat.beat_index} — ${duration.toFixed(1)}s. Compose the frame with the image${isMulti ? "s" : ""} above.
SPOKEN: "${beat.script_line}"

Make it look DIFFERENT from a plain caption and from the other scenes.`;
    return { system, user };
  }

  // ── TYPOGRAPHIC / CANVAS MODE (no asset → a full designed frame) ────────────
  const maxWords = Math.max(4, Math.round(duration * 3));
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
${continuation}
OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `BEAT ${beat.beat_index} — ${duration.toFixed(1)}s on screen
SPOKEN: "${beat.script_line}"

Design this frame. Make it look different from a plain headline-on-cream card.`;

  return { system, user };
}
