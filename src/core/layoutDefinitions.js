/**
 * layoutDefinitions.js
 * src/core/layoutDefinitions.js
 *
 * All layouts defined as JSON zone compositions.
 * Zones are absolutely positioned (percentages).
 * AI fills text/asset zones by order.
 *
 * Zone schema:
 * {
 *   id: string,
 *   type: "text" | "asset",
 *   order: number,          // fill priority (1 = most important)
 *   x: number,              // % from left
 *   y: number,              // % from top
 *   width: number,          // % of canvas width
 *   height: number,         // % of canvas height
 *   zIndex: number,
 *   start: number,          // seconds — when zone appears
 *   end: number | null,     // seconds — when zone disappears (null = beat end)
 *   enterAnimation: string,
 *   exitAnimation: string,
 *   style: {}               // type-specific defaults
 * }
 */

export const layoutDefinitions = {

  // ─────────────────────────────────────────────
  // FULL BLEED — single full canvas asset
  // ─────────────────────────────────────────────
  FullBleed: {
    id: "FullBleed",
    label: "Full Bleed",
    intent: ["hook", "scene", "cta"],
    energy: ["low", "medium", "high"],
    orientation: ["9:16", "16:9"],
    assetCount: 1,
    textCount: 0,
    zones: [
      {
        id: "z1",
        type: "asset",
        order: 1,
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 1,
        start: 0, end: null,
        enterAnimation: "fadeIn",
        exitAnimation: "none",
        style: { objectFit: "cover" }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // HEADLINE OVER ASSET — text overlaid on image
  // ─────────────────────────────────────────────
  HeadlineOverAsset: {
    id: "HeadlineOverAsset",
    label: "Headline Over Asset",
    intent: ["hook", "stat", "cta"],
    energy: ["medium", "high"],
    orientation: ["9:16", "16:9"],
    assetCount: 1,
    textCount: 1,
    zones: [
      {
        id: "z1",
        type: "asset",
        order: 1,
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 1,
        start: 0, end: null,
        enterAnimation: "fadeIn",
        exitAnimation: "none",
        style: { objectFit: "cover" }
      },
      {
        id: "z2",
        type: "text",
        order: 1,
        x: 5, y: 60, width: 90, height: 35,
        zIndex: 2,
        start: 0.3, end: null,
        enterAnimation: "slideUpIn",
        exitAnimation: "none",
        style: {
          fontSize: 52,
          fontWeight: 800,
          color: "#ffffff",
          textAlign: "center",
          textShadow: "0 2px 12px rgba(0,0,0,0.8)"
        }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // SPLIT ASSETS — asset left + asset right
  // ─────────────────────────────────────────────
  SplitAssets: {
    id: "SplitAssets",
    label: "Split Assets",
    intent: ["comparison", "list", "proof"],
    energy: ["medium", "high"],
    orientation: ["9:16", "16:9"],
    assetCount: 2,
    textCount: 0,
    zones: [
      {
        id: "z1",
        type: "asset",
        order: 1,
        x: 0, y: 0, width: 50, height: 100,
        zIndex: 1,
        start: 0, end: null,
        enterAnimation: "slideRightIn",
        exitAnimation: "none",
        style: { objectFit: "cover" }
      },
      {
        id: "z2",
        type: "asset",
        order: 2,
        x: 50, y: 0, width: 50, height: 100,
        zIndex: 1,
        start: 0.15, end: null,
        enterAnimation: "slideLeftIn",
        exitAnimation: "none",
        style: { objectFit: "cover" }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // THREE STACK — 3 assets stacked vertically
  // ─────────────────────────────────────────────
  ThreeStack: {
    id: "ThreeStack",
    label: "Three Stack",
    intent: ["list", "proof", "showcase"],
    energy: ["low", "medium"],
    orientation: ["9:16"],
    assetCount: 3,
    textCount: 0,
    zones: [
      {
        id: "z1",
        type: "asset",
        order: 1,
        x: 0, y: 0, width: 100, height: 33.33,
        zIndex: 1,
        start: 0, end: null,
        enterAnimation: "slideDownIn",
        exitAnimation: "none",
        style: { objectFit: "cover" }
      },
      {
        id: "z2",
        type: "asset",
        order: 2,
        x: 0, y: 33.33, width: 100, height: 33.33,
        zIndex: 1,
        start: 0.2, end: null,
        enterAnimation: "slideDownIn",
        exitAnimation: "none",
        style: { objectFit: "cover" }
      },
      {
        id: "z3",
        type: "asset",
        order: 3,
        x: 0, y: 66.66, width: 100, height: 33.34,
        zIndex: 1,
        start: 0.4, end: null,
        enterAnimation: "slideDownIn",
        exitAnimation: "none",
        style: { objectFit: "cover" }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // HEADLINE REVEAL — multi-scene
  // headline appears → slides up → asset fills → subtext appears
  // ─────────────────────────────────────────────
  HeadlineReveal: {
    id: "HeadlineReveal",
    label: "Headline Reveal",
    intent: ["hook", "stat", "reveal"],
    energy: ["high"],
    orientation: ["9:16"],
    assetCount: 1,
    textCount: 2,
    zones: [
      {
        id: "z1",
        type: "text",
        order: 1,
        x: 5, y: 35, width: 90, height: 30,
        zIndex: 3,
        start: 0, end: 1.8,
        enterAnimation: "popIn",
        exitAnimation: "slideUpOut",
        style: {
          fontSize: 64,
          fontWeight: 900,
          color: "#ffffff",
          textAlign: "center",
          textShadow: "0 4px 24px rgba(0,0,0,0.9)"
        }
      },
      {
        id: "z2",
        type: "asset",
        order: 1,
        x: 5, y: 5, width: 90, height: 75,
        zIndex: 2,
        start: 1.6, end: null,
        enterAnimation: "fadeIn",
        exitAnimation: "none",
        style: { objectFit: "cover", borderRadius: 16 }
      },
      {
        id: "z3",
        type: "text",
        order: 2,
        x: 5, y: 82, width: 90, height: 15,
        zIndex: 3,
        start: 2.2, end: null,
        enterAnimation: "slideUpIn",
        exitAnimation: "none",
        style: {
          fontSize: 28,
          fontWeight: 600,
          color: "#ffffff",
          textAlign: "center",
          opacity: 0.85
        }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // FOUR COLLAGE — 4 images cascade in with title
  // ─────────────────────────────────────────────
  FourCollage: {
    id: "FourCollage",
    label: "Four Collage",
    intent: ["showcase", "list", "proof"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 4,
    textCount: 1,
    zones: [
      {
        id: "z1",
        type: "text",
        order: 1,
        x: 5, y: 3, width: 90, height: 12,
        zIndex: 4,
        start: 0, end: null,
        enterAnimation: "fadeIn",
        exitAnimation: "none",
        style: {
          fontSize: 32,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,0.7)"
        }
      },
      {
        id: "z2",
        type: "asset",
        order: 1,
        x: 1, y: 16, width: 48, height: 38,
        zIndex: 2,
        start: 0.2, end: null,
        enterAnimation: "slideRightIn",
        exitAnimation: "none",
        style: { objectFit: "cover", borderRadius: 12 }
      },
      {
        id: "z3",
        type: "asset",
        order: 2,
        x: 51, y: 16, width: 48, height: 38,
        zIndex: 2,
        start: 0.4, end: null,
        enterAnimation: "slideLeftIn",
        exitAnimation: "none",
        style: { objectFit: "cover", borderRadius: 12 }
      },
      {
        id: "z4",
        type: "asset",
        order: 3,
        x: 1, y: 55, width: 48, height: 38,
        zIndex: 2,
        start: 0.6, end: null,
        enterAnimation: "slideRightIn",
        exitAnimation: "none",
        style: { objectFit: "cover", borderRadius: 12 }
      },
      {
        id: "z5",
        type: "asset",
        order: 4,
        x: 51, y: 55, width: 48, height: 38,
        zIndex: 2,
        start: 0.8, end: null,
        enterAnimation: "slideLeftIn",
        exitAnimation: "none",
        style: { objectFit: "cover", borderRadius: 12 }
      }
    ]
  },

};