import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function SideAvatar({
  zones,
  components,
  beat,
  project,
  layoutMeta
}) {

  const background = zones?.z1;
  const avatar = zones?.z2;

  const layoutPadding = beat?.layoutPadding || 0;

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

      <LayoutBackgroundRenderer background={beat?.layoutBackground} />

      {/* Background zone */}

      <div
        style={{
          position: "absolute",
          inset: 0
        }}
      >
        <LayoutZoneRenderer
          zone={background}
          slot="z1"
          beat={beat}
          project={project}
          components={components}
          layoutMeta={layoutMeta}
        />
      </div>

      {/* Avatar zone */}

      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 420,
          height: "100%",
          zIndex: 10
        }}
      >
        <LayoutZoneRenderer
          zone={avatar}
          slot="z2"
          beat={beat}
          project={project}
          components={components}
          layoutMeta={layoutMeta}
        />
      </div>

    </div>
  );
}