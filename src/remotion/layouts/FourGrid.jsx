import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function FourGrid({
  zones,
  components,
  beat,
  project,
  layoutMeta
}) {

  const layoutPadding = beat?.layoutPadding || 0;

  if (!zones) return null;

  const entries = Object.entries(zones);

  return (

    <div
      style={{
        width:"100%",
        height:"100%",
        position:"relative",
        overflow:"hidden"
      }}
    >

      <LayoutBackgroundRenderer
        background={beat?.layoutBackground}
        beat={beat}
      />

      <div
        style={{
          position:"absolute",
          inset:layoutPadding,
          display:"grid",
          gridTemplateColumns:"1fr 1fr",
          gridTemplateRows:"1fr 1fr"
        }}
      >

        {entries.map(([slot,zone]) => (

          <LayoutZoneRenderer
            key={slot}
            zone={zone}
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