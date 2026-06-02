/**
 * promoLayoutRegistry.js
 * Ground-up visual redesign — scene-type driven layouts.
 * Signature: (sid, s, e, { script, assetUrl, talkingHeadUrl, productName, productUrl, accentColor, duration, sceneData, logoUrl }) => layer[]
 */

const W = 1080;
const H = 1920;

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };
const BG_TR = { x: 0, y: 0, width: W, height: H, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" };

function mtr(x, y, w, h) {
  return { x, y, width: w, height: h, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" };
}

const TR_NONE = { type: "none", duration: 0 };

const T = {
  fade:    (dur = 0.4)  => ({ type: "fade",      duration: dur }),
  zoom:    (dur = 0.4)  => ({ type: "zoom",       duration: dur }),
  slideUp: (dur = 0.35) => ({ type: "slide-up",   duration: dur }),
  none:    ()           => ({ type: "none",        duration: 0   }),
};

// ── Gradient presets ──────────────────────────────────────────────────────────
const G = {
  dark:     "linear-gradient(180deg,#06060e 0%,#0a0a18 100%)",
  darkBlue: "linear-gradient(160deg,#070714 0%,#0d0d2a 100%)",
  midDark:  "linear-gradient(160deg,#0a0a14 0%,#141430 100%)",
  ov:       (a) => `rgba(0,0,0,${a})`,
  botFade:  "linear-gradient(0deg,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0) 40%)",
  botFadeM: "linear-gradient(0deg,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0) 30%)",
};

// ── Keyframe helpers ──────────────────────────────────────────────────────────

function fadeKf(delay = 0.1) {
  return { ...NO_KF, opacity: [{ time: delay, value: 0 }, { time: delay + 0.3, value: 1 }] };
}

// Fade-in + scale punch (for headlines, stat numbers)
function scaleInKf(from, to, dur, opDelay = 0) {
  return {
    ...NO_KF,
    opacity: [{ time: opDelay, value: 0 }, { time: opDelay + 0.22, value: 1 }],
    scale:   [{ time: 0, value: from }, { time: dur, value: to }],
  };
}

// Gentle pulse (1.0 → peak → 1.0) for logos/CTAs
function pulseKf(dur) {
  return {
    ...NO_KF,
    opacity: [{ time: 0.1, value: 0 }, { time: 0.4, value: 1 }],
    scale:   [{ time: 0, value: 1.0 }, { time: dur / 2, value: 1.03 }, { time: dur, value: 1.0 }],
  };
}

// Background / Ken Burns motion
function bgKf(type, dur) {
  const kf = { ...NO_KF };
  switch (type) {
    case "aggressivePush": kf.scale = [{ time: 0, value: 1.0  }, { time: dur, value: 1.15 }]; break;
    case "gentleZoom":     kf.scale = [{ time: 0, value: 1.0  }, { time: dur, value: 1.06 }]; break;
    case "pullSlow":       kf.scale = [{ time: 0, value: 1.12 }, { time: dur, value: 1.0  }]; break;
    case "panRight":
      kf.scale = [{ time: 0, value: 1.0 }, { time: dur, value: 1.08 }];
      kf.x     = [{ time: 0, value: 0   }, { time: dur, value: 22   }];
      break;
    default:
      kf.scale = [{ time: 0, value: 1.0 }, { time: dur, value: 1.08 }];
  }
  return kf;
}

// ── Layer primitives ──────────────────────────────────────────────────────────

function bgGradient(id, s, e, gradient, inTrans = TR_NONE) {
  return {
    id, trackId: "track_background",
    type: "gradient", gradient,
    start: s, end: e, zIndex: 0,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: inTrans, out: TR_NONE },
    transform: { ...BG_TR },
  };
}

function bgImage(id, s, e, src, kfType = "default", inTrans = TR_NONE) {
  return {
    id, trackId: "track_background",
    type: "image", src, objectFit: "cover",
    start: s, end: e, zIndex: 0,
    visible: true, locked: false, sfx: null,
    keyframes: bgKf(kfType, e - s),
    transition: { in: inTrans, out: TR_NONE },
    transform: { ...BG_TR },
  };
}

function bgVideoLyr(id, s, e, src, kfType = "default", inTrans = TR_NONE) {
  return {
    id, trackId: "track_background",
    type: "video", src, objectFit: "cover",
    start: s, end: e, zIndex: 0,
    visible: true, locked: false, sfx: null,
    keyframes: bgKf(kfType, e - s),
    transition: { in: inTrans, out: TR_NONE },
    transform: { ...BG_TR },
    volume: 0, muted: true,
  };
}

// Overlay covering full canvas
function overlayL(id, s, e, alpha, inTrans = TR_NONE) {
  return {
    id, trackId: "track_overlay",
    type: "gradient", gradient: G.ov(alpha),
    start: s, end: e, zIndex: 2,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: inTrans, out: TR_NONE },
    transform: { ...BG_TR },
  };
}

// Gradient covering a sub-region (not full canvas) — no out transition
function regionGrad(id, trackId, s, e, gradient, tr, zIdx) {
  return {
    id, trackId,
    type: "gradient", gradient,
    start: s, end: e, zIndex: zIdx,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: TR_NONE, out: TR_NONE },
    transform: tr,
  };
}

// Asset layer (image or video) at arbitrary position
function assetL(id, trackId, s, e, src, tr, zIdx = 2, kf = null, fit = "cover") {
  const isVid = /\.(mp4|webm|mov)(\?|$)/i.test(src);
  return {
    id, trackId,
    type: isVid ? "video" : "image",
    src, objectFit: fit,
    start: s, end: e, zIndex: zIdx,
    visible: true, locked: false, sfx: null,
    keyframes: kf ?? { ...NO_KF },
    transition: { in: T.fade(0.3), out: TR_NONE },
    transform: tr,
    ...(isVid ? { volume: 0, muted: true } : {}),
  };
}

// Talking head video at arbitrary transform
function thL(id, s, e, src, tr, inTrans = TR_NONE) {
  return {
    id, trackId: "track_talking_head",
    type: src ? "video" : "gradient",
    ...(src ? { src, objectFit: "cover" } : { gradient: "rgba(40,40,80,0.5)" }),
    start: s, end: e, zIndex: 5,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: inTrans, out: TR_NONE },
    transform: tr,
    volume: 0, muted: true,
  };
}

// Text layer — yCenter is offset from canvas vertical center
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

// Custom text layer at arbitrary position
function textAt(id, trackId, s, e, content, style, tr, zIndex, kf) {
  return {
    id, trackId, type: "text", content, style,
    captionStyle: style._captionStyle ?? null,
    start: s, end: e, zIndex,
    visible: true, locked: false, sfx: null,
    keyframes: kf ?? fadeKf(0.1),
    transition: { in: TR_NONE, out: { type: "fade", duration: 0.2 } },
    transform: tr,
  };
}

function logoL(sid, s, e, src, dur) {
  return {
    id: `${sid}_logo`, trackId: "track_logo",
    type: "image", src, objectFit: "contain",
    start: s, end: e, zIndex: 20,
    visible: true, locked: false, sfx: null,
    keyframes: dur ? pulseKf(dur) : fadeKf(0.1),
    transition: { in: T.fade(0.3), out: TR_NONE },
    transform: mtr(0, -800, 280, 110),
  };
}

// Pick bg image/video/gradient based on assetUrl
function assetBg(sid, s, e, assetUrl, kfType, fallback, inTrans = TR_NONE) {
  if (!assetUrl) return bgGradient(`${sid}_bg`, s, e, fallback ?? G.dark, inTrans);
  const isVid = /\.(mp4|webm|mov)(\?|$)/i.test(assetUrl);
  return isVid
    ? bgVideoLyr(`${sid}_bg`, s, e, assetUrl, kfType, inTrans)
    : bgImage(`${sid}_bg`, s, e, assetUrl, kfType, inTrans);
}

// ── Shared caption style ──────────────────────────────────────────────────────
const CAP_STYLE = {
  fontFamily: "Outfit", fontSize: 42, fontWeight: 700, color: "#ffffff",
  textAlign: "center", lineHeight: 1.3, letterSpacing: 0,
  textTransform: "none", textShadow: null,
  background: "rgba(0,0,0,0.72)", borderRadius: 12, padding: "12px 24px",
  _captionStyle: "karaokeFill",
};

// ── Scene type layouts ────────────────────────────────────────────────────────

// hook_scene — Aggressive bg motion, dominant headline
function hookSceneLayout(sid, s, e, { script, assetUrl, productName, accentColor }) {
  const dur = e - s;
  const out = [];

  out.push(assetBg(sid, s, e, assetUrl, "aggressivePush", G.darkBlue, T.zoom(0.35)));
  out.push(overlayL(`${sid}_ov`, s, e, 0.55, T.zoom(0.35)));

  if (script) {
    out.push(textL(
      `${sid}_headline`, "track_text", s, e, script,
      {
        fontFamily: "Outfit", fontSize: 88, fontWeight: 900, color: "#ffffff",
        textAlign: "center", lineHeight: 1.15, letterSpacing: -2,
        textTransform: "none", textShadow: "0 6px 32px rgba(0,0,0,0.9)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "springScaleIn",
      },
      -60, 500, 10, T.zoom(0.4),
      scaleInKf(0.92, 1.0, 0.4)
    ));
  }

  if (productName) {
    out.push(textL(
      `${sid}_sub`, "track_badge", s, e, productName,
      {
        fontFamily: "Outfit", fontSize: 28, fontWeight: 600, color: accentColor ?? "#f5c518",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 3,
        textTransform: "uppercase", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      340, 70, 11, T.fade(0.4), fadeKf(0.4)
    ));
  }

  return out;
}

// talking_head_full — TH fills frame, caption only
function talkingHeadFullLayout(sid, s, e, { script, talkingHeadUrl, logoUrl }) {
  const out = [];
  out.push(thL(`${sid}_th`, s, e, talkingHeadUrl, { ...BG_TR }, T.fade(0.3)));
  if (logoUrl) out.push(logoL(sid, s, e, logoUrl, e - s));
  if (script) {
    out.push(textL(
      `${sid}_caption`, "track_caption", s, e, script,
      { ...CAP_STYLE },
      700, 180, 15, T.fade(0.3)
    ));
  }
  return out;
}

// talking_head_split — TH left half, asset right half
function talkingHeadSplitLayout(sid, s, e, { script, assetUrl, talkingHeadUrl }) {
  const out = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.dark, T.fade(0.3)));
  out.push(thL(`${sid}_th`, s, e, talkingHeadUrl, mtr(-270, 0, 540, H), T.fade(0.3)));

  // Center divider
  out.push(regionGrad(`${sid}_div`, "track_divider", s, e, "rgba(255,255,255,0.14)", mtr(0, 0, 2, H), 4));

  // Right half — asset or placeholder
  if (assetUrl) {
    out.push(assetL(`${sid}_asset`, "track_asset", s, e, assetUrl, mtr(270, 0, 540, H), 2, fadeKf(0.2)));
  } else {
    out.push(regionGrad(`${sid}_ph`, "track_asset", s, e, "rgba(255,255,255,0.03)", mtr(270, 0, 540, H), 2));
  }

  if (script) {
    out.push(textL(
      `${sid}_caption`, "track_caption", s, e, script,
      { ...CAP_STYLE, fontSize: 34, padding: "10px 20px" },
      820, 130, 15, T.fade(0.3)
    ));
  }

  return out;
}

// listicle — Dark bg, staggered items with pill backgrounds
function listicleLayout(sid, s, e, { assetUrl, talkingHeadUrl, accentColor, sceneData, logoUrl }) {
  const out = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.darkBlue, T.fade(0.3)));

  const items  = (sceneData?.items?.length ? sceneData.items : []).slice(0, 5);
  const itemH  = 100;
  const gap    = 26;
  const rowH   = itemH + gap;
  const totalH = items.length * itemH + Math.max(0, items.length - 1) * gap;
  const startY = -(totalH / 2) + itemH / 2;

  items.forEach((item, idx) => {
    const y     = Math.round(startY + idx * rowH);
    const delay = idx * (8 / 30); // 8 frames apart

    // Pill background
    out.push({
      id: `${sid}_pill${idx}`, trackId: `track_pill_${idx}`,
      type: "gradient", gradient: "rgba(255,255,255,0.07)",
      start: s, end: e, zIndex: 8,
      visible: true, locked: false, sfx: null,
      keyframes: { ...NO_KF, opacity: [{ time: delay, value: 0 }, { time: delay + 0.22, value: 1 }] },
      transition: { in: TR_NONE, out: TR_NONE },
      transform: { ...mtr(0, y, 920, itemH + 8), borderRadius: 14 },
    });

    // Item text
    out.push(textAt(
      `${sid}_item${idx}`, `track_text_${idx}`, s, e, item,
      {
        fontFamily: "Outfit", fontSize: 46, fontWeight: 700, color: "#ffffff",
        textAlign: "center", lineHeight: 1.25, letterSpacing: 0,
        textTransform: "none", textShadow: "0 2px 12px rgba(0,0,0,0.6)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      mtr(0, y, 880, itemH),
      9 + idx,
      { ...NO_KF, opacity: [{ time: delay, value: 0 }, { time: delay + 0.22, value: 1 }] }
    ));
  });

  // TH pip bottom-right if present
  if (talkingHeadUrl) {
    out.push({
      id: `${sid}_th_pip`, trackId: "track_talking_head",
      type: "video", src: talkingHeadUrl, objectFit: "cover",
      start: s, end: e, zIndex: 5,
      visible: true, locked: false, sfx: null,
      keyframes: fadeKf(0.1),
      transition: { in: T.fade(0.3), out: TR_NONE },
      transform: mtr(330, 680, 280, 420),
      volume: 0, muted: true,
    });
  }

  if (logoUrl) out.push(logoL(sid, s, e, logoUrl, e - s));
  return out;
}

// feature_showcase — Asset dominates (80%), title top, callout bottom
function featureShowcaseLayout(sid, s, e, { script, assetUrl, accentColor, sceneData }) {
  const dur    = e - s;
  const assetH = Math.round(H * 0.8);
  const out    = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.midDark, T.fade(0.3)));

  if (assetUrl) {
    out.push(assetL(
      `${sid}_asset`, "track_asset", s, e, assetUrl,
      { ...mtr(0, 0, W, assetH) },
      2,
      { ...NO_KF, scale: [{ time: 0, value: 1.0 }, { time: dur, value: 1.05 }] },
      "contain"
    ));
  }

  // Bottom gradient for text readability
  out.push(regionGrad(`${sid}_bot_ov`, "track_overlay", s, e, G.botFade, { ...BG_TR }, 3));

  const featureName = sceneData?.feature_name ?? "";
  if (featureName) {
    out.push(textL(
      `${sid}_title`, "track_text", s, e, featureName,
      {
        fontFamily: "Outfit", fontSize: 30, fontWeight: 600, color: accentColor ?? "#f5c518",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 2,
        textTransform: "uppercase", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      -840, 60, 10, T.fade(0.3), fadeKf(0.1)
    ));
  }

  if (script) {
    out.push(textL(
      `${sid}_callout`, "track_badge", s, e, script,
      {
        fontFamily: "Outfit", fontSize: 46, fontWeight: 700, color: "#ffffff",
        textAlign: "center", lineHeight: 1.3, letterSpacing: -0.5,
        textTransform: "none", textShadow: "0 3px 16px rgba(0,0,0,0.9)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "wordBlaze",
      },
      730, 220, 11, T.slideUp(0.35), fadeKf(0.2)
    ));
  }

  return out;
}

// screenshot_focus — Screenshot hero (90%), slow pan+zoom, text bottom only
function screenshotFocusLayout(sid, s, e, { script, assetUrl }) {
  const dur    = e - s;
  const assetH = Math.round(H * 0.9);
  const out    = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.dark, T.fade(0.3)));

  if (assetUrl) {
    out.push(assetL(
      `${sid}_asset`, "track_asset", s, e, assetUrl,
      { ...mtr(0, -40, W, assetH) },
      2,
      { ...NO_KF, scale: [{ time: 0, value: 1.0 }, { time: dur, value: 1.08 }], x: [{ time: 0, value: 0 }, { time: dur, value: 22 }] },
      "contain"
    ));
  }

  out.push(regionGrad(`${sid}_bot_ov`, "track_overlay", s, e, G.botFade, { ...BG_TR }, 3));

  if (script) {
    out.push(textL(
      `${sid}_caption`, "track_caption", s, e, script,
      { ...CAP_STYLE },
      740, 180, 15, T.fade(0.3), fadeKf(0.15)
    ));
  }

  return out;
}

// screen_recording_focus — Video fills frame, captions only, no overlapping text
function screenRecordingFocusLayout(sid, s, e, { script, assetUrl }) {
  const out = [];

  if (assetUrl) {
    out.push(bgVideoLyr(`${sid}_bg`, s, e, assetUrl, "default", T.fade(0.3)));
  } else {
    out.push(bgGradient(`${sid}_bg`, s, e, G.dark, T.fade(0.3)));
  }

  out.push(regionGrad(`${sid}_bot_ov`, "track_overlay", s, e, G.botFadeM, { ...BG_TR }, 2));

  if (script) {
    out.push(textL(
      `${sid}_caption`, "track_caption", s, e, script,
      { ...CAP_STYLE },
      700, 180, 15, T.fade(0.3)
    ));
  }

  return out;
}

// benefit_highlight — Large benefit text top, supporting image below
function benefitHighlightLayout(sid, s, e, { script, assetUrl, accentColor }) {
  const out = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.darkBlue, T.fade(0.3)));

  if (script) {
    out.push(textL(
      `${sid}_benefit`, "track_text", s, e, script,
      {
        fontFamily: "Outfit", fontSize: 66, fontWeight: 800, color: "#ffffff",
        textAlign: "center", lineHeight: 1.2, letterSpacing: -1,
        textTransform: "none", textShadow: "0 4px 24px rgba(0,0,0,0.85)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "springScaleIn",
      },
      -310, 500, 10, T.zoom(0.35),
      scaleInKf(0.94, 1.0, 0.35)
    ));
  }

  if (assetUrl) {
    out.push(assetL(
      `${sid}_asset`, "track_asset", s, e, assetUrl,
      { ...mtr(0, 410, 760, 580), borderRadius: 16 },
      2, fadeKf(0.25), "contain"
    ));
  }

  return out;
}

// stat_highlight — Giant number with scale punch, label below
function statHighlightLayout(sid, s, e, { accentColor, sceneData, script }) {
  const out        = [];
  const statValue  = sceneData?.stat_value || script || "";
  const statLabel  = sceneData?.stat_label || "";

  out.push(bgGradient(`${sid}_bg`, s, e, G.dark, T.fade(0.3)));

  if (statValue) {
    out.push(textL(
      `${sid}_stat`, "track_text", s, e, statValue,
      {
        fontFamily: "Outfit", fontSize: 130, fontWeight: 900, color: accentColor ?? "#f5c518",
        textAlign: "center", lineHeight: 1.0, letterSpacing: -4,
        textTransform: "none", textShadow: `0 8px 40px ${accentColor ?? "#f5c518"}55`,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      -130, 200, 10, T.none(),
      {
        ...NO_KF,
        opacity: [{ time: 0, value: 0 }, { time: 0.2, value: 1 }],
        scale:   [{ time: 0, value: 0.85 }, { time: 0.333, value: 1.0 }],
      }
    ));
  }

  if (statLabel) {
    out.push(textL(
      `${sid}_label`, "track_badge", s, e, statLabel,
      {
        fontFamily: "Outfit", fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.7)",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 2,
        textTransform: "uppercase", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      130, 70, 11, T.fade(0.4), fadeKf(0.3)
    ));
  }

  return out;
}

// comparison — Split screen before / after
function comparisonLayout(sid, s, e, { script, assetUrl, accentColor, sceneData }) {
  const before = sceneData?.before_label || "Before";
  const after  = sceneData?.after_label  || "After";
  const out    = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.dark, T.fade(0.3)));

  // Left dark overlay (Before side)
  out.push(regionGrad(`${sid}_left_ov`, "track_overlay_left", s, e, "rgba(0,0,0,0.6)", mtr(-270, 0, 540, H), 2));

  // Right side — asset (After side)
  if (assetUrl) {
    out.push(assetL(`${sid}_right`, "track_asset", s, e, assetUrl, mtr(270, 0, 540, H), 1, fadeKf(0.2)));
    out.push(regionGrad(`${sid}_right_ov`, "track_overlay_right", s, e, "rgba(0,0,0,0.15)", mtr(270, 0, 540, H), 2));
  } else {
    out.push(regionGrad(`${sid}_right_ph`, "track_overlay_right", s, e, "rgba(255,255,255,0.04)", mtr(270, 0, 540, H), 2));
  }

  // Center divider
  out.push(regionGrad(`${sid}_div`, "track_divider", s, e, "rgba(255,255,255,0.25)", mtr(0, 0, 3, H), 4));

  const labelStyle = {
    fontFamily: "Outfit", fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.65)",
    textAlign: "center", lineHeight: 1.3, letterSpacing: 2,
    textTransform: "uppercase", textShadow: null,
    background: null, borderRadius: 0, padding: 0,
    _captionStyle: null,
  };

  out.push(textAt(`${sid}_before`, "track_text_left",  s, e, before, labelStyle, mtr(-270, -780, 480, 65), 10, fadeKf(0.15)));
  out.push(textAt(`${sid}_after`,  "track_text_right", s, e, after,  { ...labelStyle, color: "#ffffff" }, mtr(270, -780, 480, 65), 10, fadeKf(0.15)));

  return out;
}

// process_steps — Numbered steps, staggered, accent numbers
function processStepsLayout(sid, s, e, { script, accentColor, sceneData }) {
  const out   = [];
  const steps = sceneData?.steps?.length ? sceneData.steps.slice(0, 4) : script ? [script] : [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.darkBlue, T.fade(0.3)));

  const stepH  = 110;
  const gap    = 28;
  const rowH   = stepH + gap;
  const totalH = steps.length * stepH + Math.max(0, steps.length - 1) * gap;
  const startY = -(totalH / 2) + stepH / 2;

  steps.forEach((step, idx) => {
    const y     = Math.round(startY + idx * rowH);
    const delay = idx * (8 / 30);
    const num   = String(idx + 1).padStart(2, "0");

    // Number — accent, large, left side
    out.push(textAt(
      `${sid}_num${idx}`, `track_num_${idx}`, s, e, num,
      {
        fontFamily: "Outfit", fontSize: 78, fontWeight: 900, color: accentColor ?? "#f5c518",
        textAlign: "center", lineHeight: 1.0, letterSpacing: -2,
        textTransform: "none", textShadow: `0 4px 20px ${accentColor ?? "#f5c518"}55`,
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      mtr(-350, y, 180, stepH),
      10 + idx,
      { ...NO_KF, opacity: [{ time: delay, value: 0 }, { time: delay + 0.22, value: 1 }] }
    ));

    // Step text — right of number
    out.push(textAt(
      `${sid}_step${idx}`, `track_step_${idx}`, s, e, step,
      {
        fontFamily: "Outfit", fontSize: 40, fontWeight: 600, color: "#ffffff",
        textAlign: "left", lineHeight: 1.3, letterSpacing: 0,
        textTransform: "none", textShadow: "0 2px 12px rgba(0,0,0,0.6)",
        background: null, borderRadius: 0, padding: 0, _captionStyle: null,
      },
      mtr(110, y, 640, stepH),
      10 + idx,
      { ...NO_KF, opacity: [{ time: delay + 0.05, value: 0 }, { time: delay + 0.28, value: 1 }] }
    ));
  });

  return out;
}

// cta — Logo top with pulse, large action text, clean
function ctaLayout(sid, s, e, { script, accentColor, logoUrl, productName }) {
  const dur = e - s;
  const out = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.darkBlue, T.fade(0.3)));

  if (logoUrl) {
    out.push({
      id: `${sid}_logo`, trackId: "track_logo",
      type: "image", src: logoUrl, objectFit: "contain",
      start: s, end: e, zIndex: 10,
      visible: true, locked: false, sfx: null,
      keyframes: pulseKf(dur),
      transition: { in: T.fade(0.4), out: TR_NONE },
      transform: mtr(0, -560, 320, 130),
    });
  }

  if (script) {
    out.push(textL(
      `${sid}_cta`, "track_text", s, e, script,
      {
        fontFamily: "Outfit", fontSize: 70, fontWeight: 800, color: "#ffffff",
        textAlign: "center", lineHeight: 1.2, letterSpacing: -1,
        textTransform: "none", textShadow: "0 4px 24px rgba(0,0,0,0.85)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "springScaleIn",
      },
      30, 460, 10, T.zoom(0.4),
      scaleInKf(0.94, 1.0, 0.4)
    ));
  }

  if (productName) {
    out.push(textL(
      `${sid}_product`, "track_badge", s, e, productName,
      {
        fontFamily: "Outfit", fontSize: 26, fontWeight: 600, color: accentColor ?? "#f5c518",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 3,
        textTransform: "uppercase", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      520, 65, 11, T.fade(0.5), fadeKf(0.4)
    ));
  }

  return out;
}

// ── Visual-mode fallback layouts ──────────────────────────────────────────────

// full_avatar — delegates to talkingHeadFullLayout
function fullAvatarLayout(sid, s, e, { script, talkingHeadUrl, logoUrl }) {
  return talkingHeadFullLayout(sid, s, e, { script, talkingHeadUrl, logoUrl });
}

// full_asset — asset bg with text overlay
function fullAssetLayout(sid, s, e, { script, assetUrl, productName, accentColor }) {
  const out   = [];
  const bgIn  = T.slideUp(0.35);

  out.push(assetBg(sid, s, e, assetUrl, "gentleZoom", G.midDark, bgIn));
  out.push(overlayL(`${sid}_ov`, s, e, 0.48, bgIn));

  if (script) {
    out.push(textL(
      `${sid}_text`, "track_text", s, e, script,
      {
        fontFamily: "Outfit", fontSize: 58, fontWeight: 700, color: "#ffffff",
        textAlign: "center", lineHeight: 1.25, letterSpacing: -0.5,
        textTransform: "none", textShadow: "0 3px 20px rgba(0,0,0,0.85)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "wordBlaze",
      },
      350, 440, 10, T.slideUp(0.35), fadeKf(0.15)
    ));
  }

  if (productName) {
    out.push(textL(
      `${sid}_badge`, "track_badge", s, e, productName,
      {
        fontFamily: "Outfit", fontSize: 28, fontWeight: 700, color: accentColor ?? "#f5c518",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 2,
        textTransform: "uppercase", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      690, 75, 11, T.fade(0.4), fadeKf(0.3)
    ));
  }

  return out;
}

// top_asset_bottom_avatar — top 50% asset, bottom 50% TH
function topAssetBottomAvatarLayout(sid, s, e, { script, assetUrl, talkingHeadUrl }) {
  const out = [];

  out.push(bgGradient(`${sid}_bg`, s, e, G.dark, T.fade(0.3)));

  if (assetUrl) {
    out.push(assetL(`${sid}_asset`, "track_asset", s, e, assetUrl, mtr(0, -480, W, 960), 2, fadeKf(0.15)));
    out.push(regionGrad(`${sid}_top_ov`, "track_overlay_top", s, e, "rgba(0,0,0,0.3)", mtr(0, -480, W, 960), 3));
  }

  out.push(thL(`${sid}_th`, s, e, talkingHeadUrl, mtr(0, 480, W, 960), T.fade(0.3)));

  if (script) {
    out.push(textL(
      `${sid}_caption`, "track_caption", s, e, script,
      { ...CAP_STYLE, fontSize: 36 },
      820, 130, 15, T.fade(0.3)
    ));
  }

  return out;
}

// floating_avatar — asset bg, TH pip bottom center, caption above pip
function floatingAvatarLayout(sid, s, e, { script, assetUrl, talkingHeadUrl }) {
  const out  = [];
  const bgIn = T.zoom(0.35);

  out.push(assetBg(sid, s, e, assetUrl, "default", G.midDark, bgIn));
  out.push(overlayL(`${sid}_ov`, s, e, 0.38, bgIn));

  if (script) {
    out.push(textL(
      `${sid}_caption`, "track_caption", s, e, script,
      { ...CAP_STYLE, fontSize: 36, padding: "10px 22px" },
      460, 140, 6, T.fade(0.3), fadeKf(0.15)
    ));
  }

  out.push({
    id: `${sid}_th`, trackId: "track_talking_head",
    type: talkingHeadUrl ? "video" : "gradient",
    ...(talkingHeadUrl ? { src: talkingHeadUrl, objectFit: "cover" } : { gradient: "rgba(40,40,80,0.4)" }),
    start: s, end: e, zIndex: 5,
    visible: true, locked: false, sfx: null,
    keyframes: { ...NO_KF },
    transition: { in: T.zoom(0.35), out: TR_NONE },
    transform: mtr(0, 550, 540, 810),
    volume: 0, muted: true,
  });

  return out;
}

// stock — asset/stock image with headline
function stockLayout(sid, s, e, { script, assetUrl, productName, accentColor, logoUrl }) {
  const out  = [];
  const bgIn = T.zoom(0.35);

  out.push(assetBg(sid, s, e, assetUrl, "default", G.dark, bgIn));
  out.push(overlayL(`${sid}_ov`, s, e, 0.45, bgIn));

  if (script) {
    out.push(textL(
      `${sid}_headline`, "track_text", s, e, script,
      {
        fontFamily: "Outfit", fontSize: 68, fontWeight: 800, color: "#ffffff",
        textAlign: "center", lineHeight: 1.2, letterSpacing: -1,
        textTransform: "none", textShadow: "0 4px 24px rgba(0,0,0,0.85)",
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: "springScaleIn",
      },
      -80, 440, 10, T.zoom(0.4), scaleInKf(0.94, 1.0, 0.4)
    ));
  }

  if (productName) {
    out.push(textL(
      `${sid}_sub`, "track_badge", s, e, productName,
      {
        fontFamily: "Outfit", fontSize: 30, fontWeight: 600, color: accentColor ?? "#f5c518",
        textAlign: "center", lineHeight: 1.3, letterSpacing: 2,
        textTransform: "uppercase", textShadow: null,
        background: null, borderRadius: 0, padding: 0,
        _captionStyle: null,
      },
      270, 75, 11, T.fade(0.5), fadeKf(0.4)
    ));
  }

  if (logoUrl) out.push(logoL(sid, s, e, logoUrl, e - s));
  return out;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const promoLayoutRegistry = {
  full_avatar:             { primary: fullAvatarLayout,            alternate: fullAvatarLayout       },
  full_asset:              { primary: fullAssetLayout,             alternate: fullAssetLayout        },
  top_asset_bottom_avatar: { primary: topAssetBottomAvatarLayout                                     },
  floating_avatar:         { primary: floatingAvatarLayout                                           },
  stock:                   { primary: stockLayout,                 alternate: stockLayout            },
  default:                 { primary: stockLayout,                 alternate: stockLayout            },
};

// Scene-type registry — checked before visual_mode in getPromoLayoutForScene
const sceneTypeRegistry = {
  hook_scene:             { primary: hookSceneLayout             },
  talking_head_full:      { primary: talkingHeadFullLayout       },
  talking_head_split:     { primary: talkingHeadSplitLayout      },
  listicle:               { primary: listicleLayout              },
  feature_showcase:       { primary: featureShowcaseLayout       },
  screenshot_focus:       { primary: screenshotFocusLayout       },
  screen_recording_focus: { primary: screenRecordingFocusLayout  },
  benefit_highlight:      { primary: benefitHighlightLayout      },
  stat_highlight:         { primary: statHighlightLayout         },
  comparison:             { primary: comparisonLayout            },
  process_steps:          { primary: processStepsLayout          },
  cta:                    { primary: ctaLayout                   },
};

export function getPromoLayout(visualMode, variant = "primary") {
  const entry = promoLayoutRegistry[visualMode] ?? promoLayoutRegistry.default;
  return entry[variant] ?? entry.primary;
}

export function getPromoLayoutForScene(sceneType, visualMode, variant = "primary") {
  if (sceneType) {
    const entry = sceneTypeRegistry[sceneType];
    if (entry) return entry[variant] ?? entry.primary;
  }
  return getPromoLayout(visualMode, variant);
}
