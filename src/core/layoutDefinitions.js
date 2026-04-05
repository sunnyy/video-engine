/**
 * layoutDefinitions.js
 * src/core/layoutDefinitions.js
 *
 * captionStrategy:
 *   "always" — pure asset layouts, captions render on top freely
 *   "never"  — layout has text zones which serve as the captions
 */

export const layoutDefinitions = {

  FullBleed: {
    id:"FullBleed", label:"Full Bleed",
    intent:["hook","scene","cta"], energy:["low","medium","high"],
    orientation:["9:16","16:9"], assetCount:1, textCount:0,
    captionStrategy:"always",
    zones:[{
      id:"z1",type:"asset",order:1,x:0,y:0,width:100,height:100,zIndex:1,start:0,end:null,
      enterAnimation:"fadeIn",exitAnimation:"none",style:{objectFit:"cover"}
    }]
  },

  HeadlineOverAsset: {
    id:"HeadlineOverAsset", label:"Headline Over Asset",
    intent:["hook","stat","cta"], energy:["medium","high"],
    orientation:["9:16","16:9"], assetCount:1, textCount:1,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:0,width:100,height:100,zIndex:1,start:0,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z2",type:"text",order:1,x:5,y:60,width:90,height:35,zIndex:2,start:0.3,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:52,fontWeight:800,color:"#ffffff",textAlign:"center",textShadow:"0 2px 12px rgba(0,0,0,0.8)"}}
    ]
  },

  SplitAssets: {
    id:"SplitAssets", label:"Split Assets",
    intent:["comparison","list","proof"], energy:["medium","high"],
    orientation:["9:16","16:9"], assetCount:2, textCount:0,
    captionStrategy:"always",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:0,width:50,height:100,zIndex:1,start:0,end:null,enterAnimation:"slideRightIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z2",type:"asset",order:2,x:50,y:0,width:50,height:100,zIndex:1,start:0.15,end:null,enterAnimation:"slideLeftIn",exitAnimation:"none",style:{objectFit:"cover"}}
    ]
  },

  ThreeStack: {
    id:"ThreeStack", label:"Three Stack",
    intent:["list","proof","showcase"], energy:["low","medium"],
    orientation:["9:16"], assetCount:3, textCount:0,
    captionStrategy:"always",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:0,width:100,height:33.33,zIndex:1,start:0,end:null,enterAnimation:"slideDownIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z2",type:"asset",order:2,x:0,y:33.33,width:100,height:33.33,zIndex:1,start:0.2,end:null,enterAnimation:"slideDownIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z3",type:"asset",order:3,x:0,y:66.66,width:100,height:33.34,zIndex:1,start:0.4,end:null,enterAnimation:"slideDownIn",exitAnimation:"none",style:{objectFit:"cover"}}
    ]
  },

  HeadlineReveal: {
    id:"HeadlineReveal", label:"Headline Reveal",
    intent:["hook","stat","reveal"], energy:["high"],
    orientation:["9:16"], assetCount:1, textCount:2,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"text",order:1,x:5,y:35,width:90,height:30,zIndex:3,start:0,end:1.8,enterAnimation:"popIn",exitAnimation:"slideUpOut",style:{fontSize:64,fontWeight:900,color:"#ffffff",textAlign:"center",textShadow:"0 4px 24px rgba(0,0,0,0.9)"}},
      {id:"z2",type:"asset",order:1,x:5,y:5,width:90,height:75,zIndex:2,start:1.6,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:16}},
      {id:"z3",type:"text",order:2,x:5,y:82,width:90,height:15,zIndex:3,start:2.2,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:28,fontWeight:600,color:"#ffffff",textAlign:"center",opacity:0.85}}
    ]
  },

  FourCollage: {
    id:"FourCollage", label:"Four Collage",
    intent:["showcase","list","proof"], energy:["medium","high"],
    orientation:["9:16"], assetCount:4, textCount:1,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"text",order:1,x:5,y:3,width:90,height:12,zIndex:4,start:0,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{fontSize:32,fontWeight:700,color:"#ffffff",textAlign:"center",textShadow:"0 2px 8px rgba(0,0,0,0.7)"}},
      {id:"z2",type:"asset",order:1,x:1,y:16,width:48,height:38,zIndex:2,start:0.2,end:null,enterAnimation:"slideRightIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:12}},
      {id:"z3",type:"asset",order:2,x:51,y:16,width:48,height:38,zIndex:2,start:0.4,end:null,enterAnimation:"slideLeftIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:12}},
      {id:"z4",type:"asset",order:3,x:1,y:55,width:48,height:38,zIndex:2,start:0.6,end:null,enterAnimation:"slideRightIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:12}},
      {id:"z5",type:"asset",order:4,x:51,y:55,width:48,height:38,zIndex:2,start:0.8,end:null,enterAnimation:"slideLeftIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:12}}
    ]
  },

  CinematicLowerThird: {
    id:"CinematicLowerThird", label:"Cinematic Lower Third",
    intent:["hook","scene","reveal"], energy:["low","medium"],
    orientation:["9:16","16:9"], assetCount:1, textCount:2,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:0,width:100,height:100,zIndex:1,start:0,end:null,enterAnimation:"scaleIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z2",type:"text",order:1,x:5,y:68,width:90,height:20,zIndex:3,start:0.5,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:54,fontWeight:900,color:"#ffffff",textAlign:"left",textShadow:"0 2px 16px rgba(0,0,0,0.9)",letterSpacing:"-1px"}},
      {id:"z3",type:"text",order:2,x:5,y:88,width:70,height:9,zIndex:3,start:0.9,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{fontSize:22,fontWeight:500,color:"#ffffff",textAlign:"left",opacity:0.75}}
    ]
  },

  SideBySide: {
    id:"SideBySide", label:"Side By Side",
    intent:["comparison","list","proof","stat"], energy:["medium"],
    orientation:["9:16"], assetCount:1, textCount:2,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:20,width:50,height:60,zIndex:1,start:0,end:null,enterAnimation:"slideRightIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:16}},
      {id:"z2",type:"text",order:1,x:53,y:28,width:44,height:25,zIndex:2,start:0.3,end:null,enterAnimation:"slideLeftIn",exitAnimation:"none",style:{fontSize:36,fontWeight:800,color:"#ffffff",textAlign:"left",lineHeight:1.1}},
      {id:"z3",type:"text",order:2,x:53,y:56,width:44,height:20,zIndex:2,start:0.6,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{fontSize:20,fontWeight:400,color:"#ffffff",textAlign:"left",opacity:0.75,lineHeight:1.4}}
    ]
  },

  BigQuote: {
    id:"BigQuote", label:"Big Quote",
    intent:["hook","stat","cta","reveal"], energy:["high"],
    orientation:["9:16"], assetCount:0, textCount:2,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"text",order:1,x:6,y:25,width:88,height:42,zIndex:2,start:0,end:null,enterAnimation:"popIn",exitAnimation:"none",style:{fontSize:72,fontWeight:900,color:"#ffffff",textAlign:"center",lineHeight:1.0,letterSpacing:"-2px"}},
      {id:"z2",type:"text",order:2,x:10,y:70,width:80,height:14,zIndex:2,start:0.6,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{fontSize:24,fontWeight:500,color:"#ffffff",textAlign:"center",opacity:0.7}}
    ]
  },

  NumberHook: {
    id:"NumberHook", label:"Number Hook",
    intent:["hook","list","stat"], energy:["high"],
    orientation:["9:16"], assetCount:1, textCount:2,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:0,width:100,height:100,zIndex:1,start:0,end:null,enterAnimation:"scaleIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z2",type:"text",order:1,x:5,y:18,width:90,height:48,zIndex:3,start:0,end:null,enterAnimation:"popIn",exitAnimation:"none",style:{fontSize:160,fontWeight:900,color:"#ffffff",textAlign:"center",lineHeight:1.0,letterSpacing:"-4px",textShadow:"0 8px 40px rgba(0,0,0,0.8)"}},
      {id:"z3",type:"text",order:2,x:5,y:66,width:90,height:22,zIndex:3,start:0.4,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:38,fontWeight:700,color:"#ffffff",textAlign:"center",textShadow:"0 2px 12px rgba(0,0,0,0.8)"}}
    ]
  },

  ListReveal: {
    id:"ListReveal", label:"List Reveal",
    intent:["list","proof","cta"], energy:["medium","high"],
    orientation:["9:16"], assetCount:0, textCount:4,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"text",order:1,x:6,y:8,width:88,height:16,zIndex:2,start:0,end:null,enterAnimation:"slideDownIn",exitAnimation:"none",style:{fontSize:40,fontWeight:800,color:"#ffffff",textAlign:"center"}},
      {id:"z2",type:"text",order:2,x:6,y:30,width:88,height:16,zIndex:2,start:0.4,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:30,fontWeight:600,color:"#ffffff",textAlign:"left",background:"rgba(255,255,255,0.1)",borderRadius:12}},
      {id:"z3",type:"text",order:3,x:6,y:50,width:88,height:16,zIndex:2,start:0.8,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:30,fontWeight:600,color:"#ffffff",textAlign:"left",background:"rgba(255,255,255,0.1)",borderRadius:12}},
      {id:"z4",type:"text",order:4,x:6,y:70,width:88,height:16,zIndex:2,start:1.2,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:30,fontWeight:600,color:"#ffffff",textAlign:"left",background:"rgba(255,255,255,0.1)",borderRadius:12}}
    ]
  },

  AssetWithList: {
    id:"AssetWithList", label:"Asset With List",
    intent:["list","proof","showcase"], energy:["medium"],
    orientation:["9:16"], assetCount:1, textCount:3,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:0,width:100,height:45,zIndex:1,start:0,end:null,enterAnimation:"scaleIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z2",type:"text",order:1,x:6,y:48,width:88,height:13,zIndex:2,start:0.3,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:30,fontWeight:700,color:"#ffffff",textAlign:"left"}},
      {id:"z3",type:"text",order:2,x:6,y:63,width:88,height:13,zIndex:2,start:0.6,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:30,fontWeight:700,color:"#ffffff",textAlign:"left"}},
      {id:"z4",type:"text",order:3,x:6,y:78,width:88,height:13,zIndex:2,start:0.9,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:30,fontWeight:700,color:"#ffffff",textAlign:"left"}}
    ]
  },

  SplitTextAsset: {
    id:"SplitTextAsset", label:"Split Text Asset",
    intent:["hook","stat","cta"], energy:["high"],
    orientation:["9:16"], assetCount:1, textCount:2,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"text",order:1,x:3,y:15,width:55,height:50,zIndex:2,start:0,end:null,enterAnimation:"slideRightIn",exitAnimation:"none",style:{fontSize:56,fontWeight:900,color:"#ffffff",textAlign:"left",lineHeight:1.0,letterSpacing:"-1px"}},
      {id:"z2",type:"asset",order:1,x:55,y:10,width:44,height:55,zIndex:1,start:0.2,end:null,enterAnimation:"slideLeftIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:20}},
      {id:"z3",type:"text",order:2,x:3,y:68,width:90,height:14,zIndex:2,start:0.5,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{fontSize:22,fontWeight:500,color:"#ffffff",textAlign:"left",opacity:0.7}}
    ]
  },

  StackedDuo: {
    id:"StackedDuo", label:"Stacked Duo",
    intent:["comparison","showcase","hook"], energy:["medium","high"],
    orientation:["9:16"], assetCount:2, textCount:1,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"asset",order:1,x:0,y:0,width:100,height:46,zIndex:1,start:0,end:null,enterAnimation:"slideDownIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z2",type:"asset",order:2,x:0,y:54,width:100,height:46,zIndex:1,start:0.2,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{objectFit:"cover"}},
      {id:"z3",type:"text",order:1,x:5,y:43,width:90,height:14,zIndex:3,start:0.4,end:null,enterAnimation:"popIn",exitAnimation:"none",style:{fontSize:36,fontWeight:800,color:"#ffffff",textAlign:"center",textShadow:"0 2px 12px rgba(0,0,0,0.9)"}}
    ]
  },

  Magazine: {
    id:"Magazine", label:"Magazine",
    intent:["hook","reveal","showcase"], energy:["low","medium"],
    orientation:["9:16"], assetCount:1, textCount:2,
    captionStrategy:"never",
    zones:[
      {id:"z1",type:"asset",order:1,x:48,y:5,width:50,height:52,zIndex:1,start:0,end:null,enterAnimation:"fadeIn",exitAnimation:"none",style:{objectFit:"cover",borderRadius:16}},
      {id:"z2",type:"text",order:1,x:4,y:8,width:44,height:44,zIndex:2,start:0.2,end:null,enterAnimation:"slideRightIn",exitAnimation:"none",style:{fontSize:52,fontWeight:900,color:"#ffffff",textAlign:"left",lineHeight:1.0,letterSpacing:"-1px"}},
      {id:"z3",type:"text",order:2,x:4,y:62,width:92,height:28,zIndex:2,start:0.5,end:null,enterAnimation:"slideUpIn",exitAnimation:"none",style:{fontSize:26,fontWeight:400,color:"#ffffff",textAlign:"left",opacity:0.8,lineHeight:1.5}}
    ]
  },

};