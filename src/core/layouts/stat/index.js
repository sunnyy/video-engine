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

  // 9 — Stat + asset inline (editorial data viz feel)
  {
    id: "EditorialStat",
    label: "Editorial Stat",
    intent: ["stat", "proof", "hook"],
    energy: ["low", "medium"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 3,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:48, y:4, width:50, height:55, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z2", type:"text", role:"stat", maxChars:8, order:1, x:3, y:7, width:44, height:36, zIndex:2, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:130, fontWeight:900, color:"#ffffff", textAlign:"left", lineHeight:1.0, letterSpacing:"-3px" } },
      { id:"z3", type:"text", role:"label", maxChars:15, order:2, x:3, y:45, width:44, height:16, zIndex:2, start:0.35, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:600, color:"#ffffff", textAlign:"left", opacity:0.7 } },
      { id:"z4", type:"text", role:"subtext", maxChars:60, order:3, x:3, y:64, width:94, height:28, zIndex:2, start:0.55, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:400, color:"#ffffff", textAlign:"left", lineHeight:1.5 } },
    ],
  },

];
