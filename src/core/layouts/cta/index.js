/**
 * layouts/cta/index.js
 * 10 structurally distinct CTA layouts.
 */

export default [

  // 3 — Card-style: contained image + headline + sub
  {
    id: "CardCTA", label: "Card CTA",
    intent: ["cta", "reveal", "showcase"], energy: ["medium", "high"], orientation: ["9:16"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:5, y:5, width:90, height:58, zIndex:1, start:0, end:null,
        enterAnimation:"scaleIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:20 } },
      { id:"z2", type:"text", role:"headline", maxChars:28, order:1, x:5, y:65, width:90, height:22, zIndex:3, start:0.3, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:104, fontWeight:900, color:"#ffffff", textAlign:"center", letterSpacing:"-1px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:88, width:90, height:11, zIndex:3, start:0.6, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:58, fontWeight:500, color:"#ffffff", textAlign:"center" } },
    ],
  },

];
