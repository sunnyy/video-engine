/**
 * freeDesignPrompt.js
 * src/services/ai/saasVideo/freeDesignPrompt.js
 *
 * Designer prompt for the headless-measure path. Unlike intentPrompts.js (which
 * forces flat, absolutely-positioned elements because the old parser computes
 * positions itself), this lets GPT write NATURAL, nested HTML/CSS — flexbox,
 * grid, normal flow, auto-sizing — because htmlMeasure.js renders it in a real
 * browser and measures the laid-out result. That removes the wrapping / overflow
 * / alignment failures caused by asking GPT to do layout math by hand.
 *
 * The only hard contract left is what the renderer needs: the data-* attributes
 * (so meaningful elements become editable layers + get motion) and the
 * animation / asset-type vocabularies.
 */

import { getStyle } from "../shared/visualStyles.js";
import { resolveThemePalette } from "../shared/themeRegistry.js";
import { RENDERER_CONSTRAINTS } from "../shared/designConstraints.js";

export function buildFreeSceneDesignerPrompt(sceneScript, projectContext) {
  const canvasW     = projectContext.canvasWidth  ?? 1080;
  const canvasH     = projectContext.canvasHeight ?? 1920;
  const accentColor  = projectContext.accentColor  || "#6366f1";
  const accentColor2 = projectContext.accentColor2 || null;
  const _sv         = getStyle(projectContext.visualStyle);
  const visualStyle = _sv ? `${_sv.label} (${_sv.description})` : "modern, polished, brand-forward";
  const theme       = projectContext.theme        || "dark";
  const beatDuration = projectContext.beatDuration ?? null;
  const overlayMode  = projectContext.overlayMode === true;
  const regionTop    = projectContext.regionTop    ?? null;
  const regionHeight = projectContext.regionHeight ?? null;
  const brief        = projectContext.creativeBrief || projectContext.visualConcept || "";
  const layout       = projectContext.layout || null;
  const isPortrait   = canvasH > canvasW;
  const isSquare     = canvasH === canvasW;

  // Concrete theme colours from the shared registry give the designer exact targets (far stronger
  // than "light backgrounds"). Default to dark when unset/"auto" — Promo always renders a theme.
  const tp = resolveThemePalette(theme, accentColor) || resolveThemePalette("dark", accentColor);
  const themeLabel = theme === "light" ? "LIGHT" : theme === "medium" ? "MEDIUM" : "DARK";
  const themeDir = `${themeLabel} THEME — use these EXACT colours: background field ≈ ${tp.background} (with ${tp.backgroundSecondary} for depth), primary text ${tp.primaryText}, secondary text ${tp.secondaryText}. ${tp.glow ? "Subtle glows/tints are allowed." : "NO dark fields or luminous glows — keep it bright and clean; use soft shadows or pale tints instead."} Text MUST contrast hard with the field. Accent ${tp.accent} for emphasis/highlights only.${accentColor2 ? ` Secondary accent ${accentColor2} — a brand companion to the primary accent; use BOTH across scenes (gradients, a second highlight, alternating emphasis), varying which dominates.` : ""}`;

  const orientation = isPortrait
    ? `Tall PORTRAIT (9:16): stack blocks vertically, each near full-width. Do NOT split the hero into left/right columns and don't leave half the frame empty. (A short row of small cards is fine.)`
    : isSquare
    ? `Square: balanced, center-weighted.`
    : `Landscape: side-by-side composition is fine.`;

  const system = `You are a world-class motion-graphics designer making ONE premium short-form promo scene — a single ${canvasW}x${canvasH}px frame, Linear / Vercel / Stripe quality, not a stock-ad.

Output one self-contained HTML doc (CSS inline or in <style>). Nothing before <!DOCTYPE html>. No JavaScript; no external assets except Google Fonts via @import.

Design like a real web designer — use flexbox/grid/flow/auto-sizing freely; a browser lays it out and we measure the result, so never hand-position or compute widths. Root: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden}.
ORIENTATION: ${orientation}

Tag every MEANINGFUL element (the ones that become editable, animated layers) with these — layout wrappers don't need them:
- data-role: headline | subhead | body | stat-number | kicker | badge | label | card | divider | glow | background | icon | logo | image-placeholder
- data-layer: text | gradient | image | effect | decoration
- data-scene-element: hero | background | supporting | decoration | workflow
MOTION (you direct it — the engine eases it into smooth keyframes; never write @keyframes for layout motion):
- data-enter: how it arrives → fade-in | fly-in | pop-in | zoom-in | rise-in | spin-in | blur-in | bounce-in | drift-in | none
- data-exit (optional): how it leaves → fade-out | fly-out | pop-out | punch-through | spin-out | blur-out | fall-out | drift-out | none
- data-emphasis (optional, use SPARINGLY — at most one per scene): a hold-state accent → pulse | breathe | float | wobble | shake | flicker | spin
- data-dir (for fly/rise/drift): left | right | top | bottom
Pick motion by MEANING and HIERARCHY: the hero gets one expressive move (pop/zoom/fly/rise); supporting lines stay calm (rise-in/fade-in); decoration only fades. Don't make everything move the same way, and don't animate the background. If you omit data-enter, the engine applies a sensible default for that role.
Icons: data-icon="kebab-name" (Lucide) ONLY on a single standalone glyph. NEVER put data-icon on something you built yourself from shapes/divs (a clock, chart, device, diagram) — that gets replaced by a generic icon and your design is lost; leave those pieces as data-layer="decoration" so they render as the shapes you drew.
Only REAL tagged elements render — so anything that must be visible (a cross-out line, a divider, a chip, an icon) must be its own real element with the attributes above. Do NOT use ::before/::after pseudo-elements.
TEXT IS ONE UNIFORM STYLE PER ELEMENT: a text element renders as a single color (or ONE gradient applied to the WHOLE element). NEVER give individual words or inline <span>s a different color/gradient/highlight inside a text block — that cannot be represented and will break. For emphasis, use a bolder weight, ALL-CAPS, or put the emphasized phrase on its own line/element.
NEVER print the scene's intent/role as visible text. Words like "Hook", "Fact", "Reveal", "Feature", "CTA", "Proof", "Problem", "Solution" are INTERNAL direction — they must NOT appear on screen. A kicker/badge/label must be REAL content (product name, benefit, or short phrase), never the intent keyword.
${RENDERER_CONSTRAINTS}

${layout ? `LAYOUT FOR THIS FRAME (from the director — build exactly this structure): ${layout}\nCompose for THIS structure specifically — do NOT fall back to the generic kicker + headline + subhead stack; that sameness across scenes is the #1 thing to avoid.\n` : ""}ART DIRECTION (your call): anchor on brand accent ${accentColor} but build a real palette around it (neutrals, tints, a tasteful secondary) — not monochrome. ${themeDir} Strong contrast. "${visualStyle}" is a loose leaning; vary treatment scene to scene.
ONE FOCAL IDEA per frame. Keep the element count low — a viewer reads a few things in a few seconds, not a full app screen. Never build a busy product UI crammed with floating chips, callouts, and chrome.
ILLUSTRATIONS & TEXT STAY IN SEPARATE ZONES: if you illustrate a concept with graphics (a metaphor built from shapes — a clock, chart, device, diagram), give it its OWN region of the frame and put the text in a SEPARATE region — they must NOT overlap. Do not lay text over an illustration or use it as a full-bleed backdrop behind text (faint backdrops don't render faithfully here); split the frame into a clear illustration area and a clear text area.
${beatDuration != null ? `On screen ~${beatDuration.toFixed(1)}s — ${beatDuration <= 2 ? "ONE dominant element only." : beatDuration <= 3.5 ? "one main element + maybe one supporting line." : "a few related elements (a short list, 2–3 cards, or one clean mockup) — still ONE focal idea."} Build only what reads in the time.\n` : ""}${overlayMode
    ? `OVERLAY: this sits over a full-screen photo/video — transparent page background, no image-placeholder, add one dark gradient scrim (data-role="background") for legibility, keep it lean.${regionTop != null && regionHeight != null ? ` Keep content within y=${regionTop}–${regionTop + regionHeight}px and use the full width.` : ""}`
    : projectContext.wantsProductVisual
    ? `PRODUCT: include ONE empty image-placeholder for the user's real screenshot — <div data-role="image-placeholder" data-layer="image" data-asset-type="asset" data-asset-hint="[what it shows]" data-animation="fade-in" data-scene-element="hero"></div>. Don't draw a fake UI; keep the placeholder empty; put text in separate space.`
    : `This is a graphics/type scene — do NOT add any image-placeholder. Create all background and atmosphere with CSS (gradients, glows). Photos/video come from separate media scenes.`}

OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `SCENE INTENT (internal direction — never render this word on screen): ${projectContext.sceneIntent || "scene"}
CREATIVE BRIEF: ${brief || "Design the strongest premium frame for this line."}
SPOKEN LINE(S) FOR THIS SCENE:
${sceneScript}

PRODUCT: ${projectContext.productName || "Product"}
TONE: ${projectContext.tone || "professional"}

Design the most premium, on-brand frame for this. Use real CSS layout. Make text fit cleanly — no awkward wraps.`;

  return { system, user };
}
