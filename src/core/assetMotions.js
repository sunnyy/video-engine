export const assetMotions = {

  none: () => ({
    type: "none"
  }),

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

  kenburns: () => ({
    type: "kenburns",
    scaleStart: 1.1,
    scaleEnd: 1.35,
    panX: -80,
    panY: -40
  })

};