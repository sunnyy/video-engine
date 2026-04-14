import React from "react";
import { OffthreadVideo } from "remotion";

export default function AvatarLayer({ zone }) {
  if (!zone?.src) return null;

  return (
    <OffthreadVideo
      src={zone.src}
      muted={false}
      style={{
        width:      "100%",
        height:     "100%",
        objectFit:  zone.objectFit ?? "cover",
      }}
      onError={(e) => console.warn("[AvatarLayer] video error", zone.src, e)}
    />
  );
}
