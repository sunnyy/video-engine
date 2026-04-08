/**
 * elementsRegistry.jsx
 * src/core/elementsRegistry.jsx
 *
 * Registry of all placeable visual elements.
 * Each entry has: category, tags, render(), defaultProps, defaultSize.
 * render(props, W, H) → React JSX rendered inside an absolute-positioned container.
 */
import React from "react";

/* ─────────────────────────────────────────────────────────────
   DECORATIVES — full-canvas overlays, subtle texture/depth
───────────────────────────────────────────────────────────── */
const decoratives = {

  vignette: {
    category: "decorative",
    label:    "Vignette",
    tags:     ["cinematic", "depth", "dark", "quality"],
    defaultProps: { opacity: 0.55, color: "#000000" },
    defaultSize:  { x: 0, y: 0, width: 100, height: 100 },
    render: ({ opacity = 0.55 }) => (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,${opacity}) 100%)`,
      }} />
    ),
  },

  "noise-overlay": {
    category: "decorative",
    label:    "Noise Overlay",
    tags:     ["texture", "quality", "grain", "film"],
    defaultProps: { opacity: 0.06 },
    defaultSize:  { x: 0, y: 0, width: 100, height: 100 },
    render: ({ opacity = 0.06 }) => (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px",
        mixBlendMode: "overlay",
      }} />
    ),
  },

  "glow-spot": {
    category: "decorative",
    label:    "Glow Spot",
    tags:     ["energy", "neon", "highlight", "accent"],
    defaultProps: { color: "#7c5cfc", opacity: 0.35, x: 50, y: 50 },
    defaultSize:  { x: 0, y: 0, width: 100, height: 100 },
    render: ({ color = "#7c5cfc", opacity = 0.35, x = 50, y = 50 }) => (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at ${x}% ${y}%, ${color}55 0%, transparent 65%)`,
        opacity,
      }} />
    ),
  },

  "scan-lines": {
    category: "decorative",
    label:    "Scan Lines",
    tags:     ["retro", "tech", "texture"],
    defaultProps: { opacity: 0.08 },
    defaultSize:  { x: 0, y: 0, width: 100, height: 100 },
    render: ({ opacity = 0.08 }) => (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)",
        opacity,
      }} />
    ),
  },

  "gradient-fade-bottom": {
    category: "decorative",
    label:    "Gradient Fade Bottom",
    tags:     ["text", "readability", "bottom", "fade"],
    defaultProps: { opacity: 0.7, color: "#000000" },
    defaultSize:  { x: 0, y: 50, width: 100, height: 50 },
    render: ({ opacity = 0.7, color = "#000000" }) => (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `linear-gradient(to bottom, transparent 0%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 100%)`,
      }} />
    ),
  },

  "corner-accent": {
    category: "decorative",
    label:    "Corner Accent",
    tags:     ["editorial", "structure", "frame"],
    defaultProps: { color: "#7c5cfc", size: 24, position: "tl" },
    defaultSize:  { x: 0, y: 0, width: 100, height: 100 },
    render: ({ color = "#7c5cfc", size = 24, position = "tl" }) => {
      const isTop    = position.startsWith("t");
      const isLeft   = position.endsWith("l");
      const borderStyle = {
        position:  "absolute",
        width:     size, height: size,
        [isTop  ? "top"    : "bottom"]: 16,
        [isLeft ? "left"   : "right" ]: 16,
        borderTop:    isTop    ? `2px solid ${color}` : "none",
        borderBottom: !isTop   ? `2px solid ${color}` : "none",
        borderLeft:   isLeft   ? `2px solid ${color}` : "none",
        borderRight:  !isLeft  ? `2px solid ${color}` : "none",
        pointerEvents: "none",
      };
      return <div style={borderStyle} />;
    },
  },
};

/* ─────────────────────────────────────────────────────────────
   SHAPES — geometric design elements
───────────────────────────────────────────────────────────── */
const shapes = {

  "accent-line": {
    category: "shape",
    label:    "Accent Line",
    tags:     ["divider", "structure", "minimal"],
    defaultProps: { color: "#7c5cfc", thickness: 2, opacity: 1 },
    defaultSize:  { x: 5, y: 48, width: 20, height: 1 },
    render: ({ color = "#7c5cfc", thickness = 2, opacity = 1 }) => (
      <div style={{
        position: "absolute", inset: 0,
        background: color,
        height: thickness,
        top: "50%", transform: "translateY(-50%)",
        opacity, borderRadius: 2,
      }} />
    ),
  },

  "gradient-line": {
    category: "shape",
    label:    "Gradient Line",
    tags:     ["divider", "premium", "fade"],
    defaultProps: { color: "#7c5cfc", thickness: 2 },
    defaultSize:  { x: 5, y: 48, width: 90, height: 1 },
    render: ({ color = "#7c5cfc", thickness = 2 }) => (
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg, transparent 0%, ${color} 30%, ${color} 70%, transparent 100%)`,
        height: thickness,
        top: "50%", transform: "translateY(-50%)",
        borderRadius: 2,
      }} />
    ),
  },

  "pill-badge": {
    category: "shape",
    label:    "Pill Badge",
    tags:     ["label", "tag", "accent", "badge"],
    defaultProps: { color: "#7c5cfc", text: "NEW", textColor: "#ffffff" },
    defaultSize:  { x: 5, y: 5, width: 20, height: 6 },
    render: ({ color = "#7c5cfc", text = "NEW", textColor = "#ffffff" }) => (
      <div style={{
        position:       "absolute", inset: 0,
        background:     color,
        borderRadius:   100,
        display:        "flex", alignItems: "center", justifyContent: "center",
        color:          textColor,
        fontSize:       "clamp(10px, 2.5vw, 18px)",
        fontWeight:     700,
        fontFamily:     "'Outfit', sans-serif",
        letterSpacing:  "0.08em",
        textTransform:  "uppercase",
      }}>
        {text}
      </div>
    ),
  },

  "circle-accent": {
    category: "shape",
    label:    "Circle Accent",
    tags:     ["accent", "dot", "marker"],
    defaultProps: { color: "#7c5cfc", opacity: 0.9, filled: true },
    defaultSize:  { x: 3, y: 45, width: 5, height: 9 },
    render: ({ color = "#7c5cfc", opacity = 0.9, filled = true }) => (
      <div style={{
        position:     "absolute", inset: 0,
        borderRadius: "50%",
        background:   filled ? color : "transparent",
        border:       filled ? "none" : `3px solid ${color}`,
        opacity,
      }} />
    ),
  },

  "bracket-left": {
    category: "shape",
    label:    "Left Bracket",
    tags:     ["editorial", "quote", "structure"],
    defaultProps: { color: "#7c5cfc", thickness: 3 },
    defaultSize:  { x: 2, y: 20, width: 3, height: 60 },
    render: ({ color = "#7c5cfc", thickness = 3 }) => (
      <div style={{
        position:    "absolute", inset: 0,
        borderLeft:  `${thickness}px solid ${color}`,
        borderTop:   `${thickness}px solid ${color}`,
        borderBottom:`${thickness}px solid ${color}`,
        borderRight: "none",
        borderRadius: "4px 0 0 4px",
      }} />
    ),
  },

  "bracket-right": {
    category: "shape",
    label:    "Right Bracket",
    tags:     ["editorial", "quote", "structure"],
    defaultProps: { color: "#7c5cfc", thickness: 3 },
    defaultSize:  { x: 95, y: 20, width: 3, height: 60 },
    render: ({ color = "#7c5cfc", thickness = 3 }) => (
      <div style={{
        position:    "absolute", inset: 0,
        borderRight: `${thickness}px solid ${color}`,
        borderTop:   `${thickness}px solid ${color}`,
        borderBottom:`${thickness}px solid ${color}`,
        borderLeft:  "none",
        borderRadius: "0 4px 4px 0",
      }} />
    ),
  },

  "number-badge": {
    category: "shape",
    label:    "Number Badge",
    tags:     ["stat", "number", "highlight", "accent"],
    defaultProps: { color: "#f5c518", number: "1", textColor: "#000000" },
    defaultSize:  { x: 3, y: 3, width: 10, height: 18 },
    render: ({ color = "#f5c518", number = "1", textColor = "#000000" }) => (
      <div style={{
        position:       "absolute", inset: 0,
        background:     color,
        borderRadius:   8,
        display:        "flex", alignItems: "center", justifyContent: "center",
        color:          textColor,
        fontSize:       "clamp(18px, 5vw, 48px)",
        fontWeight:     900,
        fontFamily:     "'Bebas Neue', sans-serif",
      }}>
        {number}
      </div>
    ),
  },
};

/* ─────────────────────────────────────────────────────────────
   ICONS — inline SVG, no external deps
───────────────────────────────────────────────────────────── */
function Icon({ path, color = "#ffffff", size = "80%", strokeWidth = 1.5, fill = "none" }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {typeof path === "string" ? <path d={path} /> : path}
      </svg>
    </div>
  );
}

const ICON_PATHS = {
  bolt:       "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  fire:       "M12 22c5.523 0 10-4.477 10-10 0-3.5-2-6.5-5-8.5.5 2-1 4-3 5 0-2-1-4.5-3-6-1 3-4 5.5-4 9.5 0 5.523 4.477 10 10 10z",
  star:       "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  "chart-bar":"M3 3v18h18M7 16v-5M12 16V8M17 16v-3",
  "trend-up": "M22 7l-9 9-4-4-6 6M16 7h6v6",
  "check-circle": "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
  rocket:     "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11A22.35 22.35 0 0 1 12 15z",
  target:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  coin:       "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  globe:      "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  cpu:        "M9 3H5a2 2 0 0 0-2 2v4m6-6h6m-6 0V1m6 2h4a2 2 0 0 1 2 2v4m-6-6V1m0 20v-2m0 2h-6m6 0h4a2 2 0 0 0 2-2v-4m-6 6V23M3 9v6m18-6v6M9 21H5a2 2 0 0 1-2-2v-4m6 6V23M3 9h18",
  play:       "M5 3l14 9-14 9V3z",
  mic:        "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  eye:        "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  heart:      "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  camera:     "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  trophy:     "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17a2 2 0 0 1-2 2H6M14 14.66V17a2 2 0 0 1 2 2h2M12 13a4 4 0 0 0 4-4V4H8v5a4 4 0 0 0 4 4z",
  "arrow-up": "M12 19V5M5 12l7-7 7 7",
  zap:        "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  brain:      "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-3.66A2.5 2.5 0 0 1 9.5 2z",
  shield:     "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  clock:      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
};

const icons = Object.fromEntries(
  Object.entries(ICON_PATHS).map(([id, path]) => [
    `icon-${id}`,
    {
      category:     "icon",
      label:        id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      tags:         ["icon", id],
      defaultProps: { color: "#ffffff", opacity: 1, bgColor: "transparent" },
      defaultSize:  { x: 5, y: 5, width: 12, height: 21 },
      render: ({ color = "#ffffff", opacity = 1, bgColor = "transparent" }) => (
        <div style={{ position: "absolute", inset: 0, background: bgColor, borderRadius: 8, opacity }}>
          <Icon path={path} color={color} />
        </div>
      ),
    },
  ])
);

/* ─────────────────────────────────────────────────────────────
   EMOJIS — unicode, scalable
───────────────────────────────────────────────────────────── */
const EMOJI_LIST = [
  { id: "fire",    char: "🔥", tags: ["energy", "trending", "hot", "viral"]            },
  { id: "bolt",    char: "⚡", tags: ["energy", "speed", "power"]                      },
  { id: "check",   char: "✅", tags: ["proof", "fact", "confirmed", "success"]         },
  { id: "bulb",    char: "💡", tags: ["idea", "insight", "tip", "explanation"]         },
  { id: "chart",   char: "📈", tags: ["growth", "stat", "finance", "trend"]            },
  { id: "target",  char: "🎯", tags: ["focus", "goal", "cta", "precision"]             },
  { id: "hundred", char: "💯", tags: ["perfect", "facts", "energy", "proof"]           },
  { id: "rocket",  char: "🚀", tags: ["launch", "growth", "startup", "energy"]        },
  { id: "star",    char: "⭐", tags: ["quality", "rating", "best", "featured"]         },
  { id: "trophy",  char: "🏆", tags: ["winner", "achievement", "best", "proof"]        },
  { id: "gem",     char: "💎", tags: ["premium", "value", "rare", "quality"]           },
  { id: "eyes",    char: "👀", tags: ["attention", "look", "hook", "curiosity"]        },
  { id: "money",   char: "💰", tags: ["money", "finance", "stat", "value"]             },
  { id: "clock",   char: "⏰", tags: ["urgency", "time", "deadline", "cta"]            },
  { id: "lock",    char: "🔒", tags: ["secret", "reveal", "exclusive", "curiosity"]    },
];

const emojis = Object.fromEntries(
  EMOJI_LIST.map(({ id, char, tags }) => [
    `emoji-${id}`,
    {
      category:     "emoji",
      label:        id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      tags:         ["emoji", ...tags],
      defaultProps: { opacity: 1 },
      defaultSize:  { x: 5, y: 5, width: 15, height: 26 },
      render: ({ opacity = 1 }) => (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "clamp(24px, 8vw, 72px)",
          lineHeight: 1, opacity,
          userSelect: "none",
        }}>
          {char}
        </div>
      ),
    },
  ])
);

/* ─────────────────────────────────────────────────────────────
   COMBINED EXPORT
───────────────────────────────────────────────────────────── */
export const elementsRegistry = {
  ...decoratives,
  ...shapes,
  ...icons,
  ...emojis,
};

export const elementCategories = {
  decorative: Object.keys(decoratives),
  shape:      Object.keys(shapes),
  icon:       Object.keys(icons),
  emoji:      Object.keys(emojis),
};

/** Find elements matching one or more tags */
export function findElementsByTags(tags = []) {
  return Object.entries(elementsRegistry)
    .filter(([, e]) => tags.some(t => e.tags.includes(t)))
    .map(([id]) => id);
}

/** Pick a random element from a category */
export function pickElement(category) {
  const keys = elementCategories[category] || [];
  return keys[Math.floor(Math.random() * keys.length)];
}
