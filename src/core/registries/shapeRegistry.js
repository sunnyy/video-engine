/**
 * shapeRegistry.js
 * src/core/registries/shapeRegistry.js
 *
 * Comprehensive shape library for type:"decorative" zones.
 * Also exposes getClipPathCSS() so shapes can mask asset zones.
 *
 * Metadata fields per shape:
 *   intent      — array of beat intents this shape suits
 *   niche_tags  — array of content niches this shape suits
 *   energy_range — [min, max] float 0.0–1.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helper: regular polygon points in 100×100 viewBox
// ─────────────────────────────────────────────────────────────────────────────
function polyPoints(sides, r = 46, cx = 50, cy = 50, startDeg = -90) {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((startDeg + i * 360 / sides) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape Definitions
// ─────────────────────────────────────────────────────────────────────────────
export const shapeRegistry = {

  // ── Line ──────────────────────────────────────────────────
  line: {
    label: "Line", icon: "—", group: "basic",
    intent: ["visual_rest", "explanation", "contrast"],
    niche_tags: ["all"],
    energy_range: [0.0, 0.5],
    clipPath: null,
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0, orientation: "horizontal" },
  },

  // ── Circles & Ellipses ────────────────────────────────────
  circle: {
    label: "Circle", icon: "○", group: "basic",
    intent: ["visual_rest", "hook", "proof", "empathy"],
    niche_tags: ["all"],
    energy_range: [0.0, 0.7],
    clipPath: "circle(50% at 50% 50%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  ellipse: {
    label: "Ellipse", icon: "⬭", group: "basic",
    intent: ["visual_rest", "empathy", "testimonial"],
    niche_tags: ["health", "beauty", "lifestyle", "food"],
    energy_range: [0.0, 0.5],
    clipPath: "ellipse(50% 32% at 50% 50%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  semicircle: {
    label: "Semicircle", icon: "◗", group: "basic",
    intent: ["hook", "visual_rest", "reveal"],
    niche_tags: ["tech", "finance", "all"],
    energy_range: [0.2, 0.7],
    clipPath: "polygon(0% 50%, 2.4% 34.5%, 9.5% 20.6%, 20.6% 9.5%, 34.5% 2.4%, 50% 0%, 65.5% 2.4%, 79.4% 9.5%, 90.5% 20.6%, 97.6% 34.5%, 100% 50%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: true, borderRadius: 0, rotation: 0 },
  },

  ring: {
    label: "Ring", icon: "⊙", group: "basic",
    intent: ["hook", "proof", "stat", "cta"],
    niche_tags: ["all"],
    energy_range: [0.3, 0.8],
    clipPath: null, // uses SVG evenodd
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0, ringThickness: 0.35 },
  },

  // ── Rectangles ────────────────────────────────────────────
  square: {
    label: "Square", icon: "□", group: "basic",
    intent: ["proof", "explanation", "stat"],
    niche_tags: ["all"],
    energy_range: [0.0, 0.6],
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  rectangle: {
    label: "Rectangle", icon: "▬", group: "basic",
    intent: ["proof", "explanation", "stat"],
    niche_tags: ["all"],
    energy_range: [0.0, 0.6],
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  pill: {
    label: "Pill", icon: "▬", group: "basic",
    intent: ["cta", "hook", "reveal"],
    niche_tags: ["tech", "beauty", "lifestyle", "health"],
    energy_range: [0.3, 0.8],
    clipPath: "ellipse(50% 50% at 50% 50%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 50, rotation: 0 },
  },

  // ── Triangles ─────────────────────────────────────────────
  triangle: {
    label: "Triangle", icon: "△", group: "polygon",
    intent: ["hook", "escalate", "reveal", "urgency"],
    niche_tags: ["sports", "gaming", "entertainment", "motivational"],
    energy_range: [0.5, 1.0],
    clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  right_triangle: {
    label: "Right △", icon: "◺", group: "polygon",
    intent: ["hook", "contrast", "explanation"],
    niche_tags: ["tech", "finance", "education"],
    energy_range: [0.3, 0.8],
    clipPath: "polygon(0% 0%, 100% 100%, 0% 100%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  scalene: {
    label: "Scalene △", icon: "◭", group: "polygon",
    intent: ["hook", "shock", "contrast"],
    niche_tags: ["entertainment", "gaming", "sports"],
    energy_range: [0.6, 1.0],
    clipPath: "polygon(15% 100%, 95% 85%, 40% 0%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  // ── Regular Polygons ──────────────────────────────────────
  diamond: {
    label: "Diamond", icon: "◇", group: "polygon",
    intent: ["reveal", "proof", "stat"],
    niche_tags: ["finance", "beauty", "lifestyle"],
    energy_range: [0.3, 0.7],
    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  pentagon: {
    label: "Pentagon", icon: "⬠", group: "polygon",
    intent: ["proof", "stat", "reveal"],
    niche_tags: ["gaming", "tech", "sports"],
    energy_range: [0.4, 0.8],
    clipPath: `polygon(${polyPoints(5, 48, 50, 50, -90).split(" ").map(p => { const [x,y]=p.split(","); return `${(+x).toFixed(1)}% ${(+y).toFixed(1)}%`; }).join(", ")})`,
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  hexagon: {
    label: "Hexagon", icon: "⬡", group: "polygon",
    intent: ["proof", "stat", "explanation"],
    niche_tags: ["tech", "gaming", "education", "finance"],
    energy_range: [0.3, 0.7],
    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  octagon: {
    label: "Octagon", icon: "⯃", group: "polygon",
    intent: ["stat", "proof", "explanation"],
    niche_tags: ["tech", "finance", "education"],
    energy_range: [0.3, 0.7],
    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  // ── Stars ─────────────────────────────────────────────────
  star: {
    label: "Star", icon: "★", group: "polygon",
    intent: ["proof", "hook", "reveal", "cta"],
    niche_tags: ["entertainment", "lifestyle", "gaming", "motivational"],
    energy_range: [0.5, 1.0],
    clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0, points: 5, innerRadius: 0.45 },
  },

  // ── Parallelograms & Quads ────────────────────────────────
  trapezoid: {
    label: "Trapezoid", icon: "⏢", group: "quad",
    intent: ["hook", "reveal", "escalate"],
    niche_tags: ["tech", "entertainment", "sports"],
    energy_range: [0.3, 0.7],
    clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  parallelogram: {
    label: "Parallelogram", icon: "▱", group: "quad",
    intent: ["hook", "escalate", "cta"],
    niche_tags: ["sports", "gaming", "entertainment"],
    energy_range: [0.5, 1.0],
    clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  kite: {
    label: "Kite", icon: "🪁", group: "quad",
    intent: ["hook", "reveal", "visual_rest"],
    niche_tags: ["lifestyle", "food", "entertainment"],
    energy_range: [0.2, 0.6],
    clipPath: "polygon(50% 0%, 90% 40%, 50% 100%, 10% 40%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0 },
  },

  rhombus: {
    label: "Rhombus", icon: "◆", group: "quad",
    intent: ["stat", "proof", "reveal"],
    niche_tags: ["finance", "tech", "education"],
    energy_range: [0.3, 0.7],
    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  // ── Arrows ────────────────────────────────────────────────
  arrow_right: {
    label: "Arrow →", icon: "→", group: "arrow",
    intent: ["cta", "hook", "escalate", "reveal"],
    niche_tags: ["all"],
    energy_range: [0.5, 1.0],
    clipPath: "polygon(0% 35%, 60% 35%, 60% 12%, 100% 50%, 60% 88%, 60% 65%, 0% 65%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  arrow_left: {
    label: "Arrow ←", icon: "←", group: "arrow",
    intent: ["contrast", "explanation"],
    niche_tags: ["education", "tech"],
    energy_range: [0.2, 0.6],
    clipPath: "polygon(100% 35%, 40% 35%, 40% 12%, 0% 50%, 40% 88%, 40% 65%, 100% 65%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  arrow_up: {
    label: "Arrow ↑", icon: "↑", group: "arrow",
    intent: ["stat", "proof", "escalate", "hook"],
    niche_tags: ["finance", "sports", "health", "motivational"],
    energy_range: [0.6, 1.0],
    clipPath: "polygon(35% 100%, 35% 40%, 12% 40%, 50% 0%, 88% 40%, 65% 40%, 65% 100%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  arrow_down: {
    label: "Arrow ↓", icon: "↓", group: "arrow",
    intent: ["contrast", "shock", "stat"],
    niche_tags: ["finance", "entertainment", "sports"],
    energy_range: [0.5, 0.9],
    clipPath: "polygon(35% 0%, 35% 60%, 12% 60%, 50% 100%, 88% 60%, 65% 60%, 65% 0%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  chevron: {
    label: "Chevron ›", icon: "›", group: "arrow",
    intent: ["cta", "hook", "reveal"],
    niche_tags: ["tech", "entertainment", "lifestyle"],
    energy_range: [0.4, 0.8],
    clipPath: "polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  // ── Organic / Special ─────────────────────────────────────
  heart: {
    label: "Heart", icon: "♥", group: "organic",
    intent: ["empathy", "proof", "testimonial"],
    niche_tags: ["lifestyle", "health", "food", "beauty"],
    energy_range: [0.2, 0.6],
    clipPath: null, // SVG path
    defaults: { color: "#ff3366", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  crescent: {
    label: "Crescent", icon: "☽", group: "organic",
    intent: ["visual_rest", "empathy"],
    niche_tags: ["lifestyle", "beauty", "health"],
    energy_range: [0.0, 0.4],
    clipPath: null, // SVG evenodd
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  pac_man: {
    label: "Pac-Man", icon: "◔", group: "organic",
    intent: ["hook", "escalate", "cta"],
    niche_tags: ["gaming", "entertainment", "food"],
    energy_range: [0.5, 1.0],
    clipPath: "polygon(50% 50%, 89.8% 73%, 73% 89.8%, 50% 96%, 27% 89.8%, 10.2% 73%, 4% 50%, 10.2% 27%, 27% 10.2%, 50% 4%, 73% 10.2%, 89.8% 27%)",
    defaults: { color: "#ffdd00", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  trefoil: {
    label: "Trefoil", icon: "☘", group: "organic",
    intent: ["visual_rest", "hook", "reveal"],
    niche_tags: ["lifestyle", "food", "health", "beauty"],
    energy_range: [0.1, 0.5],
    clipPath: null, // SVG circles
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  quatrefoil: {
    label: "Quatrefoil", icon: "✤", group: "organic",
    intent: ["visual_rest", "proof"],
    niche_tags: ["beauty", "lifestyle", "food"],
    energy_range: [0.0, 0.4],
    clipPath: null, // SVG circles
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0 },
  },

  // ── Cross ─────────────────────────────────────────────────
  cross: {
    label: "Cross / Plus", icon: "+", group: "basic",
    intent: ["proof", "cta", "explanation"],
    niche_tags: ["health", "education", "lifestyle"],
    energy_range: [0.3, 0.7],
    clipPath: "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)",
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0, thickness: 0.25 },
  },

  // ── Decorative Lines / Waves ──────────────────────────────
  arc: {
    label: "Arc", icon: "⌒", group: "line",
    intent: ["visual_rest", "reveal", "hook"],
    niche_tags: ["lifestyle", "beauty", "tech"],
    energy_range: [0.1, 0.5],
    clipPath: null,
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0, startAngle: 0, endAngle: 180 },
  },

  wave: {
    label: "Wave", icon: "∿", group: "line",
    intent: ["visual_rest", "empathy", "hook"],
    niche_tags: ["health", "lifestyle", "food"],
    energy_range: [0.0, 0.5],
    clipPath: null,
    defaults: { color: "#ffffff", opacity: 1, strokeWidth: 3, filled: false, borderRadius: 0, rotation: 0, frequency: 2, amplitude: 0.35 },
  },

  dots: {
    label: "Dot Row", icon: "···", group: "line",
    intent: ["visual_rest", "explanation"],
    niche_tags: ["all"],
    energy_range: [0.0, 0.4],
    clipPath: null,
    defaults: { color: "#ffffff", opacity: 0.7, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0, count: 5, spacing: 0.2 },
  },

  // ── Gradient shapes ───────────────────────────────────────
  gradient_bar: {
    label: "Gradient Bar", icon: "▬", group: "gradient",
    intent: ["hook", "cta", "reveal"],
    niche_tags: ["tech", "entertainment", "lifestyle"],
    energy_range: [0.4, 0.9],
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    defaults: {
      color: "#7c5cfc", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 8, rotation: 0,
      gradientType: "linear", gradientAngle: 90,
      gradientColor1: "#7c5cfc", gradientColor2: "#c084fc",
    },
  },

  gradient_circle: {
    label: "Gradient Circle", icon: "◉", group: "gradient",
    intent: ["visual_rest", "hook", "reveal"],
    niche_tags: ["all"],
    energy_range: [0.1, 0.6],
    clipPath: "circle(50% at 50% 50%)",
    defaults: {
      color: "#7c5cfc", opacity: 1, strokeWidth: 0, filled: true, borderRadius: 0, rotation: 0,
      gradientType: "radial",
      gradientColor1: "#7c5cfc", gradientColor2: "#1e1e3a",
    },
  },
};

export default shapeRegistry;

export const SHAPE_KEYS = Object.keys(shapeRegistry);

// ─────────────────────────────────────────────────────────────────────────────
// Picker options (backward-compat name kept)
// ─────────────────────────────────────────────────────────────────────────────
export const DECORATIVE_SHAPE_OPTIONS = Object.entries(shapeRegistry).map(([id, entry]) => ({
  id,
  label:    entry.label,
  icon:     entry.icon,
  group:    entry.group,
  defaults: entry.defaults,
}));

// ─────────────────────────────────────────────────────────────────────────────
// CSS clip-path for asset zone masking (returns null if shape requires SVG clip)
// ─────────────────────────────────────────────────────────────────────────────
export function getClipPathCSS(shapeId) {
  return shapeRegistry[shapeId]?.clipPath || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG content for complex masks (objectBoundingBox units, 0–1)
// ─────────────────────────────────────────────────────────────────────────────
export function getSVGClipContent(shapeId) {
  switch (shapeId) {
    case "heart":
      return `<path d="M 0.5,0.8 C 0.2,0.65 0.03,0.5 0.03,0.33 C 0.03,0.14 0.18,0.05 0.35,0.1 C 0.41,0.12 0.46,0.17 0.5,0.23 C 0.54,0.17 0.59,0.12 0.65,0.1 C 0.82,0.05 0.97,0.14 0.97,0.33 C 0.97,0.5 0.8,0.65 0.5,0.8 Z"/>`;
    case "ring":
      return `<path fill-rule="evenodd" d="M 0.5,0.04 A 0.46,0.46 0 1,0 0.5001,0.04 Z M 0.5,0.26 A 0.24,0.24 0 1,1 0.5001,0.26 Z"/>`;
    case "crescent":
      return `<path fill-rule="evenodd" d="M 0.5,0.05 A 0.45,0.45 0 1,0 0.5001,0.05 Z M 0.65,0.08 A 0.38,0.38 0 1,1 0.6501,0.08 Z"/>`;
    case "trefoil":
      return `<circle cx="0.5" cy="0.28" r="0.28"/><circle cx="0.69" cy="0.61" r="0.28"/><circle cx="0.31" cy="0.61" r="0.28"/>`;
    case "quatrefoil":
      return `<circle cx="0.5" cy="0.22" r="0.28"/><circle cx="0.78" cy="0.5" r="0.28"/><circle cx="0.5" cy="0.78" r="0.28"/><circle cx="0.22" cy="0.5" r="0.28"/>`;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG renderer (for decorative zone display, NOT masking)
// instanceId: used for unique gradient/filter IDs when multiple zones share shape
// ─────────────────────────────────────────────────────────────────────────────
export function renderDecorativeSVG(shapeId, style = {}, instanceId = "x") {
  const reg = shapeRegistry[shapeId];
  if (!reg) return null;

  const st        = { ...reg.defaults, ...style };
  const color     = st.color       || "#ffffff";
  const sw        = st.strokeWidth ?? 3;
  const filled    = st.filled      ?? false;
  const gradType  = st.gradientType || "none";
  const viewBox   = "0 0 100 100";

  const gradId    = `dg_${shapeId}_${instanceId}`;
  const useFill   = filled || gradType !== "none";
  let   gradDefs  = "";
  let   fillAttr  = useFill   ? color  : "none";
  let   strokeAttr= useFill   ? "none" : color;

  if (gradType === "linear" || gradType === "radial") {
    const rawStops = st.gradientStops?.length >= 2
      ? st.gradientStops
      : [
          { pos: 0,   color: st.gradientColor1 || color,    opacity: st.gradientOpacity1 ?? 100 },
          { pos: 100, color: st.gradientColor2 || "#000000", opacity: st.gradientOpacity2 ?? 100 },
        ];
    const stopsSVG = [...rawStops]
      .sort((a, b) => a.pos - b.pos)
      .map(s => `<stop offset="${s.pos}%" stop-color="${s.color}" stop-opacity="${(s.opacity ?? 100) / 100}"/>`)
      .join("");

    if (gradType === "linear") {
      const angle = st.gradientAngle || 0;
      const rad   = (angle * Math.PI) / 180;
      gradDefs = `<defs><linearGradient id="${gradId}" x1="${(0.5 - 0.5*Math.sin(rad)).toFixed(3)}" y1="${(0.5 + 0.5*Math.cos(rad)).toFixed(3)}" x2="${(0.5 + 0.5*Math.sin(rad)).toFixed(3)}" y2="${(0.5 - 0.5*Math.cos(rad)).toFixed(3)}" gradientUnits="objectBoundingBox">${stopsSVG}</linearGradient></defs>`;
    } else {
      gradDefs = `<defs><radialGradient id="${gradId}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">${stopsSVG}</radialGradient></defs>`;
    }
    fillAttr   = `url(#${gradId})`;
    strokeAttr = "none";
  }

  let content = "";

  switch (shapeId) {

    case "line": {
      const orient = st.orientation || "horizontal";
      const coords = orient === "horizontal"   ? [2,50,98,50]
        : orient === "vertical"                ? [50,2,50,98]
        : orient === "diagonal-45"             ? [2,98,98,2]
        :                                        [2,2,98,98];
      content = `<line x1="${coords[0]}" y1="${coords[1]}" x2="${coords[2]}" y2="${coords[3]}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
      break;
    }

    case "circle": {
      const r = 50 - sw / 2 - 2;
      content = `${gradDefs}<circle cx="50" cy="50" r="${r.toFixed(1)}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}"/>`;
      break;
    }

    case "ellipse": {
      content = `${gradDefs}<ellipse cx="50" cy="50" rx="48" ry="32" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}"/>`;
      break;
    }

    case "semicircle": {
      content = `${gradDefs}<path d="M 3,50 A 47,47 0 0,1 97,50 Z" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}"/>`;
      break;
    }

    case "ring": {
      const thickness = st.ringThickness ?? 0.35;
      const outerR    = 46;
      const innerR    = Math.round(outerR * (1 - thickness));
      content = `${gradDefs}<path fill-rule="evenodd" d="M 50,${50-outerR} A ${outerR},${outerR} 0 1,0 50.001,${50-outerR} Z M 50,${50-innerR} A ${innerR},${innerR} 0 1,1 50.001,${50-innerR} Z" fill="${fillAttr}"/>`;
      break;
    }

    case "square":
    case "rectangle":
    case "pill":
    case "gradient_bar": {
      const br    = st.borderRadius ?? 0;
      const inset = useFill ? 0 : sw / 2;
      const size  = 100 - inset * 2;
      content = `${gradDefs}<rect x="${inset.toFixed(1)}" y="${inset.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${br}" ry="${br}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}"/>`;
      break;
    }

    case "gradient_circle": {
      content = `${gradDefs}<circle cx="50" cy="50" r="48" fill="${fillAttr}"/>`;
      break;
    }

    case "triangle": {
      content = `${gradDefs}<polygon points="50,4 96,94 4,94" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
      break;
    }

    case "right_triangle": {
      content = `${gradDefs}<polygon points="5,90 95,90 5,10" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "scalene": {
      content = `${gradDefs}<polygon points="15,90 95,85 40,5" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "diamond":
    case "rhombus": {
      content = `${gradDefs}<polygon points="50,4 96,50 50,96 4,50" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "pentagon": {
      const pts = polyPoints(5, 46, 50, 50, -90);
      content = `${gradDefs}<polygon points="${pts}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "hexagon": {
      const pts = polyPoints(6, 46, 50, 50, -90);
      content = `${gradDefs}<polygon points="${pts}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "octagon": {
      const pts = polyPoints(8, 46, 50, 50, -90);
      content = `${gradDefs}<polygon points="${pts}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "star": {
      const pts2    = st.points      ?? 5;
      const innerR2 = st.innerRadius ?? 0.45;
      const outerR2 = 46;
      const ir      = outerR2 * innerR2;
      const step    = Math.PI / pts2;
      const pathPts = Array.from({ length: pts2 * 2 }, (_, i) => {
        const a  = i * step - Math.PI / 2;
        const r3 = i % 2 === 0 ? outerR2 : ir;
        return `${(50 + r3 * Math.cos(a)).toFixed(2)},${(50 + r3 * Math.sin(a)).toFixed(2)}`;
      });
      content = `${gradDefs}<polygon points="${pathPts.join(" ")}" fill="${fillAttr || color}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "trapezoid": {
      content = `${gradDefs}<polygon points="20,8 80,8 95,92 5,92" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "parallelogram": {
      content = `${gradDefs}<polygon points="20,8 95,8 80,92 5,92" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "kite": {
      content = `${gradDefs}<polygon points="50,4 90,42 50,96 10,42" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "cross": {
      const thick = (st.thickness ?? 0.25) * 100;
      const arm   = (100 - thick) / 2;
      const pts3  = [
        `${arm},0`, `${arm+thick},0`, `${arm+thick},${arm}`, `100,${arm}`,
        `100,${arm+thick}`, `${arm+thick},${arm+thick}`, `${arm+thick},100`,
        `${arm},100`, `${arm},${arm+thick}`, `0,${arm+thick}`, `0,${arm}`, `${arm},${arm}`,
      ].join(" ");
      content = `${gradDefs}<polygon points="${pts3}" fill="${fillAttr || color}" stroke="${strokeAttr}" stroke-width="${sw}"/>`;
      break;
    }

    case "arrow_right": {
      content = `${gradDefs}<polygon points="5,35 60,35 60,12 95,50 60,88 60,65 5,65" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }
    case "arrow_left": {
      content = `${gradDefs}<polygon points="95,35 40,35 40,12 5,50 40,88 40,65 95,65" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }
    case "arrow_up": {
      content = `${gradDefs}<polygon points="35,95 35,40 12,40 50,5 88,40 65,40 65,95" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }
    case "arrow_down": {
      content = `${gradDefs}<polygon points="35,5 35,60 12,60 50,95 88,60 65,60 65,5" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }
    case "chevron": {
      content = `${gradDefs}<polygon points="5,5 72,5 95,50 72,95 5,95 28,50" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }

    case "heart": {
      content = `${gradDefs}<path d="M 50,80 C 20,63 3,50 3,32 C 3,14 18,5 35,12 C 41,15 46,19 50,25 C 54,19 59,15 65,12 C 82,5 97,14 97,32 C 97,50 80,63 50,80 Z" fill="${fillAttr || color}" stroke="${strokeAttr}" stroke-width="${sw}"/>`;
      break;
    }

    case "crescent": {
      content = `${gradDefs}<path fill-rule="evenodd" d="M 50,4 A 46,46 0 1,0 50.001,4 Z M 65,12 A 35,35 0 1,1 65.001,12 Z" fill="${fillAttr}" stroke="none"/>`;
      break;
    }

    case "pac_man": {
      content = `${gradDefs}<path d="M 50,50 L 93.3,25 A 50,50 0 1,0 93.3,75 Z" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}"/>`;
      break;
    }

    case "trefoil": {
      content = `${gradDefs}<circle cx="50" cy="28" r="28" fill="${fillAttr}"/><circle cx="69" cy="61" r="28" fill="${fillAttr}"/><circle cx="31" cy="61" r="28" fill="${fillAttr}"/>`;
      break;
    }

    case "quatrefoil": {
      content = `${gradDefs}<circle cx="50" cy="22" r="28" fill="${fillAttr}"/><circle cx="78" cy="50" r="28" fill="${fillAttr}"/><circle cx="50" cy="78" r="28" fill="${fillAttr}"/><circle cx="22" cy="50" r="28" fill="${fillAttr}"/>`;
      break;
    }

    case "arc": {
      const startDeg = st.startAngle ?? 0;
      const endDeg   = st.endAngle   ?? 180;
      const toRad    = d => (d - 90) * Math.PI / 180;
      const r4       = 44;
      const sx       = 50 + r4 * Math.cos(toRad(startDeg));
      const sy       = 50 + r4 * Math.sin(toRad(startDeg));
      const ex       = 50 + r4 * Math.cos(toRad(endDeg));
      const ey       = 50 + r4 * Math.sin(toRad(endDeg));
      const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
      content = `<path d="M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r4} ${r4} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
      break;
    }

    case "wave": {
      const freq = st.frequency  ?? 2;
      const amp  = (st.amplitude ?? 0.35) * 50;
      const pts4 = Array.from({ length: 61 }, (_, i) => {
        const x = (i / 60) * 100;
        const y = 50 + amp * Math.sin((i / 60) * Math.PI * 2 * freq);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      });
      content = `<path d="${pts4.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    }

    case "dots": {
      const count   = st.count   ?? 5;
      const spacing = st.spacing ?? 0.2;
      const r5      = 6;
      const total   = count * r5 * 2 + (count - 1) * spacing * 100;
      const startX  = (100 - total) / 2 + r5;
      const step2   = r5 * 2 + spacing * 100;
      content = Array.from({ length: count }, (_, i) =>
        `<circle cx="${(startX + i * step2).toFixed(1)}" cy="50" r="${r5}" fill="${color}"/>`
      ).join("");
      break;
    }

    default:
      return null;
  }

  return { viewBox, content };
}
