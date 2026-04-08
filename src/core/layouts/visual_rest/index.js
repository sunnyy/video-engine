/**
 * layouts/visual_rest/index.js
 * 10 structurally distinct VISUAL REST layouts.
 *
 * Visual rest = breather beats, scenic shots, ambient moments.
 * Asset-forward. Minimal text. Lets the footage breathe.
 */

export default [

  // 5 — Three equal horizontal bands
  {
    id: "ThreeStack",
    label: "Three Stack",
    intent: ["list", "scene", "showcase"],
    energy: ["low", "medium"],
    orientation: ["9:16"],
    assetCount: 3, textCount: 0,
    captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:0, y:0, width:100, height:33, zIndex:1, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"asset", role:"supporting_image", order:2, x:0, y:33.5, width:100, height:33, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z3", type:"asset", role:"supporting_image", order:3, x:0, y:67, width:100, height:33, zIndex:1, start:0.4, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none", style:{ objectFit:"cover" } },
    ],
  },

  // 8 — Mosaic: large top + two small bottom
  {
    id: "MosaicScene",
    label: "Mosaic Scene",
    intent: ["showcase", "list", "scene"],
    energy: ["medium"],
    orientation: ["9:16"],
    assetCount: 3, textCount: 0,
    captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:1, y:1, width:98, height:55, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z2", type:"asset", role:"supporting_image", order:2, x:1, y:57, width:48, height:41, zIndex:1, start:0.3, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z3", type:"asset", role:"supporting_image", order:3, x:51, y:57, width:48, height:41, zIndex:1, start:0.5, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
    ],
  },

  // 9 — Floating inset: full bg asset + smaller foreground asset
  {
    id: "PictureInPicture",
    label: "Picture In Picture",
    intent: ["scene", "comparison", "proof"],
    energy: ["medium", "low"],
    orientation: ["9:16"],
    assetCount: 2, textCount: 1,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"background_image", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"asset", role:"supporting_image", order:2, x:55, y:8, width:40, height:40, zIndex:3, start:0.4, end:null,
        enterAnimation:"popIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z3", type:"text", role:"headline", maxChars:28, order:1, x:5, y:75, width:90, height:20, zIndex:3, start:0.6, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:800, color:"#ffffff", textAlign:"left", textShadow:"0 2px 12px rgba(0,0,0,0.8)" } },
    ],
  },

  // 10 — Magazine editorial: image right, large text left
  {
    id: "Magazine",
    label: "Magazine",
    intent: ["hook", "reveal", "showcase"],
    energy: ["low", "medium"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:48, y:5, width:50, height:52, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z2", type:"text", role:"headline", maxChars:25, order:1, x:3, y:8, width:44, height:44, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"left", lineHeight:1.0, letterSpacing:"-1px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:65, order:2, x:3, y:62, width:94, height:30, zIndex:2, start:0.45, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:400, color:"#ffffff", textAlign:"left", lineHeight:1.5 } },
    ],
  },

];
