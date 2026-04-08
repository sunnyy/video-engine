/**
 * layouts/hook/index.js
 * 10 structurally distinct HOOK layouts.
 */

export default [

  // 1 — Giant number / stat dominates the frame
  {
    id: "NumberHook", label: "Number Hook",
    intent: ["hook", "stat"], energy: ["high"], orientation: ["9:16"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"background_image", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"scaleIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"text", role:"stat", maxChars:8, order:1, x:3, y:10, width:94, height:52, zIndex:3, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:180, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-5px", textShadow:"0 8px 48px rgba(0,0,0,0.85)" } },
      { id:"z3", type:"text", role:"subtext", maxChars:40, order:2, x:4, y:67, width:92, height:24, zIndex:3, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:68, fontWeight:700, color:"#ffffff", textAlign:"center", textShadow:"0 2px 16px rgba(0,0,0,0.8)" } },
    ],
  },

  // 4 — Text-only, three-part stacked (label + headline + subtext)
  {
    id: "ThreePartHook", label: "Three Part Hook",
    intent: ["hook", "curiosity", "stat"], energy: ["high"], orientation: ["9:16"],
    assetCount: 0, textCount: 3, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"label", maxChars:15, order:1, x:5, y:8, width:90, height:10, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:44, fontWeight:600, color:"#ffffff", textAlign:"center", opacity:0.65, letterSpacing:"0.18em", textTransform:"uppercase" } },
      { id:"z2", type:"text", role:"headline", maxChars:30, order:2, x:3, y:20, width:94, height:48, zIndex:2, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:108, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:0.95, letterSpacing:"-2px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:55, order:3, x:5, y:73, width:90, height:22, zIndex:2, start:0.45, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:64, fontWeight:600, color:"#ffffff", textAlign:"center", lineHeight:1.3 } },
    ],
  },

  // 5 — Headline reveals first, then asset zooms in
  {
    id: "HeadlineReveal", label: "Headline Reveal",
    intent: ["hook", "stat", "reveal"], energy: ["high"], orientation: ["9:16"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:4, y:30, width:92, height:32, zIndex:3, start:0, end:1.8,
        enterAnimation:"popIn", exitAnimation:"slideUpOut",
        style:{ fontSize:104, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:5, y:5, width:90, height:76, zIndex:2, start:1.6, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:83, width:90, height:14, zIndex:3, start:2.0, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:64, fontWeight:600, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 6 — Full bleed asset, title at top
  {
    id: "TopTitleHook", label: "Top Title Hook",
    intent: ["hook", "scene", "cta"], energy: ["medium", "high"], orientation: ["9:16"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"background_image", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"scaleIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"text", role:"headline", maxChars:28, order:1, x:5, y:8, width:90, height:8, zIndex:3, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 32px rgba(0,0,0,0.9)", letterSpacing:"-1px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:80, width:90, height:16, zIndex:3, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:600, color:"#ffffff", textAlign:"center", textShadow:"0 2px 12px rgba(0,0,0,0.8)" } },
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
