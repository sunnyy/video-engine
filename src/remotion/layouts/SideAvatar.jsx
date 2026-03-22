import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import AvatarLayer from "../elements/AvatarLayer";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function SideAvatar({
  zones,
  heading,
  components,
  beat,
  project,
  layoutMeta
}) {

  const background = zones?.z1;
  const avatar = zones?.z2;

  const headingSafe = layoutMeta?.safeAreas?.heading || {};

  return (

    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden"
      }}
    >

      {background?.type === "asset" && (
        <AssetRenderer zone={background} beat={beat} slot="z1" />
      )}

      {avatar?.type === "avatar" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 420,
            height: "100%",
            zIndex: 5
          }}
        >
          <AvatarLayer zone={avatar} />
        </div>
      )}

      {heading && (
        <div
          style={{
            position: "absolute",
            top: headingSafe.top || 120,
            left: headingSafe.left || 460,
            right: headingSafe.right || 80,
            fontSize: 60,
            fontWeight: 800,
            color: "white",
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