/**
 * layouts/hook/index.js
 * 10 structurally distinct HOOK layouts.
 */

export default [
  // Layout 1 — Single centered headline on full color/pattern background
  {
    id: "CenterHook", label: "Center Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "education", "finance", "health", "lifestyle"],
    assetCount: 0, textCount: 1, captionStrategy: "always",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:30, order:1, x:6, y:38, width:88, height:22, zIndex:3, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.1 } },
    ],
  },
 
  // Layout 2 — Three stacked text blocks: label top, headline mid, subtext bottom
  {
    id: "StackedTextHook", label: "Stacked Text Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "education", "finance", "health", "lifestyle", "gaming"],
    assetCount: 0, textCount: 3, captionStrategy: "always",
    zones: [
      { id:"z1", type:"text", role:"label", maxChars:20, order:1, x:6, y:8, width:88, height:8, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:600, color:"#ffffff", textAlign:"center", letterSpacing:"0.08em", opacity:0.75 } },
      { id:"z2", type:"text", role:"headline", maxChars:35, order:2, x:6, y:22, width:88, height:28, zIndex:3, start:0.2, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:104, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z3", type:"text", role:"subtext", maxChars:55, order:3, x:6, y:82, width:88, height:10, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:500, color:"#ffffff", textAlign:"center", opacity:0.85 } },
    ],
  },
 
  // Layout 3 — Two offset/overlapping assets + decorative square + icon
  {
    id: "OffsetDuoHook", label: "Offset Duo Hook",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
    niche: ["entertainment", "gaming", "sports", "lifestyle"],
    assetCount: 2, textCount: 0, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:4, y:6, width:72, height:44, zIndex:2, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:18, y:38, width:60, height:42, zIndex:3, start:0.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z3", type:"decorative", role:"decorative", order:3, x:62, y:22, width:28, height:20, zIndex:4, start:0.1, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ borderRadius:8, opacity:0.85 } },
      { id:"z4", type:"icon", role:"icon", order:4, x:68, y:72, width:18, height:12, zIndex:5, start:0.4, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ opacity:1 } },
    ],
  },
 
  // Layout 4 — Full-canvas asset + top label + mid headline + bottom subtext
  {
    id: "AssetOverlayHook", label: "Asset Overlay Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "sports", "health", "gaming"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"text", role:"label", maxChars:20, order:1, x:5, y:6, width:90, height:7, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:48, fontWeight:600, color:"#ffffff", textAlign:"center", letterSpacing:"0.1em", opacity:0.8 } },
      { id:"z3", type:"text", role:"headline", maxChars:32, order:2, x:5, y:38, width:90, height:24, zIndex:3, start:0.2, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 28px rgba(0,0,0,0.95)", lineHeight:1.05 } },
      { id:"z4", type:"text", role:"subtext", maxChars:50, order:3, x:5, y:82, width:90, height:10, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:500, color:"#ffffff", textAlign:"center", textShadow:"0 2px 12px rgba(0,0,0,0.8)" } },
    ],
  },
 
  // Layout 5 — Top text block full width + large asset below + bottom subtext
  {
    id: "TopTextAssetHook", label: "Top Text Asset Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "education", "finance", "health", "lifestyle"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:30, order:1, x:4, y:4, width:92, height:16, zIndex:3, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z2", type:"asset", role:"primary_asset", order:1, x:4, y:22, width:92, height:58, zIndex:2, start:0.3, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:14 } },
      { id:"z3", type:"text", role:"subtext", maxChars:50, order:2, x:4, y:83, width:92, height:12, zIndex:3, start:0.6, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:56, fontWeight:600, color:"#ffffff", textAlign:"center" } },
    ],
  },

  {
    id: "AssetDominantHook", label: "Asset Dominant Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "sports", "gaming", "health"],
    assetCount: 1, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:78, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"text", role:"headline", maxChars:32, order:1, x:4, y:80, width:92, height:14, zIndex:3, start:0.3, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
    ],
  },
 
  // Layout 2 — Two assets split horizontally with divider + icon accents at split
  {
    id: "SplitDividerHook", label: "Split Divider Hook",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
    niche: ["entertainment", "gaming", "sports", "lifestyle"],
    assetCount: 2, textCount: 0, captionStrategy: "always",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:4, y:4, width:92, height:42, zIndex:1, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:4, y:54, width:92, height:42, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z3", type:"icon", role:"icon", order:1, x:2, y:45, width:10, height:8, zIndex:4, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
      { id:"z4", type:"icon", role:"icon", order:2, x:88, y:45, width:10, height:8, zIndex:4, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
    ],
  },
 
  // Layout 3 — Oval primary asset top-right + pill secondary asset bottom-left + 3 stacked text lines right
  {
    id: "OvalPillTextHook", label: "Oval Pill Text Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "health", "education"],
    assetCount: 2, textCount: 3, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:30, y:4, width:65, height:46, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:999 } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:4, y:52, width:42, height:30, zIndex:2, start:0.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:999 } },
      { id:"z3", type:"text", role:"headline", maxChars:18, order:1, x:50, y:54, width:46, height:10, zIndex:3, start:0.3, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:56, fontWeight:900, color:"#ffffff", textAlign:"left", lineHeight:1.1 } },
      { id:"z4", type:"text", role:"subtext", maxChars:22, order:2, x:50, y:66, width:46, height:8, zIndex:3, start:0.4, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:44, fontWeight:600, color:"#ffffff", textAlign:"left", opacity:0.85 } },
      { id:"z5", type:"text", role:"label", maxChars:18, order:3, x:50, y:76, width:46, height:6, zIndex:3, start:0.5, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:36, fontWeight:500, color:"#ffffff", textAlign:"left", opacity:0.7 } },
    ],
  },
 
  // Layout 4 — Large asset with decorative border frame + icon corner accents + label top
  {
    id: "FramedAssetHook", label: "Framed Asset Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "gaming", "sports", "finance"],
    assetCount: 1, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"label", maxChars:20, order:1, x:5, y:5, width:90, height:7, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:48, fontWeight:600, color:"#ffffff", textAlign:"center", letterSpacing:"0.1em", opacity:0.8 } },
      { id:"z2", type:"asset", role:"primary_asset", order:1, x:8, y:14, width:84, height:72, zIndex:2, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:12 } },
      { id:"z3", type:"decorative", role:"decorative", order:1, x:5, y:12, width:90, height:76, zIndex:3, start:0.1, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ borderRadius:14, opacity:1 } },
      { id:"z4", type:"icon", role:"icon", order:1, x:6, y:82, width:10, height:7, zIndex:4, start:0.4, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
      { id:"z5", type:"icon", role:"icon", order:2, x:84, y:14, width:10, height:7, zIndex:4, start:0.4, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
    ],
  },
 
  // Layout 5 — Circle masked asset top with ring decorative border + headline mid + 3 icon row bottom
  {
    id: "CircleRingHook", label: "Circle Ring Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "health", "education", "gaming"],
    assetCount: 1, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:22, y:4, width:56, height:32, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:999 } },
      { id:"z2", type:"decorative", role:"decorative", order:1, x:18, y:2, width:64, height:36, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ borderRadius:999, opacity:1 } },
      { id:"z3", type:"text", role:"headline", maxChars:30, order:1, x:5, y:42, width:90, height:22, zIndex:3, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z4", type:"icon", role:"icon", order:1, x:20, y:84, width:14, height:9, zIndex:4, start:0.5, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
      { id:"z5", type:"icon", role:"icon", order:2, x:43, y:84, width:14, height:9, zIndex:4, start:0.6, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
      { id:"z6", type:"icon", role:"icon", order:3, x:66, y:84, width:14, height:9, zIndex:4, start:0.7, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
    ],
  },

  {
    id: "TextAboveAssetHook", label: "Text Above Asset Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "education", "finance", "health", "lifestyle"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:5, y:6, width:88, height:14, zIndex:3, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:900, color:"#ffffff", textAlign:"left", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z2", type:"text", role:"subtext", maxChars:40, order:2, x:5, y:22, width:70, height:8, zIndex:3, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:500, color:"#ffffff", textAlign:"left", opacity:0.8 } },
      { id:"z3", type:"asset", role:"primary_asset", order:1, x:0, y:34, width:100, height:66, zIndex:1, start:0.3, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
    ],
  },
 
  // Layout 2 — Full asset bg + decorative curved top + label + large headline + subtext + decorative curved bottom
  {
    id: "CurvedFrameHook", label: "Curved Frame Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "health", "education", "gaming"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"decorative", role:"decorative", order:1, x:0, y:0, width:100, height:14, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ borderRadius:"0 0 50% 50%", opacity:1 } },
      { id:"z3", type:"text", role:"label", maxChars:18, order:1, x:5, y:15, width:90, height:7, zIndex:4, start:0.1, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:44, fontWeight:600, color:"#ffffff", textAlign:"center", letterSpacing:"0.1em", opacity:0.8 } },
      { id:"z4", type:"text", role:"headline", maxChars:32, order:2, x:5, y:28, width:90, height:26, zIndex:4, start:0.2, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:100, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 28px rgba(0,0,0,0.95)", lineHeight:1.05 } },
      { id:"z5", type:"text", role:"subtext", maxChars:40, order:3, x:5, y:58, width:90, height:8, zIndex:4, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:48, fontWeight:500, color:"#ffffff", textAlign:"center", opacity:0.85 } },
      { id:"z6", type:"decorative", role:"decorative", order:2, x:0, y:86, width:100, height:14, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ borderRadius:"50% 50% 0 0", opacity:1 } },
    ],
  },
 
  // Layout 3 — Two equal assets top row side by side + full-width headline mid + large asset bottom
  {
    id: "DuoTopAssetHook", label: "Duo Top Asset Hook",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
    niche: ["entertainment", "gaming", "sports", "lifestyle"],
    assetCount: 3, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:1, y:1, width:48, height:30, zIndex:1, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:10 } },
      { id:"z2", type:"asset", role:"secondary_asset", order:2, x:51, y:1, width:48, height:30, zIndex:1, start:0.15, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:10 } },
      { id:"z3", type:"text", role:"headline", maxChars:30, order:1, x:2, y:33, width:96, height:12, zIndex:3, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:88, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z4", type:"asset", role:"asset_3", order:3, x:1, y:47, width:98, height:52, zIndex:1, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:10 } },
    ],
  },
 
  // Layout 4 — Full asset top 70% + icon top-left + decorative curved bottom-right + headline text bottom
  {
    id: "AssetCurvedBottomHook", label: "Asset Curved Bottom Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "sports", "gaming", "health"],
    assetCount: 1, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:72, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
      { id:"z2", type:"icon", role:"icon", order:1, x:3, y:3, width:12, height:8, zIndex:4, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
      { id:"z3", type:"decorative", role:"decorative", order:1, x:40, y:62, width:60, height:30, zIndex:3, start:0.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ borderRadius:"50% 0 0 0", opacity:1 } },
      { id:"z4", type:"text", role:"headline", maxChars:28, order:1, x:4, y:75, width:88, height:18, zIndex:4, start:0.3, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:88, fontWeight:900, color:"#ffffff", textAlign:"left", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
    ],
  },
 
  // Layout 5 — Dark bg + 3 diagonal slash asset strips mid + label top + subtext bottom
  {
    id: "DiagonalSlashHook", label: "Diagonal Slash Hook",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
    niche: ["entertainment", "gaming", "sports", "finance"],
    assetCount: 3, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"label", maxChars:20, order:1, x:5, y:5, width:60, height:7, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:44, fontWeight:600, color:"#ffffff", textAlign:"left", letterSpacing:"0.08em", opacity:0.75 } },
      { id:"z2", type:"asset", role:"primary_asset", order:1, x:-10, y:22, width:120, height:18, zIndex:1, start:0.1, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0, transform:"skewY(-6deg)" } },
      { id:"z3", type:"asset", role:"secondary_asset", order:2, x:-10, y:42, width:120, height:18, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideRightIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0, transform:"skewY(-6deg)" } },
      { id:"z4", type:"asset", role:"asset_3", order:3, x:-10, y:62, width:120, height:18, zIndex:1, start:0.3, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0, transform:"skewY(-6deg)" } },
      { id:"z5", type:"text", role:"subtext", maxChars:40, order:2, x:5, y:86, width:90, height:8, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:600, color:"#ffffff", textAlign:"left", opacity:0.9 } },
    ],
  },

  {
    id: "AssetBarAccentHook", label: "Asset Bar Accent Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "education", "health"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      { id:"z1", type:"text", role:"headline", maxChars:28, order:1, x:5, y:5, width:90, height:14, zIndex:3, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:88, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z2", type:"text", role:"label", maxChars:16, order:2, x:1, y:24, width:7, height:46, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:28, fontWeight:700, color:"#ffffff", textAlign:"center", letterSpacing:"0.15em", opacity:1,
          writingMode:"vertical-rl", textOrientation:"mixed", borderRadius:40,
          background:"rgba(255,255,255,0.1)" } },
      { id:"z3", type:"asset", role:"primary_asset", order:1, x:10, y:24, width:78, height:46, zIndex:2, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z4", type:"text", role:"tagline", maxChars:16, order:3, x:91, y:24, width:7, height:46, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:28, fontWeight:700, color:"#ffffff", textAlign:"center", letterSpacing:"0.15em", opacity:1,
          writingMode:"vertical-rl", textOrientation:"mixed", borderRadius:40,
          background:"rgba(255,255,255,0.1)" } },
      { id:"z5", type:"icon", role:"icon", order:1, x:72, y:62, width:16, height:11, zIndex:4, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1, borderRadius:999 } },
      { id:"z6", type:"text", role:"subtext", maxChars:45, order:4, x:5, y:83, width:90, height:10, zIndex:3, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:500, color:"#ffffff", textAlign:"center", opacity:0.85 } },
    ],
  },
 
  // Layout 2 — Large rounded asset top 60% + headline mid overlapping + large asset bottom 35%
  {
    id: "DoubleAssetHeadlineHook", label: "Double Asset Headline Hook",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
    niche: ["entertainment", "gaming", "sports", "lifestyle"],
    assetCount: 2, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:3, y:2, width:94, height:52, zIndex:1, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:16 } },
      { id:"z2", type:"text", role:"headline", maxChars:28, order:1, x:4, y:48, width:92, height:14, zIndex:3, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:88, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 28px rgba(0,0,0,0.95)", lineHeight:1.05 } },
      { id:"z3", type:"asset", role:"secondary_asset", order:2, x:3, y:62, width:94, height:36, zIndex:1, start:0.2, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:16 } },
    ],
  },
 
  // Layout 3 — Arch/rounded-top shaped asset dominant + icon mid + headline text block lower
  {
    id: "ArchAssetHook", label: "Arch Asset Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "health", "education", "gaming"],
    assetCount: 1, textCount: 1, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:8, y:2, width:84, height:72, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:"999px 999px 16px 16px" } },
      { id:"z2", type:"icon", role:"icon", order:1, x:44, y:44, width:12, height:8, zIndex:4, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
      { id:"z3", type:"text", role:"headline", maxChars:28, order:1, x:8, y:56, width:84, height:16, zIndex:3, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:80, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
    ],
  },
 
  // Layout 4 — Oval asset center with ring decorative border + headline below + subtext below
  {
    id: "OvalRingPortraitHook", label: "Oval Ring Portrait Hook",
    intent: ["hook"], energy: ["medium", "high"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "health", "education"],
    assetCount: 1, textCount: 2, captionStrategy: "never",
    zones: [
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:18, y:6, width:64, height:46, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:999 } },
      { id:"z2", type:"decorative", role:"decorative", order:1, x:14, y:4, width:72, height:50, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ borderRadius:999, opacity:1 } },
      { id:"z3", type:"text", role:"headline", maxChars:30, order:1, x:5, y:60, width:90, height:18, zIndex:3, start:0.3, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:88, fontWeight:900, color:"#ffffff", textAlign:"center", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z4", type:"text", role:"subtext", maxChars:45, order:2, x:5, y:80, width:90, height:10, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:500, color:"#ffffff", textAlign:"center", opacity:0.85 } },
    ],
  },
 
  // Layout 5 — Icon top-left + 3 stacked text blocks right-aligned + icon bottom-left. No asset.
  {
    id: "TextStackIconHook", label: "Text Stack Icon Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["finance", "education", "health", "lifestyle", "entertainment"],
    assetCount: 0, textCount: 3, captionStrategy: "always",
    zones: [
      { id:"z1", type:"icon", role:"icon", order:1, x:4, y:4, width:12, height:8, zIndex:4, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
      { id:"z2", type:"text", role:"headline", maxChars:28, order:1, x:5, y:16, width:90, height:18, zIndex:3, start:0.1, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:900, color:"#ffffff", textAlign:"right", textShadow:"0 4px 24px rgba(0,0,0,0.9)", lineHeight:1.05 } },
      { id:"z3", type:"text", role:"subtext", maxChars:35, order:2, x:5, y:38, width:90, height:14, zIndex:3, start:0.3, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:72, fontWeight:700, color:"#ffffff", textAlign:"right", opacity:0.9, lineHeight:1.1 } },
      { id:"z4", type:"text", role:"label", maxChars:30, order:3, x:5, y:56, width:90, height:10, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:500, color:"#ffffff", textAlign:"right", opacity:0.75 } },
      { id:"z5", type:"icon", role:"icon", order:2, x:4, y:82, width:12, height:8, zIndex:4, start:0.6, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ opacity:1 } },
    ],
  },

  {
    id: "StarBadgePolaroidHook", label: "Star Badge Polaroid Hook",
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
    niche: ["entertainment", "lifestyle", "food", "sports", "education"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      // Star badge icon — top center, large, punchy
      { id:"z1", type:"icon", role:"icon", order:1, x:32, y:2, width:36, height:18, zIndex:5, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        iconify: { set:"ph", icon:"shooting-star-fill" },
        style:{ opacity:1 } },
 
      // Badge label text ON the star — "TOP 5"
      { id:"z2", type:"text", role:"label", maxChars:6, order:1, x:34, y:4, width:32, height:14, zIndex:6, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:88, fontWeight:900, color:"#ffffff", textAlign:"center", lineHeight:1.0,
          textShadow:"0 2px 8px rgba(0,0,0,0.5)" } },
 
      // Polaroid-framed asset — white border, slight rotation feel
      { id:"z3", type:"asset", role:"primary_asset", order:1, x:6, y:22, width:88, height:48, zIndex:2, start:0.2, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:8,
          outline:"12px solid #ffffff", outlineOffset:"-12px" } },
 
      // Italic serif headline — "moments" style
      { id:"z4", type:"text", role:"headline", maxChars:20, order:2, x:5, y:73, width:65, height:14, zIndex:3, start:0.4, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:700, fontStyle:"italic",
          fontFamily:"'Playfair Display', serif",
          color:"#1a1a1a", textAlign:"left", lineHeight:1.0 } },
 
      // Small pill label "OF" top right of headline
      { id:"z5", type:"text", role:"tagline", maxChars:4, order:3, x:72, y:76, width:20, height:8, zIndex:4, start:0.5, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:44, fontWeight:800, color:"#ffffff", textAlign:"center",
          background:"#ff4500", borderRadius:6, lineHeight:1.0 } },
 
      // Stat number left
      { id:"z6", type:"text", role:"stat", maxChars:4, order:4, x:5, y:86, width:28, height:12, zIndex:3, start:0.6, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:120, fontWeight:900, color:"#1a1a1a", textAlign:"left", lineHeight:1.0 } },
 
      // Divider decorative line
      { id:"z7", type:"decorative", role:"decorative", order:1, x:36, y:89, width:28, height:1, zIndex:3, start:0.6, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ background:"#1a1a1a", opacity:0.4, borderRadius:2 } },
 
      // Stat number right
      { id:"z8", type:"text", role:"stat", maxChars:4, order:5, x:67, y:86, width:28, height:12, zIndex:3, start:0.7, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:120, fontWeight:900, color:"#1a1a1a", textAlign:"right", lineHeight:1.0 } },
    ],
  },
 
  // Layout B — Editorial mixed-weight title + polaroid photo + accent badge + CTA strip bottom
  // Ref: "Step into History" screenshot
  {
    id: "EditorialPolaroidHook", label: "Editorial Polaroid Hook",
    intent: ["hook"], energy: ["medium", "high"], orientation: ["9:16"],
    niche: ["lifestyle", "travel", "education", "food", "entertainment"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      // Mixed-weight editorial headline — thin + bold combo
      { id:"z1", type:"text", role:"headline", maxChars:22, order:1, x:4, y:4, width:78, height:22, zIndex:3, start:0, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:112, fontWeight:900, fontFamily:"'Bebas Neue', sans-serif",
          color:"#ffffff", textAlign:"left", lineHeight:0.95,
          textShadow:"0 4px 24px rgba(0,0,0,0.8)" } },
 
      // Italic serif accent word overlapping headline
      { id:"z2", type:"text", role:"tagline", maxChars:12, order:2, x:28, y:16, width:68, height:14, zIndex:4, start:0.1, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:96, fontWeight:700, fontStyle:"italic",
          fontFamily:"'Playfair Display', serif",
          color:"#f5c518", textAlign:"right", lineHeight:1.0,
          textShadow:"0 2px 16px rgba(0,0,0,0.6)" } },
 
      // Wax seal / badge decorative — top right corner accent
      { id:"z3", type:"decorative", role:"decorative", order:1, x:80, y:2, width:18, height:12, zIndex:5, start:0, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ borderRadius:999, opacity:0.95 } },
 
      // Polaroid photo — white border frame
      { id:"z4", type:"asset", role:"primary_asset", order:1, x:5, y:30, width:90, height:48, zIndex:2, start:0.3, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:4,
          outline:"14px solid #ffffff", outlineOffset:"-14px" } },
 
      // Clip/pin decorative icon top center of photo
      { id:"z5", type:"icon", role:"icon", order:1, x:44, y:27, width:12, height:6, zIndex:5, start:0.2, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        iconify: { set:"ph", icon:"push-pin-fill" },
        style:{ opacity:1 } },
 
      // Stat/offer text — bold, large
      { id:"z6", type:"text", role:"stat", maxChars:8, order:3, x:4, y:81, width:38, height:10, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:120, fontWeight:900, color:"#ffffff", textAlign:"left", lineHeight:1.0 } },
 
      // Supporting label next to stat
      { id:"z7", type:"text", role:"subtext", maxChars:30, order:4, x:44, y:82, width:52, height:10, zIndex:3, start:0.6, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:600, color:"#ffffff", textAlign:"left",
          lineHeight:1.2, opacity:0.9 } },
 
      // Bottom CTA strip — dark pill
      { id:"z8", type:"text", role:"label", maxChars:35, order:5, x:4, y:92, width:92, height:7, zIndex:3, start:0.7, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:36, fontWeight:600, color:"#ffffff", textAlign:"center",
          background:"rgba(0,0,0,0.7)", borderRadius:40,
          letterSpacing:"0.08em", opacity:0.9 } },
    ],
  },
 
  // Layout C — Giant number dominant center + icon accent + subtext strip bottom
  // Pure stat/number hook — finance, sports, education
  {
    id: "GiantStatCenterHook", label: "Giant Stat Center Hook",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
    niche: ["finance", "education", "sports", "health", "tech"],
    assetCount: 0, textCount: 3, captionStrategy: "always",
    zones: [
      // Small label top
      { id:"z1", type:"text", role:"label", maxChars:20, order:1, x:5, y:6, width:90, height:7, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:48, fontWeight:600, color:"#ffffff", textAlign:"center",
          letterSpacing:"0.15em", opacity:0.7, textTransform:"uppercase" } },
 
      // Giant dominant number — floods 50% of frame
      { id:"z2", type:"text", role:"stat", maxChars:6, order:2, x:2, y:18, width:96, height:52, zIndex:3, start:0.2, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        style:{ fontSize:280, fontWeight:900, fontFamily:"'Bebas Neue', sans-serif",
          color:"#ffffff", textAlign:"center", lineHeight:0.9,
          textShadow:"0 8px 48px rgba(0,0,0,0.9)" } },
 
      // Icon accent — sits at bottom of the number
      { id:"z3", type:"icon", role:"icon", order:1, x:42, y:68, width:16, height:10, zIndex:4, start:0.4, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        iconify: { set:"ph", icon:"trend-up-bold" },
        style:{ opacity:1 } },
 
      // Subtext explanation
      { id:"z4", type:"text", role:"subtext", maxChars:45, order:3, x:5, y:80, width:90, height:14, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:64, fontWeight:700, color:"#ffffff", textAlign:"center",
          lineHeight:1.15, textShadow:"0 2px 12px rgba(0,0,0,0.8)" } },
    ],
  },
 
  // Layout D — Asset left half + stacked text right half + icon row bottom
  // Side-by-side editorial — magazine split
  {
    id: "MagazineSplitHook", label: "Magazine Split Hook",
    intent: ["hook"], energy: ["medium", "high"], orientation: ["9:16"],
    niche: ["lifestyle", "fashion", "food", "travel", "health", "entertainment"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      // Left half asset — tall portrait
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:48, height:82, zIndex:1, start:0, end:null,
        enterAnimation:"slideLeftIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
 
      // Vertical decorative rule between split
      { id:"z2", type:"decorative", role:"decorative", order:1, x:47, y:5, width:1, height:72, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ opacity:0.5, borderRadius:2 } },
 
      // Small label top right
      { id:"z3", type:"text", role:"label", maxChars:16, order:1, x:51, y:5, width:46, height:7, zIndex:3, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:40, fontWeight:600, color:"#ffffff", textAlign:"left",
          letterSpacing:"0.12em", opacity:0.65, textTransform:"uppercase" } },
 
      // Large headline right — left aligned
      { id:"z4", type:"text", role:"headline", maxChars:22, order:2, x:51, y:14, width:46, height:42, zIndex:3, start:0.2, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:108, fontWeight:900, fontFamily:"'Bebas Neue', sans-serif",
          color:"#ffffff", textAlign:"left", lineHeight:0.95,
          textShadow:"0 4px 24px rgba(0,0,0,0.9)" } },
 
      // Subtext right
      { id:"z5", type:"text", role:"subtext", maxChars:40, order:3, x:51, y:58, width:46, height:20, zIndex:3, start:0.4, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:52, fontWeight:500, fontStyle:"italic",
          fontFamily:"'Playfair Display', serif",
          color:"#ffffff", textAlign:"left", lineHeight:1.3, opacity:0.85 } },
 
      // Bottom full-width strip
      { id:"z6", type:"decorative", role:"decorative", order:2, x:0, y:84, width:100, height:10, zIndex:2, start:0, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ opacity:1, borderRadius:0 } },
 
      // Icon on bottom strip
      { id:"z7", type:"icon", role:"icon", order:1, x:4, y:85, width:10, height:8, zIndex:4, start:0.5, end:null,
        enterAnimation:"popIn", exitAnimation:"none",
        iconify: { set:"ph", icon:"arrow-circle-right-fill" },
        style:{ opacity:1 } },
    ],
  },
 
  // Layout E — Full bleed asset + bold outline text top + semi-transparent pill bottom
  // Cinematic poster style — Bebas + thin italic serif combo
  {
    id: "CinematicPosterHook", label: "Cinematic Poster Hook",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
    niche: ["entertainment", "gaming", "sports", "travel", "lifestyle"],
    assetCount: 1, textCount: 3, captionStrategy: "never",
    zones: [
      // Full bleed asset
      { id:"z1", type:"asset", role:"primary_asset", order:1, x:0, y:0, width:100, height:100, zIndex:1, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ objectFit:"cover", borderRadius:0 } },
 
      // Dark gradient overlay top — decorative
      { id:"z2", type:"decorative", role:"decorative", order:1, x:0, y:0, width:100, height:35, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ background:"linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
          opacity:1, borderRadius:0 } },
 
      // Dark gradient overlay bottom — decorative
      { id:"z3", type:"decorative", role:"decorative", order:2, x:0, y:65, width:100, height:35, zIndex:2, start:0, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ background:"linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)",
          opacity:1, borderRadius:0 } },
 
      // Outline headline — giant, top area
      { id:"z4", type:"text", role:"headline", maxChars:20, order:1, x:4, y:5, width:92, height:28, zIndex:3, start:0.2, end:null,
        enterAnimation:"slideDownIn", exitAnimation:"none",
        style:{ fontSize:140, fontWeight:900, fontFamily:"'Bebas Neue', sans-serif",
          color:"transparent", textAlign:"left", lineHeight:0.92,
          WebkitTextStroke:"3px #ffffff",
          textShadow:"none" } },
 
      // Italic serif accent — overlaps headline bottom edge
      { id:"z5", type:"text", role:"tagline", maxChars:16, order:2, x:4, y:28, width:88, height:12, zIndex:4, start:0.3, end:null,
        enterAnimation:"fadeIn", exitAnimation:"none",
        style:{ fontSize:80, fontWeight:400, fontStyle:"italic",
          fontFamily:"'Cormorant Garamond', serif",
          color:"#f5c518", textAlign:"left", lineHeight:1.0 } },
 
      // Bottom semi-transparent pill — subtext
      { id:"z6", type:"text", role:"subtext", maxChars:50, order:3, x:4, y:82, width:92, height:14, zIndex:3, start:0.5, end:null,
        enterAnimation:"slideUpIn", exitAnimation:"none",
        style:{ fontSize:56, fontWeight:600, color:"#ffffff", textAlign:"left",
          lineHeight:1.2, background:"rgba(0,0,0,0.55)",
          borderRadius:12, paddingLeft:16, paddingRight:16 } },
    ],
  },

  // 5 — Headline reveals first, then asset zooms in
  {
    id: "HeadlineReveal", label: "Headline Reveal",
    intent: ["hook"], energy: ["high"], orientation: ["9:16"],
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
    intent: ["hook"], energy: ["high", "medium"], orientation: ["9:16"],
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
