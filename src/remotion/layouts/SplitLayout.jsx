import React from "react";
import { AbsoluteFill } from "remotion";
import AvatarLayer from "../elements/AvatarLayer";
import AssetRenderer from "../elements/AssetRenderer";
import Caption from "../elements/Caption";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function SplitLayout({ beat, project }) {
  const { meta, avatar } = project;
  const isVertical = meta.orientation === "9:16";

  const avatarOnTop = beat.avatar_position !== "bottom";

  const showAvatar =
    project.meta.mode === "talking_head" && avatar?.src;

  const asset = beat.assets?.main;

  const renderZone = (type) => {
    if (type === "avatar" && showAvatar) {
      return <AvatarLayer avatar={avatar} />;
    }

    if (type === "asset" && asset) {
      return <AssetRenderer asset={asset} />;
    }

    return (
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(135deg, #222, #111)",
        }}
      />
    );
  };

  const firstZoneType = avatarOnTop ? "avatar" : "asset";
  const secondZoneType = avatarOnTop ? "asset" : "avatar";

  return (
    <AbsoluteFill
      style={{
        flexDirection: isVertical ? "column" : "row",
      }}
    >
      <AbsoluteFill
        style={{
          flex: 1,
          position: "relative",
        }}
      >
        {renderZone(firstZoneType)}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          flex: 1,
          position: "relative",
        }}
      >
        {renderZone(secondZoneType)}
      </AbsoluteFill>

      {beat.caption?.show && (
        <Caption beat={beat} project={project} />
      )}

      <ComponentsRenderer
        components={beat.components}
      />
    </AbsoluteFill>
  );
}