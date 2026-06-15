/**
 * freeDesignPrompt.js
 * src/services/ai/promoVideo/freeDesignPrompt.js
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

export function buildFreeSceneDesignerPrompt(sceneScript, projectContext) {
  const canvasW     = projectContext.canvasWidth  ?? 1080;
  const canvasH     = projectContext.canvasHeight ?? 1920;
  const accentColor = projectContext.accentColor  || "#6366f1";
  const visualStyle = projectContext.visualStyle  || "radiant";
  const theme       = projectContext.theme        || "dark";
  const beatDuration = projectContext.beatDuration ?? null;
  const overlayMode  = projectContext.overlayMode === true;
  const regionTop    = projectContext.regionTop    ?? null;
  const regionHeight = projectContext.regionHeight ?? null;
  const brief        = projectContext.creativeBrief || projectContext.visualConcept || "";
  const layout       = projectContext.layout || null;
  const isPortrait   = canvasH > canvasW;
  const isSquare     = canvasH === canvasW;

  const themeDir = theme === "light"
    ? "LIGHT theme — light backgrounds, dark high-contrast text."
    : theme === "medium"
    ? "MEDIUM theme — mid-tone backgrounds, light high-contrast text."
    : "DARK theme — dark backgrounds, light high-contrast text.";

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
- data-animation: fade-in | fade-up | scale-in | slide-left | slide-right | none
- data-scene-element: hero | background | supporting | decoration | workflow
Icons: data-icon="kebab-name" (Lucide) on a data-role="icon" element.
Only REAL tagged elements render — so anything that must be visible (a cross-out line, a divider, a chip, an icon) must be its own real element with the attributes above. Do NOT use ::before/::after pseudo-elements.
TEXT IS ONE UNIFORM STYLE PER ELEMENT: a text element renders as a single color (or ONE gradient applied to the WHOLE element). NEVER give individual words or inline <span>s a different color/gradient/highlight inside a text block — that cannot be represented and will break. For emphasis, use a bolder weight, ALL-CAPS, or put the emphasized phrase on its own line/element.

${layout ? `LAYOUT FOR THIS FRAME (from the director — build exactly this structure): ${layout}\nCompose for THIS structure specifically — do NOT fall back to the generic kicker + headline + subhead stack; that sameness across scenes is the #1 thing to avoid.\n` : ""}ART DIRECTION (your call): anchor on brand accent ${accentColor} but build a real palette around it (neutrals, tints, a tasteful secondary) — not monochrome. ${themeDir} Strong contrast. "${visualStyle}" is a loose leaning; vary treatment scene to scene.
ONE FOCAL IDEA per frame. Keep the element count low — a viewer reads a few things in a few seconds, not a full app screen. Never build a busy product UI crammed with floating chips, callouts, and chrome.
${beatDuration != null ? `On screen ~${beatDuration.toFixed(1)}s — ${beatDuration <= 2 ? "ONE dominant element only." : beatDuration <= 3.5 ? "one main element + maybe one supporting line." : "a few related elements (a short list, 2–3 cards, or one clean mockup) — still ONE focal idea."} Build only what reads in the time.\n` : ""}${overlayMode
    ? `OVERLAY: this sits over a full-screen photo/video — transparent page background, no image-placeholder, add one dark gradient scrim (data-role="background") for legibility, keep it lean.${regionTop != null && regionHeight != null ? ` Keep content within y=${regionTop}–${regionTop + regionHeight}px and use the full width.` : ""}`
    : projectContext.wantsProductVisual
    ? `PRODUCT: include ONE empty image-placeholder for the user's real screenshot — <div data-role="image-placeholder" data-layer="image" data-asset-type="asset" data-asset-hint="[what it shows]" data-animation="fade-in" data-scene-element="hero"></div>. Don't draw a fake UI; keep the placeholder empty; put text in separate space.`
    : `This is a graphics/type scene — do NOT add any image-placeholder. Create all background and atmosphere with CSS (gradients, glows). Photos/video come from separate media scenes.`}

OUTPUT: only the HTML, from <!DOCTYPE html>.`;

  const user = `SCENE INTENT: ${projectContext.sceneIntent || "scene"}
CREATIVE BRIEF: ${brief || "Design the strongest premium frame for this line."}
SPOKEN LINE(S) FOR THIS SCENE:
${sceneScript}

PRODUCT: ${projectContext.productName || "Product"}
TONE: ${projectContext.tone || "professional"}

Design the most premium, on-brand frame for this. Use real CSS layout. Make text fit cleanly — no awkward wraps.`;

  return { system, user };
}
