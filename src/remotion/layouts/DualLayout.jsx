import React from "react";
import { AbsoluteFill } from "remotion";
import AssetRenderer from "../elements/AssetRenderer";
import Caption from "../elements/Caption";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function DualLayout({ beat, project }) {
  const { meta } = project;
  const isVertical = meta.orientation === "9:16";

  const main = beat.assets?.main;
  const secondary = beat.assets?.secondary;

  const renderZone = (asset, slot) => {
    if (asset)
      return (
        <AssetRenderer
          asset={asset}
          beat={beat}
          slot={slot}
        />
      );

    return (
      <AbsoluteFill
        style={{
          background: "linear-gradient(135deg, #222, #111)",
        }}
      />
    );
  };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        zIndex: 0,
      }}
    >
      <AbsoluteFill style={{ flex: 1, position: "relative" }}>
        {renderZone(main, "main")}
      </AbsoluteFill>

      <AbsoluteFill style={{ flex: 1, position: "relative" }}>
        {renderZone(secondary, "secondary")}
      </AbsoluteFill>

      {beat.caption?.show && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          <Caption beat={beat} project={project} />
        </div>
      )}

      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <ComponentsRenderer components={beat.components} />
      </div>
    </AbsoluteFill>
  );
}