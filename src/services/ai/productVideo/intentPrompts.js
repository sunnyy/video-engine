/**
 * intentPrompts.js
 * src/services/ai/productVideo/intentPrompts.js
 *
 * Art-director prompt for the Product Video overlay (headless-measure path).
 *
 * Every scene is an OVERLAY: the PIPELINE renders the full-bleed product shot +
 * scrim (low z); the designer builds ONLY the typography (transparent page, high z),
 * composed into the scene's ANCHOR zone — the clean negative space the shot was
 * generated to leave. The director hands us the exact display content (kicker /
 * headline / accent word / body / label / Lucide icon); the designer realizes it as
 * premium, measured HTML/CSS. No flat-pixel contract, no overflow math.
 */

import { RENDERER_CONSTRAINTS } from "../shared/designConstraints.js";

// Canvas W/H are per-call (orientation-driven) — derived inside buildProductScenePrompt.

// What each scene is FOR — energy/role, not a layout template. Gives the designer
// the scene's job so consecutive scenes feel different, not one uniform treatment.
const INTENT_PURPOSE = {
  hook:       "the SCROLL-STOPPER — bold, punchy, minimal. One huge line, maximal negative space, almost no supporting UI. High energy.",
  showcase:   "the hero beauty moment — confident and aspirational; let the product breathe, elegant restrained type.",
  hero:       "the brand statement — a strong value line with clear, confident hierarchy.",
  feature:    "an explainer — calm and structured; lead with the benefit, support with 1–2 crisp feature points.",
  detail:     "a craft close-up — quiet and premium; a short label/spec and lots of stillness.",
  lifestyle:  "aspirational, in-context — light, human, emotive; a short evocative line, minimal UI.",
  offer:      "the deal — high contrast and urgent; the number/offer is the hero.",
  cta:        "the close — decisive; brand + a clear CTA that drives the tap.",
  standalone: "a complete mini-ad — desire up top, action at the bottom; balanced and clean.",
};

// Anchor → the band the overlay must compose within (matches the cleared zone in
// the generated shot). These are guidance regions, not hard pixel boxes.
function anchorZones(W, H) {
  return {
    "text-top":    { desc: `the UPPER region (roughly y=72–${Math.round(H * 0.48)}), full width — stack content top-down`, align: "flex-start", justify: "flex-start" },
    "text-bottom": { desc: `the LOWER region (roughly y=${Math.round(H * 0.50)}–${H - 64}), full width`,                 align: "flex-start", justify: "flex-end"   },
    "text-left":   { desc: `the LEFT column (roughly x=56–${Math.round(W * 0.58)}), using its FULL height`,             align: "flex-start", justify: "flex-start" },
    "text-right":  { desc: `the RIGHT column (roughly x=${Math.round(W * 0.42)}–${W - 56}), using its FULL height`,      align: "flex-end", justify: "flex-start" },
  };
}

function hexToRgba(hex, alpha) {
  const h = (hex ?? "#000000").replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16), g = parseInt(h[1] + h[1], 16), b = parseInt(h[2] + h[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(0,0,0,${alpha})`;
}

// Concrete composition archetypes — the cure for "every scene is eyebrow + serif
// headline + icons-in-rings + pill". One is assigned per scene (rotated and seeded by
// the product), so scenes differ from each other AND the same scene-type differs across
// products. These are STRUCTURAL directions, not pixel templates — the designer still
// owns the craft within the approach.
const LAYOUT_ARCHETYPES = [
  "OVERSIZED HEADLINE — one enormous headline fills most of a clear band; everything else is small and secondary. No feature rings, no pill (unless this is the CTA). Maximal type, minimal chrome.",
  "EDITORIAL SIDE-RAIL — a thin accent rule (or a vertical/stacked kicker) runs along one clear edge with the headline beside it; any points are a clean text list aligned to that rail — NO circular icon rings.",
  "FULL-WIDTH BAND — compose as a single horizontal band across one clear third (top or bottom), edge to edge, content laid out in a ROW rather than a centered column.",
  "MAGAZINE NUMBERED — present points as a numbered editorial list (01 / 02 …) with hairline dividers, no icons; set the headline like a magazine cover.",
  "INLINE CHIP ROW — render any features as a single horizontal row of small inline chips/labels (no icons-in-rings, no vertical list), with a large headline above or beside.",
  "CORNER-ANCHORED MINIMAL — tuck a compact group into ONE corner of the clear space with generous negative space; bare glyphs or no icons, and a tiny underlined link instead of a pill.",
  "STAT / CLAIM DOMINANT — lead with the single biggest idea (a stat or a 1–3 word claim) at huge scale; supporting text minimal beneath.",
  "RESTRAINED LEFT STACK — a clean left-aligned stack, but restrained: prefer bare glyphs over rings and avoid the eyebrow-with-a-rule cliché.",
];
function archetypeSeed(s = "") { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export function buildProductScenePrompt(sceneScript, projectContext) {
  const {
    sceneIntent  = "showcase",
    sceneIndex   = 0,
    accentColor  = "#C8954F",
    secondaryColor = null,
    theme        = "dark",
    brandName    = "Brand",
    ctaText      = "Shop Now",
    website      = "",
    productMood  = "premium",
    fontPair     = {},
    anchor       = "text-top",
    display      = {},
    creativeDirection = "",
    hasVision    = false,
    canvasWidth  = 1080,
    canvasHeight = 1920,
  } = projectContext;
  const W = canvasWidth, H = canvasHeight;
  const ANCHOR_ZONES = anchorZones(W, H);

  const purpose = INTENT_PURPOSE[sceneIntent] ?? INTENT_PURPOSE.showcase;

  const heroFont = fontPair.hero       ?? "Anton";
  const bodyFont = fontPair.supporting ?? "Inter";
  const accent   = accentColor;
  const secondary = secondaryColor || accentColor;
  const accentSoft = hexToRgba(accentColor, 0.16);
  const panelTint  = theme === "light" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.40)";

  const zone = ANCHOR_ZONES[anchor] ?? ANCHOR_ZONES["text-top"];
  const isCta = sceneIntent === "cta" || sceneIntent === "standalone";
  // Rotate a concrete composition per scene, seeded by the product so different products
  // (and consecutive scenes) don't converge on the same skeleton.
  const archetype = LAYOUT_ARCHETYPES[(sceneIndex + archetypeSeed(`${brandName}|${productMood}`)) % LAYOUT_ARCHETYPES.length];

  // The content the director chose for this scene — WHAT to show (the exact strings
  // + each item's role/emphasis). HOW it looks is the designer's call, not a template.
  const feats = (display.features ?? []).filter(f => f && f.label);
  const content = [
    display.kicker      ? `• KICKER (a small eyebrow line): "${display.kicker}"` : null,
    display.headline    ? `• HEADLINE (THE focal point — the biggest, most dominant element; keep the line breaks): "${display.headline.replace(/\n/g, " / ")}"${display.accent_word ? ` — emphasize "${display.accent_word}" in the accent colour` : ""}` : null,
    display.body        ? `• SUPPORTING LINE: "${display.body}"` : null,
    display.stat        ? `• STAT — the number "${display.stat.value}" is a hero element${display.stat.label ? ` with label "${display.stat.label}"` : ""}` : null,
    display.badge       ? `• BADGE / TAG: "${display.badge}"` : null,
    feats.length        ? `• FEATURES (present each clearly — a bold label, an optional sub-line, and you MAY use its Lucide icon; the presentation is your design choice):\n      ${feats.map(f => `– ${f.label}${f.sub ? ` — ${f.sub}` : ""}${f.icon ? `  [icon: ${f.icon}]` : ""}`).join("\n      ")}` : null,
    (!feats.length && display.icon) ? `• an icon ("${display.icon}")${display.label ? ` with label "${display.label}"` : ""}` : null,
    (!feats.length && display.label) ? `• LABEL: "${display.label}"` : null,
    isCta && ctaText    ? `• CTA: "${ctaText}" — a single, unmistakable call-to-action${website ? `; website "${website}" small + muted nearby` : ""}` : null,
    (display.strip?.length) ? `• CREDENTIAL STRIP: ${display.strip.map(s => `"${s}"`).join(" · ")}` : null,
  ].filter(Boolean).join("\n  ");

  const system = `You are a world-class motion-graphics art director for premium product advertising (think Apple, Nike, MVMT, high-end editorial).
Design like a real designer — flexbox/grid/normal flow/auto-sizing; a browser lays it out and we MEASURE the result, so NEVER hand-position or compute pixel coordinates. Output ONE self-contained HTML doc (CSS inline or in <style>); nothing before <!DOCTYPE html>. No JavaScript; no external assets except Google Fonts via @import (max 2).

FONTS (load via @import): hero/display "${heroFont}" · body "${bodyFont}".
PRODUCT MOOD: ${productMood} — set the type weight, spacing, and restraint accordingly.

SCENE PURPOSE — this scene is "${sceneIntent}": ${purpose}${creativeDirection ? `\nART DIRECTION (realize this exact feeling): ${creativeDirection}` : ""}
Let this drive the energy, density, type scale, and layout. Each scene must feel DISTINCT — do not give every scene the same treatment.

THIS IS A TEXT OVERLAY over a pipeline-rendered product photograph. You build NEITHER the photo NOR any backdrop/scrim — ONLY the overlay UI.
- html,body background: TRANSPARENT. NO background element, NO image element, NO full-canvas anything.
${hasVision ? `- LOOK AT THE ATTACHED PRODUCT IMAGE. Place your overlay ONLY in the genuinely EMPTY space of THAT image — NEVER over the product itself. Find where the product sits and compose in the clear areas around it; pull from the product's real colors and match the lighting.
- Use the WHOLE frame where it's clear — typically a headline in a clear TOP band AND a CTA / credential strip along a clear BOTTOM band. Do NOT cram everything into one top-left corner and leave the rest empty.
- Suggested primary area: ${zone.desc} — but TRUST THE IMAGE over this hint: if the product occupies it, put the text where the photo is actually clear.` : `- COMPOSE within ${zone.desc} — the clean space the photo left open; never place anything over the product. You may also use a clear bottom band for a CTA / credential strip.`}
- Use absolutely-positioned wrappers per region and lay elements inside with normal flow.

CANVAS SCALE — CRITICAL. This is a ${W}×${H} video frame, NOT a web page. Everything is read from a phone at arm's length, so type and icons must be BIG. Anything under ~22px is invisible and will be discarded. Use these MINIMUMS (go bigger for hierarchy):
- headline: 90–180px · stat number: 120–240px
- subhead / body: 30–44px · feature label: 34–46px · feature sub-line: 26–34px
- kicker / badge / credential strip / website: 24–30px (NEVER smaller)
- Lucide icons: ≥64px (and any frame you choose to put around them sized to match)
- dividers/rules: 2–4px thick (not 1px)
Do NOT use web-scale 11–16px text anywhere — it will be dropped and the scene will look empty.

CORE CONTENT TO REALIZE (the backbone — render ALL of it, spell every word exactly):
  ${content || `a confident headline drawn from the voiceover`}

DESIGN A CLEAN, PREMIUM EDITORIAL OVERLAY — fewer, bigger, confident elements (aim for ~6–10 TOTAL). This is a 3-second scene, not a packed poster: clarity and hierarchy beat quantity. Realize ALL the content above with strong hierarchy — but the FORM is entirely YOURS: how the kicker, features, badge, CTA and any accents look is your design decision, NOT a fixed template.
COMPOSITION FOR THIS SCENE — realize this structural approach (this is what makes each scene distinct): ${archetype}
Do NOT default to the generic "eyebrow + rule → serif headline → two icons-in-rings → rounded pill" stack — that exact template on every scene is what makes product videos look templated and identical across products. Commit to the approach above so THIS scene looks genuinely different from its neighbours AND from how other products are presented. Let the scene purpose ("${sceneIntent}") tune the energy and scale within it.
Add a supporting touch (a rule, a divider, a glow, an icon, a frame) only when it elevates the content — never as default filler.
PANEL: optional and usually unnecessary (a scrim already sits beneath you) — never add a box by default.
COMPOSITION: ONE dominant focal element (usually the headline). Group related items, align to a tidy edge, leave generous breathing room.

MUST FIT — CRITICAL: the WHOLE composition must fit within the ${W}×${H} frame. NOTHING may extend below y=${H} or past the frame edges, and elements must NOT overlap. If it feels tight, REMOVE or shrink elements — never overflow or stack on top of each other.

CONSTRAINTS:
- NEVER cover the product. Everything legible via text-shadow (or an optional translucent panel).
- No fake UI, no scattered dots/ticks, no product/brand text that wasn't given. One uniform style per text element (the accent split goes in its own element/line). Align text groups to a consistent edge.

PALETTE — build from the PRODUCT's own colors so it feels designed for this product:
- accent ${accent} (soft tint ${accentSoft}) — the key word, icon, CTA, rules.
- secondary ${secondary} — a second key from the product, for two-tone type / brackets.
- if you DO add a panel, it MUST be clearly TRANSLUCENT (opacity ≤ 0.45, ~${panelTint}) so the product shows through — NEVER a solid/opaque box over the photo. Most scenes need no panel.
- text near-white${theme === "light" ? " or near-black on light panels" : ""}; CTA = a legible accent fill with white-space:nowrap (its shape/radius is your choice).

ELEMENTS (technical — not stylistic):
- A CTA is ONE text element with its background + padding + radius applied ON THE TEXT itself — NEVER a separate bar/box with the label inside (the label gets lost), and never full-width. Its shape, radius and fill are your design choice.
- A Lucide icon is <div data-role="icon" data-icon="NAME"> at a legible size (≥64px). Whether you frame it (ring, chip, or bare) is your call; any label near it should be ≥34px.
TAG every meaningful element (layout wrappers don't need tags):
- data-role: headline | subhead | kicker | badge | label | stat-number | cta | divider | glow | card | icon | decoration
- data-layer: text | gradient | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | none   (animate at least 2 elements)
- data-scene-element: hero | supporting | decoration
Only REAL tagged elements render — no ::before/::after.
${RENDERER_CONSTRAINTS}

OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `SCENE INTENT: ${sceneIntent}
PLACEMENT: ${anchor} → compose within ${zone.desc}.
VOICEOVER (context only — not shown): "${sceneScript}"
${display.headline ? "" : `Pick a short, premium headline if none was supplied.`}
BRAND: ${brandName}
ACCENT: ${accent}

Design the single most striking, premium overlay for this ${W}×${H} scene — text only, in the anchor zone, over the product photo. All text in English.`;

  return { system, user };
}
