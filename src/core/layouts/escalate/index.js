/**
 * layouts/escalate/index.js
 * 10 structurally distinct ESCALATE layouts.
 *
 * Escalate = building tension, stacking evidence, contrast, comparison.
 * Energetic, multi-element, things "piling up" visually.
 */

export default [

  // 3 — Building list: stacks items with title + asset background
  {
    id: "BuildingList",
    label: "Building List",
    intent: ["list", "proof", "escalate"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 4,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"background_image", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"text", role:"headline", maxChars:25, order:1, x:5, y:8, width:90, height:14, zIndex:3, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:800, color:"#ffffff", textAlign:"center", textShadow:"0 2px 12px rgba(0,0,0,0.9)" } },
      { id:"z3", type:"text", role:"subtext", maxChars:38, order:2, x:5, y:28, width:90, height:14, zIndex:3, start:0.35, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:700, color:"#ffffff", textAlign:"left", background:"rgba(0,0,0,0.5)", borderRadius:10 } },
      { id:"z4", type:"text", role:"subtext", maxChars:38, order:3, x:5, y:45, width:90, height:14, zIndex:3, start:0.65, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:700, color:"#ffffff", textAlign:"left", background:"rgba(0,0,0,0.5)", borderRadius:10 } },
      { id:"z5", type:"text", role:"subtext", maxChars:38, order:4, x:5, y:62, width:90, height:14, zIndex:3, start:0.85, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:700, color:"#ffffff", textAlign:"left", background:"rgba(0,0,0,0.5)", borderRadius:10 } },
    ],
  },

  // 4 — Four-grid collage escalation
  {
    id: "CollageEscalate",
    label: "Collage Escalate",
    intent: ["showcase", "list", "comparison"],
    energy: ["high", "medium"],
    orientation: ["9:16"],
    assetCount: 4, textCount: 1,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:25, order:1, x:5, y:2, width:90, height:11, zIndex:4, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:700, color:"#ffffff", textAlign:"center" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:1, y:14, width:48, height:38, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:10 } },
      { id:"z3", type:"asset", role:"supporting_image", order:2, x:51, y:14, width:48, height:38, zIndex:2, start:0.4, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:10 } },
      { id:"z4", type:"asset", role:"supporting_image", order:3, x:1, y:53, width:48, height:38, zIndex:2, start:0.6, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:10 } },
      { id:"z5", type:"asset", role:"supporting_image", order:4, x:51, y:53, width:48, height:38, zIndex:2, start:0.75, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:10 } },
    ],
  },

  // 8 — Three-row assets (escalating stack)
  {
    id: "EscalatingStack",
    label: "Escalating Stack",
    intent: ["list", "showcase", "escalate"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 3, textCount: 1,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:25, order:1, x:5, y:2, width:90, height:11, zIndex:4, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:700, color:"#ffffff", textAlign:"center" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:1, y:14, width:98, height:26, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:10 } },
      { id:"z3", type:"asset", role:"supporting_image", order:2, x:1, y:42, width:98, height:26, zIndex:2, start:0.45, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:10 } },
      { id:"z4", type:"asset", role:"supporting_image", order:3, x:1, y:70, width:98, height:28, zIndex:2, start:0.7, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:10 } },
    ],
  },

  // 9 — Title full-width + image below (escalating reveal)
  {
    id: "TitleThenAsset",
    label: "Title Then Asset",
    intent: ["escalate", "hook", "stat"],
    energy: ["high", "medium"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:4, y:6, width:92, height:32, zIndex:3, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:104, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-2px" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:3, y:40, width:94, height:48, zIndex:1, start:0.5, end:null,
        enterAnimation:"scaleIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z3", type:"text", role:"subtext", maxChars:40, order:2, x:4, y:90, width:92, height:8, zIndex:3, start:0.8, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:56, fontWeight:500, color:"#ffffff", textAlign:"center" } },
    ],
  },

];
