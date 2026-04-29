/**
 * textStylePresets.js
 * src/core/registries/textStylePresets.js
 *
 * Predefined text styles. Each preset defines the full style object
 * applied to a text zone in one click. Users can tweak after applying.
 */

export const textStylePresets = [

  {
    id: "brutal-stamp",
    label: "Brutal Stamp",
    roles: ["headline"],
    suitable_on: "both",
    niche: ["entertainment", "gaming", "sports"],
    intent: ["hook", "escalate", "contrast"],
    energy: ["high"],
    preview: { text: "STOP SCROLLING", bg: "#ff2200" },
    style: {
      fontSize: 96,
      fontWeight: 900,
      fontFamily: "'Bebas Neue', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      background: "#ff2200",
      textShadow: "none",
      letterSpacing: "3px",
      lineHeight: 1.0,
      borderRadius: 0,
    }
  },
 
  {
    id: "kinetic-outline",
    label: "Kinetic Outline",
    roles: ["headline"],
    suitable_on: "asset",
    niche: ["gaming", "sports", "entertainment"],
    intent: ["hook", "escalate"],
    energy: ["high"],
    preview: { text: "GAME OVER", bg: "#0a0a12" },
    style: {
      fontSize: 104,
      fontWeight: 900,
      fontFamily: "'Bebas Neue', sans-serif",
      color: "transparent",
      textAlign: "center",
      WebkitTextStroke: "2px #ffffff",
      textShadow: "none",
      letterSpacing: "4px",
      lineHeight: 1.0,
    }
  },
 
  {
    id: "editorial-serif",
    label: "Editorial Serif",
    roles: ["headline"],
    suitable_on: "both",
    niche: ["lifestyle", "travel", "food", "education"],
    intent: ["reveal", "visual_rest", "testimonial"],
    energy: ["medium", "low"],
    preview: { text: "The Story Behind", bg: "#1a1408" },
    style: {
      fontSize: 80,
      fontWeight: 700,
      fontFamily: "'Playfair Display', serif",
      fontStyle: "normal",
      color: "#ffffff",
      textAlign: "left",
      textShadow: "0 2px 16px rgba(0,0,0,0.6)",
      letterSpacing: "-0.5px",
      lineHeight: 1.15,
    }
  },
 
  {
    id: "condensed-impact",
    label: "Condensed Impact",
    roles: ["headline"],
    suitable_on: "both",
    niche: ["sports", "entertainment", "gaming"],
    intent: ["hook", "stat", "escalate"],
    energy: ["high"],
    preview: { text: "WORLD RECORD", bg: "#0a0a0a" },
    style: {
      fontSize: 112,
      fontWeight: 900,
      fontFamily: "'Barlow Condensed', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "0 6px 32px rgba(0,0,0,0.9)",
      letterSpacing: "-1px",
      lineHeight: 0.95,
    }
  },
 
  {
    id: "slab-punch",
    label: "Slab Punch",
    roles: ["headline"],
    suitable_on: "background",
    niche: ["finance", "tech", "education"],
    intent: ["hook", "proof", "contrast"],
    energy: ["high", "medium"],
    preview: { text: "THE TRUTH IS", bg: "#111111" },
    style: {
      fontSize: 88,
      fontWeight: 900,
      fontFamily: "'Roboto Slab', serif",
      color: "#ffffff",
      textAlign: "left",
      textShadow: "none",
      letterSpacing: "0px",
      lineHeight: 1.05,
      borderLeft: "6px solid #ff2200",
      paddingLeft: "16px",
    }
  },
 
  {
    id: "luxury-serif",
    label: "Luxury Serif",
    roles: ["headline"],
    suitable_on: "both",
    niche: ["lifestyle", "finance", "travel"],
    intent: ["reveal", "cta", "visual_rest"],
    energy: ["low", "medium"],
    preview: { text: "BEAUTIFUL SUNSET", bg: "#0a0805" },
    style: {
      fontSize: 72,
      fontWeight: 800,
      fontFamily: "'Cormorant Garamond', serif",
      fontStyle: "italic",
      color: "#f5c518",
      textAlign: "center",
      textShadow: "0 2px 20px rgba(245,197,24,0.3)",
      letterSpacing: "2px",
      lineHeight: 1.1,
    }
  },
 
  {
    id: "neon-glow",
    label: "Neon Glow",
    roles: ["headline"],
    suitable_on: "background",
    niche: ["gaming", "entertainment", "tech"],
    intent: ["hook", "escalate"],
    energy: ["high"],
    preview: { text: "GLOW UP", bg: "#050510" },
    style: {
      fontSize: 96,
      fontWeight: 900,
      fontFamily: "'Unbounded', sans-serif",
      color: "#f5c518",
      textAlign: "center",
      textShadow: "0 0 20px rgba(245,197,24,0.9), 0 0 60px rgba(245,197,24,0.4)",
      letterSpacing: "-1px",
      lineHeight: 1.0,
    }
  },
 
  {
    id: "mixed-weight-headline",
    label: "Mixed Weight",
    roles: ["headline"],
    suitable_on: "both",
    niche: ["lifestyle", "education", "health"],
    intent: ["hook", "reveal"],
    energy: ["medium", "high"],
    preview: { text: "A Year of MEMORIES", bg: "#0a0a12" },
    style: {
      fontSize: 80,
      fontWeight: 300,
      fontFamily: "'Outfit', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "0 2px 16px rgba(0,0,0,0.7)",
      letterSpacing: "0px",
      lineHeight: 1.1,
    }
  },
 
  {
    id: "stencil-bold",
    label: "Stencil Bold",
    roles: ["headline"],
    suitable_on: "asset",
    niche: ["sports", "gaming", "entertainment"],
    intent: ["hook", "contrast", "escalate"],
    energy: ["high"],
    preview: { text: "DARE TO BE BOLD", bg: "#1a1a1a" },
    style: {
      fontSize: 92,
      fontWeight: 900,
      fontFamily: "'Oswald', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "4px 4px 0px rgba(0,0,0,0.8)",
      letterSpacing: "4px",
      lineHeight: 1.0,
      textTransform: "uppercase",
    }
  },
 
  // ─── TAGLINE PRESETS ───────────────────────────────────────────────────────
 
  {
    id: "pill-tag",
    label: "Pill Tag",
    backgroundRole: "primary",
    roles: ["tagline", "label"],
    suitable_on: "both",
    niche: ["entertainment", "tech", "gaming", "lifestyle"],
    intent: ["hook", "cta", "proof"],
    energy: ["high", "medium"],
    preview: { text: "VLOG #5", bg: "#0a0a12" },
    style: {
      fontSize: 44,
      fontWeight: 700,
      fontFamily: "'Outfit', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      background: "rgba(124,92,252,0.9)",
      borderRadius: 40,
      letterSpacing: "0.05em",
      lineHeight: 1.2,
      paddingLeft: 20,
      paddingRight: 20,
    }
  },
 
  {
    id: "breaking-tag",
    label: "Breaking Tag",
    roles: ["tagline", "label"],
    suitable_on: "both",
    niche: ["entertainment", "finance", "tech", "education"],
    intent: ["hook", "escalate", "proof"],
    energy: ["high"],
    preview: { text: "BREAKING NEWS", bg: "#0a0a0a" },
    style: {
      fontSize: 40,
      fontWeight: 900,
      fontFamily: "'Barlow Condensed', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      background: "#e63946",
      borderRadius: 4,
      letterSpacing: "2px",
      lineHeight: 1.0,
      textTransform: "uppercase",
      paddingLeft: 16,
      paddingRight: 16,
    }
  },
 
  {
    id: "mono-tag",
    label: "Mono Tag",
    roles: ["tagline", "label"],
    suitable_on: "background",
    niche: ["tech", "finance", "education"],
    intent: ["proof", "stat", "explanation"],
    energy: ["medium", "low"],
    preview: { text: "// episode.01", bg: "#0a0f0a" },
    style: {
      fontSize: 36,
      fontWeight: 500,
      fontFamily: "'JetBrains Mono', monospace",
      color: "#00ff88",
      textAlign: "left",
      textShadow: "none",
      letterSpacing: "0.05em",
      lineHeight: 1.4,
    }
  },
 
  {
    id: "italic-script-tag",
    label: "Script Tag",
    roles: ["tagline"],
    suitable_on: "both",
    niche: ["lifestyle", "travel", "food"],
    intent: ["visual_rest", "reveal"],
    energy: ["low", "medium"],
    preview: { text: "Travel vlog", bg: "#0a0805" },
    style: {
      fontSize: 56,
      fontWeight: 400,
      fontFamily: "'Dancing Script', cursive",
      color: "#f5c518",
      textAlign: "left",
      textShadow: "0 2px 12px rgba(0,0,0,0.5)",
      letterSpacing: "1px",
      lineHeight: 1.2,
    }
  },
 
  {
    id: "spaced-caps-tag",
    label: "Spaced Caps",
    roles: ["tagline", "label"],
    suitable_on: "both",
    niche: ["lifestyle", "finance", "education", "health"],
    intent: ["reveal", "visual_rest", "cta"],
    energy: ["medium", "low"],
    preview: { text: "ISLAND HOPPING ADVENTURE", bg: "#0a0a12" },
    style: {
      fontSize: 28,
      fontWeight: 400,
      fontFamily: "'Outfit', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "none",
      opacity: 1,
      letterSpacing: "0.25em",
      lineHeight: 1.4,
      textTransform: "uppercase",
    }
  },
 
  // ─── SUBTEXT / SUPPORTING PRESETS ─────────────────────────────────────────
 
  {
    id: "clean-subtext",
    label: "Clean Subtext",
    roles: ["subtext"],
    suitable_on: "both",
    niche: ["education", "health", "finance", "lifestyle"],
    intent: ["explanation", "proof", "visual_rest"],
    energy: ["medium", "low"],
    preview: { text: "Discover how it works", bg: "#0a0a12" },
    style: {
      fontSize: 52,
      fontWeight: 400,
      fontFamily: "'Outfit', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "0 2px 8px rgba(0,0,0,0.6)",
      opacity: 1,
      letterSpacing: "0px",
      lineHeight: 1.4,
    }
  },
 
  {
    id: "bold-subtext",
    label: "Bold Subtext",
    roles: ["subtext"],
    suitable_on: "both",
    niche: ["entertainment", "gaming", "sports"],
    intent: ["hook", "escalate", "contrast"],
    energy: ["high", "medium"],
    preview: { text: "You won't believe this", bg: "#0a0a12" },
    style: {
      fontSize: 56,
      fontWeight: 700,
      fontFamily: "'Barlow Condensed', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "0 2px 16px rgba(0,0,0,0.8)",
      letterSpacing: "0.5px",
      lineHeight: 1.2,
    }
  },
 
  {
    id: "serif-subtext",
    label: "Serif Subtext",
    roles: ["subtext"],
    suitable_on: "both",
    niche: ["lifestyle", "travel", "food", "education"],
    intent: ["testimonial", "visual_rest", "explanation"],
    energy: ["low", "medium"],
    preview: { text: "A delicious journey awaits", bg: "#0a0805" },
    style: {
      fontSize: 48,
      fontWeight: 400,
      fontFamily: "'Playfair Display', serif",
      fontStyle: "italic",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "0 2px 12px rgba(0,0,0,0.5)",
      opacity: 1,
      letterSpacing: "0px",
      lineHeight: 1.35,
    }
  },
 
  // ─── STAT PRESETS ──────────────────────────────────────────────────────────
 
  {
    id: "stat-flood",
    label: "Stat Flood",
    roles: ["stat"],
    suitable_on: "both",
    niche: ["finance", "education", "tech", "health", "sports"],
    intent: ["stat", "proof", "hook"],
    energy: ["high"],
    preview: { text: "50%", bg: "#0a0a12" },
    style: {
      fontSize: 180,
      fontWeight: 900,
      fontFamily: "'Bebas Neue', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "0 8px 40px rgba(0,0,0,0.9)",
      letterSpacing: "-4px",
      lineHeight: 0.9,
    }
  },
 
  {
    id: "stat-outlined",
    label: "Stat Outlined",
    roles: ["stat"],
    suitable_on: "asset",
    niche: ["finance", "sports", "gaming", "tech"],
    intent: ["stat", "contrast"],
    energy: ["high"],
    preview: { text: "$1M", bg: "#050510" },
    style: {
      fontSize: 160,
      fontWeight: 900,
      fontFamily: "'Barlow Condensed', sans-serif",
      color: "transparent",
      textAlign: "center",
      WebkitTextStroke: "3px #f5c518",
      textShadow: "none",
      letterSpacing: "-2px",
      lineHeight: 0.9,
    }
  },
 
  {
    id: "stat-mono",
    label: "Stat Mono",
    roles: ["stat"],
    suitable_on: "background",
    niche: ["tech", "finance", "education"],
    intent: ["stat", "proof"],
    energy: ["medium"],
    preview: { text: "94%", bg: "#0a0f0a" },
    style: {
      fontSize: 140,
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      color: "#00ff88",
      textAlign: "center",
      textShadow: "0 0 30px rgba(0,255,136,0.5)",
      letterSpacing: "-2px",
      lineHeight: 1.0,
    }
  },
 
  // ─── QUOTE PRESETS ─────────────────────────────────────────────────────────
 
  {
    id: "blockquote-serif",
    label: "Blockquote",
    roles: ["quote"],
    suitable_on: "both",
    niche: ["education", "lifestyle", "health", "finance"],
    intent: ["testimonial", "proof", "visual_rest"],
    energy: ["low", "medium"],
    preview: { text: "\"This changed everything for me\"", bg: "#0a0805" },
    style: {
      fontSize: 52,
      fontWeight: 400,
      fontFamily: "'Cormorant Garamond', serif",
      fontStyle: "italic",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "0 2px 12px rgba(0,0,0,0.5)",
      opacity: 1,
      letterSpacing: "0px",
      lineHeight: 1.45,
    }
  },
 
  {
    id: "quote-highlight",
    label: "Quote Highlight",
    backgroundRole: "primary",
    roles: ["quote"],
    suitable_on: "both",
    niche: ["entertainment", "education", "lifestyle"],
    intent: ["testimonial", "proof"],
    energy: ["medium"],
    preview: { text: "\"Weird but True!\"", bg: "#1a0a2a" },
    style: {
      fontSize: 56,
      fontWeight: 700,
      fontFamily: "'Outfit', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      background: "rgba(124,92,252,0.2)",
      borderRadius: 8,
      borderLeft: "4px solid #7c5cfc",
      textShadow: "none",
      letterSpacing: "0px",
      lineHeight: 1.35,
      paddingLeft: 16,
    }
  },
 
  // ─── LABEL PRESETS ─────────────────────────────────────────────────────────
 
  {
    id: "badge-label",
    label: "Badge",
    backgroundRole: "primary",
    roles: ["label"],
    suitable_on: "both",
    niche: ["entertainment", "tech", "gaming", "sports"],
    intent: ["hook", "cta", "proof"],
    energy: ["high", "medium"],
    preview: { text: "UNBOXING", bg: "#0a0a12" },
    style: {
      fontSize: 36,
      fontWeight: 800,
      fontFamily: "'Outfit', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      background: "#7c5cfc",
      borderRadius: 6,
      letterSpacing: "2px",
      lineHeight: 1.0,
      textTransform: "uppercase",
      paddingLeft: 14,
      paddingRight: 14,
    }
  },
 
  {
    id: "minimal-label",
    label: "Minimal Label",
    roles: ["label"],
    suitable_on: "both",
    niche: ["lifestyle", "finance", "education", "health", "travel"],
    intent: ["visual_rest", "explanation", "reveal"],
    energy: ["low", "medium"],
    preview: { text: "WITH JULIANA SILVA", bg: "#0a0a12" },
    style: {
      fontSize: 28,
      fontWeight: 400,
      fontFamily: "'Barlow Condensed', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      textShadow: "none",
      opacity: 1,
      letterSpacing: "0.2em",
      lineHeight: 1.4,
      textTransform: "uppercase",
    }
  },
 
  {
    id: "rotated-label",
    label: "Rotated Label",
    roles: ["label"],
    suitable_on: "asset",
    niche: ["entertainment", "lifestyle", "travel", "gaming"],
    intent: ["hook", "visual_rest"],
    energy: ["medium", "high"],
    preview: { text: "GAMEPLAY HIGHLIGHTS", bg: "#0a0a12" },
    style: {
      fontSize: 28,
      fontWeight: 700,
      fontFamily: "'Bebas Neue', sans-serif",
      color: "#ffffff",
      textAlign: "center",
      background: "rgba(0,0,0,0.7)",
      borderRadius: 40,
      letterSpacing: "3px",
      lineHeight: 1.0,
      writingMode: "vertical-rl",
      textOrientation: "mixed",
      paddingTop: 14,
      paddingBottom: 14,
    }
  },

  {
    id:         "hero",
    label:      "Hero",
    roles:      ["headline", "stat"],
    suitable_on: ["hook", "bridge", "cta"],
    niche:      [],
    intent:     "capture_attention",
    energy:     "explosive",
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
    id:         "headline",
    label:      "Headline",
    roles:      ["headline", "subtext"],
    suitable_on: ["hook", "bridge", "value", "cta"],
    niche:      [],
    intent:     "inform",
    energy:     "high",
    preview: { text: "Breaking News", bg: "#4724E1" },
    style: {
      fontSize:      62,
      fontWeight:    800,
      fontFamily:    "'Outfit', sans-serif",
      color:         "#ffffff",
      textAlign:     "center",
      textShadow:    "0 2px 12px rgba(0,0,0,0.7)",
      letterSpacing: "-1px",
      lineHeight:    1.1,
    }
  },

  {
    id:         "editorial",
    label:      "Editorial",
    roles:      ["headline", "subtext", "quote"],
    suitable_on: ["bridge", "value", "story"],
    niche:      ["lifestyle", "fashion", "beauty", "education"],
    intent:     "inspire",
    energy:     "calm",
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
    id:         "pill",
    label:      "Pill",
    roles:      ["label", "tagline"],
    suitable_on: ["hook", "value", "cta"],
    niche:      [],
    intent:     "capture_attention",
    energy:     "medium",
    preview: { text: "Tag", bg: "#0a0a12" },
    style: {
      fontSize:      52,
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
    id:         "neon",
    label:      "Neon",
    roles:      ["headline", "stat"],
    suitable_on: ["hook", "bridge", "cta"],
    niche:      ["gaming", "entertainment", "music", "sports"],
    intent:     "capture_attention",
    energy:     "explosive",
    preview: { text: "GLOW UP", bg: "#050510" },
    style: {
      fontSize:      56,
      fontWeight:    900,
      fontFamily:    "'Unbounded', sans-serif",
      color:         "#f5c518",
      textAlign:     "center",
      textShadow:    "0 0 20px rgba(245,197,24,0.8), 0 0 40px rgba(245,197,24,0.4)",
      letterSpacing: "-1px",
      lineHeight:    1.0,
    }
  },

  {
    id:         "brutal",
    label:      "Brutal",
    roles:      ["headline", "stat"],
    suitable_on: ["hook", "cta"],
    niche:      ["entertainment", "gaming", "sports", "fitness"],
    intent:     "capture_attention",
    energy:     "explosive",
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
    id:         "mono",
    label:      "Mono",
    roles:      ["label", "subtext", "tagline"],
    suitable_on: ["hook", "bridge", "value"],
    niche:      ["tech", "finance", "education", "saas"],
    intent:     "inform",
    energy:     "medium",
    preview: { text: "// data.log", bg: "#0a0f0a" },
    style: {
      fontSize:      48,
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
    id:         "gradient-text",
    label:      "Gold",
    roles:      ["headline", "tagline"],
    suitable_on: ["hook", "bridge", "cta"],
    niche:      ["lifestyle", "finance", "luxury", "beauty"],
    intent:     "inspire",
    energy:     "medium",
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
    id:         "subtitle",
    label:      "Subtitle",
    roles:      ["label", "subtext"],
    suitable_on: ["hook", "bridge", "value", "story", "cta"],
    niche:      [],
    intent:     "inform",
    energy:     "low",
    preview: { text: "Episode 1 — Pilot", bg: "#0a0a12" },
    style: {
      fontSize:      20,
      fontWeight:    400,
      fontFamily:    "'Barlow Condensed', sans-serif",
      color:         "#ffffff",
      textAlign:     "center",
      textShadow:    "none",
      opacity:       1,
      letterSpacing: "0.15em",
      lineHeight:    1.4,
    }
  },

];