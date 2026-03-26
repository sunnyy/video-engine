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
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        padding: layoutPadding
      }}
    >

      <LayoutBackgroundRenderer background={beat?.layoutBackground} />

      {isVertical ? (

        <>
          {/* TOP */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "50%"
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

          {/* BOTTOM */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "50%"
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
          {/* LEFT */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "50%",
              height: "100%"
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

          {/* RIGHT */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "50%",
              height: "100%"
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