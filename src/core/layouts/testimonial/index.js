/**
 * layouts/testimonial/index.js
 * 10 structurally distinct TESTIMONIAL layouts.
 *
 * Testimonial = social proof, review, quote, real person, trust.
 * Human, warm, credible. The viewer should believe and relate.
 */

export default [

  // 3 — Full bleed person + overlaid quote
  {
    id: "FullBleedTestimonial",
    label: "Full Bleed Testimonial",
    intent: ["testimonial", "proof", "hook"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"background_image", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none", style:{ objectFit:"cover" } },
      { id:"z2", type:"text", role:"quote", maxChars:85, order:1, x:5, y:55, width:90, height:32, zIndex:3, start:0.35, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:700, color:"#ffffff", textAlign:"left", lineHeight:1.2, textShadow:"0 2px 16px rgba(0,0,0,0.9)", fontStyle:"italic" } },
      { id:"z3", type:"text", role:"subtext", maxChars:30, order:2, x:5, y:89, width:90, height:9, zIndex:3, start:0.65, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:56, fontWeight:600, color:"#ffffff", textAlign:"left", textShadow:"0 2px 8px rgba(0,0,0,0.8)" } },
    ],
  },

  // 4 — Star rating + quote + name (review card style)
  {
    id: "ReviewCard",
    label: "Review Card",
    intent: ["testimonial", "proof", "cta"],
    energy: ["medium"],
    orientation: ["9:16"],
    assetCount: 0, textCount: 4,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"label", maxChars:5, order:1, x:5, y:10, width:90, height:10, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:56, fontWeight:700, color:"#FFD700", textAlign:"center", letterSpacing:"0.3em" } },
      { id:"z2", type:"text", role:"quote", maxChars:90, order:2, x:5, y:24, width:90, height:46, zIndex:2, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:600, color:"#ffffff", textAlign:"center", lineHeight:1.25, fontStyle:"italic" } },
      { id:"z3", type:"text", role:"headline", maxChars:25, order:3, x:5, y:73, width:90, height:12, zIndex:2, start:0.55, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:700, color:"#ffffff", textAlign:"center" } },
      { id:"z4", type:"text", role:"subtext", maxChars:30, order:4, x:5, y:87, width:90, height:10, zIndex:2, start:0.7, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:400, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 7 — Before/after testimonial: two images + result quote
  {
    id: "BeforeAfterTestimonial",
    label: "Before After Testimonial",
    intent: ["testimonial", "proof", "comparison"],
    energy: ["medium", "high"],
    orientation: ["9:16"],
    assetCount: 2, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:1, y:5, width:47, height:60, zIndex:1, start:0, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:14 } },
      { id:"z2", type:"asset", role:"supporting_image", order:2, x:52, y:5, width:47, height:60, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:14 } },
      { id:"z3", type:"text", role:"quote", maxChars:65, order:1, x:5, y:68, width:90, height:18, zIndex:3, start:0.45, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:700, color:"#ffffff", textAlign:"center", lineHeight:1.2, fontStyle:"italic" } },
      { id:"z4", type:"text", role:"subtext", maxChars:30, order:2, x:5, y:88, width:90, height:10, zIndex:3, start:0.7, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:56, fontWeight:600, color:"#ffffff", textAlign:"center" } },
    ],
  },

  // 9 — Person top-right inset + large quote fills frame
  {
    id: "InsetPersonQuote",
    label: "Inset Person Quote",
    intent: ["testimonial", "empathy", "proof"],
    energy: ["low", "medium"],
    orientation: ["9:16"],
    assetCount: 1, textCount: 3,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"hero_image", order:1, x:62, y:5, width:36, height:36, zIndex:2, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none", style:{ objectFit:"cover", borderRadius:999 } },
      { id:"z2", type:"text", role:"quote", maxChars:55, order:1, x:5, y:10, width:55, height:30, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:700, color:"#ffffff", textAlign:"left", lineHeight:1.2, fontStyle:"italic" } },
      { id:"z3", type:"text", role:"subtext", maxChars:70, order:2, x:5, y:48, width:90, height:36, zIndex:2, start:0.4, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:64, fontWeight:500, color:"#ffffff", textAlign:"left", lineHeight:1.4 } },
      { id:"z4", type:"text", role:"subtext", maxChars:30, order:3, x:5, y:87, width:90, height:11, zIndex:2, start:0.65, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:54, fontWeight:600, color:"#ffffff", textAlign:"left" } },
    ],
  },

];
