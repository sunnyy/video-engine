import React from "react";
import { getLayoutSafeAreas } from "../../core/getLayoutSafeAreas";
import { componentMotionRegistry } from "../../core/componentMotionRegistry";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function ComponentsRenderer({ components, beat, project }) {
  if (!components) return null;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = project?.meta?.brand_color || "#ff0055";

  const list = Object.values(components).filter(Boolean);
  if (list.length === 0) return null;

  const safe = getLayoutSafeAreas(beat?.layout);
  const compSafe = safe?.components || {};

  return (
    <>
      {list.map((component, index) => {
        const motionKey = component.motion || "pop";

        const motion =
          componentMotionRegistry[motionKey]?.() ||
          componentMotionRegistry.none();

        const appearFrame = component.delay ? component.delay * fps : 0;
        const localFrame = Math.max(0, frame - appearFrame);

        let motionStyle = {};

        if (motion.type === "scale") {
          const progress = Math.min(localFrame / motion.duration, 1);

          motionStyle.transform = `scale(${interpolate(
            progress,
            [0, 1],
            [motion.from, 1]
          )})`;

          motionStyle.opacity = progress;
        }

        if (motion.type === "translateY") {
          const progress = Math.min(localFrame / motion.duration, 1);

          motionStyle.transform = `translateY(${interpolate(
            progress,
            [0, 1],
            [motion.from, 0]
          )}px)`;

          motionStyle.opacity = progress;
        }

        if (motion.type === "opacity") {
          const progress = Math.min(localFrame / motion.duration, 1);

          motionStyle.opacity = interpolate(progress, [0, 1], [motion.from, 1]);
        }

        const style = component.style || {};

        const basePosition = {
          position: "absolute",
          top: style.top || compSafe.top || "200px",
          left: style.left || "50%",
          transform: style.transform || "translateX(-50%)",
          zIndex: 120,
          textAlign: "center",
        };

        const finalStyle = {
          ...basePosition,
          ...motionStyle,
        };

        if (component.type === "badge") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                background: brandColor,
                color: "#fff",
                padding: "16px 32px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 60,
              }}
            >
              {component.props?.text || "Badge"}
            </div>
          );
        }

        if (component.type === "cta") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                bottom: style.bottom || "120px",
                top: "auto",
                background: brandColor,
                color: "#fff",
                padding: "18px 36px",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 50,
              }}
            >
              {component.props?.text || "Click"}
            </div>
          );
        }

        if (component.type === "checklist") {
          const items = component.props?.items || [];

          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                color: "#fff",
                fontSize: 48,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {items.map((item, i) => {
                const itemProgress = Math.min(
                  Math.max((localFrame - i * 10) / 15, 0),
                  1
                );

                return (
                  <div
                    key={i}
                    style={{
                      opacity: itemProgress,
                      transform: `translateY(${interpolate(
                        itemProgress,
                        [0, 1],
                        [20, 0]
                      )}px)`,
                    }}
                  >
                    ✓ {item}
                  </div>
                );
              })}
            </div>
          );
        }

        if (component.type === "stat") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                background: "rgba(0,0,0,0.6)",
                padding: "30px",
                borderRadius: 20,
                color: "#fff",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 800,
                  color: brandColor,
                }}
              >
                {component.props?.value}
              </div>

              <div style={{ fontSize: 32 }}>{component.props?.label}</div>
            </div>
          );
        }

        if (component.type === "quoteBox") {
          return (
            <div
              key={index}
              style={{
                ...finalStyle,
                background: "rgba(0,0,0,0.7)",
                padding: "28px",
                borderRadius: 18,
                color: "#fff",
                fontSize: 44,
                maxWidth: "70%",
              }}
            >
              {component.props?.text}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}