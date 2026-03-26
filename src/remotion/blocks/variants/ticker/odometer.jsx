import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate
} from "remotion";

export default function Odometer({ block }) {

  const target = parseInt(block.props.value);
  const label = block.props.label || "";

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200
    }
  });

  const value = Math.floor(interpolate(progress, [0, 1], [0, target]));

  const digits = value.toString().split("");

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center"
      }}
    >

      <div style={{ textAlign: "center" }}>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center"
          }}
        >

          {digits.map((digit, i) => {

            const d = parseInt(digit);

            const offset = -d * 120;

            return (
              <div
                key={i}
                style={{
                  height: 120,
                  width: 90,
                  overflow: "hidden",
                  background: "#111",
                  borderRadius: 12,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
                }}
              >

                <div
                  style={{
                    transform: `translateY(${offset}px)`,
                    transition: "transform 0.2s"
                  }}
                >

                  {[0,1,2,3,4,5,6,7,8,9].map(n => (
                    <div
                      key={n}
                      style={{
                        height: 120,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 100,
                        fontWeight: 900,
                        color: "white"
                      }}
                    >
                      {n}
                    </div>
                  ))}

                </div>

              </div>
            );

          })}

        </div>

        {label && (
          <div
            style={{
              fontSize: 46,
              marginTop: 24,
              color: "#ddd"
            }}
          >
            {label}
          </div>
        )}

      </div>

    </AbsoluteFill>
  );

}