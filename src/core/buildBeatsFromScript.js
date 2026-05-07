/**
 * buildBeatsFromScript.js
 * src/core/buildBeatsFromScript.js
 */

import { generateCaptionText }   from "./captionTimingEngine";
import { autoMatchAssets }        from "./assetAutoMatcher";
import { validateBeats }          from "./compilerValidator";
import { applyBeatVariation }     from "./beatVariationEngine";
import { applyCaptionEmphasis }   from "./captionEmphasisEngine";
import { getLayoutDef, layoutRegistry, initLayoutRegistry, findLayouts } from "./registries/layoutRegistry";
import { resolveColors }          from "./colorContrastResolver";
import { resolveBeatColors }      from "./elements/colorContrastResolver";
import { backgroundPatternRegistry } from "./registries/backgroundPatternRegistry.js";
import { getNicheColorFamily, getNicheAvoid } from "./registries/nichePaletteRegistry.js";
import { pickBeatSFX } from "./registries/sfxRegistry";
import { PIPELINE_EFFECTS }              from "./registries/textEffectRegistry.jsx";

import { getTypographyForRole } from "./videoDNA.js";
import { serverFetch } from "../services/serverApi";

/* ── Helpers ── */
function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function isLightColor(color) {
  if (!color || typeof color !== "string") return false;
  const c = color.trim().toLowerCase();
  const LIGHT_NAMES = new Set([
    "white","whitesmoke","snow","ivory","floralwhite","ghostwhite","mintcream",
    "aliceblue","lavender","lavenderblush","mistyrose","honeydew","lightyellow",
    "lightcyan","lightgray","lightgrey","silver","gainsboro","beige","linen",
    "oldlace","cornsilk","lemonchiffon","lightyellow","papayawhip","blanchedalmond",
    "bisque","wheat","peachpuff","moccasin","khaki","palegoldenrod","antiquewhite",
    "yellow","lightsalmon","lightpink","pink","hotpink","plum","thistle","violet",
    "orchid","palegreen","greenyellow","chartreuse","lime","aquamarine","lightseagreen",
    "turquoise","lightblue","skyblue","powderblue","paleturquoise","cyan","aqua",
  ]);
  const DARK_NAMES = new Set([
    "black","darkblue","darkgreen","darkred","navy","midnightblue","indigo","purple",
    "maroon","saddlebrown","sienna","darkslategray","darkslategrey","dimgray","dimgrey",
    "gray","grey","slategray","slategrey",
  ]);
  if (LIGHT_NAMES.has(c)) return true;
  if (DARK_NAMES.has(c)) return false;
  if (/^#[0-9a-f]{3}$/.test(c)) {
    const r = parseInt(c[1] + c[1], 16);
    const g = parseInt(c[2] + c[2], 16);
    const b = parseInt(c[3] + c[3], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }
  if (/^#[0-9a-f]{6}$/.test(c)) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return (parseInt(rgb[1]) * 299 + parseInt(rgb[2]) * 587 + parseInt(rgb[3]) * 114) / 1000 > 128;
  }
  return false;
}

/* ── Duration ── */
function calculateDuration(spoken, intent, energy = 0.5) {
  const wc  = words(spoken).length;
  let base  = 1.6 + wc * 0.14;

  const intentAdj = {
    shock: 0.8, curiosity: 0.5, proof: 0.6, reveal: 0.8,
    punchline: 0.6, empathy: 0.5, explanation: 0.5, urgency: -0.2,
    hook: 0.6, stat: 0.5, list: 0.4, contrast: 0.4, irony: 0.3,
  };
  base += intentAdj[intent] || 0;
  base -= (energy - 0.5) * 0.4;

  const variance = Math.random() * 0.4 - 0.2;
  return Number(Math.min(4.0, Math.max(1.4, base + variance)).toFixed(1));
}

/* ── Beat type → intent mapping ── */
const BEAT_TYPE_TO_INTENT = {
  hook:        "curiosity",
  item:        "explanation",
  fact:        "proof",
  stat:        "proof",
  explanation: "explanation",
  reveal:      "reveal",
  contrast:    "contrast",
  cta:         "urgency",
  setup:       "curiosity",
  conflict:    "shock",
  escalate:    "urgency",
  ending:      "reveal",
  insight:     "proof",
  claim:       "shock",
  proof:       "proof",
  punchline:   "punchline",
};

const BEAT_TYPE_TO_ENERGY = {
  hook:        0.85,
  item:        0.65,
  fact:        0.6,
  stat:        0.7,
  explanation: 0.5,
  reveal:      0.75,
  contrast:    0.6,
  cta:         0.8,
  setup:       0.6,
  conflict:    0.75,
  escalate:    0.8,
  ending:      0.7,
  insight:     0.6,
  claim:       0.8,
  proof:       0.6,
  punchline:   0.75,
};

/* ── Caption ── */
function pickVideoCaptionStyle(beats) {
  const avgEnergy = beats.reduce((s, b) => s + (b.energy ?? 0.5), 0) / (beats.length || 1);
  const intents   = beats.map(b => b.intent).filter(Boolean);
  const dominant  = intents.sort((a, b) =>
    intents.filter(v => v === b).length - intents.filter(v => v === a).length
  )[0] || "explanation";

  if (avgEnergy >= 0.85) return "brutalSlam";
  const map = {
    shock: "wordBlaze", curiosity: "wordHighlight", proof: "premiumBlock",
    reveal: "glitchStamp", urgency: "brutalSlam", empathy: "editorialSerif",
    punchline: "markerPen", contrast: "wordHighlight", irony: "wordHighlight",
    hook: "wordBlaze", stat: "premiumBlock", quote: "editorialSerif",
  };
  return map[dominant] || "wordBlaze";
}

function chooseCaptionAnimation(intent, energy = 0.5) {
  if (energy >= 0.8) return "word_pop";
  const map = {
    shock: "word_pop", curiosity: "wave", proof: "word_reveal",
    reveal: "pop", urgency: "word_pop", contrast: "slide",
    punchline: "pop", empathy: "fade", explanation: "word_reveal",
    irony: "wave", hook: "pop", stat: "word_pop", quote: "fade",
  };
  return map[intent] || "fade";
}

function chooseCaptionPosition(_layoutId, index, total, energy) {
  if (index === 0 || index === total - 1) return 80;
  if (energy >= 0.8) return 50;
  return 80;
}

/* ── Beat role ── */
function assignBeatRole(index, total) {
  if (total <= 1) return "hook";
  if (index === 0)         return "hook";
  if (index === total - 1) return "cta";
  const pos = index / (total - 1);
  if (pos <= 0.25) return "proof";
  if (pos <= 0.60) return "escalate";
  return "reveal";
}

/* ── Transition ── */
const TRANSITION_DURATIONS = {
  zoom: 18, whipPan: 12, glitch: 14, flash: 10, spin: 14,
  slideLeft: 16, slideRight: 16, slideUp: 16, slideDown: 16,
  dissolve: 18, dipBlack: 16, dipWhite: 16, fade: 14, cut: 0,
};

const TRANS_HIGH = ["zoom", "whipPan", "slideLeft", "slideUp", "glitch", "flash", "zoom", "slideRight"];
const TRANS_LOW  = ["dissolve", "dipBlack", "slideRight", "slideDown", "fade", "dissolve", "dipWhite", "slideLeft"];

function chooseTransition(layoutId, index, energy = 0.5, isLast = false, prevType = null) {
  const layoutDef = getLayoutDef(layoutId);
  if (layoutDef?.defaultTransition) return layoutDef.defaultTransition;

  if (index === 0) {
    if (energy >= 0.75) return { type: "zoom",    duration: TRANSITION_DURATIONS.zoom };
    if (energy >= 0.45) return { type: "fade",    duration: TRANSITION_DURATIONS.fade };
    return                     { type: "dissolve", duration: TRANSITION_DURATIONS.dissolve };
  }
  if (isLast) return { type: "dissolve", duration: TRANSITION_DURATIONS.dissolve };

  const pool = energy >= 0.6 ? TRANS_HIGH : TRANS_LOW;
  const available = prevType ? pool.filter(t => t !== prevType) : pool;
  const pick = available[(index * 7 + Math.round(energy * 13)) % available.length];
  return { type: pick, duration: TRANSITION_DURATIONS[pick] ?? 14 };
}

/* ── Enforce layout zones ── */
function enforceLayoutZones(layoutId, existingZones = {}) {
  const def = getLayoutDef(layoutId);
  if (!def) return existingZones;

  const fixed = {};

  def.zones.forEach(zoneDef => {
    const existing = existingZones[zoneDef.id];

    if (existing) {
      const existingKind = existing?.content?.kind;
      const kindMatches =
        (zoneDef.type === "text"       && existingKind === "text")       ||
        (zoneDef.type === "asset"      && existingKind === "asset")      ||
        (zoneDef.type === "avatar"     && existingKind === "asset")      ||
        (zoneDef.type === "decorative" && existingKind === "shape")      ||
        (zoneDef.type === "icon"       && existingKind === "icon")       ||
        (!existingKind);

      if (kindMatches && existingKind) {
        fixed[zoneDef.id] = existing;
        return;
      }
    }

    if (zoneDef.type === "text") {
      // eslint-disable-next-line no-unused-vars
      const { _presetId: _sp, color: _sc, background: _sb, fontFamily: _sff, fontWeight: _sfw, ...baseLayoutStyle } = zoneDef.style || {};
      const layoutZoneStyle = zoneDef.style?._userFontFamily
        ? { ...baseLayoutStyle, fontFamily: _sff, fontWeight: _sfw }
        : baseLayoutStyle;
      fixed[zoneDef.id] = {
        content: { kind: "text", text: "" },
        style: { ...layoutZoneStyle },
        ...(zoneDef.background ? { background: zoneDef.background } : {}),
      };
    } else if (zoneDef.type === "asset" || zoneDef.type === "avatar") {
      fixed[zoneDef.id] = {
        content: {
          kind: "asset",
          asset: { src: null, type: "image", objectFit: "cover" },
        },
        style: { ...(zoneDef.style ?? {}) },
      };
    } else if (zoneDef.type === "decorative") {
      const br      = zoneDef.style?.borderRadius ?? 0;
      const isRing  = br >= 999;
      const isLarge = (zoneDef.width ?? 0) > 60 || (zoneDef.height ?? 0) > 60;
      const shape   = isRing ? "ring" : (isLarge ? "square" : "circle");
      const filled  = zoneDef.style?.filled ?? (!isRing && !isLarge);
      fixed[zoneDef.id] = {
        content: { shape },
        style: { ...zoneDef.style, color: zoneDef.style?.color || "#ffffff", filled },
      };
    } else if (zoneDef.type === "icon") {
      fixed[zoneDef.id] = {
        content: { iconId: null },
        style: { ...zoneDef.style, color: zoneDef.style?.color || "#ffffff", filled: true },
      };
    } else {
      fixed[zoneDef.id] = { content: {}, style: {} };
    }
  });

  return fixed;
}

/* ── Direct zone filling from script fields ── */
function fillScriptFields(zones, layoutId, scriptBeat) {
  const def = getLayoutDef(layoutId);
  if (!def) return zones;

  const ROLE_TO_FIELD = {
    "display":    scriptBeat.display,
    "headline":   scriptBeat.display,
    "item_title": scriptBeat.display,
    "subtext":    scriptBeat.sub,
    "item_body":  scriptBeat.sub,
    "number":     scriptBeat.number,
    "label":      scriptBeat.label,
    "stat":       scriptBeat.stat,
  };

  const filled = { ...zones };
  const usedRoles = new Set();

  def.zones
    .filter(z => z.type === "text")
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(zoneDef => {
      const role  = zoneDef.role;
      const value = ROLE_TO_FIELD[role];
      if (!value || usedRoles.has(role)) return;

      filled[zoneDef.id] = {
        ...(filled[zoneDef.id] || {}),
        role,
        content: { kind: "text", text: String(value) },
      };
      usedRoles.add(role);
    });

  return filled;
}

/* ── Layout picker by beat type ── */
const ENTITY_CARD_LAYOUT_ID = "d425bbf7-485b-4cb7-8b26-6d7161fd1eda";

function pickLayoutForBeatType(beatType, usedLayoutIds, orientation, talkingHead = false, scriptBeat = null) {
  // Primary: find layouts matching this exact beatType
  let candidates = findLayouts({ beatType, orientation, type: "layout", talkingHead });
  if (!candidates.length) candidates = findLayouts({ beatType, orientation, talkingHead });

  // Fallback: use intent-based lookup if no beatType-specific layouts exist
  if (!candidates.length) {
    const intent = BEAT_TYPE_TO_INTENT[beatType] || "explanation";
    candidates = findLayouts({ intent, orientation, type: "layout", talkingHead });
    if (!candidates.length) candidates = findLayouts({ intent, orientation, talkingHead });
  }

  // Last resort: any orientation layout
  if (!candidates.length) candidates = findLayouts({ orientation, talkingHead });
  if (!candidates.length) candidates = findLayouts({ talkingHead });

  // Entity-aware preference: item beats with an entity get the dedicated entity card layout
  if (beatType === "item" && scriptBeat?.entity) {
    const recentTwo = new Set(usedLayoutIds.slice(-2));
    if (!recentTwo.has(ENTITY_CARD_LAYOUT_ID)) {
      // Check if the entity card layout exists in the registry
      const allLayouts = findLayouts({ orientation, talkingHead });
      if (allLayouts.some(l => l.id === ENTITY_CARD_LAYOUT_ID)) {
        console.log(`[pickLayoutForBeatType] entity="${scriptBeat.entity}" → ENTITY_CARD`);
        return ENTITY_CARD_LAYOUT_ID;
      }
    }
    // Entity card was recently used or not registered — use text-only layouts.
    // Horizontal logos/screenshots look worse stretched full-bleed than on a clean dark background.
    const textOnlyLayouts = candidates.filter(l => (l.def?.assetCount ?? 0) === 0);
    if (textOnlyLayouts.length) candidates = textOnlyLayouts;
    // else keep all candidates as absolute last resort
  }

  // Never repeat the last used layout
  const lastId = usedLayoutIds.length ? usedLayoutIds[usedLayoutIds.length - 1] : null;
  if (lastId) {
    const withoutLast = candidates.filter(l => l.id !== lastId);
    if (withoutLast.length) candidates = withoutLast;
  }

  // Rotate through unused layouts for variety
  const usedSet = new Set(usedLayoutIds);
  const unused  = candidates.filter(l => !usedSet.has(l.id));
  if (unused.length) candidates = unused;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  console.log(`[pickLayoutForBeatType] beatType=${beatType} entity=${scriptBeat?.entity || null} → ${picked?.id || "fallback"}`);
  return picked?.id || "DuoStackHook";
}

/* ── Fill text zones — DNA color + typography ── */
function fillTextZones(beats, colorOptions = {}) {
  const typographySystem = colorOptions.dna?.typographySystem || null;
  if (typographySystem) {
    console.log("[typography] Locking system:", typographySystem);
  }

  return beats.map(beat => {
    const def = getLayoutDef(beat.layout);
    if (!def) return beat;

    const colors = resolveColors({
      colorStory:  colorOptions.colorStory || null,
      brandColor:  colorOptions.brandColor  || null,
      brandColor2: colorOptions.brandColor2 || null,
      energy:      beat.energy ?? 0.5,
    });

    const textZones = def.zones
      .filter(z => z.type === "text")
      .sort((a, b) => a.order - b.order);

    if (!textZones.length) return beat;

    const zones = { ...beat.zones };
    const hasAssetZones = def.zones.some(z => z.type === "asset");

    const nicheBg         = colorOptions.colorStory?.bg || colorOptions.dna?.colorStory?.bg || "#0b0b10";
    const actualBg        = beat.layoutBackground;
    const actualBgIsDark  = !actualBg
      || actualBg.type === "pattern"
      || actualBg.type === "image"
      || actualBg.type === "video"
      || (actualBg.type === "color" && !isLightColor(actualBg.value));
    const bgIsLight = !actualBgIsDark && isLightColor(nicheBg);

    textZones.forEach((zoneDef, order) => {
      const existing = zones[zoneDef.id];

      const rawPaletteText = colorOptions.colorStory?.text || colorOptions.dna?.colorStory?.text || "#ffffff";
      const paletteText = actualBgIsDark && !isLightColor(rawPaletteText) ? "#ffffff" : rawPaletteText;
      const primary     = colorOptions.colorStory?.primary || colorOptions.dna?.colorStory?.primary || "#7c5cfc";

      const inject = {};
      console.log("[fillTextZones] paletteText:", paletteText, "colorStory:", JSON.stringify(colorOptions.colorStory?.text), "dna:", JSON.stringify(colorOptions.dna?.colorStory?.text));
      inject.color = paletteText;

      if (bgIsLight) {
        inject.textShadow = "none";
      } else if (hasAssetZones) {
        inject.textShadow = beat.energy >= 0.7
          ? "0 4px 28px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.8)"
          : "0 2px 18px rgba(0,0,0,0.9)";
      } else if (colors.textShadow && colors.textShadow !== "none") {
        inject.textShadow = colors.textShadow;
      }

      if (zoneDef.style?.WebkitTextStrokeColor || zoneDef.style?.textStrokeColor) {
        inject.WebkitTextStrokeColor = primary;
        inject.textStrokeColor       = primary;
      }

      if (!existing?.style?.textEffect) {
        const seed2 = (beat.intent || "").charCodeAt(0) + order * 7 + (zoneDef.id || "").charCodeAt(1);
        inject.textEffect = PIPELINE_EFFECTS[seed2 % PIPELINE_EFFECTS.length];
      }

      const existingContent = existing?.content || { kind: "text", text: "" };
      const { textEffect, ...injectVisualStyle } = inject;

      // eslint-disable-next-line no-unused-vars
      const { whiteSpace: _sWS, _presetId: _sPI, color: _sC, background: _sBG, fontFamily: _sFF, fontWeight: _sFW, ...zoneDef_styleNoNowrap } =
        zoneDef.style || {};

      const userOverrides = {};
      if (existing?.style?._userColor)      userOverrides.color      = existing.style.color;
      if (existing?.style?._userBackground) userOverrides.background = existing.style.background;

      const mergedVisual = {
        ...injectVisualStyle,
        ...zoneDef_styleNoNowrap,
        ...userOverrides,
        whiteSpace:   "normal",
        wordBreak:    "normal",
        overflowWrap: "normal",
        hyphens:      "none",
      };

      const zoneBgStyle = mergedVisual.background;
      const zoneBgLayer =
        (typeof zoneDef.background?.color === "string" ? zoneDef.background.color : null)
        ?? (typeof existing?.background?.color === "string" ? existing.background.color : null);
      const zoneBg = (zoneBgStyle && zoneBgStyle !== "transparent") ? zoneBgStyle : (zoneBgLayer || null);

      const isSolidColor = (v) => v && typeof v === "string"
        && v !== "transparent"
        && !v.includes("gradient")
        && !v.includes("linear")
        && !v.includes("radial");

      const zoneBgIsLight = isSolidColor(zoneBg) && isLightColor(zoneBg);
      if (bgIsLight || zoneBgIsLight) {
        mergedVisual.textShadow = "none";
      }

      const hasZoneBackground = isSolidColor(zoneBg);
      if (hasZoneBackground && !existing?.style?._userColor) {
        const textIsLight = isLightColor(mergedVisual.color || "#ffffff");
        if (textIsLight === zoneBgIsLight) {
          mergedVisual.color = zoneBgIsLight ? "#0a0a0a" : "#ffffff";
        }
      }

      if (!existing?.style?._userColor) {
        mergedVisual.color = paletteText;
      }

      if (typographySystem && !existing?.style?._userEditedFont) {
        const ROLE_TO_TYPOGRAPHY_ROLE = {
          eyebrow: "label", number: "display", item_title: "headline",
          item_body: "subtext", before: "subtext", after: "subtext",
          kicker: "headline", caption: "subtext",
        };
        const zoneRole = zoneDef.role || (order === 0 ? "headline" : "subtext");
        const resolvedTypoRole = ROLE_TO_TYPOGRAPHY_ROLE[zoneDef.role] || zoneRole;
        const { fontFamily, fontWeight } = getTypographyForRole(typographySystem, resolvedTypoRole);
        if (fontFamily) mergedVisual.fontFamily = fontFamily;
        if (fontWeight) mergedVisual.fontWeight  = fontWeight;
      }

      zones[zoneDef.id] = {
        ...existing,
        content: existingContent,
        style: {
          ...mergedVisual,
          textEffect: existing?.style?.textEffect || textEffect,
        },
      };
    });

    return { ...beat, zones };
  });
}

/* ── Decorative zone color theming ── */
const WORKS_WITH_HEX = {
  white:  "#ffffff",
  yellow: "#f5c518",
  gold:   "#f59e0b",
  black:  "#111118",
  dark:   "#1a1a2e",
  navy:   "#1e293b",
};

function fillDecorativeZones(beats, colorOptions = {}) {
  const dnaAccent = colorOptions.colorStory?.primary
    || colorOptions.dna?.colorStory?.primary
    || "#7c5cfc";
  const brandAccent = colorOptions.brandColor || dnaAccent;
  const lockedBgKey = colorOptions.lockedBgKey || null;

  return beats.map(beat => {
    const def = getLayoutDef(beat.layout);
    if (!def) return beat;

    const decorativeZones = def.zones.filter(z => z.type === "decorative" || z.type === "icon");
    if (!decorativeZones.length) return beat;

    const zones = { ...beat.zones };
    const bgKey   = (beat.layoutBackground?.type === "pattern" ? beat.layoutBackground.value : null) || lockedBgKey;
    const bgEntry = bgKey ? backgroundPatternRegistry[bgKey] : null;
    const worksWith = bgEntry?.works_with || [];

    let accent  = dnaAccent;
    let accent2 = brandAccent;
    if (worksWith.length) {
      const mapped = worksWith.map(w => WORKS_WITH_HEX[w]).filter(Boolean);
      if (mapped.length >= 1) accent  = mapped[0];
      if (mapped.length >= 2) accent2 = mapped[1];
      else                    accent2 = accent;
    }

    decorativeZones.forEach((zoneDef, idx) => {
      const existing = zones[zoneDef.id];
      if (existing?.style?._userColor) return;
      const themeColor = idx % 2 === 0 ? accent : accent2;
      zones[zoneDef.id] = {
        ...(existing || {}),
        style: { ...(existing?.style || {}), ...(zoneDef.style || {}), color: themeColor },
      };
    });

    return { ...beat, zones };
  });
}

/* ── Video-level visual system ── */
const INTENT_TO_BG_INTENT_LOCAL = {
  shock: "shock", curiosity: "curiosity", proof: "proof",
  irony: "irony", reveal: "reveal", empathy: "empathy",
  urgency: "urgency", explanation: "explanation", contrast: "contrast",
  punchline: "punchline", hook: "shock", stat: "proof",
};

function pickNicheBackground(niche, intent, excludeKeys = []) {
  const allBgs = Object.entries(backgroundPatternRegistry);

  const nicheMatch = allBgs.filter(([key, bg]) =>
    !excludeKeys.includes(key) && bg.niche?.includes(niche)
  );

  const intentMatch = nicheMatch.filter(([, bg]) => bg.intent?.includes(intent));

  const pool = intentMatch.length ? intentMatch
    : nicheMatch.length ? nicheMatch
    : allBgs.filter(([key, bg]) =>
        !excludeKeys.includes(key) &&
        bg.intent?.includes(intent) &&
        bg.category !== "dark"
      );

  const preferred = pool.filter(([, bg]) =>
    bg.category === "gradient" || bg.category === "bright"
  );

  const finalPool = preferred.length ? preferred : pool;
  if (!finalPool.length) return "nearBlack";

  return finalPool[Math.floor(Math.random() * finalPool.length)][0];
}

function planVideoVisualSystem(sourceBeats, dna) {
  const niche      = dna?.niche       || null;
  const colorStory = dna?.colorStory  || null;

  const intentCounts = {};
  sourceBeats.forEach(b => {
    const k = b.intent || "explanation";
    intentCounts[k] = (intentCounts[k] || 0) + 1;
  });
  const dominantIntent = Object.entries(intentCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "curiosity";

  const nicheAvoid  = getNicheAvoid(niche);
  const bgIntentKey = INTENT_TO_BG_INTENT_LOCAL[dominantIntent] || "curiosity";
  const lockedBgKey = pickNicheBackground(niche, bgIntentKey, nicheAvoid);

  const colorLocked = {
    bg:     colorStory?.bg      || "#0b0b10",
    text:   colorStory?.text    || "#ffffff",
    accent: colorStory?.primary || "#7c5cfc",
  };

  console.log(`[visual-system] bg="${lockedBgKey}"`);
  return { backgroundKey: lockedBgKey, colorLocked };
}

/* ── Transparent assets ── */
async function applyTransparentAssets(beats) {
  const jobs = [];
  beats.forEach((beat, beatIndex) => {
    const layoutDef = getLayoutDef(beat.layout);
    if (!layoutDef) return;
    layoutDef.zones.forEach(defZone => {
      if (!defZone.style?.transparentAsset) return;
      const bz  = beat.zones?.[defZone.id];
      const src = bz?.content?.asset?.src;
      if (!src) return;
      jobs.push({ beatIndex, zoneId: defZone.id, src });
    });
  });
  if (!jobs.length) return beats;

  const updatedBeats = beats.map(b => ({ ...b, zones: { ...b.zones } }));
  await Promise.all(jobs.map(async ({ beatIndex, zoneId, src }) => {
    try {
      const res  = await serverFetch("/api/admin/remove-background", {
        method: "POST",
        body:   JSON.stringify({ imageUrl: src }),
      });
      const data = await res.json();
      if (data.transparentUrl) {
        const beat = updatedBeats[beatIndex];
        const zone = beat.zones[zoneId];
        updatedBeats[beatIndex].zones[zoneId] = {
          ...zone,
          content: { ...zone.content, asset: { ...(zone.content?.asset ?? {}), src: data.transparentUrl } },
        };
      }
    } catch (e) {
      console.warn("[buildBeats] transparentAsset rembg failed:", zoneId, e.message);
    }
  }));
  return updatedBeats;
}

/* ── Main pipeline ── */
export async function buildBeatsFromScript({
  script:           _script           = "",
  structuredBeats  = null,
  mode             = "faceless",
  videoType:        _videoType        = "viral",
  orientation      = "9:16",
  durationCategory: _durationCategory = "short",
  assetSource      = "stock",
  uploadedAssets   = [],
  language         = "english",
  topic            = "",
  brandColor       = null,
  brandName:        _brandName        = null,
  audience:         _audience         = "general",
  tone:             _tone             = "bold",
  dna              = null,
  patternKey:       _patternKey       = null,
}) {
  await initLayoutRegistry();

  const talkingHead = mode === "talking_head";

  // Always use structuredBeats (the new schema). Plain script fallback is removed.
  if (!Array.isArray(structuredBeats) || structuredBeats.length === 0) {
    console.warn("[buildBeats] No structuredBeats provided — returning empty beats");
    return [];
  }

  const sourceBeats = structuredBeats.map((b, i) => ({
    ...b,
    // Derive intent and energy from beat type if not already present
    intent: b.intent || BEAT_TYPE_TO_INTENT[b.type] || "explanation",
    energy: typeof b.energy === "number" ? b.energy : (BEAT_TYPE_TO_ENERGY[b.type] || 0.6),
    order:  i,
  }));

  const total = sourceBeats.length;
  const videoCaptionStyle = pickVideoCaptionStyle(sourceBeats);
  let currentStart  = 0;
  let usedLayoutIds = [];
  let lastSFXKey    = null;

  const visualSystem  = planVideoVisualSystem(sourceBeats, dna);
  const _bgNiche      = dna?.niche || null;
  const _bgColorFamily = getNicheColorFamily(_bgNiche);
  console.log('[bg] colorFamily:', _bgColorFamily, 'niche:', dna?.niche, 'lockedKey:', visualSystem.backgroundKey);

  let beats = sourceBeats.map((item, index) => {
    const spoken    = String(item.spoken || "").trim();
    const beatType  = item.type || "explanation";
    const intent    = item.intent;
    const energy    = item.energy;
    const isLast    = index === total - 1;

    // Timing
    let start_sec, end_sec;
    if (item.start_sec != null && item.end_sec != null) {
      start_sec    = item.start_sec;
      end_sec      = item.end_sec;
      currentStart = end_sec;
    } else {
      const duration = calculateDuration(spoken, intent, energy);
      start_sec    = currentStart;
      end_sec      = start_sec + duration;
      currentStart = end_sec;
    }

    // Layout — by beat type, rotating through available layouts
    const layout = pickLayoutForBeatType(beatType, usedLayoutIds, orientation, talkingHead, item);
    usedLayoutIds = [...usedLayoutIds, layout];

    // Zones: enforce structure then fill from script fields directly
    let zones = enforceLayoutZones(layout, {});
    zones = fillScriptFields(zones, layout, item);

    // Asset hint for downstream image generation
    const asset_hint = {
      entity:       item.entity       || null,
      image_needed: item.image_needed ?? false,
      prompt:       item.asset_prompt || null,
    };

    // Background — per beat type for visual variety; item/cta/explanation use the locked key
    let _bgValue;
    if (beatType === "hook") {
      _bgValue = pickNicheBackground(_bgNiche, "shock",    []);
    } else if (beatType === "fact" || beatType === "stat") {
      _bgValue = pickNicheBackground(_bgNiche, "proof",    [visualSystem.backgroundKey]);
    } else if (beatType === "reveal") {
      _bgValue = pickNicheBackground(_bgNiche, "reveal",   []);
    } else if (beatType === "contrast") {
      _bgValue = pickNicheBackground(_bgNiche, "contrast", []);
    } else {
      _bgValue = visualSystem.backgroundKey;
    }
    const layoutBackground = { type: "pattern", value: _bgValue };
    console.log(`[bg] beat ${index} type=${item?.type} → background=${layoutBackground?.value}`);

    // Talking head avatar zone
    let avatarZone = null;
    if (talkingHead && item.showAvatar !== false) {
      const layoutDef = getLayoutDef(layout);
      const avatarZoneDef = layoutDef?.zones?.find(z => z.type === "avatar")
        ?? layoutDef?.zones?.find(z => z.type === "asset");
      avatarZone = avatarZoneDef?.id ?? null;
    }

    const role            = assignBeatRole(index, total);
    const captionPosition = chooseCaptionPosition(layout, index, total, energy);
    const captionShowDefault = layoutRegistry[layout]?.showCaption ?? true;

    let sfxCue = pickBeatSFX(intent, energy, 0.4);
    if (sfxCue?.key === lastSFXKey) {
      const retry = pickBeatSFX(intent, energy, 0.4);
      if (retry?.key !== lastSFXKey) sfxCue = retry;
    }
    if (sfxCue) { lastSFXKey = sfxCue.key; sfxCue = { ...sfxCue, volume: 0.3 }; }

    return {
      id:    crypto.randomUUID(),
      order: index,

      layout,
      layoutPadding:    0,
      layoutBackground,

      avatarZone,
      zones,
      blocks:      [],
      block_props: null,

      caption: {
        show:           captionShowDefault,
        text:           generateCaptionText(spoken),
        style:          videoCaptionStyle,
        animation:      chooseCaptionAnimation(intent, energy),
        position:       captionPosition,
        emphasis_words: item.emphasis_words || [],
      },

      overlays:   [],
      audio_cues: sfxCue ? [sfxCue] : [],

      transition: chooseTransition(layout, index, energy, isLast, null),

      spoken, intent, energy, language, role,
      beatType,
      asset_hint,
      // Pass through script fields for reference
      display:    item.display    || null,
      sub:        item.sub        || null,
      entity:     item.entity     || null,
      number:     item.number     || null,
      stat:       item.stat       || null,
      label:      item.label      || null,
      duration_sec: end_sec - start_sec,
      start_sec, end_sec,
    };
  });

  /* ── Anti-repeat transition pass ── */
  for (let i = 1; i < beats.length; i++) {
    const prevType = beats[i - 1].transition?.type;
    if (beats[i].transition?.type && beats[i].transition.type === prevType) {
      const beat = beats[i];
      beats[i] = {
        ...beat,
        transition: chooseTransition(beat.layout, i, beat.energy ?? 0.5, i === beats.length - 1, prevType),
      };
    }
  }

  /* ── Post-processing ── */
  beats = fillTextZones(beats, {
    dna,
    colorStory:  dna?.colorStory  || null,
    brandColor:  brandColor       || null,
    niche:       dna?.niche       || null,
  });

  beats = fillDecorativeZones(beats, {
    dna,
    colorStory:  dna?.colorStory  || null,
    brandColor:  brandColor       || null,
    lockedBgKey: visualSystem.backgroundKey || null,
  });

  beats = beats.map(beat => ({ ...beat, zones: { ...beat.zones } }));

  if (assetSource !== "none") {
    beats = await autoMatchAssets(beats, orientation, { assetSource, uploadedAssets, topic, language, dna });
  }
  beats = await applyTransparentAssets(beats);
  beats = applyBeatVariation(beats);
  beats = applyCaptionEmphasis(beats);

  /* ── Resolve colors per beat ── */
  beats = beats.map(beat => {
    const bgEntry = backgroundPatternRegistry[beat.layoutBackground?.value];
    const bgStyle = bgEntry?.style || null;
    const resolvedColors = resolveBeatColors(bgStyle, dna);
    return { ...beat, resolvedColors };
  });

  beats = validateBeats(beats);

  return beats;
}
