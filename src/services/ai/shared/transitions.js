/**
 * transitions.js
 * src/services/ai/shared/transitions.js
 *
 * Black-flash-safe scene transitions for the headless-measure services
 * (Social, Product — and any future service with the same scene model).
 *
 * Sequential scenes can't overlap, so fading the OUTGOING scene to transparent
 * would dip to black at every cut. Slides may animate the out side (they move,
 * staying opaque); fades/zooms act on the INCOMING side only.
 *
 * NOTE: AI Video keeps its OWN transition logic (beat continuation "BUILD"
 * handling + SFX whoosh), so it does not use this shared helper.
 */

export const TRANSITION_DURATION = 0.3;

export const TRANSITION_MAP = {
  zoom:         { out: "none",       in: "zoom-in" },
  "slide-left": { out: "slide-left", in: "slide-left" },
  "slide-up":   { out: "slide-up",   in: "slide-up" },
  "slide-down": { out: "slide-down", in: "slide-down" },
  fade:         { out: "none",       in: "fade" },
};

export const TRANSITION_POOL = ["fade", "slide-left", "zoom", "slide-up", "slide-down"];

/**
 * applyTransitions(layers, scenes)
 * Each scene must carry a `transition_out` key (one of TRANSITION_MAP). The
 * outgoing scene's layers get the out side; the incoming scene's base layers
 * (background / _media / _scrim) get the in side.
 */
export function applyTransitions(layers, scenes) {
  for (let i = 0; i < scenes.length - 1; i++) {
    const t = TRANSITION_MAP[scenes[i].transition_out] ?? TRANSITION_MAP.fade;
    for (const layer of layers) {
      if (!layer.id?.startsWith(`s${i}_`) || layer.type === "audio") continue;
      layer.transition = {
        in:  layer.transition?.in ?? { type: "none", duration: 0 },
        out: { type: t.out, duration: TRANSITION_DURATION },
      };
    }
    for (const layer of layers) {
      if (!(layer.id?.startsWith(`s${i + 1}_`) && /background|_media|_scrim/.test(layer.id))) continue;
      layer.transition = {
        in:  { type: t.in, duration: TRANSITION_DURATION },
        out: layer.transition?.out ?? { type: "none", duration: 0 },
      };
    }
  }
}

/**
 * assignSceneTransitions(scenes) — give each scene a varied transition_out,
 * avoiding repeating the same one back-to-back.
 */
export function assignSceneTransitions(scenes) {
  let prev = null;
  for (const s of scenes) {
    const pool = TRANSITION_POOL.filter(t => t !== prev);
    s.transition_out = pool[Math.floor(Math.random() * pool.length)];
    prev = s.transition_out;
  }
}
