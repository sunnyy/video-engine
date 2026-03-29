import React from "react";
import { AbsoluteFill } from "remotion";

export default function VignetteLayer({ strength = 0.5 }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(circle at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
        mixBlendMode: "multiply"
      }}
    />
  );
}