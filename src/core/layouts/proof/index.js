/**
 * layouts/proof/index.js
 * 10 structurally distinct PROOF layouts.
 */

export default [

  // 1 — Asset top, stacked list below
  {
    id: "AssetWithList", label: "Asset With List",
    intent: ["list", "proof", "showcase"], energy: ["medium"], orientation: ["9:16"],
    assetCount: 1, textCount: 4, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:0, y:0, width:100, height:42, zIndex:1, start:0, end:null,
        enterAnimation:"scaleIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"text", role:"headline", maxChars:28, order:1, x:5, y:44, width:90, height:13, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:800, color:"#ffffff", textAlign:"left" } },
      { id:"z3", type:"text", role:"subtext", maxChars:40, order:2, x:5, y:59, width:90, height:12, zIndex:2, start:0.45, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:600, color:"#ffffff", textAlign:"left" } },
      { id:"z4", type:"text", role:"subtext", maxChars:40, order:3, x:5, y:73, width:90, height:12, zIndex:2, start:0.7, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:600, color:"#ffffff", textAlign:"left" } },
      { id:"z5", type:"text", role:"subtext", maxChars:40, order:4, x:5, y:87, width:90, height:11, zIndex:2, start:0.85, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:58, fontWeight:500, color:"#ffffff", textAlign:"left" } },
    ],
  },

  // 2 — Side by side: image left, text stack right
  {
    id: "SideBySide", label: "Side By Side",
    intent: ["comparison", "proof", "stat"], energy: ["medium"], orientation: ["9:16"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:0, y:16, width:48, height:64, zIndex:1, start:0, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z2", type:"text", role:"headline", maxChars:22, order:1, x:52, y:18, width:46, height:28, zIndex:2, start:0.3, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:800, color:"#ffffff", textAlign:"left", lineHeight:1.1, letterSpacing:"-1px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:52, y:49, width:46, height:18, zIndex:2, start:0.55, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:58, fontWeight:500, color:"#ffffff", textAlign:"left", lineHeight:1.4 } },
      { id:"z4", type:"text", role:"label", maxChars:18, order:3, x:52, y:70, width:46, height:12, zIndex:2, start:0.75, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:50, fontWeight:400, color:"#ffffff", textAlign:"left", opacity:0.7 } },
    ],
  },

  // 5 — Four-grid collage + title header
  {
    id: "FourCollage", label: "Four Collage",
    intent: ["showcase", "list", "proof"], energy: ["medium", "high"], orientation: ["9:16"],
    assetCount: 4, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:5, y:2, width:90, height:12, zIndex:4, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:700, color:"#ffffff", textAlign:"center" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:1, y:15, width:48, height:38, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z3", type:"asset", role:"supporting_image", order:2, x:51, y:15, width:48, height:38, zIndex:2, start:0.35, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z4", type:"asset", role:"supporting_image", order:3, x:1, y:54, width:48, height:38, zIndex:2, start:0.5, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z5", type:"asset", role:"supporting_image", order:4, x:51, y:54, width:48, height:38, zIndex:2, start:0.65, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
    ],
  },

  // 9 — Data rows: title + multiple labeled rows
  {
    id: "DataRowsProof", label: "Data Rows",
    intent: ["stat", "list", "proof"], energy: ["low", "medium"], orientation: ["9:16"],
    assetCount: 0, textCount: 5, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:4, y:5, width:92, height:13, zIndex:2, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:800, color:"#ffffff", textAlign:"left" } },
      { id:"z2", type:"text", role:"subtext", maxChars:40, order:2, x:4, y:23, width:92, height:13, zIndex:2, start:0.3, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:700, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.06)", borderRadius:8 } },
      { id:"z3", type:"text", role:"subtext", maxChars:40, order:3, x:4, y:39, width:92, height:13, zIndex:2, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:700, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.06)", borderRadius:8 } },
      { id:"z4", type:"text", role:"subtext", maxChars:40, order:4, x:4, y:55, width:92, height:13, zIndex:2, start:0.7, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:700, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.06)", borderRadius:8 } },
      { id:"z5", type:"text", role:"subtext", maxChars:40, order:5, x:4, y:71, width:92, height:13, zIndex:2, start:0.85, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:62, fontWeight:700, color:"#ffffff", textAlign:"left", background:"rgba(255,255,255,0.06)", borderRadius:8 } },
    ],
  },

];
