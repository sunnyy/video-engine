import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function TwoTopOneBottom({
  zones,
  components,
  beat,
  project,
  layoutMeta
}) {

  const layoutPadding = beat?.layoutPadding || 0;

  if (!zones) return null;

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
          inset:layoutPadding
        }}
      >

        <div style={{ display:"flex", height:"50%" }}>

          <div style={{ flex:1 }}>
            <LayoutZoneRenderer
              zone={zones.z1}
              slot="z1"
              beat={beat}
              project={project}
              components={components}
              layoutMeta={layoutMeta}
            />
          </div>

          <div style={{ flex:1 }}>
            <LayoutZoneRenderer
              zone={zones.z2}
              slot="z2"
              beat={beat}
              project={project}
              components={components}
              layoutMeta={layoutMeta}
            />
          </div>

        </div>

        <div style={{ height:"50%" }}>
          <LayoutZoneRenderer
            zone={zones.z3}
            slot="z3"
            beat={beat}
            project={project}
            components={components}
            layoutMeta={layoutMeta}
          />
        </div>

      </div>

    </div>

  );

}