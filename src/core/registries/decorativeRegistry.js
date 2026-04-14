/**
 * decorativeRegistry.js
 * src/core/registries/decorativeRegistry.js
 *
 * 63 inline decorative entries — no external assets.
 * All SVGs use currentColor so color is injected at render time via CSS.
 */

export const decorativeRegistry = [

  /* ══════════════════════════════════════════════════════════
     STRUCTURAL — CORNERS (8)
  ══════════════════════════════════════════════════════════ */

  {
    id: "corner_bracket_geo",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
      <path d="M2 20 L2 2 L20 2" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["geometric", "clean", "modern"],
    niche_tags: ["all"],
    quantity: [1, 4],
  },

  {
    id: "corner_bracket_double",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" fill="none">
      <path d="M2 22 L2 2 L22 2" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
      <path d="M7 22 L7 7 L22 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["editorial", "structured", "bold"],
    niche_tags: ["all"],
    quantity: [1, 4],
  },

  {
    id: "corner_circle_dot",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2"/>
      <circle cx="6" cy="6" r="2" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: false,
    scale: ["sm", "md"],
    energy_range: [0.0, 0.8],
    style_tags: ["minimal", "clean", "playful"],
    niche_tags: ["all"],
    quantity: [1, 4],
  },

  {
    id: "corner_diagonal_cut",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
      <path d="M2 22 L22 2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M2 30 L30 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: true,
    scale: ["sm", "md"],
    energy_range: [0.4, 1.0],
    style_tags: ["dynamic", "bold", "modern"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "corner_ornate_minimal",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
      <line x1="8" y1="0" x2="8" y2="16" stroke="currentColor" stroke-width="2"/>
      <line x1="0" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="2"/>
      <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: true,
    scale: ["sm", "md"],
    energy_range: [0.0, 0.7],
    style_tags: ["minimal", "elegant", "calm"],
    niche_tags: ["beauty", "fashion", "lifestyle"],
    quantity: [1, 4],
  },

  {
    id: "corner_arrow_in",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">
      <path d="M4 4 L20 4 L20 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M4 4 L14 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: true,
    scale: ["sm", "md"],
    energy_range: [0.3, 1.0],
    style_tags: ["dynamic", "directional", "bold"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "corner_tick",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
      <path d="M4 16 L10 22 L24 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: false,
    scale: ["sm", "md"],
    energy_range: [0.0, 0.8],
    style_tags: ["clean", "positive", "minimal"],
    niche_tags: ["health", "fitness", "finance"],
    quantity: [1, 2],
  },

  {
    id: "corner_wave_curl",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
      <path d="M4 20 Q4 4 20 4 Q28 4 28 12 Q28 20 18 20 Q12 20 12 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: true,
    scale: ["sm", "md"],
    energy_range: [0.0, 0.7],
    style_tags: ["playful", "organic", "soft"],
    niche_tags: ["beauty", "lifestyle", "food"],
    quantity: [1, 2],
  },

  /* ══════════════════════════════════════════════════════════
     STRUCTURAL — BORDERS (8)
  ══════════════════════════════════════════════════════════ */

  {
    id: "border_wave_top",
    category: "structural", subtype: "border", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 32" preserveAspectRatio="none" fill="none">
      <path d="M0 24 Q50 4 100 20 Q150 36 200 18 Q250 0 300 20 Q350 38 400 16 L400 0 L0 0 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["organic", "playful", "bold"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "border_wave_bottom",
    category: "structural", subtype: "border", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 32" preserveAspectRatio="none" fill="none">
      <path d="M0 8 Q50 28 100 12 Q150 -4 200 14 Q250 32 300 12 Q350 -6 400 16 L400 32 L0 32 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["bottom"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["organic", "playful", "bold"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "border_drip_top",
    category: "structural", subtype: "border", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 48" preserveAspectRatio="none" fill="none">
      <path d="M0 0 L400 0 L400 16 Q380 16 376 28 Q372 40 368 28 Q364 16 340 16 Q316 16 312 32 Q308 44 304 32 Q300 20 280 20 Q260 20 256 36 Q252 48 248 36 Q244 24 220 24 Q196 24 192 38 Q188 48 184 38 Q180 28 160 28 Q140 28 136 40 Q132 48 128 40 Q124 32 100 32 Q76 32 72 44 Q68 48 64 44 Q60 36 40 36 Q20 36 16 44 Q12 48 8 44 Q4 36 0 36 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "playful", "street"],
    niche_tags: ["food", "streetwear", "entertainment"],
    quantity: [1],
  },

  {
    id: "border_drip_bottom",
    category: "structural", subtype: "border", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 48" preserveAspectRatio="none" fill="none">
      <path d="M0 48 L400 48 L400 32 Q380 32 376 20 Q372 8 368 20 Q364 32 340 32 Q316 32 312 16 Q308 4 304 16 Q300 28 280 28 Q260 28 256 12 Q252 0 248 12 Q244 24 220 24 Q196 24 192 10 Q188 0 184 10 Q180 20 160 20 Q140 20 136 8 Q132 0 128 8 Q124 16 100 16 Q76 16 72 4 Q68 0 64 4 Q60 12 40 12 Q20 12 16 4 Q12 0 8 4 Q4 12 0 12 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["bottom"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "playful", "street"],
    niche_tags: ["food", "streetwear", "entertainment"],
    quantity: [1],
  },

  {
    id: "border_line_single",
    category: "structural", subtype: "border", render: "css_repeat",
    css: { borderTop: "2px solid currentColor" },
    colorize: true,
    positions: ["top", "bottom"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["minimal", "clean", "structured"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "border_line_double",
    category: "structural", subtype: "border", render: "css_repeat",
    css: { borderTop: "3px double currentColor" },
    colorize: true,
    positions: ["top", "bottom"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 0.8],
    style_tags: ["editorial", "structured", "premium"],
    niche_tags: ["finance", "news", "education"],
    quantity: [1],
  },

  {
    id: "border_zigzag",
    category: "structural", subtype: "border", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 16" preserveAspectRatio="none" fill="none">
      <path d="M0 8 L20 0 L40 8 L60 0 L80 8 L100 0 L120 8 L140 0 L160 8 L180 0 L200 8 L220 0 L240 8 L260 0 L280 8 L300 0 L320 8 L340 0 L360 8 L380 0 L400 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom"],
    mirroring: false,
    scale: ["sm", "md"],
    energy_range: [0.4, 1.0],
    style_tags: ["energetic", "dynamic", "bold"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "border_torn",
    category: "structural", subtype: "border", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 24" preserveAspectRatio="none" fill="none">
      <path d="M0 0 L0 12 Q15 8 25 14 Q35 20 50 10 Q60 4 75 16 Q88 24 100 12 Q110 4 125 18 Q138 24 150 10 Q162 0 175 14 Q186 24 200 12 Q212 4 225 16 Q238 24 250 10 Q262 0 275 14 Q286 22 300 10 Q312 2 325 16 Q336 24 350 12 Q362 4 375 18 Q385 24 400 14 L400 0 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.3, 1.0],
    style_tags: ["raw", "grunge", "bold"],
    niche_tags: ["entertainment", "streetwear", "food"],
    quantity: [1],
  },

  /* ══════════════════════════════════════════════════════════
     STRUCTURAL — FRAMES (4)
  ══════════════════════════════════════════════════════════ */

  {
    id: "frame_inset_thin",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" preserveAspectRatio="none">
      <rect x="4" y="4" width="92" height="92" stroke="currentColor" stroke-width="1.5"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.7],
    style_tags: ["clean", "premium", "minimal"],
    niche_tags: ["fashion", "finance", "beauty"],
    quantity: [1],
  },

  {
    id: "frame_inset_thick",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" preserveAspectRatio="none">
      <rect x="4" y="4" width="92" height="92" stroke="currentColor" stroke-width="4"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.4, 1.0],
    style_tags: ["bold", "editorial", "structured"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "frame_inset_double",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" preserveAspectRatio="none">
      <rect x="3" y="3" width="94" height="94" stroke="currentColor" stroke-width="2"/>
      <rect x="7" y="7" width="86" height="86" stroke="currentColor" stroke-width="1"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.6],
    style_tags: ["premium", "editorial", "elegant"],
    niche_tags: ["fashion", "beauty", "finance"],
    quantity: [1],
  },

  {
    id: "frame_corner_only",
    category: "structural", subtype: "corner", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" preserveAspectRatio="none">
      <path d="M3 18 L3 3 L18 3" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
      <path d="M82 3 L97 3 L97 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
      <path d="M3 82 L3 97 L18 97" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
      <path d="M97 82 L97 97 L82 97" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["clean", "geometric", "premium"],
    niche_tags: ["all"],
    quantity: [1],
  },

  /* ══════════════════════════════════════════════════════════
     ACCENT — SHAPES (8)
  ══════════════════════════════════════════════════════════ */

  {
    id: "star_burst_4pt",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <path d="M24 2 L27 21 L46 24 L27 27 L24 46 L21 27 L2 24 L21 21 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.6, 1.0],
    style_tags: ["bold", "energetic", "playful"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "star_burst_6pt",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <path d="M24 2 L26.5 18 L40 8 L30 21 L46 24 L30 27 L40 40 L26.5 30 L24 46 L21.5 30 L8 40 L18 27 L2 24 L18 21 L8 8 L21.5 18 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.6, 1.0],
    style_tags: ["bold", "premium", "pop"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "star_burst_8pt",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <path d="M24 2 L26 17 L36 7 L29 20 L44 18 L31 25 L44 30 L29 28 L36 41 L26 31 L24 46 L22 31 L12 41 L19 28 L4 30 L17 25 L4 18 L19 20 L12 7 L22 17 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.6, 1.0],
    style_tags: ["bold", "energetic", "impactful"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "star_burst_12pt",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <path d="M24 2 L25.5 16 L32 5 L27 18 L38 11 L28 22 L42 20 L29 26 L42 30 L28 28 L36 41 L25.5 31 L24 46 L22.5 31 L12 41 L20 28 L6 30 L19 26 L6 20 L20 22 L10 11 L21 18 L16 5 L22.5 16 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.7, 1.0],
    style_tags: ["bold", "loud", "celebration"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "flower_simple",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <ellipse cx="24" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.85"/>
      <ellipse cx="24" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.85" transform="rotate(72 24 24)"/>
      <ellipse cx="24" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.85" transform="rotate(144 24 24)"/>
      <ellipse cx="24" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.85" transform="rotate(216 24 24)"/>
      <ellipse cx="24" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.85" transform="rotate(288 24 24)"/>
      <circle cx="24" cy="24" r="6" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md"],
    energy_range: [0.2, 0.8],
    style_tags: ["playful", "organic", "soft"],
    niche_tags: ["beauty", "lifestyle", "food"],
    quantity: [1, 2],
  },

  {
    id: "flower_daisy",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <ellipse cx="24" cy="11" rx="4" ry="9" rx="4" ry="9" fill="currentColor" opacity="0.7"/>
      <ellipse cx="24" cy="11" rx="4" ry="9" fill="currentColor" opacity="0.7" transform="rotate(45 24 24)"/>
      <ellipse cx="24" cy="11" rx="4" ry="9" fill="currentColor" opacity="0.7" transform="rotate(90 24 24)"/>
      <ellipse cx="24" cy="11" rx="4" ry="9" fill="currentColor" opacity="0.7" transform="rotate(135 24 24)"/>
      <ellipse cx="24" cy="11" rx="4" ry="9" fill="currentColor" opacity="0.7" transform="rotate(180 24 24)"/>
      <ellipse cx="24" cy="11" rx="4" ry="9" fill="currentColor" opacity="0.7" transform="rotate(225 24 24)"/>
      <ellipse cx="24" cy="11" rx="4" ry="9" fill="currentColor" opacity="0.7" transform="rotate(270 24 24)"/>
      <ellipse cx="24" cy="11" rx="4" ry="9" fill="currentColor" opacity="0.7" transform="rotate(315 24 24)"/>
      <circle cx="24" cy="24" r="5" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md"],
    energy_range: [0.2, 0.7],
    style_tags: ["playful", "soft", "organic"],
    niche_tags: ["beauty", "lifestyle"],
    quantity: [1, 2],
  },

  {
    id: "speech_bubble_round",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 48" fill="none">
      <path d="M4 4 Q4 2 6 2 L50 2 Q52 2 52 4 L52 34 Q52 36 50 36 L20 36 L10 46 L14 36 L6 36 Q4 36 4 34 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "floating"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.3, 1.0],
    style_tags: ["playful", "conversational", "fun"],
    niche_tags: ["entertainment", "social", "education"],
    quantity: [1],
  },

  {
    id: "speech_bubble_sharp",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 48" fill="none">
      <path d="M2 2 L54 2 L54 36 L18 36 L8 46 L12 36 L2 36 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "floating"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "sharp", "direct"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "shape_square",
    category: "accent", subtype: "shape", render: "svg",
    // preserveAspectRatio="none" so the border stretches to fill the zone edge-to-edge
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" preserveAspectRatio="none" fill="none">
      <rect x="0" y="0" width="48" height="48" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/>
    </svg>`,
    colorize: true,
    positions: ["center"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["geometric", "clean", "minimal"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "shape_rectangle",
    category: "accent", subtype: "shape", render: "svg",
    // preserveAspectRatio="none" so the border stretches to fill the zone edge-to-edge
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" preserveAspectRatio="none" fill="none">
      <rect x="0" y="0" width="48" height="48" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/>
    </svg>`,
    colorize: true,
    positions: ["center"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["geometric", "clean", "minimal"],
    niche_tags: ["all"],
    quantity: [1],
  },

  /* ══════════════════════════════════════════════════════════
     ACCENT — ARROWS (6)
  ══════════════════════════════════════════════════════════ */

  {
    id: "arrow_curved_right",
    category: "accent", subtype: "arrow", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48" fill="none">
      <path d="M4 40 Q4 8 44 8" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round" fill="none"/>
      <path d="M38 4 L46 10 L38 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.3, 1.0],
    style_tags: ["directional", "casual", "fun"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "arrow_curved_down",
    category: "accent", subtype: "arrow", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" fill="none">
      <path d="M10 4 Q44 4 42 44" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round" fill="none"/>
      <path d="M36 38 L44 48 L50 38" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "floating"],
    mirroring: true,
    scale: ["sm", "md"],
    energy_range: [0.3, 1.0],
    style_tags: ["directional", "casual", "fun"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "arrow_straight_right",
    category: "accent", subtype: "arrow", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 24" fill="none">
      <path d="M2 12 L54 12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M46 4 L58 12 L46 20" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "direct", "action"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "arrow_double_right",
    category: "accent", subtype: "arrow", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 24" fill="none">
      <path d="M2 12 L34 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M26 5 L36 12 L26 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M36 5 L46 12 L36 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: true,
    scale: ["sm", "md"],
    energy_range: [0.6, 1.0],
    style_tags: ["bold", "urgent", "action"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "arrow_swoosh",
    category: "accent", subtype: "arrow", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 56" fill="none">
      <path d="M4 48 Q20 8 60 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" style="stroke-dasharray: none"/>
      <path d="M52 14 L64 22 L54 30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.3, 1.0],
    style_tags: ["casual", "hand-drawn", "playful"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "arrow_bounce",
    category: "accent", subtype: "arrow", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 56" fill="none">
      <path d="M4 28 Q20 4 38 24 Q48 36 62 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M54 8 L64 18 L52 22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["floating"],
    mirroring: true,
    scale: ["sm", "md"],
    energy_range: [0.5, 1.0],
    style_tags: ["playful", "energetic", "casual"],
    niche_tags: ["entertainment", "social", "food"],
    quantity: [1],
  },

  /* ══════════════════════════════════════════════════════════
     ACCENT — SPARKLES (5)
  ══════════════════════════════════════════════════════════ */

  {
    id: "sparkle_4pt_sm",
    category: "accent", subtype: "sparkle", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L13 10 L22 12 L13 14 L12 22 L11 14 L2 12 L11 10 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm"],
    energy_range: [0.5, 1.0],
    style_tags: ["sparkle", "minimal", "accent"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "sparkle_4pt_lg",
    category: "accent", subtype: "sparkle", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <path d="M24 2 L27 21 L46 24 L27 27 L24 46 L21 27 L2 24 L21 21 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.6, 1.0],
    style_tags: ["bold", "sparkle", "premium"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "sparkle_6pt",
    category: "accent", subtype: "sparkle", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
      <path d="M20 2 L22 16 L34 6 L24 18 L38 20 L24 22 L34 34 L22 24 L20 38 L18 24 L6 34 L16 22 L2 20 L16 18 L6 6 L18 16 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md"],
    energy_range: [0.5, 1.0],
    style_tags: ["sparkle", "premium", "energetic"],
    niche_tags: ["beauty", "fashion", "entertainment"],
    quantity: [1, 2],
  },

  {
    id: "sparkle_star_sm",
    category: "accent", subtype: "sparkle", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none">
      <path d="M14 2 L16 10 L22 6 L18 12 L26 14 L18 16 L22 22 L16 18 L14 26 L12 18 L6 22 L10 16 L2 14 L10 12 L6 6 L12 10 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm"],
    energy_range: [0.4, 1.0],
    style_tags: ["sparkle", "cute", "accent"],
    niche_tags: ["all"],
    quantity: [1, 3],
  },

  {
    id: "sparkle_cluster",
    category: "accent", subtype: "sparkle", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 48" fill="none">
      <path d="M12 6 L13 12 L20 12 L13 14 L12 20 L11 14 L4 12 L11 10 Z" fill="currentColor"/>
      <path d="M36 2 L37.5 10 L46 12 L37.5 14 L36 22 L34.5 14 L26 12 L34.5 10 Z" fill="currentColor"/>
      <path d="M18 30 L19 36 L26 36 L19 38 L18 44 L17 38 L10 36 L17 34 Z" fill="currentColor" opacity="0.7"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.6, 1.0],
    style_tags: ["sparkle", "celebration", "premium"],
    niche_tags: ["beauty", "fashion", "entertainment"],
    quantity: [1, 2],
  },

  /* ══════════════════════════════════════════════════════════
     ACCENT — BADGES (6)
  ══════════════════════════════════════════════════════════ */

  {
    id: "badge_circle",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="26" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["badge", "clean", "modern"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "badge_pill",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 36" fill="none">
      <rect x="2" y="2" width="84" height="32" rx="16" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 0.9],
    style_tags: ["badge", "modern", "soft"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "badge_burst",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
      <path d="M30 2 L33 14 L42 6 L37 18 L50 16 L40 25 L52 30 L40 35 L50 44 L37 42 L42 54 L33 46 L30 58 L27 46 L18 54 L23 42 L10 44 L20 35 L8 30 L20 25 L10 16 L23 18 L18 6 L27 14 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.6, 1.0],
    style_tags: ["badge", "bold", "promotion"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "badge_shield",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 56" fill="none">
      <path d="M24 2 L44 10 L44 30 Q44 46 24 54 Q4 46 4 30 L4 10 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["badge", "trust", "premium"],
    niche_tags: ["finance", "health", "education"],
    quantity: [1],
  },

  {
    id: "badge_tag",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 56" fill="none">
      <path d="M4 4 L36 4 Q38 4 39 5 L50 28 Q51 30 50 32 L39 51 Q38 52 36 52 L4 52 Q2 52 2 50 L2 6 Q2 4 4 4 Z" fill="currentColor"/>
      <circle cx="12" cy="14" r="3.5" fill="white" opacity="0.5"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.3, 1.0],
    style_tags: ["badge", "sale", "promotion"],
    niche_tags: ["ecommerce", "food", "retail"],
    quantity: [1],
  },

  {
    id: "badge_ribbon",
    category: "accent", subtype: "shape", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 32" fill="none">
      <path d="M6 2 L74 2 Q78 2 78 6 L78 26 Q78 30 74 30 L6 30 Q2 30 2 26 L2 6 Q2 2 6 2 Z" fill="currentColor"/>
      <path d="M2 6 L10 16 L2 26" fill="currentColor"/>
      <path d="M78 6 L70 16 L78 26" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.3, 0.9],
    style_tags: ["badge", "ribbon", "announcement"],
    niche_tags: ["all"],
    quantity: [1],
  },

  /* ══════════════════════════════════════════════════════════
     ACCENT — LINES (5)
  ══════════════════════════════════════════════════════════ */

  {
    id: "line_horizontal_thin",
    category: "accent", subtype: "divider", render: "css_repeat",
    css: { height: "1px", background: "currentColor", width: "100%" },
    colorize: true,
    positions: ["top", "bottom", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 1.0],
    style_tags: ["minimal", "clean"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "line_horizontal_bold",
    category: "accent", subtype: "divider", render: "css_repeat",
    css: { height: "4px", background: "currentColor", width: "100%", borderRadius: "2px" },
    colorize: true,
    positions: ["top", "bottom", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.4, 1.0],
    style_tags: ["bold", "strong"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "line_diagonal_45",
    category: "accent", subtype: "divider", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
      <path d="M2 58 L58 2" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    mirroring: true,
    scale: ["sm", "md", "lg"],
    energy_range: [0.4, 1.0],
    style_tags: ["dynamic", "bold", "diagonal"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "line_wavy",
    category: "accent", subtype: "divider", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 16" fill="none" preserveAspectRatio="none">
      <path d="M0 8 Q25 0 50 8 Q75 16 100 8 Q125 0 150 8 Q175 16 200 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.2, 0.8],
    style_tags: ["organic", "soft", "playful"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "line_dashed",
    category: "accent", subtype: "divider", render: "css_repeat",
    css: { height: "2px", background: "none", borderTop: "2px dashed currentColor", width: "100%" },
    colorize: true,
    positions: ["top", "bottom", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 0.8],
    style_tags: ["casual", "soft", "clean"],
    niche_tags: ["all"],
    quantity: [1],
  },

  /* ══════════════════════════════════════════════════════════
     ATMOSPHERIC — BLOBS (5)
  ══════════════════════════════════════════════════════════ */

  {
    id: "blob_organic_a",
    category: "atmospheric", subtype: "pattern", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" fill="none">
      <path d="M100 10 C140 10 175 30 185 65 C195 100 180 140 155 158 C130 176 80 178 52 162 C24 146 15 110 18 76 C21 42 60 10 100 10 Z" fill="currentColor" opacity="0.9"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "background"],
    mirroring: true,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.65],
    style_tags: ["organic", "soft", "atmospheric"],
    niche_tags: ["beauty", "lifestyle", "health"],
    quantity: [1],
  },

  {
    id: "blob_organic_b",
    category: "atmospheric", subtype: "pattern", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" fill="none">
      <path d="M90 8 C126 2 168 24 182 58 C196 92 184 138 158 162 C132 186 88 184 58 168 C28 152 8 118 12 82 C16 46 54 14 90 8 Z" fill="currentColor" opacity="0.9"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "background"],
    mirroring: true,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.65],
    style_tags: ["organic", "soft", "atmospheric"],
    niche_tags: ["beauty", "lifestyle", "health"],
    quantity: [1],
  },

  {
    id: "blob_circle_soft",
    category: "atmospheric", subtype: "pattern", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <ellipse cx="80" cy="80" rx="75" ry="70" fill="currentColor" opacity="0.85"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "background", "floating"],
    mirroring: false,
    scale: ["sm", "md", "lg"],
    energy_range: [0.0, 0.65],
    style_tags: ["soft", "minimal", "atmospheric"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  {
    id: "blob_elongated",
    category: "atmospheric", subtype: "pattern", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" fill="none">
      <ellipse cx="120" cy="60" rx="116" ry="54" fill="currentColor" opacity="0.85"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.65],
    style_tags: ["soft", "wide", "atmospheric"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "blob_corner_fill",
    category: "atmospheric", subtype: "pattern", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <path d="M0 0 Q80 0 120 40 Q160 80 160 160 L0 160 Z" fill="currentColor" opacity="0.8"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    mirroring: true,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.65],
    style_tags: ["soft", "atmospheric", "corner"],
    niche_tags: ["all"],
    quantity: [1, 2],
  },

  /* ══════════════════════════════════════════════════════════
     ATMOSPHERIC — PATTERNS (6)
  ══════════════════════════════════════════════════════════ */

  {
    id: "pattern_dots_sm",
    category: "atmospheric", subtype: "pattern", render: "css_repeat",
    css: {
      backgroundImage: "radial-gradient(circle, currentColor 1.5px, transparent 1.5px)",
      backgroundSize: "16px 16px",
    },
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.7],
    style_tags: ["pattern", "structured", "subtle"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "pattern_dots_lg",
    category: "atmospheric", subtype: "pattern", render: "css_repeat",
    css: {
      backgroundImage: "radial-gradient(circle, currentColor 3px, transparent 3px)",
      backgroundSize: "28px 28px",
    },
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.7],
    style_tags: ["pattern", "bold", "retro"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "pattern_grid",
    category: "atmospheric", subtype: "pattern", render: "css_repeat",
    css: {
      backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
      backgroundSize: "32px 32px",
    },
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.6],
    style_tags: ["pattern", "structured", "tech"],
    niche_tags: ["tech", "education", "finance"],
    quantity: [1],
  },

  {
    id: "pattern_diagonal_lines",
    category: "atmospheric", subtype: "pattern", render: "css_repeat",
    css: {
      backgroundImage: "repeating-linear-gradient(45deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 12px)",
    },
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.3, 0.8],
    style_tags: ["pattern", "dynamic", "energetic"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "pattern_crosshatch",
    category: "atmospheric", subtype: "pattern", render: "css_repeat",
    css: {
      backgroundImage: "repeating-linear-gradient(0deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 24px)",
    },
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.6],
    style_tags: ["pattern", "structured", "classic"],
    niche_tags: ["education", "finance", "news"],
    quantity: [1],
  },

  {
    id: "pattern_hexagon",
    category: "atmospheric", subtype: "pattern", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 92" fill="none">
      <polygon points="40,2 72,20 72,56 40,74 8,56 8,20" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <polygon points="80,46 112,64 112,100 80,118 48,100 48,64" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <polygon points="0,46 32,64 32,100 0,118 -32,100 -32,64" stroke="currentColor" stroke-width="1.5" fill="none"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["md", "lg"],
    energy_range: [0.0, 0.7],
    style_tags: ["pattern", "tech", "geometric"],
    niche_tags: ["tech", "education", "finance"],
    quantity: [1],
  },

  /* ══════════════════════════════════════════════════════════
     ATMOSPHERIC — TEXTURES (2)
  ══════════════════════════════════════════════════════════ */

  {
    id: "texture_noise",
    category: "atmospheric", subtype: "pattern", render: "svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend in="SourceGraphic" mode="multiply"/>
      </filter>
      <rect width="200" height="200" filter="url(#noise)" fill="currentColor" opacity="0.08"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    mirroring: false,
    scale: ["lg"],
    energy_range: [0.0, 0.7],
    style_tags: ["texture", "subtle", "organic"],
    niche_tags: ["all"],
    quantity: [1],
  },

  {
    id: "texture_grain",
    category: "atmospheric", subtype: "pattern", render: "css_repeat",
    css: {
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)' opacity='0.06'/%3E%3C/svg%3E\")",
      backgroundRepeat: "repeat",
      backgroundSize: "200px 200px",
    },
    colorize: false,
    positions: ["background"],
    mirroring: false,
    scale: ["lg"],
    energy_range: [0.0, 0.65],
    style_tags: ["texture", "film", "organic"],
    niche_tags: ["all"],
    quantity: [1],
  },
];

/* ── Fast lookup by id ─────────────────────────────────────── */
export const decorativeById = Object.fromEntries(
  decorativeRegistry.map(d => [d.id, d])
);

export default decorativeRegistry;
