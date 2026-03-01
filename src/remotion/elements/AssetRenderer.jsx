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

  const objectFit = asset.object_fit || "cover";

  // Background
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

  // 🔥 Normalize source (support old src + new url)
  const source = asset.url || asset.src;

  if (source) {
    const isVideo =
      source.endsWith(".mp4") ||
      source.endsWith(".webm");

    if (isVideo) {
      return (
        <Video
          src={source}
          muted
          loop
          style={{
            width: "100%",
            height: "100%",
            objectFit,
          }}
        />
      );
    }

    return (
      <img
        src={source}
        style={{
          width: "100%",
          height: "100%",
          objectFit,
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