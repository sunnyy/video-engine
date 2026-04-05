/**
 * textStylePresets.js
 * src/core/textStylePresets.js
 *
 * Predefined text styles. Each preset defines the full style object
 * applied to a text zone in one click. Users can tweak after applying.
 */

export const textStylePresets = [

  {
    id:    "hero",
    label: "Hero",
    preview: { text: "BIG IMPACT", bg: "#0a0a12" },
    style: {
      fontSize:      72,
      fontWeight:    900,
      fontFamily:    "'Bebas Neue', sans-serif",
      color:         "#ffffff",
      textAlign:     "center",
      textShadow:    "0 4px 24px rgba(0,0,0,0.8)",
      letterSpacing: "-2px",
      lineHeight:    1.0,
    }
  },

  {
    id:    "headline",
    label: "Headline",
    preview: { text: "Breaking News", bg: "#4724E1" },
    style: {
      fontSize:      52,
      fontWeight:    800,
      fontFamily:    "'Syne', sans-serif",
      color:         "#ffffff",
      textAlign:     "center",
      textShadow:    "0 2px 12px rgba(0,0,0,0.7)",
      letterSpacing: "-1px",
      lineHeight:    1.1,
    }
  },

  {
    id:    "editorial",
    label: "Editorial",
    preview: { text: "The Story", bg: "#f5f0e8" },
    style: {
      fontSize:      48,
      fontWeight:    700,
      fontFamily:    "'Playfair Display', serif",
      color:         "white",
      textAlign:     "left",
      textShadow:    "none",
      letterSpacing: "0px",
      lineHeight:    1.2,
    }
  },

  {
    id:    "caption",
    label: "Caption",
    preview: { text: "Supporting text", bg: "#0a0a12" },
    style: {
      fontSize:      24,
      fontWeight:    500,
      fontFamily:    "inherit",
      color:         "#ffffff",
      textAlign:     "center",
      textShadow:    "none",
      opacity:       0.8,
      lineHeight:    1.4,
    }
  },

  {
    id:    "pill",
    label: "Pill",
    preview: { text: "Tag", bg: "#0a0a12" },
    style: {
      fontSize:      22,
      fontWeight:    700,
      fontFamily:    "'Outfit', sans-serif",
      color:         "#ffffff",
      textAlign:     "center",
      background:    "rgba(124,92,252,0.85)",
      borderRadius:  40,
      letterSpacing: "0.05em",
      lineHeight:    1.2,
    }
  },

  {
    id:    "neon",
    label: "Neon",
    preview: { text: "GLOW UP", bg: "#050510" },
    style: {
      fontSize:      56,
      fontWeight:    900,
      fontFamily:    "'Unbounded', sans-serif",
      color:         "#00f2ea",
      textAlign:     "center",
      textShadow:    "0 0 20px rgba(0,242,234,0.8), 0 0 40px rgba(0,242,234,0.4)",
      letterSpacing: "-1px",
      lineHeight:    1.0,
    }
  },

  {
    id:    "brutal",
    label: "Brutal",
    preview: { text: "STOP.", bg: "#ff2200" },
    style: {
      fontSize:      80,
      fontWeight:    900,
      fontFamily:    "'Bebas Neue', sans-serif",
      color:         "#ffffff",
      textAlign:     "center",
      background:    "#ff2200",
      textShadow:    "none",
      letterSpacing: "2px",
      lineHeight:    1.0,
    }
  },

  {
    id:    "mono",
    label: "Mono",
    preview: { text: "// data.log", bg: "#0a0f0a" },
    style: {
      fontSize:      28,
      fontWeight:    500,
      fontFamily:    "'JetBrains Mono', monospace",
      color:         "#00ff88",
      textAlign:     "left",
      textShadow:    "none",
      letterSpacing: "0.05em",
      lineHeight:    1.5,
    }
  },

  {
    id:    "gradient-text",
    label: "Gold",
    preview: { text: "Premium", bg: "#0a0a0a" },
    style: {
      fontSize:      52,
      fontWeight:    800,
      fontFamily:    "'Syne', sans-serif",
      color:         "#f5c518",
      textAlign:     "center",
      textShadow:    "0 2px 12px rgba(245,197,24,0.4)",
      letterSpacing: "-0.5px",
      lineHeight:    1.1,
    }
  },

  {
    id:    "subtitle",
    label: "Subtitle",
    preview: { text: "Episode 1 — Pilot", bg: "#0a0a12" },
    style: {
      fontSize:      20,
      fontWeight:    400,
      fontFamily:    "'Barlow Condensed', sans-serif",
      color:         "#ffffff",
      textAlign:     "center",
      textShadow:    "none",
      opacity:       0.65,
      letterSpacing: "0.15em",
      lineHeight:    1.4,
    }
  },

];