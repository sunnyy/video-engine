import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function PictureInPicture({
  zones,
  components,
  beat,
  project,
  layoutMeta
}) {

  const background = zones?.z1;
  const pip = zones?.z2;

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

      {/* PIP zone */}

      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: 40,
          width: "32%",
          aspectRatio: "9/16",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          zIndex: 20
        }}
      >
        <LayoutZoneRenderer
          zone={pip}
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