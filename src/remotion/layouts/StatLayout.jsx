import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function StatLayout({
  zones,
  heading,
  components,
  beat,
  project,
  layoutMeta
}) {

  const background = zones?.z1;

  const headingSafe = layoutMeta?.safeAreas?.heading || {};

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >

      {background?.type === "asset" && (
        <AssetRenderer zone={background} beat={beat} slot="z1" />
      )}

      {heading && (
        <div
          style={{
            position: "absolute",
            top: headingSafe.top || "38%",
            left: headingSafe.left || 80,
            right: headingSafe.right || 80,
            transform: "translateY(-50%)",
            textAlign: "center",
            fontSize: 120,
            fontWeight: 900,
            color: "white",
            zIndex: 5,
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