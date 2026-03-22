import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function SplitZone({
  zones,
  heading,
  components,
  beat,
  project,
  layoutMeta
}) {

  const z1 = zones?.z1;
  const z2 = zones?.z2;

  const headingSafe = layoutMeta?.safeAreas?.heading || {};
  const orientation = project?.meta?.orientation || "9:16";

  const isVertical = orientation === "9:16";

  return (

    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        position: "relative",
        overflow: "hidden"
      }}
    >

      <div
        style={{
          width: isVertical ? "100%" : "50%",
          height: isVertical ? "50%" : "100%",
          position: "relative"
        }}
      >
        {z1 && (
          <AssetRenderer zone={z1} beat={beat} slot="z1" />
        )}
      </div>

      <div
        style={{
          width: isVertical ? "100%" : "50%",
          height: isVertical ? "50%" : "100%",
          position: "relative"
        }}
      >
        {z2 && (
          <AssetRenderer zone={z2} beat={beat} slot="z2" />
        )}
      </div>

      {heading && (
        <div
          style={{
            position: "absolute",
            top: headingSafe.top || 80,
            left: headingSafe.left || 80,
            right: headingSafe.right || 80,
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            zIndex: 5
          }}
        >
          {heading}
        </div>
      )}

      <ComponentsRenderer
        components={components}
        beat={beat}
        project={project}
      />

    </div>

  );

}