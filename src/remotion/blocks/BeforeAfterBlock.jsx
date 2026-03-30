import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate
} from "remotion";
import { BLOCK_FONTS } from "../../core/colorUtils";

export const BEFORE_AFTER_DEFAULTS = {
  beforeLabel: "Before",
  beforeValue: "2h",
  beforeDesc: "Manual reporting every morning",
  afterLabel: "After",
  afterValue: "0m",
  afterDesc: "Fully automated overnight",
  accent: "#00e5c3"
};

export default function BeforeAfterBlock({ block }) {
  const props = { ...BEFORE_AFTER_DEFAULTS, ...(block?.props || {}) };
  const variant = block?.variant || "sideBySide";

  if (variant === "stacked") return <StackedVariant props={props} />;
  if (variant === "spotlight") return <SpotlightVariant props={props} />;

  return <SideBySideVariant props={props} />;
}

/* ---------------- SIDE BY SIDE ---------------- */

function SideBySideVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftAnim = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const rightAnim = spring({ frame: Math.max(frame - 8, 0), fps });

  const arrowAnim = spring({ frame: Math.max(frame - 16, 0), fps });

  const leftX = interpolate(leftAnim, [0, 1], [-200, 0]);
  const rightX = interpolate(rightAnim, [0, 1], [200, 0]);
  const arrowScale = interpolate(arrowAnim, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 80px" }}>
      <div style={{ width: "100%", maxWidth: 1300, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, position: "relative" }}>
        
        <div style={{ background: "rgba(255,80,80,0.07)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 24, padding: 50, transform: `translateX(${leftX}px)` }}>
          <div style={{ fontFamily: BLOCK_FONTS.mono, fontSize: 30, letterSpacing: "0.18em", color: "#ff6b6b", marginBottom: 10 }}>
            {props.beforeLabel}
          </div>

          <div style={{ fontFamily: BLOCK_FONTS.bebas, fontSize: 150, color: "rgba(255,80,80,0.6)", lineHeight: 1 }}>
            {props.beforeValue}
          </div>

          <div style={{ fontFamily: BLOCK_FONTS.dm, fontSize: 40, color: "rgba(255,255,255,0.6)", marginTop: 10 }}>
            {props.beforeDesc}
          </div>
        </div>

        <div style={{ background: "rgba(0,229,195,0.07)", border: "1px solid rgba(0,229,195,0.3)", borderRadius: 24, padding: 50, transform: `translateX(${rightX}px)` }}>
          <div style={{ fontFamily: BLOCK_FONTS.mono, fontSize: 30, letterSpacing: "0.18em", color: props.accent }}>
            {props.afterLabel}
          </div>

          <div style={{ fontFamily: BLOCK_FONTS.bebas, fontSize: 150, color: props.accent }}>
            {props.afterValue}
          </div>

          <div style={{ fontFamily: BLOCK_FONTS.dm, fontSize: 40, color: "rgba(255,255,255,0.6)" }}>
            {props.afterDesc}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%,-50%) scale(${arrowScale})`,
            background: "#111",
            width: 70,
            height: 70,
            borderRadius: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36
          }}
        >
          →
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- STACKED VARIANT ---------------- */

function StackedVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const topAnim = spring({ frame, fps });
  const bottomAnim = spring({ frame: Math.max(frame - 10, 0), fps });

  const topY = interpolate(topAnim, [0, 1], [-150, 0]);
  const bottomY = interpolate(bottomAnim, [0, 1], [150, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 1100, display: "flex", flexDirection: "column", gap: 40 }}>

        <div style={{ padding: 50, borderRadius: 24, border: "1px solid rgba(255,80,80,0.2)", transform: `translateY(${topY}px)` }}>
          <div style={{ fontSize: 30, fontFamily: BLOCK_FONTS.mono, color: "#ff6b6b" }}>{props.beforeLabel}</div>
          <div style={{ fontSize: 140, fontFamily: BLOCK_FONTS.bebas, color: "#ff6b6b" }}>{props.beforeValue}</div>
          <div style={{ fontSize: 40, fontFamily: BLOCK_FONTS.dm }}>{props.beforeDesc}</div>
        </div>

        <div style={{ padding: 50, borderRadius: 24, border: "1px solid rgba(0,229,195,0.3)", transform: `translateY(${bottomY}px)` }}>
          <div style={{ fontSize: 30, fontFamily: BLOCK_FONTS.mono, color: props.accent }}>{props.afterLabel}</div>
          <div style={{ fontSize: 140, fontFamily: BLOCK_FONTS.bebas, color: props.accent }}>{props.afterValue}</div>
          <div style={{ fontSize: 40, fontFamily: BLOCK_FONTS.dm }}>{props.afterDesc}</div>
        </div>

      </div>
    </AbsoluteFill>
  );
}

/* ---------------- SPOTLIGHT VARIANT ---------------- */

function SpotlightVariant({ props }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const valueAnim = spring({ frame, fps });

  const scale = interpolate(valueAnim, [0, 1], [0.5, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontSize: 40, fontFamily: BLOCK_FONTS.mono }}>{props.beforeLabel}</div>

      <div style={{ fontSize: 120, fontFamily: BLOCK_FONTS.bebas, opacity: 0.3 }}>
        {props.beforeValue}
      </div>

      <div style={{ fontSize: 150, fontFamily: BLOCK_FONTS.bebas, color: props.accent, transform: `scale(${scale})` }}>
        {props.afterValue}
      </div>

      <div style={{ fontSize: 40, fontFamily: BLOCK_FONTS.dm, marginTop: 10 }}>
        {props.afterDesc}
      </div>
    </AbsoluteFill>
  );
}