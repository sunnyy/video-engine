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

const W = 1080, H = 1920;

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
const ANCHOR_ZONES = {
  "text-top":    { desc: `the UPPER region (roughly y=72–${Math.round(H * 0.48)}), full width — stack content top-down`, align: "flex-start", justify: "flex-start" },
  "text-bottom": { desc: `the LOWER region (roughly y=${Math.round(H * 0.50)}–${H - 64}), full width`,                 align: "flex-start", justify: "flex-end"   },
  "text-left":   { desc: `the LEFT column (roughly x=56–${Math.round(W * 0.58)}), using its FULL height`,             align: "flex-start", justify: "flex-start" },
  "text-right":  { desc: `the RIGHT column (roughly x=${Math.round(W * 0.42)}–${W - 56}), using its FULL height`,      align: "flex-end", justify: "flex-start" },
};

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

export function buildProductScenePrompt(sceneScript, projectContext) {
  const {
    sceneIntent  = "showcase",
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
  } = projectContext;

  const purpose = INTENT_PURPOSE[sceneIntent] ?? INTENT_PURPOSE.showcase;

  const heroFont = fontPair.hero       ?? "Anton";
  const bodyFont = fontPair.supporting ?? "Inter";
  const accent   = accentColor;
  const secondary = secondaryColor || accentColor;
  const accentSoft = hexToRgba(accentColor, 0.16);
  const panelTint  = theme === "light" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.40)";

  const zone = ANCHOR_ZONES[anchor] ?? ANCHOR_ZONES["text-top"];
  const isCta = sceneIntent === "cta" || sceneIntent === "standalone";

  // The content the director chose for this scene — the backbone to realize richly.
  const feats = (display.features ?? []).filter(f => f && f.label);
  const content = [
    display.kicker      ? `• KICKER (tiny uppercase eyebrow, with a short rule/bracket beside it): "${display.kicker}"` : null,
    display.headline    ? `• HEADLINE (huge, THE focal point, keep the line breaks): "${display.headline.replace(/\n/g, " / ")}"${display.accent_word ? ` — color "${display.accent_word}" in the accent, on its own line/element` : ""}` : null,
    display.body        ? `• SUBHEAD (one supporting line, letter-spaced): "${display.body}"` : null,
    display.stat        ? `• BIG STAT BLOCK — oversized accent number "${display.stat.value}"${display.stat.label ? ` with label "${display.stat.label}"` : ""}` : null,
    display.badge       ? `• BADGE/PILL: "${display.badge}" (accent fill or hairline outline)` : null,
    feats.length        ? `• FEATURE LIST — render each row as [Lucide icon inside a thin circular ring] + bold LABEL + muted sub line:\n      ${feats.map(f => `– ${f.icon || "check-circle"} | ${f.label}${f.sub ? ` | ${f.sub}` : ""}`).join("\n      ")}` : null,
    (!feats.length && display.icon) ? `• an icon-in-a-ring ("${display.icon}")${display.label ? ` with label "${display.label}"` : ""}` : null,
    (!feats.length && display.label) ? `• LABEL: "${display.label}"` : null,
    isCta && ctaText    ? `• CTA: ONE pill — a single TEXT element "${ctaText}" with accent-color background + padding + border-radius:999px + white-space:nowrap (NOT a wide bar, NOT split into icon+text — the text must live IN the pill)${website ? `; website "${website}" small + muted just below` : ""}` : null,
    (display.strip?.length) ? `• BOTTOM CREDENTIAL STRIP: ${display.strip.map(s => `"${s}"`).join(" · ")} — small, separated by thin vertical dividers, optional tiny star icon at the start` : null,
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

CANVAS SCALE — CRITICAL. This is a 1080×1920 video frame, NOT a web page. Everything is read from a phone at arm's length, so type and icons must be BIG. Anything under ~22px is invisible and will be discarded. Use these MINIMUMS (go bigger for hierarchy):
- headline: 90–180px · stat number: 120–240px
- subhead / body: 30–44px · feature label: 34–46px · feature sub-line: 26–34px
- kicker / badge / credential strip / website: 24–30px (NEVER smaller)
- Lucide icons: 64–110px; their circular ring ~110–150px
- dividers/rules: 2–4px thick (not 1px)
Do NOT use web-scale 11–16px text anywhere — it will be dropped and the scene will look empty.

CORE CONTENT TO REALIZE (the backbone — render ALL of it, spell every word exactly):
  ${content || `a confident headline drawn from the voiceover`}

DESIGN A CLEAN, PREMIUM EDITORIAL OVERLAY — fewer, bigger, confident elements (aim for ~6–10 meaningful elements TOTAL). This is a 3-second video scene, not a packed poster: clarity and hierarchy beat quantity. Realize the core content with strong hierarchy, then add ONLY the supporting touches that genuinely elevate it — YOUR call — e.g. a thin accent rule beside the kicker, one tasteful divider, a refined badge, an icon-in-a-ring per feature, a soft accent glow.
YOU decide the UI treatment — including WHETHER a subtle translucent panel behind the text helps legibility. It is OPTIONAL and usually unnecessary (a scrim already sits beneath you). Do not add a box by default.
COMPOSITION: ONE dominant focal element (the headline). Group related items, align to a tidy edge, leave generous breathing room.

MUST FIT — CRITICAL: the WHOLE composition must fit within the 1080×1920 frame. NOTHING may extend below y=1920 or past the frame edges, and elements must NOT overlap. If it feels tight, REMOVE or shrink elements — never overflow or stack on top of each other.

CONSTRAINTS:
- NEVER cover the product. Everything legible via text-shadow (or an optional translucent panel).
- No fake UI, no scattered dots/ticks, no product/brand text that wasn't given. One uniform style per text element (the accent split goes in its own element/line). Align text groups to a consistent edge.

PALETTE — build from the PRODUCT's own colors so it feels designed for this product:
- accent ${accent} (soft tint ${accentSoft}) — the key word, icon, CTA, rules.
- secondary ${secondary} — a second key from the product, for two-tone type / brackets.
- if you DO add a panel, it MUST be clearly TRANSLUCENT (opacity ≤ 0.45, ~${panelTint}) so the product shows through — NEVER a solid/opaque box over the photo. Most scenes need no panel.
- text near-white${theme === "light" ? " or near-black on light panels" : ""}; CTA = accent fill, radius:999px, white-space:nowrap.

ELEMENTS:
- A CTA/button is ONE TEXT element with the background + padding + radius ON THE TEXT itself — NEVER a separate bar with the label inside (the label gets lost) and never full-width.
- A Lucide icon: <div data-role="icon" data-icon="NAME"> sized 64–110px; ring = a bordered circular data-role="decoration" element (~110–150px) behind it; label beside/beneath at ≥34px.
TAG every meaningful element (layout wrappers don't need tags):
- data-role: headline | subhead | kicker | badge | label | stat-number | cta | divider | glow | card | icon | decoration
- data-layer: text | gradient | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | none   (animate at least 2 elements)
- data-scene-element: hero | supporting | decoration
Only REAL tagged elements render — no ::before/::after.

OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `SCENE INTENT: ${sceneIntent}
PLACEMENT: ${anchor} → compose within ${zone.desc}.
VOICEOVER (context only — not shown): "${sceneScript}"
${display.headline ? "" : `Pick a short, premium headline if none was supplied.`}
BRAND: ${brandName}
ACCENT: ${accent}

Design the single most striking, premium 9:16 overlay for this scene — text only, in the anchor zone, over the product photo. All text in English.`;

  return { system, user };
}
