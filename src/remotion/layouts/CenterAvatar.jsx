import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function CenterAvatar({
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

        <LayoutZoneRenderer
          zone={background}
          slot="z1"
          beat={beat}
          project={project}
          components={components}
          layoutMeta={layoutMeta}
        />

      </div>

      <div
        style={{
          position:"absolute",
          left:"50%",
          bottom:layoutPadding,
          transform:"translateX(-50%)",
          width:520,
          height:`calc(100% - ${layoutPadding * 2}px)`,
          zIndex:10
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