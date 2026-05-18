/**
 * cinematicRegistry.js
 * src/core/registries/cinematicRegistry.js
 *
 * 45 premium cinematic visual elements for AI video composition.
 * render types: "svg" | "css_repeat" | "svg_filter"
 * colorMode: "stroke" | "fill" | "mixed"
 *   stroke — only stroke color applies (currentColor on stroke attrs)
 *   fill   — only fill color applies (solid or gradient on fill attrs)
 *   mixed  — separate strokeColor + fillColor/gradient controls
 * All use currentColor for colorization.
 * Per-layer instance fields (not in registry, set on the layer object):
 *   color       — primary color (fill or stroke)
 *   strokeColor — override stroke color for mixed entries
 *   gradient    — CSS gradient string, injected as SVG linearGradient at render time
 *   shapeOpacity — overall opacity 0–1
 * Designed for: product ads, reels, short-form video.
 */

export const cinematicRegistry = [

  /* ══════════════════════════════════════════════════════════
     GEOMETRIC ACCENTS (10)
  ══════════════════════════════════════════════════════════ */

  {
    id: "slash_diagonal",
    label: "Diagonal Slash",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <line x1="20" y1="180" x2="180" y2="20" stroke="currentColor" stroke-width="12" stroke-linecap="square"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "TL", "TR", "BR", "BL"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "dynamic", "kinetic", "modern"],
    niche_tags: ["all"],
  },

  {
    id: "slash_double",
    label: "Double Slash",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <line x1="20" y1="180" x2="180" y2="20" stroke="currentColor" stroke-width="10" stroke-linecap="square"/>
      <line x1="55" y1="180" x2="200" y2="35" stroke="currentColor" stroke-width="5" stroke-linecap="square" opacity="0.5"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "TL", "TR"],
    energy_range: [0.6, 1.0],
    style_tags: ["bold", "kinetic", "sporty"],
    niche_tags: ["sports", "fitness", "entertainment"],
  },

  {
    id: "cross_bold",
    label: "Bold Cross",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" stroke-width="14" stroke-linecap="square"/>
      <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" stroke-width="14" stroke-linecap="square"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "center"],
    energy_range: [0.4, 1.0],
    style_tags: ["bold", "graphic", "modern"],
    niche_tags: ["all"],
  },

  {
    id: "plus_thin",
    label: "Thin Plus",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
      <line x1="40" y1="8" x2="40" y2="72" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <line x1="8" y1="40" x2="72" y2="40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "TL", "TR", "BL", "BR"],
    energy_range: [0.0, 0.7],
    style_tags: ["minimal", "clean", "elegant"],
    niche_tags: ["all"],
  },

  {
    id: "l_bracket_bold",
    label: "Bold L-Bracket",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
      <path d="M10 10 L10 90 L90 90" stroke="currentColor" stroke-width="10" stroke-linecap="square" stroke-linejoin="miter"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    energy_range: [0.3, 0.9],
    style_tags: ["bold", "structured", "modern"],
    niche_tags: ["all"],
  },

  {
    id: "angled_stripe",
    label: "Angled Stripe",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 60" preserveAspectRatio="none" fill="none">
      <path d="M0 60 L40 0 L300 0 L260 60 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "sporty", "kinetic"],
    niche_tags: ["sports", "fitness", "entertainment"],
  },

  {
    id: "arrow_burst",
    label: "Arrow Burst",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <path d="M10 60 L90 60 M70 40 L90 60 L70 80" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 30 L60 60 M48 28 L30 30 L32 48" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
      <path d="M30 90 L60 60 M32 72 L30 90 L48 88" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "center"],
    energy_range: [0.6, 1.0],
    style_tags: ["dynamic", "directional", "bold"],
    niche_tags: ["all"],
  },

  {
    id: "corner_slash_accent",
    label: "Corner Slash Accent",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <path d="M0 120 L120 0" stroke="currentColor" stroke-width="8" stroke-linecap="square"/>
      <path d="M0 90 L90 0" stroke="currentColor" stroke-width="4" stroke-linecap="square" opacity="0.4"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "kinetic", "modern"],
    niche_tags: ["all"],
  },

  {
    id: "diamond_accent",
    label: "Diamond Accent",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
      <path d="M40 6 L74 40 L40 74 L6 40 Z" stroke="currentColor" stroke-width="4" fill="none"/>
      <path d="M40 18 L62 40 L40 62 L18 40 Z" fill="currentColor" opacity="0.3"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "TL", "TR", "BL", "BR"],
    energy_range: [0.3, 0.9],
    style_tags: ["elegant", "geometric", "modern"],
    niche_tags: ["beauty", "fashion", "luxury"],
  },

  {
    id: "triangle_accent",
    label: "Sharp Triangle",
    category: "geometric", subtype: "accent", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
      <path d="M50 5 L95 90 L5 90 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "TL", "TR", "BL", "BR"],
    energy_range: [0.4, 1.0],
    style_tags: ["bold", "sharp", "dynamic"],
    niche_tags: ["all"],
  },

  /* ══════════════════════════════════════════════════════════
     LINES & DIVIDERS (8)
  ══════════════════════════════════════════════════════════ */

  {
    id: "line_thick_h",
    label: "Thick Horizontal Bar",
    category: "lines", subtype: "divider", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 20" preserveAspectRatio="none" fill="none">
      <rect x="0" y="4" width="400" height="12" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.4, 1.0],
    style_tags: ["bold", "structured", "clean"],
    niche_tags: ["all"],
  },

  {
    id: "line_thin_accent",
    label: "Thin Accent Line",
    category: "lines", subtype: "divider", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 6" preserveAspectRatio="none" fill="none">
      <rect x="0" y="2" width="400" height="2" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.0, 0.8],
    style_tags: ["minimal", "clean", "elegant"],
    niche_tags: ["all"],
  },

  {
    id: "line_double",
    label: "Double Line",
    category: "lines", subtype: "divider", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 16" preserveAspectRatio="none" fill="none">
      <rect x="0" y="2" width="400" height="3" fill="currentColor"/>
      <rect x="0" y="11" width="400" height="1.5" fill="currentColor" opacity="0.5"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.2, 0.8],
    style_tags: ["editorial", "structured", "clean"],
    niche_tags: ["all"],
  },

  {
    id: "line_diagonal_rule",
    label: "Diagonal Rule",
    category: "lines", subtype: "divider", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="none" fill="none">
      <line x1="0" y1="200" x2="400" y2="0" stroke="currentColor" stroke-width="6" stroke-linecap="square"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "background"],
    energy_range: [0.4, 1.0],
    style_tags: ["dynamic", "bold", "kinetic"],
    niche_tags: ["all"],
  },

  {
    id: "line_dotted",
    label: "Dotted Line",
    category: "lines", subtype: "divider", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 10" preserveAspectRatio="none" fill="none">
      <line x1="0" y1="5" x2="400" y2="5" stroke="currentColor" stroke-width="3" stroke-dasharray="6 8" stroke-linecap="round"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.0, 0.6],
    style_tags: ["minimal", "playful", "clean"],
    niche_tags: ["all"],
  },

  {
    id: "line_zigzag",
    label: "Zigzag Line",
    category: "lines", subtype: "divider", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 30" preserveAspectRatio="none" fill="none">
      <polyline points="0,24 25,6 50,24 75,6 100,24 125,6 150,24 175,6 200,24 225,6 250,24 275,6 300,24 325,6 350,24 375,6 400,24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.3, 0.8],
    style_tags: ["energetic", "playful", "bold"],
    niche_tags: ["entertainment", "food", "lifestyle"],
  },

  {
    id: "line_tapered",
    label: "Tapered Line",
    category: "lines", subtype: "divider", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 12" preserveAspectRatio="none" fill="none">
      <path d="M0 6 Q150 0 300 6 Q150 12 0 6 Z" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.2, 0.7],
    style_tags: ["elegant", "soft", "modern"],
    niche_tags: ["beauty", "fashion", "lifestyle"],
  },

  {
    id: "line_vertical_accent",
    label: "Vertical Accent",
    category: "lines", subtype: "divider", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 300" preserveAspectRatio="none" fill="none">
      <rect x="4" y="0" width="4" height="300" fill="currentColor"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "TL", "TR", "BL", "BR"],
    energy_range: [0.2, 0.8],
    style_tags: ["structured", "editorial", "clean"],
    niche_tags: ["all"],
  },

  /* ══════════════════════════════════════════════════════════
     GLOW & LIGHT (8)
  ══════════════════════════════════════════════════════════ */

  {
    id: "glow_ring",
    label: "Glow Ring",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <defs>
        <filter id="glow_ring_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="80" stroke="currentColor" stroke-width="6" fill="none" filter="url(#glow_ring_f)" opacity="0.9"/>
      <circle cx="100" cy="100" r="80" stroke="currentColor" stroke-width="2" fill="none" opacity="0.4"/>
    </svg>`,
    colorize: true,
    positions: ["center", "floating", "background"],
    energy_range: [0.3, 1.0],
    style_tags: ["glow", "neon", "cinematic", "premium"],
    niche_tags: ["all"],
  },

  {
    id: "glow_halo",
    label: "Halo Glow",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none">
      <defs>
        <filter id="halo_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="blur"/></feMerge>
        </filter>
      </defs>
      <circle cx="150" cy="150" r="100" fill="currentColor" filter="url(#halo_f)" opacity="0.35"/>
      <circle cx="150" cy="150" r="60" fill="currentColor" opacity="0.12"/>
    </svg>`,
    colorize: true,
    positions: ["center", "background", "floating"],
    energy_range: [0.2, 0.8],
    style_tags: ["glow", "soft", "atmospheric", "cinematic"],
    niche_tags: ["all"],
  },

  {
    id: "glow_line_h",
    label: "Glow Horizontal Line",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 40" preserveAspectRatio="none" fill="none">
      <defs>
        <filter id="glow_line_f" x="-10%" y="-100%" width="120%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" stroke-width="3" filter="url(#glow_line_f)" opacity="0.9"/>
      <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" stroke-width="1" opacity="1"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.4, 1.0],
    style_tags: ["neon", "glow", "cinematic", "tech"],
    niche_tags: ["tech", "entertainment", "gaming"],
  },

  {
    id: "light_streak",
    label: "Light Streak",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" fill="none">
      <defs>
        <filter id="streak_f" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="streak_g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0"/>
          <stop offset="40%" stop-color="currentColor" stop-opacity="1"/>
          <stop offset="60%" stop-color="currentColor" stop-opacity="1"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="44" width="400" height="12" fill="url(#streak_g)" filter="url(#streak_f)" opacity="0.8"/>
      <rect x="0" y="48" width="400" height="4" fill="url(#streak_g)" opacity="0.9"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "center"],
    energy_range: [0.5, 1.0],
    style_tags: ["cinematic", "neon", "dynamic", "glow"],
    niche_tags: ["all"],
  },

  {
    id: "lens_flare_simple",
    label: "Lens Flare",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <defs>
        <filter id="flare_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="flare_rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="1"/>
          <stop offset="40%" stop-color="currentColor" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="40" fill="url(#flare_rg)" filter="url(#flare_f)"/>
      <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" stroke-width="1" opacity="0.2"/>
      <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" stroke-width="1" opacity="0.2"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "center", "floating"],
    energy_range: [0.4, 1.0],
    style_tags: ["cinematic", "glow", "premium", "light"],
    niche_tags: ["all"],
  },

  {
    id: "spotlight_cone",
    label: "Spotlight Cone",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" fill="none">
      <defs>
        <filter id="spot_f" x="-20%" y="-10%" width="140%" height="120%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>
        <linearGradient id="spot_g" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M150 0 L280 400 L20 400 Z" fill="url(#spot_g)" filter="url(#spot_f)"/>
    </svg>`,
    colorize: true,
    positions: ["top", "center", "floating"],
    energy_range: [0.3, 0.9],
    style_tags: ["cinematic", "dramatic", "atmospheric"],
    niche_tags: ["entertainment", "beauty", "fashion"],
  },

  {
    id: "radial_glow",
    label: "Radial Glow",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
      <defs>
        <filter id="radglow_f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="30"/>
        </filter>
        <radialGradient id="radglow_g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.8"/>
          <stop offset="60%" stop-color="currentColor" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#radglow_g)" filter="url(#radglow_f)"/>
    </svg>`,
    colorize: true,
    positions: ["center", "background", "floating"],
    energy_range: [0.2, 0.9],
    style_tags: ["glow", "atmospheric", "cinematic", "premium"],
    niche_tags: ["all"],
  },

  {
    id: "neon_outline_rect",
    label: "Neon Rectangle",
    category: "glow", subtype: "light", render: "svg_filter", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" fill="none">
      <defs>
        <filter id="neon_rect_f" x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="8" y="8" width="284" height="184" rx="4" stroke="currentColor" stroke-width="4" fill="none" filter="url(#neon_rect_f)" opacity="0.85"/>
      <rect x="8" y="8" width="284" height="184" rx="4" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    </svg>`,
    colorize: true,
    positions: ["center", "floating"],
    energy_range: [0.5, 1.0],
    style_tags: ["neon", "tech", "gaming", "cinematic"],
    niche_tags: ["tech", "gaming", "entertainment"],
  },

  /* ══════════════════════════════════════════════════════════
     SPEED & MOTION (6)
  ══════════════════════════════════════════════════════════ */

  {
    id: "speed_lines_radial",
    label: "Radial Speed Lines",
    category: "motion", subtype: "speed", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
      ${Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = 200 + Math.cos(rad) * 60;
        const y1 = 200 + Math.sin(rad) * 60;
        const x2 = 200 + Math.cos(rad) * 195;
        const y2 = 200 + Math.sin(rad) * 195;
        const opacity = 0.3 + (i % 3) * 0.2;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="${i % 2 === 0 ? 2 : 1}" opacity="${opacity}" stroke-linecap="round"/>`;
      }).join('\n      ')}
    </svg>`,
    colorize: true,
    positions: ["center", "background"],
    energy_range: [0.7, 1.0],
    style_tags: ["kinetic", "dynamic", "sporty", "energetic"],
    niche_tags: ["sports", "fitness", "entertainment", "gaming"],
  },

  {
    id: "speed_lines_h",
    label: "Horizontal Speed Lines",
    category: "motion", subtype: "speed", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" fill="none">
      ${[20,45,70,95,110,125,140,158,175].map((y, i) => {
        const w = 200 + (i % 3) * 80;
        const x = 400 - w;
        const opacity = 0.3 + (i % 4) * 0.15;
        const sw = i % 2 === 0 ? 2 : 1;
        return `<line x1="${x}" y1="${y}" x2="400" y2="${y}" stroke="currentColor" stroke-width="${sw}" opacity="${opacity}" stroke-linecap="round"/>`;
      }).join('\n      ')}
    </svg>`,
    colorize: true,
    positions: ["floating", "background"],
    energy_range: [0.6, 1.0],
    style_tags: ["kinetic", "dynamic", "speed"],
    niche_tags: ["sports", "automotive", "entertainment"],
  },

  {
    id: "burst_rays",
    label: "Burst Rays",
    category: "motion", subtype: "speed", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none">
      ${Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30) * Math.PI / 180;
        const x2 = 150 + Math.cos(angle) * 140;
        const y2 = 150 + Math.sin(angle) * 140;
        const opacity = i % 2 === 0 ? 0.7 : 0.35;
        return `<line x1="150" y1="150" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="${i % 2 === 0 ? 3 : 1.5}" opacity="${opacity}" stroke-linecap="round"/>`;
      }).join('\n      ')}
    </svg>`,
    colorize: true,
    positions: ["center", "background", "floating"],
    energy_range: [0.6, 1.0],
    style_tags: ["energetic", "bold", "dynamic"],
    niche_tags: ["all"],
  },

  {
    id: "motion_blur_lines",
    label: "Motion Blur Lines",
    category: "motion", subtype: "speed", render: "svg_filter", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" fill="none">
      <defs>
        <filter id="mblur_f" x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="4 0"/>
        </filter>
      </defs>
      ${[30,60,90,110,130,150,170].map((y, i) => {
        const w = 150 + (i % 3) * 100;
        const opacity = 0.4 + (i % 3) * 0.15;
        return `<rect x="${400 - w}" y="${y - 2}" width="${w}" height="${i % 2 === 0 ? 4 : 2}" fill="currentColor" opacity="${opacity}" filter="url(#mblur_f)" rx="1"/>`;
      }).join('\n      ')}
    </svg>`,
    colorize: true,
    positions: ["floating", "background"],
    energy_range: [0.6, 1.0],
    style_tags: ["kinetic", "speed", "cinematic"],
    niche_tags: ["sports", "automotive", "entertainment"],
  },

  {
    id: "diagonal_streaks",
    label: "Diagonal Streaks",
    category: "motion", subtype: "speed", render: "svg", colorMode: "stroke",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
      ${[0,60,110,160,210,270,330,380].map((offset, i) => {
        const opacity = 0.2 + (i % 3) * 0.15;
        const sw = i % 2 === 0 ? 3 : 1.5;
        return `<line x1="${offset}" y1="0" x2="${offset - 200}" y2="400" stroke="currentColor" stroke-width="${sw}" opacity="${opacity}" stroke-linecap="round"/>`;
      }).join('\n      ')}
    </svg>`,
    colorize: true,
    positions: ["background", "floating"],
    energy_range: [0.5, 1.0],
    style_tags: ["kinetic", "dynamic", "sporty"],
    niche_tags: ["sports", "entertainment", "fitness"],
  },

  {
    id: "shockwave_ring",
    label: "Shockwave Ring",
    category: "motion", subtype: "speed", render: "svg_filter", colorMode: "mixed",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none">
      <defs>
        <filter id="shock_f" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="150" cy="150" r="120" stroke="currentColor" stroke-width="8" fill="none" opacity="0.8" filter="url(#shock_f)"/>
      <circle cx="150" cy="150" r="90" stroke="currentColor" stroke-width="4" fill="none" opacity="0.4"/>
      <circle cx="150" cy="150" r="55" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/>
    </svg>`,
    colorize: true,
    positions: ["center", "floating"],
    energy_range: [0.7, 1.0],
    style_tags: ["impact", "cinematic", "bold", "dynamic"],
    niche_tags: ["sports", "gaming", "entertainment"],
  },

  /* ══════════════════════════════════════════════════════════
     PATTERNS & OVERLAYS (8)
  ══════════════════════════════════════════════════════════ */

  {
    id: "overlay_scanlines",
    label: "Scan Lines",
    category: "overlay", subtype: "texture", render: "css_repeat", colorMode: "fill",
    css: {
      backgroundImage: "repeating-linear-gradient(0deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 4px)",
      opacity: 0.06,
    },
    colorize: true,
    positions: ["background"],
    energy_range: [0.0, 0.8],
    style_tags: ["texture", "retro", "cinematic", "film"],
    niche_tags: ["all"],
  },

  {
    id: "overlay_halftone",
    label: "Halftone Dots",
    category: "overlay", subtype: "texture", render: "css_repeat", colorMode: "fill",
    css: {
      backgroundImage: "radial-gradient(circle, currentColor 2px, transparent 2px)",
      backgroundSize: "12px 12px",
      opacity: 0.15,
    },
    colorize: true,
    positions: ["background"],
    energy_range: [0.2, 0.8],
    style_tags: ["pattern", "retro", "bold", "graphic"],
    niche_tags: ["entertainment", "streetwear", "food"],
  },

  {
    id: "overlay_matrix_grid",
    label: "Matrix Grid",
    category: "overlay", subtype: "texture", render: "css_repeat", colorMode: "fill",
    css: {
      backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
      backgroundSize: "40px 40px",
      opacity: 0.08,
    },
    colorize: true,
    positions: ["background"],
    energy_range: [0.0, 0.6],
    style_tags: ["tech", "structured", "minimal"],
    niche_tags: ["tech", "finance", "gaming"],
  },

  {
    id: "overlay_diagonal_grid",
    label: "Diagonal Grid",
    category: "overlay", subtype: "texture", render: "css_repeat", colorMode: "fill",
    css: {
      backgroundImage: "repeating-linear-gradient(45deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 20px), repeating-linear-gradient(-45deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 20px)",
      opacity: 0.07,
    },
    colorize: true,
    positions: ["background"],
    energy_range: [0.2, 0.7],
    style_tags: ["pattern", "dynamic", "structured"],
    niche_tags: ["all"],
  },

  {
    id: "overlay_vignette",
    label: "Vignette",
    category: "overlay", subtype: "texture", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
      <defs>
        <radialGradient id="vig_g" cx="50%" cy="50%" r="70%">
          <stop offset="30%" stop-color="currentColor" stop-opacity="0"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0.85"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#vig_g)"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    energy_range: [0.0, 0.8],
    style_tags: ["cinematic", "atmospheric", "film", "premium"],
    niche_tags: ["all"],
  },

  {
    id: "overlay_noise_grain",
    label: "Film Grain",
    category: "overlay", subtype: "texture", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
      <filter id="grain_f">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend in="SourceGraphic" mode="overlay"/>
      </filter>
      <rect width="300" height="300" filter="url(#grain_f)" fill="currentColor" opacity="0.05"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    energy_range: [0.0, 0.7],
    style_tags: ["texture", "film", "cinematic", "organic"],
    niche_tags: ["all"],
  },

  {
    id: "overlay_light_leak",
    label: "Light Leak",
    category: "overlay", subtype: "light", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" fill="none">
      <defs>
        <linearGradient id="leak_g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.6"/>
          <stop offset="60%" stop-color="currentColor" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="leak_g2" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="100" rx="120" ry="80" fill="url(#leak_g1)" transform="rotate(-20 50 100)"/>
      <ellipse cx="380" cy="600" rx="100" ry="60" fill="url(#leak_g2)" transform="rotate(15 380 600)"/>
    </svg>`,
    colorize: true,
    positions: ["background", "TL", "BR"],
    energy_range: [0.2, 0.8],
    style_tags: ["cinematic", "film", "atmospheric", "premium"],
    niche_tags: ["all"],
  },

  {
    id: "overlay_color_grade",
    label: "Color Grade Overlay",
    category: "overlay", subtype: "light", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grade_g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.25"/>
          <stop offset="50%" stop-color="currentColor" stop-opacity="0"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grade_g)"/>
    </svg>`,
    colorize: true,
    positions: ["background"],
    energy_range: [0.0, 0.8],
    style_tags: ["cinematic", "grading", "atmospheric"],
    niche_tags: ["all"],
  },

  /* ══════════════════════════════════════════════════════════
     ORGANIC & ATMOSPHERIC (8)
  ══════════════════════════════════════════════════════════ */

  {
    id: "ink_splash",
    label: "Ink Splash",
    category: "organic", subtype: "splash", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <path d="M100 20 C130 10 170 30 180 60 C195 100 180 150 155 170 C130 190 90 195 65 175 C35 152 15 115 20 80 C28 40 70 30 100 20 Z" fill="currentColor" opacity="0.9"/>
      <circle cx="160" cy="50" r="12" fill="currentColor" opacity="0.7"/>
      <circle cx="170" cy="75" r="6" fill="currentColor" opacity="0.5"/>
      <circle cx="40" cy="160" r="9" fill="currentColor" opacity="0.6"/>
      <circle cx="25" cy="140" r="4" fill="currentColor" opacity="0.4"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    energy_range: [0.4, 1.0],
    style_tags: ["organic", "bold", "artistic", "streetwear"],
    niche_tags: ["entertainment", "streetwear", "food", "beauty"],
  },

  {
    id: "paint_stroke_h",
    label: "Paint Stroke",
    category: "organic", subtype: "stroke", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" preserveAspectRatio="none" fill="none">
      <path d="M0 40 Q40 20 80 38 Q120 55 160 35 Q200 18 240 36 Q280 52 320 34 Q360 18 400 38 L400 55 Q360 35 320 52 Q280 68 240 50 Q200 34 160 52 Q120 68 80 52 Q40 36 0 55 Z" fill="currentColor" opacity="0.9"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.3, 0.9],
    style_tags: ["organic", "artistic", "bold", "handmade"],
    niche_tags: ["beauty", "food", "lifestyle", "entertainment"],
  },

  {
    id: "smoke_wisp",
    label: "Smoke Wisp",
    category: "organic", subtype: "atmospheric", render: "svg_filter", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" fill="none">
      <defs>
        <filter id="smoke_f" x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>
        <linearGradient id="smoke_g" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M100 380 Q80 300 110 220 Q140 140 90 60 Q70 20 100 0 Q130 20 115 60 Q90 140 120 220 Q148 300 120 380 Z" fill="url(#smoke_g)" filter="url(#smoke_f)"/>
    </svg>`,
    colorize: true,
    positions: ["floating", "background", "BL", "BR"],
    energy_range: [0.2, 0.8],
    style_tags: ["atmospheric", "cinematic", "soft", "mysterious"],
    niche_tags: ["entertainment", "beauty", "fashion", "gaming"],
  },

  {
    id: "grunge_splat",
    label: "Grunge Splat",
    category: "organic", subtype: "splash", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <path d="M100 15 L115 55 L158 40 L130 75 L170 85 L135 105 L160 140 L120 125 L115 170 L95 130 L65 165 L72 125 L35 140 L60 108 L20 95 L62 82 L38 48 L80 65 Z" fill="currentColor" opacity="0.85"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating"],
    energy_range: [0.5, 1.0],
    style_tags: ["bold", "grunge", "street", "energetic"],
    niche_tags: ["entertainment", "streetwear", "gaming", "sports"],
  },

  {
    id: "blob_asymmetric",
    label: "Asymmetric Blob",
    category: "organic", subtype: "blob", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" fill="none">
      <path d="M60 10 C100 -5 160 10 190 45 C220 80 215 140 185 170 C155 200 100 205 65 185 C30 165 5 125 8 85 C12 45 35 22 60 10 Z" fill="currentColor" opacity="0.85"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating", "background"],
    energy_range: [0.0, 0.7],
    style_tags: ["organic", "soft", "modern", "atmospheric"],
    niche_tags: ["beauty", "lifestyle", "health", "food"],
  },

  {
    id: "cloud_soft",
    label: "Soft Cloud",
    category: "organic", subtype: "atmospheric", render: "svg_filter", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" fill="none">
      <defs>
        <filter id="cloud_f" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="15"/>
        </filter>
      </defs>
      <ellipse cx="150" cy="80" rx="130" ry="55" fill="currentColor" filter="url(#cloud_f)" opacity="0.5"/>
      <ellipse cx="100" cy="70" rx="70" ry="45" fill="currentColor" filter="url(#cloud_f)" opacity="0.4"/>
      <ellipse cx="200" cy="75" rx="80" ry="40" fill="currentColor" filter="url(#cloud_f)" opacity="0.4"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "background", "floating"],
    energy_range: [0.0, 0.5],
    style_tags: ["soft", "atmospheric", "dreamy", "minimal"],
    niche_tags: ["lifestyle", "beauty", "health", "spiritual"],
  },

  {
    id: "liquid_blob",
    label: "Liquid Blob",
    category: "organic", subtype: "blob", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <path d="M95 5 C135 0 175 25 192 65 C210 105 200 155 172 180 C144 205 100 210 68 192 C36 174 12 140 8 100 C4 60 22 25 55 12 C70 5 80 6 95 5 Z" fill="currentColor" opacity="0.9"/>
    </svg>`,
    colorize: true,
    positions: ["TL", "TR", "BL", "BR", "floating", "background"],
    energy_range: [0.0, 0.65],
    style_tags: ["organic", "fluid", "modern", "soft"],
    niche_tags: ["beauty", "lifestyle", "health", "food"],
  },

  {
    id: "wave_swoosh",
    label: "Wave Swoosh",
    category: "organic", subtype: "stroke", render: "svg", colorMode: "fill",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" preserveAspectRatio="none" fill="none">
      <path d="M0 80 Q80 20 160 70 Q240 120 320 50 Q380 10 400 40 L400 80 Q380 50 320 90 Q240 130 160 80 Q80 30 0 90 Z" fill="currentColor" opacity="0.8"/>
    </svg>`,
    colorize: true,
    positions: ["top", "bottom", "floating"],
    energy_range: [0.3, 0.8],
    style_tags: ["organic", "fluid", "dynamic", "modern"],
    niche_tags: ["all"],
  },

];

/* ── Fast lookup by id ─────────────────────────────────── */
export const cinematicById = Object.fromEntries(
  cinematicRegistry.map(d => [d.id, d])
);

export default cinematicRegistry;
