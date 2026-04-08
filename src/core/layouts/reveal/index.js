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
      { id:"z2", type:"text", role:"headline", maxChars:28, order:1, x:5, y:65, width:90, height:22, zIndex:3, start:0.35, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"center", letterSpacing:"-1px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:88, width:90, height:10, zIndex:3, start:0.65, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:58, fontWeight:400, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 5 — Title appears first, then asset zooms in beneath
  {
    id: "TitleFirstReveal",
    label: "Title First Reveal",
    intent: ["reveal", "stat", "hook"],
    energy: ["high"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:4, y:30, width:92, height:32, zIndex:3, start:0, end:1.8,
        enterAnimation:"popIn", exitAnimation:"slideUpOut",
        style:{ fontSize:108, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)" } },
      { id:"z2", type:"asset", role:"hero_image", order:1, x:5, y:5, width:90, height:76, zIndex:2, start:1.6, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z3", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:83, width:90, height:14, zIndex:3, start:2.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:64, fontWeight:600, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 6 — Large quote style (the reveal IS the quote)
  {
    id: "QuoteReveal",
    label: "Quote Reveal",
    intent: ["reveal", "hook", "stat"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 0, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:35, order:1, x:5, y:22, width:90, height:46, zIndex:2, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-2px" } },
      { id:"z2", type:"text", role:"subtext", maxChars:50, order:2, x:10, y:72, width:80, height:12, zIndex:2, start:0.5, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:500, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 8 — Number/stat reveal: big isolated figure on clean background
  {
    id: "StatReveal",
    label: "Stat Reveal",
    intent: ["reveal", "stat", "hook"],
    energy: ["high"],
    orientation: ["9:16"],
    assetCount: 0, textCount: 3,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"label", maxChars:15, order:1, x:5, y:8, width:90, height:9, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:44, fontWeight:600, color:"#ffffff", textAlign:"center", opacity:0.65, letterSpacing:"0.18em", textTransform:"uppercase" } },
      { id:"z2", type:"text", role:"stat", maxChars:8, order:2, x:3, y:18, width:94, height:48, zIndex:2, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:168, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0, letterSpacing:"-5px" } },
      { id:"z3", type:"text", role:"subtext", maxChars:55, order:3, x:5, y:70, width:90, height:24, zIndex:2, start:0.45, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:66, fontWeight:700, color:"#ffffff", textAlign:"center", lineHeight:1.2 } },
    ],
  },

];
