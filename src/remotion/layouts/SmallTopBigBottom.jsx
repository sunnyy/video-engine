import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function SmallTopBigBottom({ zones, components, beat, project, layoutMeta }) {
  const p = beat?.layoutPadding || 0;
  if (!zones) return null;

  return (
    <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden" }}>
      <LayoutBackgroundRenderer background={beat?.layoutBackground} beat={beat} />
      <div style={{ position:"absolute", inset:p, display:"flex", flexDirection:"column", gap:2 }}>

        {/* Top — 40%, two equal zones */}
        <div style={{ flex:2, display:"flex", gap:2 }}>
          <div style={{ flex:1 }}>
            <LayoutZoneRenderer
              zone={zones.z1} slot="z1"
              beat={beat} project={project}
              components={components} layoutMeta={layoutMeta}
            />
          </div>
          <div style={{ flex:1 }}>
            <LayoutZoneRenderer
              zone={zones.z2} slot="z2"
              beat={beat} project={project}
              components={components} layoutMeta={layoutMeta}
            />
          </div>
        </div>

        {/* Bottom — 60% */}
        <div style={{ flex:3 }}>
          <LayoutZoneRenderer
            zone={zones.z3} slot="z3"
            beat={beat} project={project}
            components={components} layoutMeta={layoutMeta}
          />
        </div>

      </div>
    </div>
  );
}