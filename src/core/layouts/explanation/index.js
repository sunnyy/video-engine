/**
 * layouts/explanation/index.js
 * 10 structurally distinct EXPLANATION layouts.
 *
 * Explanation = how it works, why it matters, step by step, mechanism.
 * Clear, readable, informative. Teaching mode.
 */

export default [

  // 7 — Title + two-column explanation blocks
  {
    id: "TwoColumnExplain",
    label: "Two Column Explain",
    intent: ["explanation", "comparison", "list"],
    energy: ["medium"],
    orientation: ["9:16"],
    assetCount: 0, textCount: 5,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:25, order:1, x:5, y:5, width:90, height:13, zIndex:2, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:800, color:"#ffffff", textAlign:"center" } },
      { id:"z2", type:"text", role:"subtext", maxChars:40, order:2, x:3, y:22, width:46, height:30, zIndex:2, start:0.3, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:600, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.07)", borderRadius:10, lineHeight:1.3 } },
      { id:"z3", type:"text", role:"subtext", maxChars:40, order:3, x:51, y:22, width:46, height:30, zIndex:2, start:0.45, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:600, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.07)", borderRadius:10, lineHeight:1.3 } },
      { id:"z4", type:"text", role:"subtext", maxChars:40, order:4, x:3, y:56, width:46, height:30, zIndex:2, start:0.6, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:600, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.07)", borderRadius:10, lineHeight:1.3 } },
      { id:"z5", type:"text", role:"subtext", maxChars:40, order:5, x:51, y:56, width:46, height:30, zIndex:2, start:0.75, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:600, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.07)", borderRadius:10, lineHeight:1.3 } },
    ],
  },

  // 8 — Big claim + supporting explanation paragraph
  {
    id: "ClaimExplain",
    label: "Claim Explain",
    intent: ["explanation", "proof", "hook"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 0, textCount: 3,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"label", maxChars:15, order:1, x:5, y:8, width:90, height:9, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:42, fontWeight:600, color:"#ffffff", textAlign:"center", opacity:0.65, letterSpacing:"0.15em", textTransform:"uppercase" } },
      { id:"z2", type:"text", role:"headline", maxChars:30, order:2, x:3, y:20, width:94, height:36, zIndex:2, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:108, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-2px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:70, order:3, x:5, y:60, width:90, height:32, zIndex:2, start:0.45, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:500, color:"#ffffff", textAlign:"center", lineHeight:1.5 } },
    ],
  },

];
