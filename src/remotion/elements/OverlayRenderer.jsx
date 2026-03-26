import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function OverlayRenderer({ overlays }) {

  if (!overlays) return null;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const list = Object.values(overlays).filter(Boolean);
  if (!list.length) return null;

  return (
    <>
      {list.map((overlay, index) => {

        const appearFrame = overlay.delay ? overlay.delay * fps : 0;
        const localFrame = Math.max(0, frame - appearFrame);

        const motion = overlay.motion || "pop";

        let motionStyle = {};

        if (motion === "pop") {

          const progress = Math.min(localFrame / 8, 1);

          motionStyle.transform = `scale(${interpolate(
            progress,
            [0, 1],
            [0.6, 1]
          )})`;

          motionStyle.opacity = progress;

        }

        if (motion === "slideUp") {

          const progress = Math.min(localFrame / 10, 1);

          motionStyle.transform = `translateY(${interpolate(
            progress,
            [0, 1],
            [80, 0]
          )}px)`;

          motionStyle.opacity = progress;

        }

        if (motion === "fade") {

          const progress = Math.min(localFrame / 10, 1);

          motionStyle.opacity = interpolate(progress, [0, 1], [0, 1]);

        }

        if (motion === "bounce") {

          const progress = Math.min(localFrame / 12, 1);

          const scale = interpolate(
            progress,
            [0, 0.6, 0.8, 1],
            [0.7, 1.1, 0.95, 1]
          );

          motionStyle.transform = `scale(${scale})`;
          motionStyle.opacity = progress;

        }

        const basePosition = {
          position: "absolute",
          top: overlay.position?.top || "200px",
          left: overlay.position?.left || "50%",
          transform: overlay.position?.transform || "translateX(-50%)",
          zIndex: 200,
          textAlign: "center"
        };

        const finalStyle = {
          ...basePosition,
          ...motionStyle
        };

        /* TEXT */

        if (overlay.type === "text") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                color: overlay.color || "#ffffff",
                fontSize: overlay.size || 60,
                fontWeight: 800
              }}
            >
              {overlay.text || "Text"}
            </div>
          );
        }

        /* BADGE */

        if (overlay.type === "badge") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                background: overlay.color || "#ff0055",
                color: "#fff",
                padding: "14px 28px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: overlay.size || 40
              }}
            >
              {overlay.text || "Badge"}
            </div>
          );
        }

        /* HIGHLIGHT */

        if (overlay.type === "highlight") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                background: overlay.color || "rgba(255,255,0,0.4)",
                padding: "6px 12px",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: overlay.size || 50,
                color: "#000"
              }}
            >
              {overlay.text || "Highlight"}
            </div>
          );
        }

        /* CTA */

        if (overlay.type === "cta") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                background: overlay.color || "#ff0055",
                color: "#fff",
                padding: "18px 36px",
                borderRadius: 14,
                fontWeight: 900,
                fontSize: overlay.size || 48
              }}
            >
              {overlay.text || "Call To Action"}
            </div>
          );
        }

        /* ARROW */

        if (overlay.type === "arrow") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                fontSize: overlay.size || 120,
                color: overlay.color || "#ff0000"
              }}
            >
              ➜
            </div>
          );
        }

        /* CIRCLE */

        if (overlay.type === "circle") {
          const size = overlay.size || 200;

          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                width: size,
                height: size,
                border: `6px solid ${overlay.color || "#ffff00"}`,
                borderRadius: "50%"
              }}
            />
          );
        }

        /* RECTANGLE */

        if (overlay.type === "rectangle") {
          const width = overlay.width || 400;
          const height = overlay.height || 120;

          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                width,
                height,
                border: `6px solid ${overlay.color || "#00ffcc"}`
              }}
            />
          );
        }

        return null;

      })}
    </>
  );
}