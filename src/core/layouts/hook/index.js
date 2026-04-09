/**
 * layouts/hook/index.js
 * 10 structurally distinct HOOK layouts.
 */

export default [

  // 5 — Headline reveals first, then asset zooms in
  {
    id: "HeadlineReveal", label: "Headline Reveal",
    intent: ["hook", "stat", "reveal"], energy: ["high"], orientation: ["9:16"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:4, y:30, width:92, height:6, zIndex:3, start:0, end:1.8,
        enterAnimation:"popIn", exitAnimation:"slideUpOut",
        style:{ fontSize:104, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:5, y:5, width:90, height:76, zIndex:2, start:1.6, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:83, width:90, height:16, zIndex:3, start:2.0, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:64, fontWeight:600, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 9 — Stacked duo images + center label
  {
    id: "DuoStackHook", label: "Duo Stack Hook",
    intent: ["hook", "comparison", "showcase"], energy: ["high", "medium"], orientation: ["9:16"],
    assetCount: 2, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:0, y:0, width:100, height:47, zIndex:1, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"asset", role:"supporting_image", order:2, x:0, y:53, width:100, height:47, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z3", type:"text", role:"headline", maxChars:25, order:1, x:5, y:42, width:90, height:14, zIndex:3, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 2px 16px rgba(0,0,0,0.9)", letterSpacing:"-1px" } },
    ],
  },

];
