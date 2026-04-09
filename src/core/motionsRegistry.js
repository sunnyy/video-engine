/**
 * motionsRegistry.js
 * src/core/motionsRegistry.js
 *
 * Only motions that keep the asset within its zone bounds.
 * Removed: drift, arcPan, orbitSlow, parallaxLeft, parallaxRight, float, breathing, bounce
 * These caused assets to visually leave their zone container.
 */
export const motionsRegistry = {

  none: () => ({ type: "none" }),

  /* ── ZOOM / PUSH — safe, scale from center ── */

  slowZoom: () => ({
    type: "scaleDrift",
    scaleStart: 1.05,
    scaleEnd: 1.18,
  }),

  cinematicPush: () => ({
    type: "scaleDrift",
    scaleStart: 1.1,
    scaleEnd: 1.28,
  }),

  pushSlow: () => ({
    type: "scaleDrift",
    scaleStart: 1.05,
    scaleEnd: 1.22,
  }),

  pullSlow: () => ({
    type: "scaleDrift",
    scaleStart: 1.22,
    scaleEnd: 1.05,
  }),

  microZoom: () => ({
    type: "microZoom",
    scaleStart: 1.0,
    scaleEnd: 1.1,
  }),

  /* ── DRONE RISE — vertical only, stays in bounds ── */

  droneRise: () => ({
    type: "droneRise",
    yStart: 60,    // reduced from 120 to stay in bounds
    yEnd: -20,     // reduced from -40
    scaleStart: 1.05,
    scaleEnd: 1.18,
  }),

};