import React from "react";

/*
  V1: deterministic pass-through.
  No dynamic layout logic.
  No positioning engine.
*/

export default function ComponentsRenderer({ components }) {
  if (!Array.isArray(components) || components.length === 0)
    return null;

  return (
    <>
      {components.map((component, index) => {
        if (!component?.type) return null;

        switch (component.type) {
          case "badge":
            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  top: 60,
                  right: 60,
                  background: "#000",
                  color: "#fff",
                  padding: "12px 24px",
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                {component.text || "Badge"}
              </div>
            );

          case "cta":
            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  bottom: 60,
                  right: 60,
                  background: "#ff0055",
                  color: "#fff",
                  padding: "16px 32px",
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                {component.text || "Click Here"}
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
}