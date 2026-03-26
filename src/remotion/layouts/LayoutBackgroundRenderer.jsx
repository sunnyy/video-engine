import React from "react";

export default function LayoutBackgroundRenderer({ background }) {

  if (!background) return null;

  const type = background.type || "color";
  const value = background.value;
  const fit = background.objectFit || "cover";

  if (type === "color") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: value,
          zIndex: 0
        }}
      />
    );
  }

  if (type === "gradient") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: value,
          zIndex: 0
        }}
      />
    );
  }

  if (type === "image") {
    return (
      <img
        src={value}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: fit,
          zIndex: 0
        }}
      />
    );
  }

  if (type === "video") {
    return (
      <video
        src={value}
        autoPlay
        muted
        loop
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: fit,
          zIndex: 0
        }}
      />
    );
  }

  return null;
}