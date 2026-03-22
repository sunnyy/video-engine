import React from "react";
import { Video } from "remotion";

export default function AvatarLayer({ zone }) {

  if (!zone?.src) return null;

  const objectFit = zone.objectFit || "cover";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5
      }}
    >
      <Video
        src={zone.src}
        muted={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit
        }}
      />
    </div>
  );

}