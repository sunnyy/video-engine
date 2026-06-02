/**
 * dslLayoutEngine.js
 * src/services/ai/promoVideo/dsl/dslLayoutEngine.js
 *
 * Visual Intent DSL → timeline layer arrays.
 * Each intent has its own renderer. GPT never decides layout — this file does.
 *
 * Entry point: buildSceneLayers(scene, startTime, endTime, projectContext)
 *
 * projectContext shape:
 *   { accentColor, productName, logoUrl, niche, fps = 30 }
 */

import { getPaletteForProject }   from "../../../../core/registries/dslPaletteRegistry.js";
import { getTypographyPreset }    from "../../../../core/registries/dslTypographyRegistry.js";

// ── Semantic icon name → Phosphor icon name ───────────────────────────────────
const ICON_MAP = {
  speed: "Lightning", fast: "Lightning",
  analytics: "ChartBar", chart: "ChartBar",
  growth: "TrendingUp", trending: "TrendingUp",
  check: "CheckCircle", success: "CheckCircle",
  star: "Star",
  gear: "Gear", settings: "Gear",
  clock: "Clock", time: "Clock",
  shield: "Shield", security: "Shield",
  lock: "Lock",
  video: "VideoCamera", camera: "VideoCamera",
  play: "Play",
  download: "DownloadSimple",
  share: "ShareNetwork",
  users: "Users", user: "User",
  robot: "Robot", ai: "Robot",
  magic: "MagicWand", wand: "MagicWand",
  money: "CurrencyDollar", dollar: "CurrencyDollar",
  education: "GraduationCap",
  gaming: "GameController",
  code: "Code",
  globe: "Globe",
  phone: "DeviceMobile",
  desktop: "Desktop",
  fire: "Fire",
  heart: "Heart",
  trophy: "Trophy",
  medal: "Medal",
  flag: "Flag",
  search: "MagnifyingGlass",
  mail: "Envelope",
  notification: "Bell",
  warning: "Warning",
  info: "Info",
};

const resolveIcon = (semantic) => {
  if (!semantic) return "Star";
  const key = semantic.toLowerCase().trim();
  return ICON_MAP[key] || "Star";
};

// ── Canvas constants ──────────────────────────────────────────────────────────
const W   = 1080;
const H   = 1920;
const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };
const FULL_TR = {
  x: 0, y: 0, width: W, height: H,
  opacity: 1, rotation: 0, scale: 1, blur: 0,
  borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
};

// ── Transition presets ────────────────────────────────────────────────────────
const TR_NONE  = { type: "none",  duration: 0    };
const TR_FADE  = (dur = 0.3)  => ({ type: "fade",     duration: dur });
const TR_ZOOM  = (dur = 0.35) => ({ type: "zoom",     duration: dur });
const TR_SLIDE = (dur = 0.35) => ({ type: "slide-up", duration: dur });

// ── Keyframe helpers ──────────────────────────────────────────────────────────
function fadeInKf(delay = 0, duration = 0.3) {
  return { ...NO_KF, opacity: [{ time: delay, value: 0 }, { time: delay + duration, value: 1 }] };
}

function scaleKenBurns(fromScale, toScale, dur) {
  return {
    ...NO_KF,
    scale:   [{ time: 0, value: fromScale }, { time: dur, value: toScale }],
    opacity: [{ time: 0, value: 0 }, { time: 0.25, value: 1 }],
  };
}

function punchIn(delay = 0) {
  return {
    ...NO_KF,
    opacity: [{ time: delay, value: 0 }, { time: delay + 0.22, value: 1 }],
    scale:   [{ time: delay, value: 0.88 }, { time: delay + 0.35, value: 1.0 }],
  };
}

// ── Transform helpers ─────────────────────────────────────────────────────────
function tr(x, y, w, h, extra = {}) {
  return {
    x, y, width: w, height: h,
    opacity: 1, rotation: 0, scale: 1, blur: 0,
    borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    ...extra,
  };
}

// ── Layer ID helper ───────────────────────────────────────────────────────────
function lid(startTime, role) {
  return `${startTime.toFixed(2)}_${role}`;
}

// ── Background layer builder ──────────────────────────────────────────────────
function bgLayer(startTime, endTime, gradient, inTrans = TR_NONE, kf = null) {
  return {
    id: lid(startTime, "bg"),
    trackId:  "track_background",
    type:     "gradient",
    gradient,
    start: startTime, end: endTime, zIndex: 0,
    visible: true, locked: false, sfx: null,
    keyframes:  kf ?? { ...NO_KF },
    transition: { in: inTrans, out: TR_NONE },
    transform:  { ...FULL_TR },
  };
}

// ── Text layer builder ────────────────────────────────────────────────────────
function textLayer(id, trackId, startTime, endTime, content, style, yCenter, height, zIndex, inTrans, kf) {
  return {
    id, trackId,
    type: "text", content,
    style, captionStyle: style._captionStyle ?? null,
    start: startTime, end: endTime, zIndex,
    visible: true, locked: false, sfx: null,
    keyframes:  kf ?? fadeInKf(0.1),
    transition: { in: inTrans, out: TR_FADE(0.2) },
    transform:  tr(0, yCenter, 960, height),
  };
}

// ── Dark overlay ──────────────────────────────────────────────────────────────
function overlayLayer(startTime, endTime, alpha, inTrans = TR_NONE) {
  return {
    id: lid(startTime, "ov"),
    trackId: "track_overlay",
    type: "gradient", gradient: `rgba(0,0,0,${alpha})`,
    start: startTime, end: endTime, zIndex: 2,
    visible: true, locked: false, sfx: null,
    keyframes:  { ...NO_KF },
    transition: { in: inTrans, out: TR_NONE },
    transform:  { ...FULL_TR },
  };
}

// ── Accent divider helper ─────────────────────────────────────────────────────
function dividerLayer(startTime, endTime, x, y, palette, delay = 0.3) {
  return {
    id: lid(startTime, "divider"), trackId: "track_accent",
    type: "gradient", gradient: palette.divider,
    start: startTime, end: endTime, zIndex: 9,
    visible: true, locked: false, sfx: null,
    keyframes: fadeInKf(delay, 0.25),
    transition: { in: TR_FADE(0.2), out: TR_FADE(0.2) },
    transform: { ...tr(x, y, 120, 4), borderRadius: 2, borderWidth: 0, borderColor: "#ffffff" },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── hook renderer ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function renderHook(scene, startTime, endTime, ctx, palette, typo) {
  const dur    = endTime - startTime;
  const accent = palette.accent;
  const layers = [];

  const hasAsset = scene.asset_requirement !== "none" && scene.asset_hint;
  const useAsset = scene.visual_weight === "high" && hasAsset;

  // ── Background ─────────────────────────────────────────────────────────────
  if (useAsset) {
    layers.push({
      id: lid(startTime, "hook_bg"), trackId: "track_background",
      type: "image", src: scene.asset_url || null, objectFit: "cover",
      start: startTime, end: endTime, zIndex: 0,
      visible: true, locked: false, sfx: null,
      keyframes: {
        ...NO_KF,
        scale:   [{ time: 0, value: 1.0 }, { time: dur, value: 1.18 }],
        opacity: [{ time: 0, value: 0   }, { time: 0.25, value: 1   }],
      },
      transition: { in: TR_ZOOM(0.35), out: TR_NONE },
      transform:  { ...FULL_TR },
    });
    layers.push(overlayLayer(startTime, endTime, 0.55, TR_ZOOM(0.35)));
  } else {
    layers.push(bgLayer(
      startTime, endTime, palette.backgroundDeep,
      TR_ZOOM(0.35),
      { ...NO_KF, scale: [{ time: 0, value: 1.0 }, { time: dur, value: 1.06 }] },
    ));
  }

  // ── Light beam ─────────────────────────────────────────────────────────────
  layers.push({
    id: lid(startTime, "hook_beam"), trackId: "track_overlay",
    type: "gradient", gradient: palette.beam(accent),
    start: startTime, end: endTime, zIndex: 1,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: TR_NONE, out: TR_NONE },
    transform: { ...FULL_TR },
  });

  // ── Headline ───────────────────────────────────────────────────────────────
  const headlineText = scene.headline ?? scene.spoken ?? "";
  if (headlineText) {
    layers.push({
      id: lid(startTime, "hook_headline"), trackId: "track_text",
      type: "text", content: headlineText,
      style: {
        fontFamily: typo.headline.fontFamily, fontSize: typo.headline.fontSize,
        fontWeight: typo.headline.fontWeight, color: palette.text,
        textAlign: "left", lineHeight: typo.headline.lineHeight,
        letterSpacing: typo.headline.letterSpacing,
        textTransform: typo.headline.textTransform,
        textShadow: "0 6px 32px rgba(0,0,0,0.9)",
        background: null, borderRadius: 0, padding: 0, _captionStyle: "springScaleIn",
      },
      captionStyle: "springScaleIn",
      start: startTime, end: endTime, zIndex: 10,
      visible: true, locked: false, sfx: null,
      keyframes: punchIn(0),
      transition: { in: TR_ZOOM(0.4), out: TR_FADE(0.2) },
      transform: tr(-40, -100, 960, 500),
    });
  }

  // ── Accent divider ─────────────────────────────────────────────────────────
  layers.push(dividerLayer(startTime, endTime, -380, 280, palette, 0.5));

  // ── EMPHASIS ───────────────────────────────────────────────────────────────
  if (scene.emphasis) {
    layers.push(textLayer(
      lid(startTime, "hook_emphasis"), "track_badge",
      startTime, endTime, scene.emphasis,
      {
        fontFamily: typo.badge.fontFamily, fontSize: typo.badge.fontSize,
        fontWeight: typo.badge.fontWeight, color: accent,
        textAlign: "center", lineHeight: typo.badge.lineHeight,
        letterSpacing: typo.badge.letterSpacing,
        textTransform: typo.badge.textTransform,
        textShadow: `0 4px 24px ${accent}66`,
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      310, 120, 11, TR_FADE(0.3), fadeInKf(4 / 30, 0.25),
    ));
  }

  // ── SUBHEAD ────────────────────────────────────────────────────────────────
  if (scene.subhead) {
    layers.push(textLayer(
      lid(startTime, "hook_subhead"), "track_text",
      startTime, endTime, scene.subhead,
      {
        fontFamily: typo.subhead.fontFamily, fontSize: typo.subhead.fontSize,
        fontWeight: typo.subhead.fontWeight, color: palette.textMuted,
        textAlign: "center", lineHeight: typo.subhead.lineHeight,
        letterSpacing: typo.subhead.letterSpacing,
        textTransform: typo.subhead.textTransform,
        textShadow: null,
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      460, 80, 12, TR_FADE(0.3), fadeInKf(0.35, 0.25),
    ));
  }

  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── list renderer ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function renderList(scene, startTime, endTime, ctx, palette, typo) {
  const accent  = palette.accent;
  const layers  = [];
  const items   = scene.items ?? [];
  const count   = items.length;
  const vw      = scene.visual_weight ?? "medium";

  const yBase = vw === "low" ? 320 : 0;

  // ── Background ─────────────────────────────────────────────────────────────
  layers.push(bgLayer(startTime, endTime, palette.backgroundAlt, TR_FADE(0.3)));

  // ── Icon ───────────────────────────────────────────────────────────────────
  if (scene.icon) {
    layers.push({
      id: lid(startTime, "list_icon"), type: "icon",
      iconName: resolveIcon(scene.icon), trackId: "track_icon",
      start: startTime, end: endTime,
      locked: false, visible: true, zIndex: 10, sfx: null,
      style: { color: accent, weight: "regular" },
      transform: {
        x: 0, y: yBase - 760, width: 120, height: 120,
        opacity: 1, rotation: 0, scale: 1, blur: 0,
        borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
      },
      keyframes: {
        x: [], y: [], blur: [], scale: [], rotation: [],
        opacity: [{ time: 0.15, value: 0 }, { time: 0.37, value: 1 }],
      },
      transition: { in: TR_FADE(0.25), out: TR_FADE(0.2) },
    });
  }

  // ── Headline ───────────────────────────────────────────────────────────────
  if (scene.headline) {
    layers.push({
      id: lid(startTime, "list_headline"), trackId: "track_text",
      type: "text", content: scene.headline,
      style: {
        fontFamily: typo.headline.fontFamily, fontSize: typo.headline.fontSize,
        fontWeight: typo.headline.fontWeight, color: palette.text,
        textAlign: "left", lineHeight: typo.headline.lineHeight,
        letterSpacing: typo.headline.letterSpacing,
        textTransform: typo.headline.textTransform,
        textShadow: "0 4px 24px rgba(0,0,0,0.85)",
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      captionStyle: null,
      start: startTime, end: endTime, zIndex: 10,
      visible: true, locked: false, sfx: null,
      keyframes: punchIn(0),
      transition: { in: TR_FADE(0.3), out: TR_FADE(0.2) },
      transform: tr(-40, yBase - 620, 960, 130),
    });
    layers.push(dividerLayer(startTime, endTime, -380, yBase - 500, palette, 0.3));
  }

  if (count === 0) return layers;

  // ── 2 items: side-by-side cards ────────────────────────────────────────────
  if (count === 2) {
    const cardW = 460, cardH = 400, cardY = yBase + 120;
    [-270, 270].forEach((x, idx) => {
      const delay = idx * 0.2;
      layers.push({
        id: lid(startTime, `list_card_${idx}`), trackId: `track_card_${idx}`,
        type: "gradient", gradient: "rgba(255,255,255,0.06)",
        start: startTime, end: endTime, zIndex: 11 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay, 0.25),
        transition: { in: TR_NONE, out: TR_NONE },
        transform: { ...tr(x, cardY, cardW, cardH), borderRadius: 24 },
      });
      layers.push({
        id: lid(startTime, `list_item_${idx}`), trackId: `track_text_${idx}`,
        type: "text", content: items[idx],
        style: {
          fontFamily: typo.body.fontFamily, fontSize: typo.body.fontSize,
          fontWeight: typo.body.fontWeight, color: palette.text,
          textAlign: "center", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 12 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay + 0.06, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(x, cardY, cardW - 48, cardH - 40),
      });
    });

  // ── 3 items: stacked cards ─────────────────────────────────────────────────
  } else if (count === 3) {
    const cardW = 900, cardH = 160, gap = 24, rowH = cardH + gap;
    const totalH = 3 * cardH + 2 * gap;
    const topY   = yBase - totalH / 2 + cardH / 2;
    items.forEach((item, idx) => {
      const y = topY + idx * rowH, delay = idx * 0.25;
      layers.push({
        id: lid(startTime, `list_card_${idx}`), trackId: `track_card_${idx}`,
        type: "gradient", gradient: "rgba(255,255,255,0.06)",
        start: startTime, end: endTime, zIndex: 11 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay, 0.22),
        transition: { in: TR_NONE, out: TR_NONE },
        transform: { ...tr(0, y, cardW, cardH), borderRadius: 20 },
      });
      layers.push({
        id: lid(startTime, `list_item_${idx}`), trackId: `track_text_${idx}`,
        type: "text", content: item,
        style: {
          fontFamily: typo.body.fontFamily, fontSize: typo.body.fontSize,
          fontWeight: typo.body.fontWeight, color: palette.text,
          textAlign: "center", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 12 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay + 0.06, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(0, y, cardW - 60, cardH),
      });
    });

  // ── 4–5 items: left-aligned with bullet ────────────────────────────────────
  } else if (count <= 5) {
    const fontSize = vw === "high" ? typo.body.fontSize + 6 : typo.body.fontSize;
    const itemH = 88, gap = 16, rowH = itemH + gap;
    const totalH = count * itemH + (count - 1) * gap;
    const topY   = yBase - totalH / 2 + itemH / 2;
    items.forEach((item, idx) => {
      layers.push({
        id: lid(startTime, `list_item_${idx}`), trackId: `track_text_${idx}`,
        type: "text", content: `• ${item}`,
        style: {
          fontFamily: typo.body.fontFamily, fontSize,
          fontWeight: typo.body.fontWeight, color: palette.text,
          textAlign: "left", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 11 + idx,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(idx * 0.2, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(0, topY + idx * rowH, 920, itemH),
      });
    });

  // ── 6+ items: 2-column grid ────────────────────────────────────────────────
  } else {
    const colW = 460, itemH = 65, rowGap = 14, rowH = itemH + rowGap;
    const rows  = Math.ceil(count / 2);
    const totalH = rows * itemH + (rows - 1) * rowGap;
    const topY   = yBase - totalH / 2 + itemH / 2;
    items.forEach((item, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2);
      layers.push({
        id: lid(startTime, `list_item_${idx}`), trackId: `track_text_${idx}`,
        type: "text", content: `• ${item}`,
        style: {
          fontFamily: typo.body.fontFamily, fontSize: Math.round(typo.body.fontSize * 0.75),
          fontWeight: typo.body.fontWeight, color: palette.text,
          textAlign: "left", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 11 + idx,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(idx * 0.15, 0.2),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(col === 0 ? -270 : 270, topY + row * rowH, colW, itemH),
      });
    });
  }

  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── process renderer ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function renderProcess(scene, startTime, endTime, ctx, palette, typo) {
  const accent  = palette.accent;
  const layers  = [];
  const steps   = scene.steps ?? [];
  const count   = steps.length;
  const vw      = scene.visual_weight ?? "medium";

  const yBase   = vw === "low" ? 280 : 0;
  const fontMod = vw === "high" ? 1.1 : 1.0;

  // ── Background ─────────────────────────────────────────────────────────────
  layers.push(bgLayer(startTime, endTime, palette.background, TR_FADE(0.3)));

  // ── Headline (white) + optional EMPHASIS (accent) below it ───────────────
  if (scene.headline) {
    layers.push(textLayer(
      lid(startTime, "process_headline"), "track_text",
      startTime, endTime, scene.headline,
      {
        fontFamily: typo.headline.fontFamily, fontSize: typo.headline.fontSize,
        fontWeight: typo.headline.fontWeight, color: palette.text,
        textAlign: "center", lineHeight: typo.headline.lineHeight,
        letterSpacing: typo.headline.letterSpacing,
        textTransform: typo.headline.textTransform,
        textShadow: "0 3px 20px rgba(0,0,0,0.8)",
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      yBase - 600, 110, 10, TR_FADE(0.3), punchIn(0),
    ));
  }
  if (scene.emphasis) {
    layers.push(textLayer(
      lid(startTime, "process_emphasis"), "track_badge",
      startTime, endTime, scene.emphasis,
      {
        fontFamily: typo.badge.fontFamily, fontSize: typo.badge.fontSize,
        fontWeight: typo.badge.fontWeight, color: accent,
        textAlign: "center", lineHeight: typo.badge.lineHeight,
        letterSpacing: typo.badge.letterSpacing,
        textTransform: typo.badge.textTransform,
        textShadow: `0 3px 20px ${accent}55`,
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      yBase - 480, 80, 11, TR_FADE(0.3), fadeInKf(0.1, 0.22),
    ));
  }

  // ── Accent divider ─────────────────────────────────────────────────────────
  layers.push(dividerLayer(startTime, endTime, -380, yBase - 380, palette, 0.3));

  if (count === 0) return layers;

  // ── 2–3 steps: circles with connecting line ────────────────────────────────
  if (count <= 3) {
    const spacing    = 200;
    const circleSize = 100;
    const txtSize    = Math.round(typo.body.fontSize * fontMod);
    const lineH      = Math.max(2, (count - 1) * spacing);
    const topY       = yBase - ((count - 1) * spacing) / 2;

    // Connecting line between circle centers
    layers.push({
      id: lid(startTime, "process_line"), trackId: "track_accent",
      type: "gradient", gradient: accent,
      start: startTime, end: endTime, zIndex: 10,
      visible: true, locked: false, sfx: null,
      keyframes: fadeInKf(0.1, 0.3),
      transition: { in: TR_NONE, out: TR_NONE },
      transform: { ...tr(-360, yBase, 2, lineH), opacity: 0.4, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
    });

    steps.forEach((step, idx) => {
      const y     = topY + idx * spacing;
      const delay = idx * 0.3;
      const num   = String(idx + 1);

      // Circle border behind number
      layers.push({
        id: lid(startTime, `process_circle_${idx}`), trackId: `track_circle_${idx}`,
        type: "gradient", gradient: "transparent",
        start: startTime, end: endTime, zIndex: 10 + idx * 3,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: { ...tr(-360, y, circleSize, circleSize), borderRadius: 999, borderWidth: 2, borderColor: accent },
      });

      // Number inside circle
      layers.push({
        id: lid(startTime, `process_num_${idx}`), trackId: `track_num_${idx}`,
        type: "text", content: num,
        style: {
          fontFamily: typo.label.fontFamily, fontSize: 48,
          fontWeight: typo.label.fontWeight, color: accent,
          textAlign: "center", lineHeight: 1.0, letterSpacing: 0,
          textTransform: "none", textShadow: `0 4px 20px ${accent}4d`,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 11 + idx * 3,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(-360, y, circleSize, circleSize),
      });

      // Step text — right of circle
      layers.push({
        id: lid(startTime, `process_step_${idx}`), trackId: `track_step_${idx}`,
        type: "text", content: step,
        style: {
          fontFamily: typo.body.fontFamily, fontSize: txtSize,
          fontWeight: typo.body.fontWeight, color: palette.text,
          textAlign: "left", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 12 + idx * 3,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay + 0.06, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(60, y, 620, circleSize),
      });
    });

  // ── 4–5 steps: compact vertical ────────────────────────────────────────────
  } else if (count <= 5) {
    const spacing = 150;
    const numSize = Math.round(typo.label.fontSize * fontMod);
    const txtSize = Math.round(typo.body.fontSize * fontMod);
    const rowH    = 90;
    const totalH  = (count - 1) * spacing + rowH;
    const topY    = yBase - totalH / 2 + rowH / 2;

    steps.forEach((step, idx) => {
      const y     = topY + idx * spacing;
      const delay = idx * 0.2;
      const num   = String(idx + 1).padStart(2, "0");

      layers.push({
        id: lid(startTime, `process_num_${idx}`), trackId: `track_num_${idx}`,
        type: "text", content: num,
        style: {
          fontFamily: typo.label.fontFamily, fontSize: numSize,
          fontWeight: typo.label.fontWeight, color: accent,
          textAlign: "center", lineHeight: 1.0,
          letterSpacing: typo.label.letterSpacing,
          textTransform: typo.label.textTransform,
          textShadow: `0 3px 16px ${accent}4d`,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 11 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(-380, y, 130, rowH),
      });

      layers.push({
        id: lid(startTime, `process_step_${idx}`), trackId: `track_step_${idx}`,
        type: "text", content: step,
        style: {
          fontFamily: typo.body.fontFamily, fontSize: txtSize,
          fontWeight: typo.body.fontWeight, color: palette.text,
          textAlign: "left", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 12 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay + 0.05, 0.22),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(20, y, 700, rowH),
      });
    });

  // ── 6+ steps: two-column layout ────────────────────────────────────────────
  } else {
    const numSize = Math.round(typo.label.fontSize * 0.9);
    const txtSize = Math.round(typo.body.fontSize * 0.8);
    const rowH = 80, rowGap = 16, rowStride = rowH + rowGap;
    const rows  = Math.ceil(count / 2);
    const totalH = rows * rowH + (rows - 1) * rowGap;
    const topY   = yBase - totalH / 2 + rowH / 2;

    steps.forEach((step, idx) => {
      const col   = idx % 2;
      const row   = Math.floor(idx / 2);
      const xBase = col === 0 ? -270 : 270;
      const y     = topY + row * rowStride;
      const delay = idx * 0.15;
      const num   = String(idx + 1).padStart(2, "0");

      layers.push({
        id: lid(startTime, `process_num_${idx}`), trackId: `track_num_${idx}`,
        type: "text", content: num,
        style: {
          fontFamily: typo.label.fontFamily, fontSize: numSize,
          fontWeight: typo.label.fontWeight, color: accent,
          textAlign: "center", lineHeight: 1.0,
          letterSpacing: typo.label.letterSpacing,
          textTransform: typo.label.textTransform,
          textShadow: `0 2px 12px ${accent}4d`,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 11 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay, 0.2),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(xBase - 150, y, 90, rowH),
      });

      layers.push({
        id: lid(startTime, `process_step_${idx}`), trackId: `track_step_${idx}`,
        type: "text", content: step,
        style: {
          fontFamily: typo.body.fontFamily, fontSize: txtSize,
          fontWeight: typo.body.fontWeight, color: palette.text,
          textAlign: "left", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 12 + idx * 2,
        visible: true, locked: false, sfx: null,
        keyframes: fadeInKf(delay + 0.05, 0.2),
        transition: { in: TR_NONE, out: TR_FADE(0.2) },
        transform: tr(xBase, y, 350, rowH),
      });
    });
  }

  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── feature renderer ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function renderFeature(scene, startTime, endTime, ctx, palette, typo) {
  const dur      = endTime - startTime;
  const accent   = palette.accent;
  const layers   = [];
  const vw       = scene.visual_weight ?? "medium";
  const hasAsset = scene.asset_requirement !== "none";

  // ── Background ─────────────────────────────────────────────────────────────
  layers.push(bgLayer(startTime, endTime, palette.backgroundAlt, TR_FADE(0.3)));

  if (hasAsset) {
    // ── Asset-driven layout ─────────────────────────────────────────────────
    const assetH  = vw === "low" ? 1152 : 1536;
    const assetY  = vw === "low" ? 120  : -80;

    layers.push({
      id: lid(startTime, "feature_asset"), trackId: "track_asset",
      type: "image", src: scene.asset_url || null, objectFit: "contain",
      start: startTime, end: endTime, zIndex: 1,
      visible: true, locked: false, sfx: null,
      keyframes: {
        ...NO_KF,
        scale:   [{ time: 0, value: 1.0 }, { time: dur, value: 1.06 }],
        opacity: [{ time: 0, value: 0   }, { time: 0.3, value: 1    }],
      },
      transition: { in: TR_FADE(0.3), out: TR_NONE },
      transform:  tr(0, assetY, W, assetH),
    });

    const ovAlpha = vw === "high" ? 0.92 : 0.88;
    layers.push({
      id: lid(startTime, "feature_overlay"), trackId: "track_overlay",
      type: "gradient",
      gradient: palette.overlayBottom,
      start: startTime, end: endTime, zIndex: 3,
      visible: true, locked: false, sfx: null,
      keyframes:  { ...NO_KF },
      transition: { in: TR_NONE, out: TR_NONE },
      transform:  { ...FULL_TR },
    });

    const headlineText = scene.headline ?? "";
    if (headlineText) {
      layers.push(textLayer(
        lid(startTime, "feature_headline"), "track_text",
        startTime, endTime, headlineText,
        {
          fontFamily: typo.label.fontFamily, fontSize: typo.label.fontSize,
          fontWeight: typo.label.fontWeight, color: accent,
          textAlign: "center", lineHeight: typo.label.lineHeight,
          letterSpacing: typo.label.letterSpacing,
          textTransform: typo.label.textTransform,
          textShadow: `0 3px 16px ${accent}55`,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        -820, 90, 10, TR_FADE(0.3), fadeInKf(0.2, 0.25),
      ));
    }

    if (scene.emphasis) {
      layers.push({
        id: lid(startTime, "feature_emphasis"), trackId: "track_badge",
        type: "text", content: scene.emphasis,
        style: {
          fontFamily: typo.badge.fontFamily, fontSize: typo.badge.fontSize,
          fontWeight: typo.badge.fontWeight, color: palette.text,
          textAlign: "center", lineHeight: typo.badge.lineHeight,
          letterSpacing: typo.badge.letterSpacing,
          textTransform: typo.badge.textTransform,
          textShadow: null,
          background: accent, borderRadius: 8, padding: "6px 18px",
          _captionStyle: null,
        },
        captionStyle: null,
        start: startTime, end: endTime, zIndex: 12,
        visible: true, locked: false, sfx: null,
        keyframes:  fadeInKf(0.35, 0.25),
        transition: { in: TR_FADE(0.3), out: TR_FADE(0.2) },
        transform:  tr(0, 620, 680, 70),
      });
    }

    const bottomText = scene.subhead ?? scene.body ?? "";
    if (bottomText) {
      layers.push(textLayer(
        lid(startTime, "feature_subhead"), "track_text",
        startTime, endTime, bottomText,
        {
          fontFamily: typo.subhead.fontFamily, fontSize: typo.subhead.fontSize,
          fontWeight: typo.subhead.fontWeight, color: palette.text,
          textAlign: "center", lineHeight: typo.subhead.lineHeight,
          letterSpacing: typo.subhead.letterSpacing,
          textTransform: typo.subhead.textTransform,
          textShadow: "0 3px 16px rgba(0,0,0,0.9)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        700, 160, 11, TR_FADE(0.3), fadeInKf(0.4, 0.25),
      ));
    }

  } else {
    // ── No-asset layout: text-driven ───────────────────────────────────────
    const headlineText = scene.headline ?? scene.spoken ?? "";
    if (headlineText) {
      layers.push(textLayer(
        lid(startTime, "feature_headline"), "track_text",
        startTime, endTime, headlineText,
        {
          fontFamily: typo.headline.fontFamily, fontSize: typo.headline.fontSize,
          fontWeight: typo.headline.fontWeight, color: palette.text,
          textAlign: "center", lineHeight: typo.headline.lineHeight,
          letterSpacing: typo.headline.letterSpacing,
          textTransform: typo.headline.textTransform,
          textShadow: "0 5px 28px rgba(0,0,0,0.9)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: "springScaleIn",
        },
        -200, 460, 10, TR_ZOOM(0.4), punchIn(0),
      ));
    }

    if (scene.subhead) {
      layers.push(textLayer(
        lid(startTime, "feature_subhead"), "track_text",
        startTime, endTime, scene.subhead,
        {
          fontFamily: typo.subhead.fontFamily, fontSize: typo.subhead.fontSize,
          fontWeight: typo.subhead.fontWeight, color: palette.textMuted,
          textAlign: "center", lineHeight: typo.subhead.lineHeight,
          letterSpacing: typo.subhead.letterSpacing,
          textTransform: typo.subhead.textTransform,
          textShadow: null,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        0, 110, 11, TR_FADE(0.3), fadeInKf(0.25, 0.25),
      ));
    }

    if (scene.body) {
      layers.push(textLayer(
        lid(startTime, "feature_body"), "track_badge",
        startTime, endTime, scene.body,
        {
          fontFamily: typo.body.fontFamily, fontSize: typo.body.fontSize,
          fontWeight: typo.body.fontWeight, color: palette.textMuted,
          textAlign: "center", lineHeight: typo.body.lineHeight,
          letterSpacing: typo.body.letterSpacing, textTransform: typo.body.textTransform,
          textShadow: null,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        200, 90, 11, TR_FADE(0.3), fadeInKf(0.35, 0.25),
      ));
    }

    if (scene.emphasis) {
      layers.push(textLayer(
        lid(startTime, "feature_emphasis"), "track_badge",
        startTime, endTime, scene.emphasis,
        {
          fontFamily: typo.badge.fontFamily, fontSize: typo.badge.fontSize,
          fontWeight: typo.badge.fontWeight, color: accent,
          textAlign: "center", lineHeight: typo.badge.lineHeight,
          letterSpacing: typo.badge.letterSpacing,
          textTransform: typo.badge.textTransform,
          textShadow: `0 3px 16px ${accent}55`,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        380, 70, 12, TR_FADE(0.3), fadeInKf(0.4, 0.25),
      ));
    }
  }

  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── statistic renderer ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function renderStatistic(scene, startTime, endTime, ctx, palette, typo) {
  const accent = palette.accent;
  const layers = [];
  const vw     = scene.visual_weight ?? "medium";

  const yBase = vw === "low" ? 300 : 0;

  // ── Background ─────────────────────────────────────────────────────────────
  layers.push(bgLayer(startTime, endTime, palette.backgroundDeep, TR_FADE(0.3)));

  if (scene.stat) {
    // Radial accent glow behind the number
    layers.push({
      id: lid(startTime, "stat_glow"), trackId: "track_overlay",
      type: "gradient", gradient: palette.glow(accent),
      start: startTime, end: endTime, zIndex: 1,
      visible: true, locked: false, sfx: null,
      keyframes:  fadeInKf(0.1, 0.4),
      transition: { in: TR_NONE, out: TR_NONE },
      transform:  { ...FULL_TR },
    });

    // ICON — above number
    if (scene.icon) {
      layers.push({
        id: lid(startTime, "stat_icon"), type: "icon",
        iconName: resolveIcon(scene.icon), trackId: "track_icon",
        start: startTime, end: endTime,
        locked: false, visible: true, zIndex: 9, sfx: null,
        style: { color: accent, weight: "regular" },
        transform: {
          x: 0, y: yBase - 380, width: 120, height: 120,
          opacity: 1, rotation: 0, scale: 1, blur: 0,
          borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
        },
        keyframes: {
          x: [], y: [], blur: [], scale: [], rotation: [],
          opacity: [{ time: 0.15, value: 0 }, { time: 0.37, value: 1 }],
        },
        transition: { in: TR_FADE(0.25), out: TR_FADE(0.2) },
      });
    }

    // Giant number — punch-in
    layers.push(textLayer(
      lid(startTime, "stat_number"), "track_text",
      startTime, endTime, scene.stat,
      {
        fontFamily: typo.stat.fontFamily, fontSize: typo.stat.fontSize,
        fontWeight: typo.stat.fontWeight, color: accent,
        textAlign: "center", lineHeight: typo.stat.lineHeight,
        letterSpacing: typo.stat.letterSpacing,
        textTransform: typo.stat.textTransform,
        textShadow: `0 0 60px ${accent}88`,
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      yBase - 80, 300, 10, TR_NONE,
      {
        ...NO_KF,
        opacity: [{ time: 0, value: 0 }, { time: 0.2,  value: 1.0 }],
        scale:   [{ time: 0, value: 0.82 }, { time: 0.35, value: 1.0 }],
      },
    ));

    // LABEL — below number
    if (scene.label) {
      layers.push(textLayer(
        lid(startTime, "stat_label"), "track_badge",
        startTime, endTime, scene.label,
        {
          fontFamily: typo.label.fontFamily, fontSize: typo.label.fontSize,
          fontWeight: typo.label.fontWeight, color: palette.text,
          textAlign: "center", lineHeight: typo.label.lineHeight,
          letterSpacing: typo.label.letterSpacing,
          textTransform: typo.label.textTransform,
          textShadow: null,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        yBase + 180, 80, 11, TR_FADE(0.3), fadeInKf(0.4, 0.25),
      ));
    }

    // SUBHEAD — below label
    if (scene.subhead) {
      layers.push(textLayer(
        lid(startTime, "stat_subhead"), "track_text",
        startTime, endTime, scene.subhead,
        {
          fontFamily: typo.subhead.fontFamily, fontSize: typo.subhead.fontSize,
          fontWeight: typo.subhead.fontWeight, color: palette.textMuted,
          textAlign: "center", lineHeight: typo.subhead.lineHeight,
          letterSpacing: typo.subhead.letterSpacing,
          textTransform: typo.subhead.textTransform,
          textShadow: null,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        yBase + 300, 75, 12, TR_FADE(0.3), fadeInKf(0.55, 0.25),
      ));
    }

    // EMPHASIS — accent line
    if (scene.emphasis) {
      layers.push(textLayer(
        lid(startTime, "stat_emphasis"), "track_badge",
        startTime, endTime, scene.emphasis,
        {
          fontFamily: typo.badge.fontFamily, fontSize: typo.badge.fontSize,
          fontWeight: typo.badge.fontWeight, color: accent,
          textAlign: "center", lineHeight: typo.badge.lineHeight,
          letterSpacing: typo.badge.letterSpacing,
          textTransform: typo.badge.textTransform,
          textShadow: `0 3px 14px ${accent}55`,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        yBase + 420, 65, 13, TR_FADE(0.3), fadeInKf(0.6, 0.25),
      ));
    }

  } else {
    // ── No STAT fallback ──────────────────────────────────────────────────
    const headlineText = scene.headline ?? scene.spoken ?? "";
    if (headlineText) {
      layers.push(textLayer(
        lid(startTime, "stat_number"), "track_text",
        startTime, endTime, headlineText,
        {
          fontFamily: typo.headline.fontFamily, fontSize: typo.headline.fontSize,
          fontWeight: typo.headline.fontWeight, color: palette.text,
          textAlign: "center", lineHeight: typo.headline.lineHeight,
          letterSpacing: typo.headline.letterSpacing,
          textTransform: typo.headline.textTransform,
          textShadow: "0 6px 32px rgba(0,0,0,0.9)",
          background: null, borderRadius: 0, padding: 0, _captionStyle: "springScaleIn",
        },
        yBase - 120, 420, 10, TR_NONE,
        {
          ...NO_KF,
          opacity: [{ time: 0, value: 0 }, { time: 0.2,  value: 1.0 }],
          scale:   [{ time: 0, value: 0.82 }, { time: 0.35, value: 1.0 }],
        },
      ));
    }

    if (scene.subhead) {
      layers.push(textLayer(
        lid(startTime, "stat_subhead"), "track_text",
        startTime, endTime, scene.subhead,
        {
          fontFamily: typo.subhead.fontFamily, fontSize: typo.subhead.fontSize,
          fontWeight: typo.subhead.fontWeight, color: palette.textMuted,
          textAlign: "center", lineHeight: typo.subhead.lineHeight,
          letterSpacing: typo.subhead.letterSpacing,
          textTransform: typo.subhead.textTransform,
          textShadow: null,
          background: null, borderRadius: 0, padding: 0, _captionStyle: null,
        },
        yBase + 200, 100, 11, TR_FADE(0.3), fadeInKf(0.3, 0.25),
      ));
    }
  }

  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── statement fallback ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function renderStatement(scene, startTime, endTime, ctx, palette, typo) {
  const layers = [];

  layers.push(bgLayer(startTime, endTime, palette.background, TR_FADE(0.3)));

  const headlineText = scene.headline ?? scene.spoken ?? "";
  if (headlineText) {
    layers.push(textLayer(
      lid(startTime, "stmt_headline"), "track_text",
      startTime, endTime, headlineText,
      {
        fontFamily: typo.headline.fontFamily, fontSize: typo.headline.fontSize,
        fontWeight: typo.headline.fontWeight, color: palette.text,
        textAlign: "center", lineHeight: typo.headline.lineHeight,
        letterSpacing: typo.headline.letterSpacing,
        textTransform: typo.headline.textTransform,
        textShadow: "0 4px 24px rgba(0,0,0,0.85)",
        background: null, borderRadius: 0, padding: 0, _captionStyle: "springScaleIn",
      },
      -60, 440, 10, TR_ZOOM(0.4), punchIn(0),
    ));
  }

  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Intent renderer map ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const intentRenderers = {
  hook:      renderHook,
  list:      renderList,
  process:   renderProcess,
  feature:   renderFeature,
  statistic: renderStatistic,
  // benefit:    renderBenefit,
  // comparison: renderComparison,
  // proof:      renderProof,
  // cta:        renderCTA,
};

// ─────────────────────────────────────────────────────────────────────────────
// ── Public entry point ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * buildSceneLayers(scene, startTime, endTime, projectContext)
 *
 * @param {object} scene          — parsed DSL scene from dslParser
 * @param {number} startTime      — scene start in seconds
 * @param {number} endTime        — scene end in seconds
 * @param {object} projectContext — { accentColor, productName, logoUrl, niche, fps }
 * @returns {Array}               — timeline layer objects
 */
export function buildSceneLayers(scene, startTime, endTime, projectContext = {}) {
  const ctx     = { fps: 30, ...projectContext };
  const palette = getPaletteForProject(scene.mood, ctx.accentColor, ctx.niche);
  const typo    = getTypographyPreset(ctx.niche, scene.mood);
  const renderer = intentRenderers[scene?.intent];
  if (renderer) return renderer(scene, startTime, endTime, ctx, palette, typo);
  return renderStatement(scene, startTime, endTime, ctx, palette, typo);
}
