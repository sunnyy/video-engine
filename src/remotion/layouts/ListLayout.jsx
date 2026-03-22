import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function ListLayout({
  zones,
  heading,
  components,
  beat,
  project,
  layoutMeta
}) {

  const background = zones?.z1;

  const headingSafe = layoutMeta?.safeAreas?.heading || {};
  const compSafe = layoutMeta?.safeAreas?.components || {};

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
            top: headingSafe.top || 90,
            left: headingSafe.left || 80,
            right: headingSafe.right || 80,
            fontSize: 64,
            fontWeight: 900,
            color: "white",
            textAlign: "center",
            zIndex: 5,
          }}
        >
          {heading}
        </div>
      )}

      {beat.text && (
        <div
          style={{
            position: "absolute",
            top: compSafe.top || 260,
            left: compSafe.left || 120,
            right: compSafe.right || 120,
            fontSize: 52,
            color: "white",
            lineHeight: 1.4,
            zIndex: 5,
          }}
        >
          {beat.text}
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