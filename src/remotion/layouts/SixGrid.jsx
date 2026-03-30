import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function SixGrid({ zones, components, beat, project, layoutMeta }) {
  const p = beat?.layoutPadding || 0;
  if (!zones) return null;

  const slots = ["z1","z2","z3","z4","z5","z6"];

  return (
    <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden" }}>
      <LayoutBackgroundRenderer background={beat?.layoutBackground} beat={beat} />
      <div style={{ position:"absolute", inset:p, display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr 1fr", gap:2 }}>
        {slots.map(slot => (
          <LayoutZoneRenderer
            key={slot}
            zone={zones[slot]}
            slot={slot}
            beat={beat}
            project={project}
            components={components}
            layoutMeta={layoutMeta}
          />
        ))}
      </div>
    </div>
  );
}