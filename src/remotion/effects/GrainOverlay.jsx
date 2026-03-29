import React from "react";
import { AbsoluteFill } from "remotion";

export default function GrainOverlay({ intensity = 0.25 }) {

  const grain =
    "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMTIwIDEyMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC44JyBudW1PY3RhdmVzPSc0Jy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzEyMCcgaGVpZ2h0PScxMjAnIGZpbHRlcj0ndXJsKCNuKScgb3BhY2l0eT0nMC4yJy8+PC9zdmc+";

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity: intensity,
        mixBlendMode: "overlay",
        backgroundImage: `url(${grain})`,
        backgroundSize: "120px 120px"
      }}
    />
  );
}