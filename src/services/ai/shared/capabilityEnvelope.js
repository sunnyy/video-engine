/**
 * capabilityEnvelope.js
 * src/services/ai/shared/capabilityEnvelope.js
 *
 * THE single, truthful description of what our video engine can actually produce — what visual
 * sources exist and what each costs, what the renderer can and cannot draw, and the motion /
 * transition / sfx vocabulary. It is handed to the ART-DIRECTOR so the brain makes every per-scene
 * decision WITH full knowledge of the medium, instead of downstream constants deciding for it.
 *
 * Principle: the only constraints are the system's REAL capabilities (not layout archetypes). The
 * director composes scenes freely inside this envelope; the executor + designer then faithfully
 * produce exactly what it asked for. Free sources are UNLIMITED; only ai_image is budgeted.
 *
 * Lives in shared/ so every video service can adopt the same brief. (AI Video first.)
 */
import { RENDERER_CONSTRAINTS } from "./designConstraints.js";
import { ENTER_TYPES, EXIT_TYPES, EMPHASIS_TYPES } from "./motion.js";

// AI Video's own beat-level transition + camera vocab (it keeps its own transition logic, separate
// from the Social/Product TRANSITION_POOL). Kept here so the director's choices are always valid
// downstream and the envelope quotes the real, accepted values.
export const AIV_TRANSITIONS = ["zoom", "slide-left", "slide-up", "slide-down", "fade", "none"];
export const AIV_CAMERAS     = ["slow_zoom_in", "fast_zoom_in", "slow_zoom_out", "pan_left", "pan_right", "hold"];
export const SFX_PALETTES    = ["boom", "impact", "whoosh", "pop", "ding", "success", "tick", "glitch"];

// The asset sources the director may choose from, in their natural priority. These map 1:1 to what
// the executor can actually fetch (entityImage.js / stock.js / aiImageLibrary.js / aiImage.js).
export const ASSET_SOURCES = ["entity", "stock_video", "stock_image", "ai_image", "typographic"];

/**
 * buildCapabilityEnvelope({ orientation, aiImageBudget }) → string
 * The brief injected into the art-director's system prompt.
 */
export function buildCapabilityEnvelope({ orientation = "9:16", aiImageBudget = 0 } = {}) {
  return `CAPABILITY ENVELOPE — this is EXACTLY what our engine can produce and what each visual source costs. Design every scene to be visually COMPLETE within this; a scene is NEVER allowed to be a bare empty color block. You are NOT limited to any templates — compose each scene freely, but only with what is listed here.

VISUAL SOURCES — choose the best fit PER SCENE (free sources are UNLIMITED — lean on them):
- entity (FREE, unlimited): a REAL photo of a NAMED public person / company / place / landmark / product, fetched from Wikipedia/Wikimedia. Provide the exact Wikipedia article title. Best + free whenever the scene is literally about a real named subject.
- stock_video (FREE, unlimited): real FOOTAGE of a real-world moment (a city, crowd, nature, machinery, hands, motion). Provide a concrete search phrase. Prefer this for any real-world scene footage could show.
- stock_image (FREE, unlimited): a real stock photo or illustration. Provide a concrete search phrase. Great for concrete subjects, objects, places, moods, AND iconic symbol/sign/emblem imagery (e.g. "aries zodiac symbol neon", "bull silhouette gold").
- ai_image (PAID — BUDGET = ${aiImageBudget} for THIS video): a generated cinematic shot (text-free). Use ONLY for a bespoke concept or metaphor that NO free source can show. Spend the budget deliberately; allocations beyond ${aiImageBudget} cannot render, so don't over-ask.
- typographic (FREE, unlimited): NO photo/footage — a designed FULL-FRAME composition of big type + color + shape + optional Lucide icons. Use it for pure information moments (a stat, quote, list, title, CTA, comparison) OR when genuinely nothing depictable fits. A typographic scene MUST FILL the frame — it is a deliberate design, never empty.

If a subject can be SEEN, it gets entity/stock/ai imagery. If it can't, it becomes a deliberate FULL typographic frame. There is no other outcome — no empty frames, ever. For a topic that is a set of concrete visual subjects (e.g. each zodiac sign, each animal, each city), give EVERY one its own real (free stock/entity) image; do not fall back to text cards for subjects that obviously have imagery.

Each scene also declares a FALLBACK source (one of the others, or "typographic") to use if its first choice returns nothing — so a scene is always complete.

WHAT THE RENDERER CAN DRAW — every scene is flattened into separate layers, so design ONLY with what survives the flatten:
${RENDERER_CONSTRAINTS}

MOTION, TRANSITIONS & SOUND available to you:
- camera move (for entity/stock/ai_image scenes): ${AIV_CAMERAS.join(" | ")} — pick by emotion (slow zoom = awe/somber, fast zoom = impact, pan = scale/journey, hold = stillness).
- scene transition_out: ${AIV_TRANSITIONS.join(" | ")}.
- per-element motion the designer animates with: enter [${ENTER_TYPES.join(", ")}]; exit [${EXIT_TYPES.join(", ")}]; emphasis [${EMPHASIS_TYPES.join(", ")}].
- sfx is auto-placed on cuts from these palettes: ${SFX_PALETTES.join(" | ")} — you may hint one per scene.

ORIENTATION: ${orientation} — every entity/stock/ai source is fetched at this aspect ratio.`;
}
