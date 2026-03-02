import React from "react";
import { AbsoluteFill } from "remotion";
import AssetRenderer from "../elements/AssetRenderer";
import Caption from "../elements/Caption";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function SplitLayout({ beat, project }) {
  const { meta } = project;
  const isVertical = meta.orientation === "9:16";

  const avatarOnTop = beat.avatar_position !== "bottom";
  const asset = beat.assets?.main;

  const renderAssetZone = () => {
    if (asset) {
      return <AssetRenderer asset={asset} beat={beat} />;
    }

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
        {avatarOnTop ? null : renderAssetZone()}
      </AbsoluteFill>

      <AbsoluteFill style={{ flex: 1, position: "relative" }}>
        {avatarOnTop ? renderAssetZone() : null}
      </AbsoluteFill>

      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <ComponentsRenderer components={beat.components} />
      </div>
    </AbsoluteFill>
  );
}