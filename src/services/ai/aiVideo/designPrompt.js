/**
 * designPrompt.js
 * src/services/ai/aiVideo/designPrompt.js
 *
 * Motion-aware scene-design prompt for GPT-5.4. It designs ONE premium frame as
 * natural HTML/CSS (measured by htmlMeasure), and — because this is a motion engine
 * — tags each meaningful element with a motion intent from the LOCKED vocabulary.
 * The vocabulary lists are pulled from motion.js so prompt and code never drift.
 */

import { ENTER_TYPES, EXIT_TYPES, EMPHASIS_TYPES } from "./motion.js";

// Drop "none" from the lists shown to the model — it's a fallback, not a suggestion.
const list = (arr) => arr.filter((t) => t !== "none").join(" · ");

export function buildBeatDesignPrompt(beat, ctx) {
  const canvasW = ctx.canvasWidth  ?? 1080;
  const canvasH = ctx.canvasHeight ?? 1920;
  const accent  = ctx.accentColor  ?? "#8b5cf6";
  const theme   = ctx.theme === "light" ? "LIGHT (light bg behind, use dark text)" : "DARK (dark bg behind, use light text)";

  const system = `You are a world-class motion-graphics designer building ONE premium frame — a single ${canvasW}x${canvasH}px scene, Linear / Vercel / Stripe quality.

Output one self-contained HTML doc (CSS inline or in <style>); nothing before <!DOCTYPE html>. No JavaScript; no external assets except Google Fonts via @import.
A persistent background sits BEHIND this scene — so keep the page TRANSPARENT: html,body{width:${canvasW}px;height:${canvasH}px;margin:0;overflow:hidden;background:transparent}. Do NOT add a full-canvas opaque background; atmosphere (a soft glow) is fine.
Design like a real designer — flexbox/grid/flow/auto-sizing; a browser lays it out and we measure it, so never hand-position or compute widths.

ONE focal idea per frame. Low element count — a viewer reads a few things in ~2.5s. ${theme}. Anchor on accent ${accent} but build a real palette around it.

Tag every MEANINGFUL element (these become animated layers; layout wrappers don't need tags):
- data-role: headline | subhead | body | stat | label | card | divider | glow | icon
- data-layer: text | gradient | image | effect
- data-scene-element: hero | supporting | decoration   (mark the main idea "hero")
- data-icon="kebab-name" (Lucide) on an icon element

MOTION — this is a motion engine, so give every meaningful element a motion intent. Use ONLY these names (no inventing):
- data-enter (required):  ${list(ENTER_TYPES)}
- data-exit  (required):  ${list(EXIT_TYPES)}
- data-dir (for fly-in/fly-out): left | right | top | bottom
${beat.motion ? `The HERO element (data-scene-element="hero") MUST use data-enter="${beat.motion.enter}" and data-exit="${beat.motion.exit}" — these are directed for cross-scene variety. Give SUPPORTING elements their own DIFFERENT motion (vary direction and type), so the frame isn't uniform.` : `Vary motion per element — things enter from outside and leave the frame.`}
- data-emphasis (RARE): ${list(EMPHASIS_TYPES)}. After entering, elements HOLD STILL. Add data-emphasis to AT MOST ONE element (usually none) and only as a subtle, intentional accent — never on every element, or the scene looks like it's vibrating.
HIERARCHY — only the HERO is expressive. Supporting elements use calm entrances (fade/rise) and never emphasize. Decorations (glows, dividers, background shapes) should just fade — never spin, drift, or pulse. One star per scene; everything else supports quietly.

TEXT IS ONE UNIFORM STYLE PER ELEMENT — never per-word colors/gradients. Only REAL tagged elements render — no ::before/::after, no pseudo-elements.

LAYOUT FOR THIS FRAME: ${beat.layout || "the strongest premium structure for the line"}
ON-SCREEN TEXT: ${beat.text}

Output ONLY the HTML, from <!DOCTYPE html>.`;

  return { system, user: `Design this beat as a single premium, motion-tagged frame.` };
}
