/**
 * layerBuilder.js — editorial direct-layer builder for product video scenes.
 *
 * Layout philosophy:
 *  • Text lives in two safe zones: top strip (y 160–320) and bottom zone (y 975–1780).
 *  • Product sits in the center/lower area — text never competes with it.
 *  • All body/headline text is LEFT-ALIGNED for an editorial, confident feel.
 *  • Each scene has a visual hierarchy: kicker → headline → accent → feature strip.
 */

const W   = 1080;
const H   = 1920;
const PAD = 60;
const CW  = W - PAD * 2;   // 960
const CX  = W / 2;          // 540

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

// ── Font helpers ───────────────────────────────────────────────────────────────

function heroFont(mood) {
  return ["premium", "elegant", "minimalist"].includes(mood) ? "Inter" : "Bebas Neue";
}
function heroWeight(mood) {
  return ["premium", "elegant"].includes(mood) ? "700" : "400";
}
function bodyFont() { return "Inter"; }

function textColor(theme, a = 1) {
  return theme === "light" ? `rgba(10,10,18,${a})` : `rgba(255,255,255,${a})`;
}

// ── Animation helpers ──────────────────────────────────────────────────────────

function noAnim() {
  return {
    keyframes:  { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
  };
}
function fadeUp(y, d = 0) {
  return {
    keyframes: {
      x: [], scale: [], rotation: [], blur: [],
      opacity: [{ time: d, value: 0 }, { time: d + 0.40, value: 1 }],
      y:       [{ time: d, value: y + 48 }, { time: d + 0.40, value: y }],
    },
    transition: { in: { type: "fade", duration: 0.35 }, out: { type: "none", duration: 0 } },
  };
}
function scaleIn(d = 0) {
  return {
    keyframes: {
      x: [], y: [], rotation: [], blur: [],
      opacity: [{ time: d, value: 0 }, { time: d + 0.40, value: 1 }],
      scale:   [{ time: d, value: 0.88 }, { time: d + 0.40, value: 1 }],
    },
    transition: { in: { type: "fade", duration: 0.35 }, out: { type: "none", duration: 0 } },
  };
}

// ── Base helpers ───────────────────────────────────────────────────────────────

function tr(x, y, w, h, extra = {}) {
  return { x, y, width: w, height: h, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff", ...extra };
}
function layerBase(id, type, start, end, zIndex, anim) {
  return {
    id, trackId: id, type, start, end, zIndex,
    visible: true, locked: false,
    sfx: null, filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
    ...(anim ?? noAnim()),
  };
}

// ── Primitive builders ─────────────────────────────────────────────────────────

function bgImage(si, url, start, end) {
  return {
    ...layerBase(`s${si}_bg`, "image", start, end, 0),
    name: "BG", src: url, objectFit: "cover", assetType: "product_bg",
    transform: tr(0, 0, W, H),
  };
}

function gradLayer(id, gradient, start, end, zIndex, x = 0, y = 0, w = W, h = H, br = 0, anim = null) {
  return {
    ...layerBase(id, "gradient", start, end, zIndex, anim),
    name: id.split("_").slice(1).join(" "),
    gradient,
    transform: tr(x, y, w, h, { borderRadius: br }),
  };
}

const STRONG_SHADOW = "0 3px 32px rgba(0,0,0,0.95), 0 8px 64px rgba(0,0,0,0.70)";
const MED_SHADOW    = "0 2px 20px rgba(0,0,0,0.85), 0 4px 40px rgba(0,0,0,0.55)";
const LIGHT_SHADOW  = "0 2px 16px rgba(0,0,0,0.40)";

function shadowFor(theme) { return theme === "light" ? LIGHT_SHADOW : STRONG_SHADOW; }

// Left-aligned text layer (default for editorial layouts)
function txtLayer(id, text, x, y, w, h, size, family, weight, color, tracking, shadow, start, end, zi, delay = 0, styleExtra = {}) {
  return {
    ...layerBase(id, "text", start, end, zi, fadeUp(y, delay)),
    name: id.split("_").slice(1).join(" "),
    content: text,
    transform: tr(x, y, w, h),
    style: {
      fontSize: size, fontFamily: family, fontWeight: weight, color,
      textAlign: "left", lineHeight: 1.10, letterSpacing: tracking,
      textShadow: shadow, _captionStyle: null,
      ...styleExtra,
    },
    captionStyle: null,
  };
}

// ── Design elements ────────────────────────────────────────────────────────────

// Short left-anchored accent bar — modern/editorial (not centered pill)
function accentBar(si, y, accentColor, start, end, w = 72, zi = 9) {
  return gradLayer(`s${si}_bar`, accentColor, start, end, zi, PAD, y, w, 5, 3, scaleIn(0.04));
}

// Thin vertical left bar (for feature item rows)
function leftBar(id, y, h, accentColor, start, end) {
  return gradLayer(id, accentColor, start, end, 9, PAD, y, 5, h, 2, scaleIn(0.04));
}

// Small chip/pill badge — used for category and section labels
function chipBadge(si, text, y, accentColor, start, end) {
  const chipW = Math.min(Math.max(text.length * 21 + 64, 160), 520);
  const chipH = 58;
  return [
    gradLayer(`s${si}_chip`, accentColor, start, end, 9, PAD, y, chipW, chipH, 29, scaleIn(0)),
    txtLayer(`s${si}_chip_txt`, text, PAD, y + 13, chipW, 36, 29, bodyFont(), "700", "#ffffff", 5,
      "0 1px 8px rgba(0,0,0,0.40)", start, end, 10, 0.05, { textAlign: "center", letterSpacing: 5 }),
  ];
}

// Small editorial kicker line — sits above the hero headline
// e.g. "STEP INTO EVERYDAY CONFIDENCE" or "NOT YOUR AVERAGE SNEAKER"
function kickerLine(id, text, y, color, start, end, zi = 9, delay = 0) {
  return txtLayer(id, text.toUpperCase(), PAD, y, CW, 55, 33, bodyFont(), "600", color, 9,
    MED_SHADOW, start, end, zi, delay, { letterSpacing: 9, textAlign: "left" });
}

// Horizontal feature strip — 3 short items with separator lines
// Parses a line containing "·" or "|" separators, or accepts an array
function featureStrip(si, items, y, theme, accentColor, start, end) {
  if (!items || items.length === 0) return [];
  const cols = items.slice(0, 3);
  const colW = Math.floor(CW / cols.length);
  const layers = [];

  // Dark strip background
  layers.push(gradLayer(`s${si}_fstrip`, "rgba(0,0,0,0.50)", start, end, 7, 0, y - 22, W, 96, 0, scaleIn(0.18)));

  cols.forEach((item, i) => {
    const x = PAD + i * colW;
    layers.push(
      txtLayer(`s${si}_fi${i}`, item.toUpperCase(), x + 8, y, colW - 16, 58, 27, bodyFont(), "600",
        textColor(theme, 0.90), 2, MED_SHADOW, start, end, 10, 0.18 + i * 0.07,
        { textAlign: "center", letterSpacing: 3 })
    );
    if (i < cols.length - 1) {
      // Vertical separator
      layers.push(gradLayer(`s${si}_fsep${i}`, "rgba(255,255,255,0.22)", start, end, 10,
        x + colW - 1, y + 8, 2, 40, 0, scaleIn(0.18)));
    }
  });
  return layers;
}

// Semi-transparent dark card for feature lists — ensures legibility over any photo
function featureCard(si, y, h, start, end) {
  return gradLayer(`s${si}_card`, "rgba(4,5,18,0.62)", start, end, 5, 24, y - 24, W - 48, h + 48, 20, scaleIn(0.04));
}

// CTA pill button (centered)
function ctaButton(si, label, accentColor, y, start, end) {
  const btnW = 700, btnH = 120;
  const btnX = CX - btnW / 2;
  return [
    gradLayer(`s${si}_btn`, accentColor, start, end, 11, btnX, y, btnW, btnH, 60, scaleIn(0.18)),
    txtLayer(`s${si}_btn_txt`, label, btnX, y + 24, btnW, btnH - 24, 52, bodyFont(), "700", "#ffffff",
      2, "0 2px 14px rgba(0,0,0,0.45)", start, end, 12, 0.24, { textAlign: "center" }),
  ];
}

// Standard bottom dark gradient
function bottomDark(si, start, end, stop = 0.90) {
  return gradLayer(`s${si}_btm`,
    `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,${stop}) 100%)`,
    start, end, 2);
}

// Top vignette (keeps top text readable)
function topVignette(si, grad, start, end) {
  return gradLayer(`s${si}_top`, grad, start, end, 1);
}

// ── Strip parser ───────────────────────────────────────────────────────────────

// If a display_line contains "·" or "|" separators, parse into items array
function parseStripLine(line) {
  if (!line) return null;
  if (line.includes("·")) return line.split("·").map(s => s.trim()).filter(Boolean);
  if (line.includes("|")) return line.split("|").map(s => s.trim()).filter(Boolean);
  return null;
}

// ── Per-intent scene builders ──────────────────────────────────────────────────

// HOOK — kicker + TWO-TONE headline (line1 white, line2 accent) + feature strip
// display_lines = [kicker, headline_line1_white, headline_line2_accent, optional_strip]
function hookScene(scene, shotUrl, ctx, start, end) {
  const { accentColor, theme, productMood: mood, productCategory } = ctx;
  const si    = scene.scene_index;
  const lines = scene.display_lines ?? [];

  // Parse display_lines: kicker / hl1 (white) / hl2 (accent) / strip
  let kicker = null, hl1 = null, hl2 = null, stripItems = null;

  if (lines.length >= 3) {
    const maybeStrip = parseStripLine(lines[3] ?? lines[2]);
    if (maybeStrip) {
      kicker     = lines[0];
      hl1        = lines[1];
      hl2        = lines[2];
      stripItems = maybeStrip;
    } else {
      kicker = lines[0];
      hl1    = lines[1];
      hl2    = lines[2];
    }
  } else if (lines.length === 2) {
    kicker = lines[0];
    hl1    = lines[1];
  } else {
    hl1 = lines[0] ?? scene.script_segment;
  }

  // Category chip — top left
  const chip = productCategory
    ? chipBadge(si, productCategory.toUpperCase(), 168, accentColor, start, end)
    : [];

  const fontSize   = 158;
  const lineH      = Math.round(fontSize * 1.08);  // ~170px per line
  const KICKER_Y   = 985;
  const HL1_Y      = kicker ? 1042 : 985;
  const HL2_Y      = HL1_Y + lineH;
  const BAR_Y      = HL2_Y + lineH - 20;
  const STRIP_Y    = 1720;

  return [
    bgImage(si, shotUrl, start, end),
    topVignette(si, "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 22%)", start, end),
    bottomDark(si, start, end, 0.90),

    ...chip,

    // Kicker — small spaced line
    ...(kicker ? [kickerLine(`s${si}_kicker`, kicker, KICKER_Y, `rgba(255,255,255,0.65)`, start, end, 9, 0.04)] : []),

    // Headline line 1 — white
    ...(hl1 ? [txtLayer(`s${si}_hl1`, hl1, PAD, HL1_Y, CW, lineH + 10, fontSize, heroFont(mood), heroWeight(mood),
      "#ffffff", 1, shadowFor(theme), start, end, 10, 0.09, { lineHeight: 1.0 })] : []),

    // Headline line 2 — accent color
    ...(hl2 ? [txtLayer(`s${si}_hl2`, hl2, PAD, HL2_Y, CW, lineH + 10, fontSize, heroFont(mood), heroWeight(mood),
      accentColor, 1, shadowFor(theme), start, end, 10, 0.14, { lineHeight: 1.0 })] : []),

    // Short left accent bar
    accentBar(si, BAR_Y, accentColor, start, end, 72, 9),

    // Feature strip at bottom
    ...(stripItems ? featureStrip(si, stripItems, STRIP_Y, theme, accentColor, start, end) : []),
  ];
}

// HERO — brand top + TWO-TONE headline (line1 white, line2 accent) + optional strip
// display_lines = [headline_line1_white, headline_line2_accent, optional_strip]
function heroScene(scene, shotUrl, ctx, start, end) {
  const { accentColor, brandName, theme, productMood: mood, productCategory } = ctx;
  const si    = scene.scene_index;
  const lines = scene.display_lines ?? [];

  let hl1 = lines[0] ?? scene.script_segment;
  let hl2 = null, stripItems = null;

  for (let i = 1; i < lines.length; i++) {
    const strip = parseStripLine(lines[i]);
    if (strip && !stripItems) { stripItems = strip; }
    else if (!hl2)            { hl2 = lines[i]; }
  }

  const fontSize = 132;
  const lineH    = Math.round(fontSize * 1.08);  // ~143px
  const HL1_Y    = 990;
  const HL2_Y    = HL1_Y + lineH;
  const BAR_Y    = HL2_Y + lineH - 20;
  const STRIP_Y  = 1700;

  return [
    bgImage(si, shotUrl, start, end),
    topVignette(si, "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 26%)", start, end),
    bottomDark(si, start, end, 0.88),

    // Category micro-label + brand top
    ...(productCategory ? [
      kickerLine(`s${si}_cat`, productCategory.toUpperCase(), 170, `rgba(255,255,255,0.48)`, start, end, 7, 0),
    ] : []),
    ...(brandName ? [
      txtLayer(`s${si}_brand`, brandName.toUpperCase(), PAD, 214, CW, 72, 46, bodyFont(), "700",
        textColor(theme, 0.92), 8, shadowFor(theme), start, end, 8, 0.02, { letterSpacing: 8 }),
      accentBar(si, 280, accentColor, start, end, 80, 8),
    ] : []),

    // Two-tone headline
    txtLayer(`s${si}_hl1`, hl1, PAD, HL1_Y, CW, lineH + 10, fontSize, heroFont(mood), heroWeight(mood),
      "#ffffff", 1, shadowFor(theme), start, end, 10, 0.10, { lineHeight: 1.0 }),
    ...(hl2 ? [txtLayer(`s${si}_hl2`, hl2, PAD, HL2_Y, CW, lineH + 10, fontSize, heroFont(mood), heroWeight(mood),
      accentColor, 1, shadowFor(theme), start, end, 10, 0.16, { lineHeight: 1.0 })] : []),

    accentBar(si, BAR_Y, accentColor, start, end, 72, 9),

    ...(stripItems ? featureStrip(si, stripItems, STRIP_Y, theme, accentColor, start, end) : []),
  ];
}

// FEATURES — section label + stacked items with left accent bars inside frosted card
function featuresScene(scene, shotUrl, ctx, start, end) {
  const { accentColor, theme } = ctx;
  const si    = scene.scene_index;
  const lines = scene.display_lines ?? [];

  const labelRaw = lines.find(l => !l.startsWith("•")) ?? "WHY YOU'LL LOVE IT";
  const label    = labelRaw.toUpperCase();
  const bullets  = lines.filter(l => l.startsWith("•"));
  const items    = bullets.length > 0 ? bullets : lines.filter(l => l !== labelRaw).slice(0, 4);

  const START_Y = 1025;
  const ITEM_H  = 148;
  const cardH   = Math.max(items.length, 1) * ITEM_H;

  return [
    bgImage(si, shotUrl, start, end),
    topVignette(si, "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 28%)", start, end),
    bottomDark(si, start, end, 0.92),

    // Section label chip
    ...chipBadge(si, label, 168, accentColor, start, end),

    // Frosted card behind items
    featureCard(si, START_Y, cardH, start, end),

    // Feature rows: thin left bar + left-aligned text
    ...items.slice(0, 4).flatMap((item, idx) => {
      const y     = START_Y + idx * ITEM_H;
      const clean = item.replace(/^•\s*/, "");
      return [
        leftBar(`s${si}_lb${idx}`, y + 12, 78, accentColor, start, end),
        txtLayer(`s${si}_feat${idx}`, clean, PAD + 22, y, CW - 22, ITEM_H - 12, 54, bodyFont(), "500",
          textColor(theme), 1, MED_SHADOW, start, end, 9, 0.08 + idx * 0.14),
      ];
    }),
  ];
}

// OFFER — "LIMITED OFFER" chip + bold deal text + sub
function offerScene(scene, shotUrl, ctx, start, end) {
  const { accentColor, theme, productMood: mood } = ctx;
  const si    = scene.scene_index;
  const lines = scene.display_lines ?? [];
  const headline = lines[0] ?? scene.script_segment;
  const subtext  = lines[1] ?? null;

  return [
    bgImage(si, shotUrl, start, end),
    topVignette(si, "linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0) 22%)", start, end),
    bottomDark(si, start, end, 0.92),

    ...chipBadge(si, "LIMITED OFFER", 168, accentColor, start, end),

    txtLayer(`s${si}_headline`, headline, PAD, 1010, CW, 440, 158, heroFont(mood), heroWeight(mood),
      textColor(theme), 1, shadowFor(theme), start, end, 10, 0.08, { lineHeight: 1.05 }),

    accentBar(si, 1400, accentColor, start, end, 72, 9),

    ...(subtext ? [
      txtLayer(`s${si}_sub`, subtext, PAD, 1440, CW, 96, 54, bodyFont(), "400",
        textColor(theme, 0.88), 1, MED_SHADOW, start, end, 9, 0.22),
    ] : []),
  ];
}

// CTA — brand + hook line + pill button + website
function ctaScene(scene, shotUrl, ctx, start, end) {
  const { accentColor, brandName, ctaText, website, theme, productMood: mood } = ctx;
  const si    = scene.scene_index;
  const lines = scene.display_lines ?? [];

  // Only show hook line if ≤6 words (keeps it punchy, not cluttered)
  const hookLine = (lines[0] && lines[0].split(" ").length <= 6) ? lines[0] : null;
  const cta      = ctaText ?? "Shop Now";
  const btnY     = hookLine ? 1300 : 1200;
  const siteY    = btnY + 144;

  return [
    bgImage(si, shotUrl, start, end),
    gradLayer(`s${si}_btm`,
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0.72) 56%, rgba(0,0,0,0.96) 100%)",
      start, end, 2),

    // Brand — top left
    ...(brandName ? [
      txtLayer(`s${si}_brand`, brandName.toUpperCase(), PAD, 172, CW, 72, 44, bodyFont(), "700",
        textColor(theme, 0.90), 8, shadowFor(theme), start, end, 8, 0, { letterSpacing: 8 }),
      accentBar(si, 248, accentColor, start, end, 80, 8),
    ] : []),

    // Hook line (short, bold)
    ...(hookLine ? [
      txtLayer(`s${si}_hook`, hookLine, PAD, 1100, CW, 200, 108, heroFont(mood), heroWeight(mood),
        textColor(theme), 1, shadowFor(theme), start, end, 10, 0.06, { lineHeight: 1.05 }),
    ] : []),

    // CTA button
    ...ctaButton(si, cta, accentColor, btnY, start, end),

    // Website
    ...(website ? [
      txtLayer(`s${si}_site`, website, PAD, siteY + 8, CW, 64, 42, bodyFont(), "400",
        textColor(theme, 0.65), 1, MED_SHADOW, start, end, 8, 0.32, { textAlign: "center" }),
    ] : []),
  ];
}

// STANDALONE — full funnel in one scene
function standaloneScene(scene, shotUrl, ctx, start, end) {
  const { accentColor, brandName, ctaText, website, theme, productMood: mood } = ctx;
  const si    = scene.scene_index;
  const lines = scene.display_lines ?? [];
  const headline = lines[0] ?? scene.script_segment;
  const subtext  = lines[1] ?? null;
  const cta      = ctaText ?? "Shop Now";

  return [
    bgImage(si, shotUrl, start, end),
    topVignette(si, "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0) 22%)", start, end),
    gradLayer(`s${si}_btm`,
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.68) 56%, rgba(0,0,0,0.94) 100%)",
      start, end, 2),

    ...(brandName ? [
      txtLayer(`s${si}_brand`, brandName.toUpperCase(), PAD, 172, CW, 72, 44, bodyFont(), "700",
        textColor(theme, 0.90), 8, shadowFor(theme), start, end, 8, 0, { letterSpacing: 8 }),
      accentBar(si, 252, accentColor, start, end, 80, 8),
    ] : []),

    txtLayer(`s${si}_headline`, headline, PAD, 1000, CW, 380, 138, heroFont(mood), heroWeight(mood),
      textColor(theme), 1, shadowFor(theme), start, end, 10, 0.08, { lineHeight: 1.05 }),

    ...(subtext ? [
      txtLayer(`s${si}_sub`, subtext, PAD, 1405, CW, 96, 54, bodyFont(), "400",
        textColor(theme, 0.88), 1, MED_SHADOW, start, end, 9, 0.22),
    ] : []),

    accentBar(si, subtext ? 1520 : 1400, accentColor, start, end, 72, 8),

    ...ctaButton(si, cta, accentColor, 1580, start, end),

    ...(website ? [
      txtLayer(`s${si}_site`, website, PAD, 1730, CW, 64, 42, bodyFont(), "400",
        textColor(theme, 0.65), 1, MED_SHADOW, start, end, 8, 0.40, { textAlign: "center" }),
    ] : []),
  ];
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildSceneLayers(scene, shotUrl, projectContext, start, end) {
  switch (scene.intent) {
    case "hook":       return hookScene(scene, shotUrl, projectContext, start, end);
    case "hero":       return heroScene(scene, shotUrl, projectContext, start, end);
    case "features":   return featuresScene(scene, shotUrl, projectContext, start, end);
    case "offer":      return offerScene(scene, shotUrl, projectContext, start, end);
    case "cta":        return ctaScene(scene, shotUrl, projectContext, start, end);
    case "standalone":
    default:           return standaloneScene(scene, shotUrl, projectContext, start, end);
  }
}
