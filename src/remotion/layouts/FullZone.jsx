import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function FullZone({
  zones,
  heading,
  components,
  beat,
  project,
  layoutMeta
}) {

  const zone = zones?.z1;

  const headingSafe = layoutMeta?.safeAreas?.heading || {};

  return (

    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative"
      }}
    >

      {zone && (
        <AssetRenderer zone={zone} beat={beat} slot="z1" />
      )}

      {heading && (
        <div
          style={{
            position: "absolute",
            top: headingSafe.top || 80,
            left: headingSafe.left || 80,
            right: headingSafe.right || 80,
            fontSize: 60,
            fontWeight: 700,
            color: "white"
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