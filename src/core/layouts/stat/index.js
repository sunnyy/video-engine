/**
 * layouts/stat/index.js
 * 10 structurally distinct STAT layouts.
 *
 * Stat = number-dominant, data point, metric, percentage.
 * The number IS the hero. Everything else supports it.
 */

export default [

  // 7 — Asset top half, stat block bottom half
  {
    id: "AssetStatBottom",
    label: "Asset Stat Bottom",
    intent: ["stat", "proof", "showcase"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:0, y:0, width:100, height:48, zIndex:1, start:0, end:null,
        enterAnimation:"scaleIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"text", role:"stat", maxChars:8, order:1, x:3, y:50, width:94, height:36, zIndex:3, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:140, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-4px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:88, width:90, height:10, zIndex:3, start:0.6, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:600, color:"#ffffff", textAlign:"center" } },
    ],
  },

];
