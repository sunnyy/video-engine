/**
 * intentPrompts.js
 * Art-director prompt for the Social Video pipeline (headless-measure path).
 *
 * Two modes:
 *   CANVAS  — no image: GPT composes the whole frame freely (type + shapes).
 *   OVERLAY — the scene has an image: the PIPELINE renders the full-bleed image
 *             + a dark scrim (low z); the designer builds ONLY a typographic
 *             overlay in safe bands (transparent page, high z). This guarantees
 *             text sits OVER the image — never behind it or off-screen.
 *
 * Both modes are natural HTML/CSS (flexbox/grid/flow); a browser lays it out and
 * htmlMeasure flattens the result. No flat-pixel contract, no overflow math.
 */

export function buildSocialScenePrompt(visualText, sceneContext) {
  const {
    sceneIntent      = "scene",
    creativeBrief    = "",
    visualConcept    = "",
    hasFetchedImage  = false,
    palette          = {},
    fontPair         = {},
    showAttribution  = false,
    author           = "",
    authorHandle     = "",
  } = sceneContext;

  const brief = creativeBrief || visualConcept || "";

  const bg     = palette.background          ?? "#0A0A0A";
  const bg2    = palette.backgroundSecondary ?? "#111111";
  const fg     = palette.primaryText         ?? "#FFFFFF";
  const muted  = palette.secondaryText       ?? "#AAAAAA";
  const accent = palette.accent              ?? "#FFD600";
  const hl     = palette.highlight           ?? "#FFFFFF";

  const heroFont = fontPair.hero       ?? "Anton";
  const bodyFont = fontPair.supporting ?? "Inter";

  const W = 1080, H = 1920;
  const bandTop = Math.round(H * 0.54), kickerMax = Math.round(H * 0.16);

  const shared = `You are a world-class motion-graphics art director for short-form viral social video.
Design like a real designer — flexbox/grid/normal flow/auto-sizing; a browser lays it out and we MEASURE the result, so NEVER hand-position or compute pixel coordinates. Output ONE self-contained HTML doc (CSS inline or in <style>); nothing before <!DOCTYPE html>. No JavaScript; no external assets except Google Fonts via @import (max 2).

FONTS (load via @import): hero/display "${heroFont}" · body "${bodyFont}".

Tag every MEANINGFUL element (these become animated layers; layout wrappers don't need tags):
- data-role: headline | subhead | stat | quote | attribution | badge | label | cta | card | divider | glow | icon | background | image-placeholder
- data-layer: text | gradient | image | effect | decoration
- data-animation: fade-in | fade-up | scale-in | slide-left | none   (animate at least 2 elements)
- data-scene-element: hero | background | supporting | decoration
TEXT IS ONE UNIFORM STYLE PER ELEMENT — never per-word colors/gradients inside a text block. Only REAL tagged elements render — no ::before/::after. Spell every word EXACTLY as given. A glow is a <div> radial-gradient + blur with NO text inside. A CTA/button is ONE element (bg+padding+radius on the text element, white-space:nowrap).

ABSOLUTE PROHIBITIONS (violating any invalidates the scene):
- NEVER show any author name, username, or @handle unless the ATTRIBUTION directive explicitly instructs it.
- NEVER show any platform name (Twitter, X, Instagram, TikTok, etc.) anywhere. The video is about the IDEA.`;

  const attributionDirective = showAttribution
    ? `\nATTRIBUTION (this scene only): a small, tasteful credit in the bottom-left — muted color, body font, one line ("${authorHandle || author}"). A credit, never a headline.`
    : "";

  const framed = sceneContext.assetTreatment === "framed";
  let modeBlock;
  if (hasFetchedImage) {
    // ── OVERLAY MODE ──────────────────────────────────────────────────────────
    const placement = framed
      ? `The image is LANDSCAPE/WIDE and is framed in the UPPER ~60% of the frame (the pipeline builds it + a blurred backdrop + scrim). Put ALL your text in the LOWER ~36% (below y≈${Math.round(H * 0.64)}). Put NOTHING over the image band up top.`
      : `The image is PORTRAIT and fills the whole ${W}x${H} frame behind you (pipeline-built + dark scrim). Keep the CENTER clear so the photo reads: main content sits LOW (bottom ~45%); a small kicker/tag may sit at the very top.`;
    modeBlock = `THIS IS A TEXT OVERLAY over a pipeline-rendered image. You build NEITHER the image NOR any backdrop/scrim — only the typography.
- html,body background: TRANSPARENT. NO background element, NO image element, NO glow/scrim, NO full-canvas anything.
- Build ONLY 2–4 TYPOGRAPHIC elements: the display text, plus optionally ONE small kicker/badge and ONE thin accent rule.
- ${placement}
- Promo-grade type: strong hierarchy, accent ${accent} on the key word/number, a text-shadow for legibility over the image, near-white body text.
- Everything is normal-z text — the pipeline's image + scrim sit beneath you automatically.
PALETTE: accent ${accent} · highlight ${hl} · text near-white over the scrim.`;
  } else {
    // ── CANVAS MODE ───────────────────────────────────────────────────────────
    modeBlock = `NO image this scene — you own the whole ${W}x${H} frame. Root: html,body{width:${W}px;height:${H}px;margin:0;overflow:hidden}.

PALETTE — this video's family (anchor on it, but THIS scene OWNS its field):
  accent ${accent} · highlight ${hl} · deep/dark ${bg} / ${bg2} · text ${fg} · muted ${muted}
VARY THE BACKGROUND scene to scene — don't default every frame to the same flat dark field. Pick what suits THIS scene: a deep dark field, a near-white field, a saturated accent block, or a tonal tint/glow. Never monochrome, never the same wash every scene. Text must contrast HARD with the field.

ONE FOCAL IDEA. FEWER, BIGGER beats more-and-smaller. ELEMENT BUDGET: aim for 4–7 meaningful tagged elements, NEVER exceed ~9 (a background counts). RESIST CLUTTER: no 3-card stat grids, no scattered icons/dots/ticks, no stacking a headline + subhead + cards + CTA all in one frame. If you can't read it in ~3s, it's too busy.
Build with TYPE (a massive headline, a stat slam with a glow, a quote, a bold CTA) OR a single clean SHAPE graphic (a two-side comparison, a simple bar/stat, a labeled card) — not both at once. The hero reads INSTANTLY (max contrast, max size).`;
  }

  const system = `${shared}

WHAT TO BUILD:
${modeBlock}
${attributionDirective}

OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `CREATIVE BRIEF (realize this): "${brief || "(use your best judgment)"}"
SCENE INTENT: ${sceneIntent}
DISPLAY TEXT (show on screen): "${visualText}"

Design the single most striking, premium, scroll-stopping 9:16 ${hasFetchedImage ? "overlay (text only, over the image, in safe bands)" : "frame"} for this. Match the brief's feeling — not a generic layout.
${showAttribution ? "Author credit allowed on THIS scene only — small, bottom-left." : "Remember: NO author names, NO handles, NO platform names."}`;

  return { system, user };
}
