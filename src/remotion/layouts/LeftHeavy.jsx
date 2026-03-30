import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function LeftHeavy({ zones, components, beat, project, layoutMeta }) {
  const p = beat?.layoutPadding || 0;
  if (!zones) return null;

  return (
    <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden" }}>
      <LayoutBackgroundRenderer background={beat?.layoutBackground} beat={beat} />
      <div style={{ position:"absolute", inset:p, display:"flex", flexDirection:"row", gap:2 }}>

        {/* Left — 65% */}
        <div style={{ flex:65 }}>
          <LayoutZoneRenderer
            zone={zones.z1} slot="z1"
            beat={beat} project={project}
            components={components} layoutMeta={layoutMeta}
          />
        </div>

        {/* Right — 35% */}
        <div style={{ flex:35 }}>
          <LayoutZoneRenderer
            zone={zones.z2} slot="z2"
            beat={beat} project={project}
            components={components} layoutMeta={layoutMeta}
          />
        </div>

      </div>
    </div>
  );
}