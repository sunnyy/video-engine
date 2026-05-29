/**
 * promoLayoutRegistry.js
 * src/core/registries/promoLayoutRegistry.js
 *
 * Layout templates driven by visual_mode (not scene_type).
 * Signature: (sid, s, e, { script, assetUrl, talkingHeadUrl, productName, productUrl, accentColor, duration }) => layer[]
 */

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 1080;
const H = 1920;

const NO_KF  = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };
const BG_TR  = { x: 0, y: 0, width: W, height: H, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" };

function mtr(x, y, w, h) {
  return { x, y, width: w, height: h, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" };
}

// ── Ken Burns keyframes (localTime in seconds from layer start) ───────────────
function kb(type, dur) {
  const kf = { ...NO_KF };
  switch (type) {
    case "cinematicPush": kf.scale = [{ time: 0, value: 1.10 }, { time: dur, value: 1.28 }]; break;
    case "pushSlow":      kf.scale = [{ time: 0, value: 1.05 }, { time: dur, value: 1.22 }]; break;
    case "pullSlow":      kf.scale = [{ time: 0, value: 1.22 }, { time: dur, value: 1.05 }]; break;
    case "microZoom":     kf.scale = [{ time: 0, value: 1.00 }, { time: dur, value: 1.10 }]; break;
    case "droneRise":
      kf.scale = [{ time: 0, value: 1.05 }, { time: dur, value: 1.18 }];
      kf.y     = [{ time: 0, value: 60  }, { time: dur, value: -20  }];
      break;
    default: // slowZoom
      kf.scale = [{ time: 0, value: 1.05 }, { time: dur, value: 1.18 }];
  }
  return kf;
}

// Opacity fade-in keyframe helper (localTime seconds)
function fadeKf(delay = 0.1) {
  return { ...NO_KF, opacity: [{ time: delay, value: 0 }, { time: delay + 0.35, value: 1 }] };
}

// ── Gradient map ──────────────────────────────────────────────────────────────
const GRADIENTS = {
  hook:         "linear-gradient(160deg,#0d0d1a 0%,#1a0a2e 100%)",
  pain_point:   "linear-gradient(160deg,#1e0a0a 0%,#3d1212 100%)",
  feature_demo: "linear-gradient(160deg,#0a0a1e 0%,#0f1240 100%)",
  ui_showcase:  "linear-gradient(160deg,#050a14 0%,#0a1428 100%)",
  cta:          "linear-gradient(160deg,#0a1a0a 0%,#0d2d0d 100%)",
  logo_outro:   "linear-gradient(180deg,#080808 0%,#101010 100%)",
  montage:      "linear-gradient(160deg,#080808 0%,#161616 100%)",
  talking_head: "linear-gradient(180deg,#0a0a14 0%,#1a1a2e 100%)",
  before_after: "linear-gradient(160deg,#0a0a1e 0%,#1a1a2e 100%)",
  default:      "linear-gradient(160deg,#0a0a14 0%,#1a1a2e 100%)",
};

// ── Layer primitives ──────────────────────────────────────────────────────────

function bgImage(id, s, e, src, motion = "slowZoom") {
  return {
    id, trackId: "track_background",
    type: "image", src, objectFit: "cover",
    start: s, end: e, zIndex: 0,
    visible: true, locked: false, sfx: null,
    keyframes: kb(motion, e - s),
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { ...BG_TR },
  };
}

function bgVideoLyr(id, s, e, src, motion = "slowZoom") {
  return {
    id, trackId: "track_background",
    type: "video", src, objectFit: "cover",
    start: s, end: e, zIndex: 0,
    visible: true, locked: false, sfx: null,
    keyframes: kb(motion, e - s),
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { ...BG_TR },
    volume: 0, muted: true,
  };
}

function bgGradient(id, s, e, gradient) {
  return {
    id, trackId: "track_background",
    type: "gradient", gradient,
    start: s, end: e, zIndex: 0,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { ...BG_TR },
  };
}

function overlay(id, s, e, alpha) {
  return {
    id, trackId: "track_overlay",
    type: "gradient", gradient: `rgba(0,0,0,${alpha})`,
    start: s, end: e, zIndex: 1,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { ...BG_TR },
  };
}

// yCenter: center offset from canvas center (px). Positive = lower on screen.
function textL(id, trackId, s, e, content, style, yCenter, height, zIndex, transIn, kf) {
  return {
    id, trackId, type: "text", content, style,
    captionStyle: style._captionStyle ?? null,
    start: s, end: e, zIndex,
    visible: true, locked: false, sfx: null,
    keyframes: kf ?? fadeKf(0.1),
    transition: { in: transIn, out: { type: "fade", duration: 0.2 } },
    transform: mtr(0, yCenter, 960, height),
  };
}

// ── Transitions ───────────────────────────────────────────────────────────────
const T = {
  fade:      (dur = 0.4)  => ({ type: "fade",       duration: dur }),
  zoom:      (dur = 0.4)  => ({ type: "zoom",        duration: dur }),
  slideUp:   (dur = 0.35) => ({ type: "slide-up",   duration: dur }),
  slideDown: (dur = 0.35) => ({ type: "slide-down",  duration: dur }),
  slideLeft: (dur = 0.35) => ({ type: "slide-left",  duration: dur }),
  none:      ()           => ({ type: "none",         duration: 0  }),
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function assetBg(sid, s, e, assetUrl, motion, fallbackGradient) {
  if (!assetUrl) return bgGradient(`${sid}_bg`, s, e, fallbackGradient ?? GRADIENTS.default);
  const isVid = /\.(mp4|webm|mov)(\?|$)/i.test(assetUrl);
  return isVid
    ? bgVideoLyr(`${sid}_bg`, s, e, assetUrl, motion)
    : bgImage(`${sid}_bg`, s, e, assetUrl, motion);
}

function thLayer(id, s, e, src, tr) {
  return {
    id, trackId: "track_talking_head",
    type: src ? "video" : "gradient",
    ...(src ? { src, objectFit: "cover" } : { gradient: "rgba(60,60,100,0.4)" }),
    start: s, end: e, zIndex: 2,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: tr,
    volume: 0, muted: true,
  };
}

// ── 1. full_avatar ─────────────────────────────────────────────────────────────
// Talking head fills the full frame. Caption pill at bottom.
function fullAvatarLayout(sid, s, e, { script, talkingHeadUrl }) {
  const out = [];
  out.push(thLayer(`${sid}_th`, s, e, talkingHeadUrl, { ...BG_TR }));
  if (script) {
    out.push(textL(
      `${sid}_caption`, `track_caption_${sid}`, s, e, script,
      {
        fontFamily: "Outfit", fontSize: 42, fontWeight: 700, color: "#ffffff",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 0,
        textTransform: "none", textShadow: null,
        background: "rgba(0,0,0,0.7)", borderRadius: 12, padding: "12px 24px",
        _captionStyle: "karaokeFill",
      },
      700, 180, 10, T.fade()
    ));
  }
  return out;
}

// ── 2. full_asset ──────────────────────────────────────────────────────────────
// Asset fills full frame. Text overlaid in lower area. Product badge at bottom.
function fullAssetLayout(sid, s, e, { script, assetUrl, productName, accentColor }) {
  const out = [];
  out.push(assetBg(sid, s, e, assetUrl, "slowZoom", GRADIENTS.feature_demo));
  out.push(overlay(`${sid}_ov`, s, e, 0.45));
  if (script) {
    out.push(textL(
      `${sid}_text`, `track_text_${sid}`, s, e, script,
      {
        fontFamily: "Outfit", fontSize: 58, fontWeight: 700, color: "#ffffff",
        textAlign: "center", lineHeight: 1.25, letterSpacing: -0.5,
        textTransform: "none", textShadow: "0 3px 20px rgba(0,0,0,0.8)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "wordBlaze",
      },
      400, 420, 10, T.slideUp()
    ));
  }
  if (productName) {
    out.push(textL(
      `${sid}_badge`, "track_badge", s, e, productName,
      {
        fontFamily: "Outfit", fontSize: 32, fontWeight: 700, color: accentColor,
        textAlign: "center", lineHeight: 1.3, letterSpacing: 2,
        textTransform: "uppercase", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      700, 100, 11, T.fade(0.4), fadeKf(0.3)
    ));
  }
  return out;
}

// ── 3. top_asset_bottom_avatar ────────────────────────────────────────────────
// Top 50% = asset / screenshot. Bottom 50% = talking head. Caption at very bottom.
function topAssetBottomAvatarLayout(sid, s, e, { script, assetUrl, talkingHeadUrl }) {
  const out = [];
  const isVid = assetUrl && /\.(mp4|webm|mov)(\?|$)/i.test(assetUrl);

  out.push(bgGradient(`${sid}_bg`, s, e, GRADIENTS.talking_head));

  // Asset — top half (center at y=-480 from canvas center)
  if (assetUrl) {
    out.push({
      id: `${sid}_asset`, trackId: "track_asset",
      type: isVid ? "video" : "image",
      src: assetUrl, objectFit: "cover",
      start: s, end: e, zIndex: 2,
      visible: true, locked: false, sfx: null,
      keyframes: { ...NO_KF },
      transition: { in: { type: "fade", duration: 0.4 }, out: { type: "fade", duration: 0.3 } },
      transform: mtr(0, -480, W, 960),
      ...(isVid ? { volume: 0, muted: true } : {}),
    });
  }

  // Dark overlay on top half only
  out.push({
    id: `${sid}_top_ov`, trackId: "track_overlay_top",
    type: "gradient", gradient: "rgba(0,0,0,0.3)",
    start: s, end: e, zIndex: 3,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: T.none(), out: T.none() },
    transform: mtr(0, -480, W, 960),
  });

  // Talking head — bottom half (center at y=480 from canvas center)
  out.push(thLayer(`${sid}_th`, s, e, talkingHeadUrl, mtr(0, 480, W, 960)));

  // Caption pill at very bottom
  if (script) {
    out.push(textL(
      `${sid}_caption`, `track_caption_${sid}`, s, e, script,
      {
        fontFamily: "Outfit", fontSize: 38, fontWeight: 700, color: "#ffffff",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 0,
        textTransform: "none", textShadow: null,
        background: "rgba(0,0,0,0.72)", borderRadius: 12, padding: "12px 24px",
        _captionStyle: "karaokeFill",
      },
      760, 160, 10, T.fade()
    ));
  }
  return out;
}

// ── 4. floating_avatar ────────────────────────────────────────────────────────
// Full bleed asset BG. Talking head as floating pip at bottom center. Text at top.
function floatingAvatarLayout(sid, s, e, { script, assetUrl, talkingHeadUrl }) {
  const out = [];

  out.push(assetBg(sid, s, e, assetUrl, "slowZoom", GRADIENTS.feature_demo));
  out.push(overlay(`${sid}_ov`, s, e, 0.35));

  // Large text at top
  if (script) {
    out.push(textL(
      `${sid}_text`, `track_text_${sid}`, s, e, script,
      {
        fontFamily: "Outfit", fontSize: 62, fontWeight: 800, color: "#ffffff",
        textAlign: "center", lineHeight: 1.2, letterSpacing: -1,
        textTransform: "none",
        textShadow: "0 4px 24px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "wordBlaze",
      },
      -600, 300, 4, T.fade(0.4), fadeKf(0.1)
    ));
  }

  // Caption pill above the floating head
  if (script) {
    out.push(textL(
      `${sid}_cap_pill`, `track_caption_${sid}`, s, e, script,
      {
        fontFamily: "Outfit", fontSize: 36, fontWeight: 700, color: "#ffffff",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 0,
        textTransform: "none", textShadow: null,
        background: "rgba(0,0,0,0.75)", borderRadius: 10, padding: "10px 22px",
        _captionStyle: "karaokeFill",
      },
      460, 140, 6, T.fade(0.3), fadeKf(0.15)
    ));
  }

  // Talking head pip — bottom center, width=540, height=810
  out.push({
    id: `${sid}_th`, trackId: "track_talking_head",
    type: talkingHeadUrl ? "video" : "gradient",
    ...(talkingHeadUrl ? { src: talkingHeadUrl, objectFit: "cover" } : { gradient: "rgba(60,60,100,0.4)" }),
    start: s, end: e, zIndex: 5,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: mtr(0, 550, 540, 810),
    volume: 0, muted: true,
  });

  return out;
}

// ── 5. stock ───────────────────────────────────────────────────────────────────
// Stock image fills frame. Large headline. Product name sub in accent color.
function stockLayout(sid, s, e, { script, assetUrl, productName, accentColor }) {
  const out = [];
  out.push(assetBg(sid, s, e, assetUrl, "microZoom", GRADIENTS.default));
  out.push(overlay(`${sid}_ov`, s, e, 0.4));
  if (script) {
    out.push(textL(
      `${sid}_headline`, `track_text_${sid}`, s, e, script,
      {
        fontFamily: "Outfit", fontSize: 64, fontWeight: 800, color: "#ffffff",
        textAlign: "center", lineHeight: 1.2, letterSpacing: -1,
        textTransform: "none", textShadow: "0 4px 24px rgba(0,0,0,0.85)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "springScaleIn",
      },
      -100, 420, 10, T.zoom()
    ));
  }
  if (productName) {
    out.push(textL(
      `${sid}_sub`, "track_badge", s, e, productName,
      {
        fontFamily: "Outfit", fontSize: 34, fontWeight: 600, color: accentColor,
        textAlign: "center", lineHeight: 1.3, letterSpacing: 1,
        textTransform: "none", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      200, 100, 11, T.fade(0.5), fadeKf(0.4)
    ));
  }
  return out;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const promoLayoutRegistry = {
  full_avatar:            { primary: fullAvatarLayout           },
  full_asset:             { primary: fullAssetLayout            },
  top_asset_bottom_avatar:{ primary: topAssetBottomAvatarLayout },
  floating_avatar:        { primary: floatingAvatarLayout       },
  stock:                  { primary: stockLayout                },
  default:                { primary: stockLayout                },
};

export function getPromoLayout(visualMode, variant = "primary") {
  const entry = promoLayoutRegistry[visualMode] ?? promoLayoutRegistry.default;
  return entry[variant] ?? entry.primary;
}
