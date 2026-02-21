import React from "react";
import { AbsoluteFill } from "remotion";
import AvatarLayer from "../elements/AvatarLayer";
import AssetRenderer from "../elements/AssetRenderer";
import Caption from "../elements/Caption";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function FullLayout({ beat, project }) {
  const { avatar } = project;

  const showAvatar =
    project.meta.mode === "talking_head" && avatar?.src;

  const showAsset = beat.assets?.main;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#111",
      }}
    >
      {/* Asset or Avatar fills full */}
      {showAsset ? (
        <AssetRenderer asset={beat.assets.main} />
      ) : showAvatar ? (
        <AvatarLayer avatar={avatar} />
      ) : (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(135deg, #222, #111)",
          }}
        />
      )}

      {/* Caption */}
      {beat.caption?.show && (
        <Caption beat={beat} project={project} />
      )}

      {/* Components */}
      <ComponentsRenderer
        components={beat.components}
      />
    </AbsoluteFill>
  );
}