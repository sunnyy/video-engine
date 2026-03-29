export const backgroundPatternRegistry = {

  /* ---------------- PATTERNS ---------------- */

  none: () => ({
    background: "#000000"
  }),

  stripesDiagonal: (c1 = "#111", c2 = "#222") => ({
    background: `repeating-linear-gradient(
      45deg,
      ${c1} 0px,
      ${c1} 12px,
      ${c2} 12px,
      ${c2} 24px
    )`
  }),

  stripesHorizontal: (c1 = "#111", c2 = "#222") => ({
    background: `repeating-linear-gradient(
      0deg,
      ${c1} 0px,
      ${c1} 10px,
      ${c2} 10px,
      ${c2} 20px
    )`
  }),

  dots: (c = "#333") => ({
    background: `radial-gradient(circle, ${c} 2px, transparent 2px)`,
    backgroundSize: "22px 22px"
  }),

  grid: (c = "#333") => ({
    background: `
      linear-gradient(${c} 1px, transparent 1px),
      linear-gradient(90deg, ${c} 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px"
  }),

  crossGrid: (c = "#333") => ({
    background: `
      linear-gradient(${c} 1px, transparent 1px),
      linear-gradient(90deg, ${c} 1px, transparent 1px),
      linear-gradient(45deg, ${c} 1px, transparent 1px),
      linear-gradient(-45deg, ${c} 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px"
  }),

  /* ---------------- GRADIENT LIBRARY ---------------- */

  gradientDark: () => ({
    background: `linear-gradient(135deg,#111,#000)`
  }),

  gradientPurpleNight: () => ({
    background: `linear-gradient(135deg,#1a0b2e,#000)`
  }),

  gradientBlueDepth: () => ({
    background: `linear-gradient(135deg,#0f2027,#203a43,#2c5364)`
  }),

  gradientSunset: () => ({
    background: `linear-gradient(135deg,#ff7e5f,#feb47b)`
  }),

  gradientOrangeGlow: () => ({
    background: `linear-gradient(135deg,#ff5f6d,#ffc371)`
  }),

  gradientNeonPink: () => ({
    background: `linear-gradient(135deg,#ff00cc,#333399)`
  }),

  gradientAqua: () => ({
    background: `linear-gradient(135deg,#13547a,#80d0c7)`
  }),

  gradientEmerald: () => ({
    background: `linear-gradient(135deg,#134e5e,#71b280)`
  }),

  gradientRedEnergy: () => ({
    background: `linear-gradient(135deg,#cb2d3e,#ef473a)`
  }),

  gradientCyber: () => ({
    background: `linear-gradient(135deg,#0f0c29,#302b63,#24243e)`
  }),

  gradientSoftLight: () => ({
    background: `linear-gradient(135deg,#f5f7fa,#c3cfe2)`
  }),

  gradientWarmLight: () => ({
    background: `linear-gradient(135deg,#f6d365,#fda085)`
  }),

  gradientOcean: () => ({
    background: `linear-gradient(135deg,#2E3192,#1BFFFF)`
  }),

  gradientNightSky: () => ({
    background: `linear-gradient(135deg,#141E30,#243B55)`
  }),

  gradientLavender: () => ({
    background: `linear-gradient(135deg,#654ea3,#eaafc8)`
  }),

  /* ---------------- RADIAL / MESH ---------------- */

  radialBurst: (c1 = "#111", c2 = "#000") => ({
    background: `radial-gradient(circle at center, ${c1}, ${c2})`
  }),

  softGradient: (c1 = "#1a1a1a", c2 = "#000") => ({
    background: `linear-gradient(135deg, ${c1}, ${c2})`
  }),

  meshGradient: (c1 = "#222", c2 = "#000", c3 = "#333") => ({
    background: `
      radial-gradient(circle at 20% 20%, ${c1}, transparent 40%),
      radial-gradient(circle at 80% 30%, ${c2}, transparent 40%),
      radial-gradient(circle at 50% 80%, ${c3}, transparent 40%)
    `
  }),

};