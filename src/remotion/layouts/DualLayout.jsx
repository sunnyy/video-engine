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

  const renderZone = (asset) => {
    if (asset) return <AssetRenderer asset={asset} />;

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
        flexDirection: isVertical ? "column" : "row",
      }}
    >
      <AbsoluteFill style={{ flex: 1, position: "relative" }}>
        {renderZone(main)}
      </AbsoluteFill>

      <AbsoluteFill style={{ flex: 1, position: "relative" }}>
        {renderZone(secondary)}
      </AbsoluteFill>

      {beat.caption?.show && (
        <Caption beat={beat} project={project} />
      )}

      <ComponentsRenderer components={beat.components} />
    </AbsoluteFill>
  );
}