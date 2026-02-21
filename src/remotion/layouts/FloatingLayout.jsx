import React from "react";
import { AbsoluteFill } from "remotion";
import AvatarLayer from "../elements/AvatarLayer";
import AssetRenderer from "../elements/AssetRenderer";
import Caption from "../elements/Caption";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function FloatingLayout({ beat, project }) {
  const { avatar } = project;

  const asset = beat.assets?.main;
  const showAvatar =
    project.meta.mode === "talking_head" && avatar?.src;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#111",
      }}
    >
      {/* Background asset */}
      {asset ? (
        <AssetRenderer asset={asset} />
      ) : (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(135deg, #222, #111)",
          }}
        />
      )}

      {/* Floating Avatar */}
      {showAvatar && (
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            overflow: "hidden",
            bottom: 80,
            right: 80,
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          }}
        >
          <AvatarLayer avatar={avatar} />
        </div>
      )}

      {beat.caption?.show && (
        <Caption beat={beat} project={project} />
      )}

      <ComponentsRenderer
        components={beat.components}
      />
    </AbsoluteFill>
  );
}