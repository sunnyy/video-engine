export const motionsRegistry = {

  none: () => ({
    type: "none"
  }),

  /* ---------- ZOOM / PUSH ---------- */

  slowZoom: () => ({
    type: "scaleDrift",
    scaleStart: 1.05,
    scaleEnd: 1.2
  }),

  cinematicPush: () => ({
    type: "scaleDrift",
    scaleStart: 1.12,
    scaleEnd: 1.35
  }),

  pushSlow: () => ({
    type: "scaleDrift",
    scaleStart: 1.05,
    scaleEnd: 1.25
  }),

  pullSlow: () => ({
    type: "scaleDrift",
    scaleStart: 1.25,
    scaleEnd: 1.05
  }),

  /* ---------- DRIFT ---------- */

  driftLeft: () => ({
    type: "drift",
    xStart: 0,
    xEnd: -120,
    scaleStart: 1.1,
    scaleEnd: 1.2
  }),

  driftRight: () => ({
    type: "drift",
    xStart: 0,
    xEnd: 120,
    scaleStart: 1.1,
    scaleEnd: 1.2
  }),

  driftUp: () => ({
    type: "drift",
    yStart: 0,
    yEnd: -100,
    scaleStart: 1.08,
    scaleEnd: 1.18
  }),

  driftDown: () => ({
    type: "drift",
    yStart: 0,
    yEnd: 100,
    scaleStart: 1.08,
    scaleEnd: 1.18
  }),

  /* ---------- KEN BURNS ---------- */

  kenburns: () => ({
    type: "kenburns",
    scaleStart: 1.1,
    scaleEnd: 1.35,
    panX: -80,
    panY: -40
  }),

  kenburnsReverse: () => ({
    type: "kenburnsReverse",
    scaleStart: 1.35,
    scaleEnd: 1.1,
    panX: 80,
    panY: 40
  }),

  /* ---------- PARALLAX ---------- */

  parallaxLeft: () => ({
    type: "parallax",
    xStart: 0,
    xEnd: -200,
    depth: 0.6
  }),

  parallaxRight: () => ({
    type: "parallax",
    xStart: 0,
    xEnd: 200,
    depth: 0.6
  }),

  /* ---------- FLOATING ---------- */

  float: () => ({
    type: "float",
    amplitude: 12,
    speed: 0.5
  }),

  breathing: () => ({
    type: "breathing",
    scaleStart: 1,
    scaleEnd: 1.05,
    speed: 0.6
  }),

  /* ---------- ORBIT / ARC ---------- */

  orbitSlow: () => ({
    type: "orbit",
    radius: 40,
    speed: 0.4
  }),

  arcPan: () => ({
    type: "arcPan",
    xStart: -80,
    xEnd: 80,
    yStart: 40,
    yEnd: -40
  }),

  /* ---------- DRONE / CAMERA ---------- */

  droneRise: () => ({
    type: "droneRise",
    yStart: 120,
    yEnd: -40,
    scaleStart: 1.05,
    scaleEnd: 1.2
  }),

  /* ---------- IMPACT ---------- */

  microZoom: () => ({
    type: "microZoom",
    scaleStart: 1,
    scaleEnd: 1.12
  }),

  bounce: () => ({
    type: "bounce",
    scaleStart: 1.3,
    scaleEnd: 1
  })

};