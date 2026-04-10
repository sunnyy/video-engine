/**
 * layouts/visual_rest/index.js
 * Structurally distinct VISUAL REST layouts.
 *
 * Visual rest = breather beats, scenic shots, ambient moments.
 * Asset-forward. Minimal text. Lets the footage breathe.
 * Single primary intent per layout.
 * Font sizes calibrated for 1080×1920 canvas.
 */

export default [

  // 1 — Three equal horizontal bands
  {
    id: "ThreeStack",
    label: "Three Stack",
    intent: ["visual_rest"],
    energy: ["low", "medium"],
    orientation: ["9:16"],
    niche: ["travel", "lifestyle", "food", "entertainment", "sports"],
    assetCount: 3, textCount: 0,
    captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:33, zIndex:1, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover" } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:0, y:33.5, width:100, height:33, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover" } },
      { id:"z3", type:"asset", role:"asset_3", order:3, x:0, y:67, width:100, height:33, zIndex:1, start:0.4, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover" } },
    ],
  },

  // 2 — Mosaic: large top + two small bottom
  {
    id: "MosaicScene",
    label: "Mosaic Scene",
    intent: ["visual_rest"],
    energy: ["medium"],
    orientation: ["9:16"],
    niche: ["travel", "lifestyle", "food", "sports", "entertainment"],
    assetCount: 3, textCount: 0,
    captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:1, y:1, width:98, height:55, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:1, y:57, width:48, height:41, zIndex:1, start:0.3, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z3", type:"asset", role:"asset_3", order:3, x:51, y:57, width:48, height:41, zIndex:1, start:0.5, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
    ],
  },

  // 3 — Picture in picture: full bg + inset foreground asset + headline
  {
    id: "PictureInPicture",
    label: "Picture In Picture",
    intent: ["visual_rest"],
    energy: ["medium", "low"],
    orientation: ["9:16"],
    niche: ["travel", "lifestyle", "entertainment", "sports", "food"],
    assetCount: 2, textCount: 1,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover" } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:55, y:6, width:40, height:36, zIndex:3, start:0.4, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:14,
          outline:"8px solid #ffffff", outlineOffset:"-8px" } },
      { id:"z3", type:"text", role:"headline", maxChars:28, order:1, x:4, y:76, width:92, height:18, zIndex:3, start:0.6, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:112, fontWeight:900, fontFamily:"'Bebas Neue', sans-serif",
          color:"#ffffff", textAlign:"left", lineHeight:0.95,
          textShadow:"0 4px 24px rgba(0,0,0,0.9)" } },
    ],
  },

  // 4 — Magazine: large text left + asset right
  {
    id: "Magazine",
    label: "Magazine",
    intent: ["visual_rest"],
    energy: ["low", "medium"],
    orientation: ["9:16"],
    niche: ["lifestyle", "travel", "food", "education", "entertainment"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:48, y:4, width:50, height:54, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z2", type:"text", role:"headline", maxChars:22, order:1, x:3, y:6, width:44, height:42, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ fontSize:112, fontWeight:900, fontFamily:"'Bebas Neue', sans-serif",
          color:"#ffffff", textAlign:"left", lineHeight:0.95,
          letterSpacing:"-1px", textShadow:"0 4px 24px rgba(0,0,0,0.9)" } },
      { id:"z3", type:"text", role:"subtext", maxChars:65, order:2, x:3, y:62, width:94, height:28, zIndex:2, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:60, fontWeight:400, fontFamily:"'Outfit', sans-serif",
          color:"#ffffff", textAlign:"left", lineHeight:1.5, opacity:0.85 } },
    ],
  },

  // 5 — Full bleed single asset — pure cinematic frame, caption only
  {
    id: "FullBleedScene",
    label: "Full Bleed Scene",
    intent: ["visual_rest"],
    energy: ["low"],
    orientation: ["9:16"],
    niche: ["travel", "lifestyle", "entertainment", "food", "sports"],
    assetCount: 1, textCount: 0,
    captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
    ],
  },

  // 6 — Letterbox cinematic: asset with black bars top + bottom + centered label
  {
    id: "LetterboxScene",
    label: "Letterbox Scene",
    intent: ["visual_rest"],
    energy: ["low"],
    orientation: ["9:16"],
    niche: ["travel", "entertainment", "lifestyle", "education"],
    assetCount: 1, textCount: 1,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:12, width:100, height:76, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"decorative", role:"decorative", order:1, x:0, y:0, width:100, height:12, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ background:"#000000", opacity:1, borderRadius:0 } },
      { id:"z3", type:"decorative", role:"decorative", order:2, x:0, y:88, width:100, height:12, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ background:"#000000", opacity:1, borderRadius:0 } },
      { id:"z4", type:"text", role:"label", maxChars:28, order:1, x:5, y:90, width:90, height:8, zIndex:3, start:0.3, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:48, fontWeight:400, fontStyle:"italic",
          fontFamily:"'Playfair Display', serif",
          color:"#ffffff", textAlign:"center", lineHeight:1.0,
          letterSpacing:"0.12em", opacity:0.75 } },
    ],
  },

  // 7 — Four collage grid: 2x2 equal assets, no text
  {
    id: "FourGridScene",
    label: "Four Grid Scene",
    intent: ["visual_rest"],
    energy: ["medium"],
    orientation: ["9:16"],
    niche: ["travel", "lifestyle", "food", "entertainment", "sports"],
    assetCount: 4, textCount: 0,
    captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:49, height:49, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:51, y:0, width:49, height:49, zIndex:1, start:0.15, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z3", type:"asset", role:"asset_3", order:3, x:0, y:51, width:49, height:49, zIndex:1, start:0.3, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z4", type:"asset", role:"asset_4", order:4, x:51, y:51, width:49, height:49, zIndex:1, start:0.45, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
    ],
  },

  // 8 — Editorial scenic: asset top 65% + italic serif caption bottom
  {
    id: "EditorialScene",
    label: "Editorial Scene",
    intent: ["visual_rest"],
    energy: ["low"],
    orientation: ["9:16"],
    niche: ["travel", "lifestyle", "food", "education", "entertainment"],
    assetCount: 1, textCount: 2,
    captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:65, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"decorative", role:"decorative", order:1, x:0, y:52, width:100, height:20, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ background:"linear-gradient(0deg, rgba(0,0,0,1) 0%, transparent 100%)",
          opacity:1, borderRadius:0 } },
      { id:"z3", type:"text", role:"label", maxChars:18, order:1, x:4, y:67, width:92, height:7, zIndex:3, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:44, fontWeight:600, color:"#ffffff", textAlign:"left",
          letterSpacing:"0.22em", opacity:0.5, textTransform:"uppercase" } },
      { id:"z4", type:"text", role:"headline", maxChars:40, order:2, x:4, y:76, width:92, height:20, zIndex:3, start:0.35, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:88, fontWeight:700, fontStyle:"italic",
          fontFamily:"'Playfair Display', serif",
          color:"#ffffff", textAlign:"left", lineHeight:1.15,
          textShadow:"0 2px 16px rgba(0,0,0,0.8)" } },
    ],
  },

  // 9 — Split scenic: two assets side by side full height, no text
  {
    id: "SplitScene",
    label: "Split Scene",
    intent: ["visual_rest"],
    energy: ["medium", "low"],
    orientation: ["9:16"],
    niche: ["travel", "lifestyle", "food", "entertainment", "sports"],
    assetCount: 2, textCount: 0,
    captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:49, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:51, y:0, width:49, height:100, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z3", type:"decorative", role:"decorative", order:1, x:48, y:0, width:4, height:100, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ opacity:0.4, borderRadius:0 } },
    ],
  },

];