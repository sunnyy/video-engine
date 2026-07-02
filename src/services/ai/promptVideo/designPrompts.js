/**
 * designPrompts.js
 * src/services/ai/promptVideo/designPrompts.js
 *
 * The design prompt for ONE frame of an AI Video (headless-measure path): GPT-5.4 writes natural
 * HTML/CSS, a real browser lays it out, htmlMeasure flattens it to positioned layers.
 *
 * Design philosophy (rewritten 2026-06-28): ONE coherent brief, NO rigidity. The prompt states only
 * (a) the SITUATION (what assets this frame has + how the pipeline handles media), (b) the real
 * TECHNICAL CONSTRAINTS of our renderer, (c) a few DON'T-BREAK-IT quality guards, and (d) total
 * creative freedom. There are deliberately NO layout archetypes, no "default" structure, no
 * per-"kind" recipes, and no "hero-only / go-big / band-split" prescriptions — those accreted over
 * time, contradicted each other, and made every scene the same skeleton. The single creative
 * instruction is: make each frame gorgeous and structurally UNLIKE its neighbours.
 */

import { styleDirectiveBlock } from "./styleSystem.js";
import { RENDERER_CONSTRAINTS } from "../shared/designConstraints.js";

// The facts this frame conveys — NOT a layout and NOT a list that must be rendered in full.
function infoBlock(beat) {
  const c = beat.content ?? {};
  const lines = [`INFORMATION — the facts for THIS frame (verbatim; convey them, never fabricate):`];
  if (c.headline)    lines.push(`• "${c.headline}"`);
  if (c.subtext)     lines.push(`• "${c.subtext}"`);
  if (c.attribution) lines.push(`• — ${c.attribution}`);
  if (Array.isArray(c.items) && c.items.length) {
    lines.push(c.items[0]?.value != null
      ? `• values to compare honestly: ${JSON.stringify(c.items)}`
      : `• items: ${JSON.stringify(c.items)}`);
  }
  if (lines.length === 1) {
    // No on-screen content was written for this beat → it is a deliberate VISUAL-ONLY breather.
    // The spoken line for such a beat is often a mid-sentence fragment ("fracture—can"); putting
    // it on screen reads as gibberish. Force a clean full-bleed frame with NO sentence text.
    lines.push(`• NO on-screen text for this frame — it is a VISUAL-ONLY breather. Let the image FILL THE ENTIRE CANVAS edge to edge (full-bleed). Do NOT put the spoken words on screen — they may be a mid-sentence fragment. At most a tiny kicker word; otherwise let the picture carry the beat alone.`);
    lines.push(`Spell every word exactly as given.`);
    return lines.join("\n");
  }
  lines.push(`You choose what to surface and how big — feature ONE as a giant line/number, distil it, or use all. You are NOT required to show a kicker + headline + subtext. Spell every word exactly as given.`);
  return lines.join("\n");
}

// The video's palette family; each frame still owns its own field so scenes don't all look alike.
function paletteBlock(palette) {
  const theme = palette.theme || "auto";
  const field = theme === "light"  ? "a LIGHT / near-white field with dark text (no dark fields, no glows)"
              : theme === "medium" ? "a MID-TONE field with light text (no pure black or white)"
              :                      "a DEEP / near-black field with light text";
  return `PALETTE — the video's family; THIS frame owns its own field within it:
• accent ${palette.accent} · accent2 ${palette.accent2} · base ${field} · text ${palette.text}
Vary the field scene to scene (deep dark / near-white / an accent block / a tint / a moody gradient) so consecutive frames don't look identical — but CONTRAST IS NON-NEGOTIABLE: on a LIGHT / near-white field, ALL text and key elements MUST be dark (near-black or a deep accent); on a DARK field, text MUST be light. NEVER light text on a light field or dark text on a dark field. Build a real palette around the accent — never flat monochrome.`;
}

export function buildBeatPrompt(beat, ctx) {
  const { style, palette, canvasW, canvasH, language } = ctx;
  const duration = beat.duration_seconds ?? 3;

  const assets = Array.isArray(beat.resolvedAssets) ? beat.resolvedAssets.filter(a => a?.src) : (beat.asset?.src ? [beat.asset] : []);
  const video  = assets.find(a => a.kind === "video") || null;
  const images = assets.filter(a => a.kind === "image");

  const latinOnScreenRule = (language === "hi" || language === "hinglish")
    ? `ON-SCREEN SCRIPT — the strings are Hindi in DEVANAGARI; render them EXACTLY as given (never romanize). English/brand terms and numbers stay as-is. Keep on-screen Hindi short so it fits.\n`
    : "";

  // ── SITUATION: what this frame is given, and how the pipeline handles its media ──
  let situation, rootBg;
  if (video) {
    situation = `SITUATION: a cinematic clip plays FULL-BLEED behind this frame — the pipeline already placed the video AND a legibility scrim. You build NEITHER: html/body stay transparent, no background element, no <img>, no full-canvas element. You compose ONLY the type/graphics that sit over the clip.`;
    rootBg = "transparent";
  } else if (images.length) {
    const cutouts = images.filter(a => a.cutout);
    const photos  = images.filter(a => !a.cutout);
    const line = (im, k, kind) => `   ${kind} ${k + 1}${im.label ? ` "${im.label}"` : ""}: ${im.src}`;
    const parts = [];
    if (cutouts.length) {
      parts.push(`${cutouts.length} CUTOUT${cutouts.length > 1 ? "s" : ""} — a subject with its background already REMOVED (transparent PNG). PLACE it INTO the composition as a hero element: <img style="object-fit:contain"> sized and positioned deliberately (it may run large and bleed off an edge for drama), with type and graphics composed AROUND it on the palette field. NEVER stretch a cutout with object-fit:cover and NEVER treat it as a full-bleed background — it has no background; that is the whole point. Build the field/backdrop yourself (palette base + your graphics), then set the subject into it.\n${cutouts.map((im, k) => line(im, k, "cutout")).join("\n")}`);
    }
    if (photos.length) {
      const multi = photos.length > 1
        ? ` Lead with the STRONGEST as the hero; a second ONLY if it composes as a true diptych/collage where both sides fill — NEVER a small floating inset / picture-in-picture rectangle in a corner. Don't slice them into thin strips.`
        : "";
      parts.push(`${photos.length} real photo${photos.length > 1 ? "s" : ""} to place as <img> (object-fit:cover) — the entire frame or a strong accent, your call.${multi}\n${photos.map((im, k) => line(im, k, "photo")).join("\n")}`);
    }
    situation = `SITUATION: compose WITH what you're given (each element shares ONE frame):\n${parts.join("\n")}`;
    rootBg = palette.bg;
  } else {
    situation = `SITUATION: NO photo — the design IS the whole frame, built in pure HTML/CSS: either TYPE as the picture (one commanding mass) OR a built graphic that ILLUSTRATES the idea (a UI / app panel, a meter, a labelled diagram, a comparison diptych, a stat/quote card, a tile grid, a flat device frame, an abstract composition). Whichever you choose must OWN the frame. THE failure to avoid: a headline parked at the very top, a line parked at the very bottom, and a dead empty gap between them — never a header-top / footer-bottom split with a void in the middle, and no floating divider/line stranded in empty space. Don't CSS-draw a realistic photo subject (a real map, face, animal, logo or object as if photographed) — illustrate the concept graphically instead.`;
    rootBg = palette.bg;
  }

  const direction = `YOUR JOB — COMPOSE one striking picture that ILLUSTRATES this moment, not a screen with parts arranged on it. This is the whole game and it's where frames fail: a number parked at the top, a photo parked at the bottom, a caption labelling it — three things coexisting in zones reads as a slide deck made by a beginner. Instead, design with an art director's taste:
• COMPOSE, don't arrange — every element shares ONE frame and relates to the others. Type sits OVER / inside the composition, not stranded in a panel beside or below it like a caption.
• ONE hero carries the feeling — a full-bleed photo, a giant word/number, OR a built graphic — give it real presence and let it own the frame; never reduce the lead to a small passive rectangle floating in empty space.
• ILLUSTRATE THE IDEA, don't just label it — you may build the concept in pure HTML/CSS: a UI / app panel, a meter or progress state, a labelled diagram, a comparison diptych, a stat/quote card, a tile grid, a flat device frame, an abstract graphic. A photo can be the hero, an accent, or absent entirely — whatever expresses the moment best. Cards / panels / tiles are excellent when they ARE the composition; they're only amateur when used as a caption stuck beside or below a photo.
• ONE idea, ruthless hierarchy — the single most important thing is HUGE and owns the frame; everything else is small and quiet. Do NOT lay out kicker + headline + stat + caption + divider at equal weight — that even, labelled checklist IS the amateur look.
• Make the viewer FEEL the idea, not read a fact sheet — the composition should express what this moment is ABOUT.

Within that taste you have TOTAL freedom of form, and you MUST make each frame structurally UNLIKE the one before — there is no default layout. Fair game (inspiration, not a checklist or an order): full-bleed photo with type punched into its calm space · a bold top/bottom or left/right split where EACH side genuinely fills · a comparison diptych · a giant number or word as the hero · a built UI / app / dashboard panel that illustrates the idea · a labelled diagram or meter · a stat or quote card · a tile / icon grid · a flat device frame · a duotone / treated backdrop · a clean listicle · type overlapping an edge · an asymmetric collage. Combine, ignore, invent. Be bold — surprise me.`;

  const technical = `TECHNICAL CONSTRAINTS — the ONLY hard limits; everything else is yours:
• Real HTML/CSS with flow / flex / grid / auto-sizing — a browser lays it out and we flatten it. Never hand-compute pixel coordinates.
• Everything fits fully inside ${canvasW}×${canvasH}: nothing clipped or off the edge; a long line wraps or sizes down; smallest readable text ~26px.
• SAFE MARGINS (this is posted to Shorts / Reels / TikTok, which cover the edges with their own UI): keep ALL text, logos, kickers, captions and key graphics within a safe box — pad ~${Math.round(canvasH*0.12)}px at the TOP, ~${Math.round(canvasH*0.18)}px at the BOTTOM, and ~${Math.round(canvasW*0.12)}px on the RIGHT (the like/share rail). A full-bleed background PHOTO/VIDEO/gradient may fill the whole frame, but never place a headline or any readable text in those top/bottom/right margins — it will be hidden behind the app's buttons.
• Tag every MEANINGFUL element (layout wrappers don't need tags) — each becomes an animatable layer:
   data-role="headline|subhead|kicker|label|badge|stat-number|card|divider|glow|background|icon|decoration"
   data-layer="text|gradient|image|effect|decoration" · data-scene-element="hero|background|supporting|decoration"
   data-animation="fade-in|fade-up|scale-in|slide-left|slide-right|none"  (≥2 elements animate)
• ONE uniform style per text element (no per-word colours except a single accent word/number).
• Our renderer DROPS ::before / ::after, content:"", clip-path and inline <svg>. Build EVERY visible mark (glow, underline, line, dot, sweep, scrim, shape) as its own real tagged <div> (e.g. a glow = <div data-role="glow" data-layer="effect"> with a radial-gradient). Icons: data-icon="kebab-name" (Lucide) only on a lone glyph, never on shapes built from divs.
• Place photos as <img data-layer="image" data-role="..." data-scene-element="..." style="object-fit:cover; your size+position">. Real photos for real things; never CSS-draw a map / face / animal / object / logo.
• Optional kinetic text: split a spoken line into one element per phrase (exact words, in spoken order) and the pipeline lands each on the voice.
${RENDERER_CONSTRAINTS}`;

  const quality = `DON'T BREAK IT (quality guards, not layout rules):
• Legibility is yours, but NEVER darken the whole photo — no full-frame dark wash and no filter:brightness on the <img> (that murk is a top failure). Keep the photo bright; win contrast with text-shadow, by sitting type over a naturally calm/dark region, or with ONE local gradient scrim that is fully transparent over the image and dark ONLY under the text band (e.g. linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)).
• Say each string ONCE — this is strict. Every provided line (headline AND subtext) appears in EXACTLY ONE element. Do NOT print the subtext both as an inline subhead and again as a bottom chip/label; do NOT repeat it as a top kicker AND a bottom bar. A common failure is echoing the subtext top and bottom — never do this. A kicker/chip/label is ONLY for a category word YOU invent (e.g. "FAST", "RESTRICTION") or genuinely NEW context — never a copy of the headline or the subtext. To stress a word, style it IN PLACE — never copy it into a second element, and never overlap two text elements.
• No orphan decoration — every mark belongs to content (it IS content, HOLDS content, or STRUCTURES it). No floating lines / rings / dots / chips, and NEVER an empty box / hollow card / placeholder panel with nothing inside it.
• Compose for the WHOLE vertical frame as ONE picture — don't cram everything into the top and strand a kicker/line at the very bottom with a dead empty band in the middle. Either anchor it as one cohesive block or distribute the elements so there is no large hollow gap.
• Never invent a number, date, or fact that isn't in the information above. Never print internal/direction words on screen — e.g. Hook / Stat / CTA / SPOKEN / BEAT / scene numbers, AND the design style's name ("${style.label}") or any word from it, are art-direction notes for you, never visible text (never render the style name as a masthead, byline, footer or label).`;

  const continuation = beat.continues_previous
    ? `\nThis frame continues the previous thought — you may keep its world/palette and bring the new info in as the focus.\n`
    : "";

  const system = `You are a world-class motion-graphics designer making ONE frame of a fast-cut vertical video — ${canvasW}×${canvasH}px, on screen ${duration.toFixed(1)}s, Linear / Vercel / Stripe polish. The director chose WHAT it says; HOW it looks is entirely yours.

${situation}

${styleDirectiveBlock(style)}
${paletteBlock(palette)}

${infoBlock(beat)}
${latinOnScreenRule}
${direction}

${technical}

${quality}
${continuation}
OUTPUT: only the HTML, from <!DOCTYPE html>. Root: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden;background:${rootBg}}.`;

  const user = `On screen ${duration.toFixed(1)}s while the voiceover says: "${beat.script_line}".

Design this frame: gorgeous, unlike the neighbouring scenes, and FILLING the whole vertical frame — the composition reaches top to bottom with NO empty dead band left in the middle.`;

  return { system, user };
}
