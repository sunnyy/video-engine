import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function FullZone({
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
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        padding: layoutPadding
      }}
    >

      <LayoutBackgroundRenderer
        background={beat?.layoutBackground}
        beat={beat}
      />

      {Object.entries(zones).map(([slot, zone]) => (
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
  );
}