import React from "react";
import { Video } from "remotion";

export default function AssetRenderer({ asset }) {
  if (!asset) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #1e1e1e, #3a3a3a)",
        }}
      />
    );
  }

  const objectFit =
    asset.object_fit || "cover";

  // Background type
  if (asset.type === "background") {
    if (asset.value?.color) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: asset.value.color,
          }}
        />
      );
    }

    if (asset.value?.gradient) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: asset.value.gradient,
          }}
        />
      );
    }
  }

  // Image / video type
  if (asset.src) {
    const isVideo =
      asset.src.endsWith(".mp4") ||
      asset.src.endsWith(".webm");

    if (isVideo) {
      return (
        <Video
          src={asset.src}
          muted
          loop
          style={{
            width: "100%",
            height: "100%",
            objectFit: objectFit,
          }}
        />
      );
    }

    return (
      <img
        src={asset.src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: objectFit,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #1e1e1e, #3a3a3a)",
      }}
    />
  );
}