/**
 * layouts/reveal/index.js
 * 10 structurally distinct REVEAL layouts.
 *
 * Reveal = payoff, aha moment, resolution, punchline.
 * High impact, clean, often minimal. The moment everything clicks.
 */

export default [

  // 3 — Contained product/image + centered title below
  {
    id: "ProductReveal",
    label: "Product Reveal",
    intent: ["reveal", "showcase", "cta"],
    energy: ["medium"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:8, y:5, width:84, height:58, zIndex:1, start:0, end:null,
        enterAnimation:"scaleIn", exitAnimation:"none", style:{ objectFit:"contain", borderRadius:20 } },
      { id:"z2", type:"text", role:"headline", maxChars:28, order:1, x:5, y:65, width:90, height:8, zIndex:3, start:0.35, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:125, fontWeight:900, color:"#ffffff", textAlign:"center", letterSpacing:"-1px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:77, width:90, height:28, zIndex:3, start:0.65, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:48, fontWeight:400, color:"#ffffff", textAlign:"center", lineHeight:1.3 } },
    ],
  },

];
