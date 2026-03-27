import React from "react";
import LayoutZoneRenderer from "./LayoutZoneRenderer";
import LayoutBackgroundRenderer from "./LayoutBackgroundRenderer";

export default function SplitZone({
  zones,
  components,
  beat,
  project,
  layoutMeta
}) {

  const layoutPadding = beat?.layoutPadding || 0;

  const orientation = project?.meta?.orientation || "9:16";
  const isVertical = orientation === "9:16";

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

      {isVertical ? (

        <>

          <div
            style={{
              position:"absolute",
              left:layoutPadding,
              right:layoutPadding,
              top:layoutPadding,
              height:`calc(50% - ${layoutPadding}px)`
            }}
          >
            <LayoutZoneRenderer
              zone={zones.z1}
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
              left:layoutPadding,
              right:layoutPadding,
              bottom:layoutPadding,
              height:`calc(50% - ${layoutPadding}px)`
            }}
          >
            <LayoutZoneRenderer
              zone={zones.z2}
              slot="z2"
              beat={beat}
              project={project}
              components={components}
              layoutMeta={layoutMeta}
            />
          </div>

        </>

      ) : (

        <>

          <div
            style={{
              position:"absolute",
              top:layoutPadding,
              bottom:layoutPadding,
              left:layoutPadding,
              width:`calc(50% - ${layoutPadding}px)`
            }}
          >
            <LayoutZoneRenderer
              zone={zones.z1}
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
              top:layoutPadding,
              bottom:layoutPadding,
              right:layoutPadding,
              width:`calc(50% - ${layoutPadding}px)`
            }}
          >
            <LayoutZoneRenderer
              zone={zones.z2}
              slot="z2"
              beat={beat}
              project={project}
              components={components}
              layoutMeta={layoutMeta}
            />
          </div>

        </>

      )}

    </div>

  );

}