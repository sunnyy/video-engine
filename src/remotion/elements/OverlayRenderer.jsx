/**
 * OverlayRenderer.jsx
 * src/remotion/elements/OverlayRenderer.jsx
 *
 * Renders all overlays for a beat.
 * Each overlay uses anchor-based positioning — no raw pixel coords.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { ANCHOR_POSITIONS } from "../../core/overlayRegistry";

/* ── Motion system ── */
function useMotionStyle(motion, delay, fps, frame) {
  const appearFrame = Math.round((delay || 0) * fps);

  if (frame < appearFrame) return { opacity: 0 };

  const local = frame - appearFrame;

  switch (motion) {
    case "pop": {
      const s = spring({ frame: local, fps, config: { damping: 14, stiffness: 200, mass: 0.6 } });
      return { opacity: Math.min(local / 4, 1), transform: `scale(${interpolate(s, [0,1], [0.5,1])})` };
    }
    case "slideUp": {
      const s = spring({ frame: local, fps, config: { damping: 16, stiffness: 180, mass: 0.7 } });
      return { opacity: Math.min(local / 6, 1), transform: `translateY(${interpolate(s, [0,1], [80,0])}px)` };
    }
    case "slideLeft": {
      const s = spring({ frame: local, fps, config: { damping: 16, stiffness: 180 } });
      return { opacity: Math.min(local / 6, 1), transform: `translateX(${interpolate(s, [0,1], [-80,0])}px)` };
    }
    case "slam": {
      const s = spring({ frame: local, fps, config: { damping: 8, stiffness: 300, mass: 0.5 } });
      return { opacity: Math.min(local / 3, 1), transform: `scale(${interpolate(s, [0,1], [1.8,1])})` };
    }
    case "fade": {
      return { opacity: interpolate(local, [0,12], [0,1], { extrapolateRight: "clamp" }) };
    }
    default:
      return { opacity: Math.min(local / 6, 1) };
  }
}

/* ── Overlay components ── */

function HeadlineText({ overlay, motionStyle }) {
  const scale = overlay.scale ?? 1;
  return (
    <div style={{
      ...motionStyle,
      fontFamily: "'Bebas Neue', 'Syne', sans-serif",
      fontSize:   overlay.size || 72,
      fontWeight: 900,
      color:      overlay.color || "#ffffff",
      lineHeight: 0.95,
      letterSpacing: "-1px",
      textTransform: "uppercase",
      maxWidth:   800,
      transform:  `${motionStyle.transform || ""} scale(${scale})`,
      transformOrigin: "top left",
      textShadow: "0 2px 20px rgba(0,0,0,0.6)",
    }}>
      {overlay.text || "HEADLINE TEXT"}
    </div>
  );
}

function Badge({ overlay, motionStyle }) {
  const scale = overlay.scale ?? 1;
  const variant = overlay.variant || "pill";
  const isPill  = variant === "pill";
  const color   = overlay.color || "#ff4d6d";

  return (
    <div style={{
      ...motionStyle,
      display:       "flex",
      alignItems:    "center",
      gap:           8,
      background:    isPill ? color : "transparent",
      border:        isPill ? "none" : `2px solid ${color}`,
      padding:       isPill ? "8px 20px" : "6px 16px",
      borderRadius:  100,
      fontFamily:    "'JetBrains Mono', monospace",
      fontSize:      overlay.size || 28,
      fontWeight:    800,
      color:         isPill ? "#fff" : color,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      transform:     `${motionStyle.transform || ""} scale(${scale})`,
    }}>
      {overlay.showDot !== false && (
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: isPill ? "#fff" : color,
          animation: "none",
          opacity: overlay.pulse ? 0.8 : 1,
        }} />
      )}
      {overlay.text || "LIVE"}
    </div>
  );
}

function StatCallout({ overlay, motionStyle }) {
  const scale = overlay.scale ?? 1;
  const color = overlay.color || "#f0e040";
  return (
    <div style={{
      ...motionStyle,
      background:  "rgba(0,0,0,0.55)",
      backdropFilter: "blur(8px)",
      borderLeft:  `4px solid ${color}`,
      padding:     "14px 20px",
      borderRadius: "0 12px 12px 0",
      minWidth:    140,
      transform:   `${motionStyle.transform || ""} scale(${scale})`,
    }}>
      <div style={{
        fontFamily:  "'Bebas Neue', sans-serif",
        fontSize:    overlay.size || 52,
        fontWeight:  900,
        color:       color,
        lineHeight:  1,
      }}>
        {overlay.value || "↑ 94%"}
      </div>
      <div style={{
        fontFamily:  "'JetBrains Mono', monospace",
        fontSize:    20,
        color:       "rgba(255,255,255,0.6)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginTop:   4,
      }}>
        {overlay.label || "Stat"}
      </div>
    </div>
  );
}

function HighlightBox({ overlay, motionStyle }) {
  const scale = overlay.scale ?? 1;
  return (
    <div style={{
      ...motionStyle,
      background:   overlay.color || "rgba(245,243,238,0.94)",
      padding:      "20px 28px",
      borderRadius: 12,
      maxWidth:     900,
      transform:    `${motionStyle.transform || ""} scale(${scale})`,
    }}>
      <div style={{
        fontFamily:  "'Outfit', sans-serif",
        fontSize:    overlay.size || 44,
        fontWeight:  700,
        textAlign:    "center",
        color:       overlay.textColor || "#111111",
        lineHeight:  1.3,
      }}>
        {overlay.text || "Key insight here"}
      </div>
    </div>
  );
}

function LiveDot({ overlay, motionStyle, frame, fps }) {
  const scale  = overlay.scale ?? 1;
  const color  = overlay.color || "#ff4d6d";
  const pulse  = Math.sin(frame / fps * Math.PI * 2) * 0.3 + 0.7;
  return (
    <div style={{
      ...motionStyle,
      display:    "flex",
      alignItems: "center",
      gap:        10,
      transform:  `${motionStyle.transform || ""} scale(${scale})`,
    }}>
      <div style={{
        width:        16, height: 16, borderRadius: "50%",
        background:   color,
        opacity:      pulse,
        boxShadow:    `0 0 0 6px ${color}33`,
      }} />
      <div style={{
        fontFamily:   "'JetBrains Mono', monospace",
        fontSize:     overlay.size || 28,
        fontWeight:   800,
        color:        color,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        {overlay.text || "LIVE"}
      </div>
    </div>
  );
}

function EmojiFloat({ overlay, motionStyle, frame, fps }) {
  const scale  = overlay.scale ?? 1;
  const emojis = overlay.emojis || ["❤️","🔥","💯"];
  return (
    <div style={{
      ...motionStyle,
      display:   "flex",
      gap:       16,
      transform: `${motionStyle.transform || ""} scale(${scale})`,
    }}>
      {emojis.map((e, i) => {
        const yOffset = Math.sin((frame / fps * 2 + i * 1.2) * Math.PI) * 8;
        return (
          <div key={i} style={{ fontSize: 64, transform: `translateY(${yOffset}px)` }}>
            {e}
          </div>
        );
      })}
    </div>
  );
}

function ArrowPointer({ overlay, motionStyle, frame, fps }) {
  const scale  = overlay.scale ?? 1;
  const color  = overlay.color || "#f0e040";
  const dir    = overlay.direction || "down";
  const bounce = Math.sin(frame / fps * Math.PI * 3) * 6;

  const rotations = { down: 90, up: -90, left: 180, right: 0 };
  const rotation  = rotations[dir] || 90;

  return (
    <div style={{
      ...motionStyle,
      display:   "flex",
      flexDirection: "column",
      alignItems: "center",
      gap:        8,
      transform:  `${motionStyle.transform || ""} scale(${scale}) translateY(${bounce}px)`,
    }}>
      {overlay.label && (
        <div style={{
          fontFamily:   "'JetBrains Mono', monospace",
          fontSize:     22,
          color:        color,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          {overlay.label}
        </div>
      )}
      <svg
        width={overlay.size || 48} height={overlay.size || 48}
        viewBox="0 0 48 48"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <path
          d="M8 24 L32 24 M24 12 L36 24 L24 36"
          stroke={color} strokeWidth={4}
          strokeLinecap="round" strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/* ── Main renderer ── */
export default function OverlayRenderer({ overlays }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!overlays?.length) return null;

  return (
    <>
      {overlays.filter(Boolean).map((overlay, index) => {
        const anchorStyle = ANCHOR_POSITIONS[overlay.anchor] || ANCHOR_POSITIONS["top-left"];
        const motionStyle = useMotionStyle(overlay.motion, overlay.delay, fps, frame);

        const positionStyle = {
          position: "absolute",
          zIndex:   200 + index,
          ...anchorStyle,
        };

        const props = { overlay, motionStyle, frame, fps };

        const renderOverlay = () => {
          switch (overlay.type) {
            case "HeadlineText":  return <HeadlineText  {...props} />;
            case "Badge":         return <Badge         {...props} />;
            case "StatCallout":   return <StatCallout   {...props} />;
            case "HighlightBox":  return <HighlightBox  {...props} />;
            case "LiveDot":       return <LiveDot       {...props} />;
            case "EmojiFloat":    return <EmojiFloat    {...props} />;
            case "ArrowPointer":  return <ArrowPointer  {...props} />;
            default:              return null;
          }
        };

        const content = renderOverlay();
        if (!content) return null;

        return (
          <div key={overlay.id || index} style={positionStyle}>
            {content}
          </div>
        );
      })}
    </>
  );
}