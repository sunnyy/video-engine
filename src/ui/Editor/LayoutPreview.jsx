/**
 * LayoutPreview.jsx
 * src/ui/Editor/LayoutPreview.jsx
 *
 * Renders a 9:16 thumbnail of the layout zone structure.
 * Used in LayoutSelector grid.
 */
import React from "react";

const ZA = "#2a2a3e";
const ZB = "#35354a";
const ZC = "#424258";
const ZD = "#505068";

export default function LayoutPreview({ layout, isActive = false }) {

  const render = () => {
    switch (layout) {

      case "FullZone":
        return <div style={{ width:"100%", height:"100%", background: ZA }} />;

      case "SplitZone":
        return (
          <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:1, background: ZA }} />
            <div style={{ flex:1, background: ZB }} />
          </div>
        );

      case "ThreeZone":
        return (
          <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:1, background: ZA }} />
            <div style={{ flex:1, background: ZB }} />
            <div style={{ flex:1, background: ZC }} />
          </div>
        );

      case "TwoTopOneBottom":
        return (
          <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:1, display:"flex", gap:2 }}>
              <div style={{ flex:1, background: ZA }} />
              <div style={{ flex:1, background: ZB }} />
            </div>
            <div style={{ flex:1, background: ZC }} />
          </div>
        );

      case "OneTopTwoBottom":
        return (
          <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:1, background: ZA }} />
            <div style={{ flex:1, display:"flex", gap:2 }}>
              <div style={{ flex:1, background: ZB }} />
              <div style={{ flex:1, background: ZC }} />
            </div>
          </div>
        );

      case "FourGrid":
        return (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr", width:"100%", height:"100%", gap:2 }}>
            <div style={{ background: ZA }} />
            <div style={{ background: ZB }} />
            <div style={{ background: ZC }} />
            <div style={{ background: ZD }} />
          </div>
        );

      case "SixGrid":
        return (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr 1fr", width:"100%", height:"100%", gap:2 }}>
            {[ZA,ZB,ZC,ZD,ZA,ZB].map((bg,i) => (
              <div key={i} style={{ background: bg }} />
            ))}
          </div>
        );

      case "BigTopSmallBottom":
        return (
          <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:3, background: ZA }} />
            <div style={{ flex:1, display:"flex", gap:2 }}>
              <div style={{ flex:1, background: ZB }} />
              <div style={{ flex:1, background: ZC }} />
            </div>
          </div>
        );

      case "SmallTopBigBottom":
        return (
          <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:1, display:"flex", gap:2 }}>
              <div style={{ flex:1, background: ZA }} />
              <div style={{ flex:1, background: ZB }} />
            </div>
            <div style={{ flex:3, background: ZC }} />
          </div>
        );

      case "LeftHeavy":
        return (
          <div style={{ display:"flex", flexDirection:"row", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:2, background: ZA }} />
            <div style={{ flex:1, background: ZB }} />
          </div>
        );

      case "RightHeavy":
        return (
          <div style={{ display:"flex", flexDirection:"row", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:1, background: ZA }} />
            <div style={{ flex:2, background: ZB }} />
          </div>
        );

      case "PictureInPicture":
        return (
          <div style={{ position:"relative", width:"100%", height:"100%", background: ZA }}>
            <div style={{
              position:"absolute", bottom:4, right:4,
              width:"38%", height:"26%",
              background: ZD,
              border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:2,
            }} />
          </div>
        );

      case "FloatingAvatar":
        return (
          <div style={{ position:"relative", width:"100%", height:"100%", background: ZA }}>
            <div style={{
              position:"absolute", bottom:"10%", left:"50%",
              transform:"translateX(-50%)",
              width:"55%", height:"45%",
              background: ZC,
              border:"1px solid rgba(255,255,255,0.10)",
              borderRadius:3,
            }} />
          </div>
        );

      case "SideAvatar":
        return (
          <div style={{ display:"flex", flexDirection:"row", width:"100%", height:"100%", gap:2 }}>
            <div style={{ flex:1, background: ZA }} />
            <div style={{ flex:1, background: ZB }} />
          </div>
        );

      case "CenterAvatar":
        return (
          <div style={{ position:"relative", width:"100%", height:"100%", background: ZA }}>
            <div style={{
              position:"absolute", top:"15%", left:"15%", right:"15%", bottom:"15%",
              background: ZC,
              border:"1px solid rgba(255,255,255,0.10)",
              borderRadius:3,
            }} />
          </div>
        );

      default:
        return <div style={{ width:"100%", height:"100%", background: ZC }} />;
    }
  };

  return (
    <div style={{
      width:        "100%",
      paddingTop:   "177.78%", // 9:16
      position:     "relative",
      borderRadius: 6,
      overflow:     "hidden",
      background:   "#0b0b10",
      border:       isActive
        ? "1.5px solid #f5c518"
        : "1px solid rgba(255,255,255,0.07)",
      boxShadow:    isActive ? "0 0 0 1px #f5c51840" : "none",
    }}>
      <div style={{ position:"absolute", inset:0 }}>
        {render()}
      </div>
    </div>
  );
}