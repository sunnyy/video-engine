/**
 * layouts/contrast/index.js
 * 10 structurally distinct CONTRAST layouts.
 *
 * Contrast = this vs that, before/after, expected vs reality, irony.
 * Visual tension between two ideas. Duality is the point.
 */

export default [

  // 4 — Diagonal split (one color each side + text)
  {
    id: "DiagonalContrast",
    label: "Diagonal Contrast",
    intent: ["contrast", "comparison", "hook"],
    energy: ["high"],
    orientation: ["9:16"],
    assetCount: 2, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:0, y:0, width:60, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"asset", role:"supporting_image", order:2, x:40, y:0, width:60, height:100, zIndex:1, start:0.15, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z3", type:"text", role:"headline", maxChars:12, order:1, x:3, y:40, width:36, height:20, zIndex:3, start:0.3, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"left", textShadow:"0 2px 12px rgba(0,0,0,0.9)" } },
      { id:"z4", type:"text", role:"subtext", maxChars:12, order:2, x:61, y:40, width:36, height:20, zIndex:3, start:0.45, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"right", textShadow:"0 2px 12px rgba(0,0,0,0.9)" } },
    ],
  },

  // 6 — Two inset cards side by side + label
  {
    id: "CardContrast",
    label: "Card Contrast",
    intent: ["contrast", "comparison", "list"],
    energy: ["medium"],
    orientation: ["9:16"],
    assetCount: 2, textCount: 3,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:22, order:1, x:5, y:4, width:90, height:12, zIndex:4, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:800, color:"#ffffff", textAlign:"center" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:3, y:18, width:44, height:60, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z3", type:"asset", role:"supporting_image", order:2, x:53, y:18, width:44, height:60, zIndex:1, start:0.35, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z4", type:"text", role:"subtext", maxChars:18, order:2, x:3, y:80, width:44, height:14, zIndex:3, start:0.5, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:68, fontWeight:700, color:"#ffffff", textAlign:"center" } },
      { id:"z5", type:"text", role:"subtext", maxChars:18, order:3, x:53, y:80, width:44, height:14, zIndex:3, start:0.6, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:68, fontWeight:700, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 7 — Then vs Now: stat contrast layout
  {
    id: "ThenNowContrast",
    label: "Then Now Contrast",
    intent: ["contrast", "stat", "proof"],
    energy: ["high", "medium"],
    orientation: ["9:16"],
    assetCount: 0, textCount: 6,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:22, order:1, x:5, y:5, width:90, height:11, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:54, fontWeight:700, color:"#ffffff", textAlign:"center", opacity:0.65, letterSpacing:"0.15em", textTransform:"uppercase" } },
      { id:"z2", type:"text", role:"label", maxChars:8, order:2, x:3, y:18, width:46, height:8, zIndex:2, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:46, fontWeight:600, color:"#ffffff", textAlign:"center", opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em" } },
      { id:"z3", type:"text", role:"label", maxChars:8, order:3, x:51, y:18, width:46, height:8, zIndex:2, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:46, fontWeight:600, color:"#ffffff", textAlign:"center", opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em" } },
      { id:"z4", type:"text", role:"stat", maxChars:8, order:4, x:3, y:27, width:46, height:36, zIndex:2, start:0.3, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ fontSize:110, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-3px", opacity:0.6 } },
      { id:"z5", type:"text", role:"stat", maxChars:8, order:5, x:51, y:27, width:46, height:36, zIndex:2, start:0.5, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ fontSize:110, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-3px" } },
      { id:"z6", type:"text", role:"subtext", maxChars:55, order:6, x:5, y:70, width:90, height:22, zIndex:2, start:0.7, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:64, fontWeight:700, color:"#ffffff", textAlign:"center", lineHeight:1.2 } },
    ],
  },

];
