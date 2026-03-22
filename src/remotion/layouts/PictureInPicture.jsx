import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import AvatarLayer from "../elements/AvatarLayer";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function PictureInPicture({
  zones,
  heading,
  components,
  beat,
  project,
  layoutMeta
}) {

  const background = zones?.z1;
  const pip = zones?.z2;

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

      {pip?.type === "asset" && (
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: 40,
            width: 360,
            height: 480,
            zIndex: 5
          }}
        >
          <AssetRenderer zone={pip} beat={beat} slot="z2" />
        </div>
      )}

      {pip?.type === "avatar" && (
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: 40,
            width: 360,
            height: 480,
            zIndex: 5
          }}
        >
          <AvatarLayer zone={pip} />
        </div>
      )}

      {heading && (
        <div
          style={{
            position: "absolute",
            top: headingSafe.top || 80,
            left: headingSafe.left || 80,
            right: headingSafe.right || 80,
            fontSize: 64,
            fontWeight: 700,
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