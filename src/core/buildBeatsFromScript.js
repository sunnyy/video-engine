/**
 * buildBeatsFromScript.js
 * src/core/buildBeatsFromScript.js
 */

import { generateCaptionText }   from "./captionTimingEngine";
import { autoMatchAssets }        from "./assetAutoMatcher";
import { validateBeats }          from "./compilerValidator";
import { classifyBeatIntent }     from "./beatIntent/beatIntentClassifier";
import { applyBeatVariation }     from "./beatVariationEngine";
import { applyCaptionEmphasis }   from "./captionEmphasisEngine";
import { planBeatVisual }         from "./visualPlanner";
import { getLayoutDef, layoutRegistry, initLayoutRegistry, findLayouts } from "./registries/layoutRegistry";
import { resolveColors }          from "./colorContrastResolver";
import { resolveBeatColors }      from "./elements/colorContrastResolver";
import { backgroundPatternRegistry, getBackgroundForIntent } from "./registries/backgroundPatternRegistry.js";
import { getNicheColorFamily, getNicheAvoid } from "./registries/nichePaletteRegistry.js";
import { pickBeatSFX } from "./registries/sfxRegistry";
import { PIPELINE_EFFECTS }              from "./registries/textEffectRegistry.jsx";
import { PIPELINE_SHINE_EFFECTS }        from "./registries/assetShineRegistry.jsx";
import { resolveAnimatedBorderForZone }  from "./registries/animatedBorderRegistry.js";

import { analyzeBeatRoles }   from "./ai/beatRoleAnalyzer";
import { analyzeVisualTypes } from "./ai/visualTypeAnalyzer";
import { validateAIOutputs }  from "./ai/aiOutputValidator";
import { getTypographyForRole } from "./videoDNA.js";
import { getPattern } from "../services/ai/patterns";

/* ── Helpers ── */
function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function isLightColor(color) {
  if (!color || typeof color !== "string") return false;
  const c = color.trim().toLowerCase();
  // CSS named colors → hardcoded luminance classification
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
  // 3-digit hex: #rgb → #rrggbb
  if (/^#[0-9a-f]{3}$/.test(c)) {
    const r = parseInt(c[1] + c[1], 16);
    const g = parseInt(c[2] + c[2], 16);
    const b = parseInt(c[3] + c[3], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }
  // 6-digit hex: #rrggbb
  if (/^#[0-9a-f]{6}$/.test(c)) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }
  // rgb(...) / rgba(...)
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return (parseInt(rgb[1]) * 299 + parseInt(rgb[2]) * 587 + parseInt(rgb[3]) * 114) / 1000 > 128;
  }
  return false;
}

function splitIntoDurationBeats(text) {
  const w = words(text);
  const beats = [];
  let i = 0;
  while (i < w.length) {
    const size = Math.floor(Math.random() * 6) + 4;
    beats.push(w.slice(i, i + size).join(" "));
    i += size;
  }
  return beats;
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
  return Number(Math.min(8.0, Math.max(1.4, base + variance)).toFixed(1));
}

/* ── Caption ── */
/* ── Caption style — ONE per video based on overall tone ── */
function pickVideoCaptionStyle(beats) {
  // Determine dominant intent/energy across all beats
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

/* ── Beat role — position-based, optional hint for layout picker ── */
function assignBeatRole(index, total) {
  if (total <= 1) return "hook";
  if (index === 0)         return "hook";
  if (index === total - 1) return "cta";
  const pos = index / (total - 1); // 0..1
  if (pos <= 0.25) return "proof";
  if (pos <= 0.60) return "escalate";
  return "reveal";
}

/* ── Transition ── */

// Canonical durations per transition type
const TRANSITION_DURATIONS = {
  zoom: 18, whipPan: 12, glitch: 14, flash: 10, spin: 14,
  slideLeft: 16, slideRight: 16, slideUp: 16, slideDown: 16,
  dissolve: 18, dipBlack: 16, dipWhite: 16, fade: 14, cut: 0,
};

// Buckets: high-energy uses punchy types, low-energy uses smooth types
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
  // Filter out the previous type to prevent consecutive repeats
  const available = prevType ? pool.filter(t => t !== prevType) : pool;
  // Deterministic but varied: mix of index + energy as seed
  const pick = available[(index * 7 + Math.round(energy * 13)) % available.length];
  return { type: pick, duration: TRANSITION_DURATIONS[pick] ?? 14 };
}

/* ── Enforce layout zones — respects new zone type schema ── */
function enforceLayoutZones(layoutId, existingZones = {}) {
  const def = getLayoutDef(layoutId);
  if (!def) return existingZones;

  const fixed = {};

  def.zones.forEach(zoneDef => {
    const existing = existingZones[zoneDef.id];

    if (existing) {
      // Only reuse existing content if the content type matches the zone definition.
      // Mismatches (e.g. text content in an asset zone) would cause ghost placeholders
      // or silent failures — treat them as if there is no existing content.
      const existingKind = existing?.content?.kind;
      const kindMatches =
        (zoneDef.type === "text"       && existingKind === "text")       ||
        (zoneDef.type === "asset"      && existingKind === "asset")      ||
        (zoneDef.type === "decorative" && existingKind === "shape")      ||
        (zoneDef.type === "icon"       && existingKind === "icon")       ||
        (!existingKind); // no content yet — let it fall through to the empty-zone path

      if (kindMatches && existingKind) {
        fixed[zoneDef.id] = existing;
        return;
      }
      // Type mismatch — fall through to create a fresh empty zone of the correct type
    }

    // Create empty zone matching type from layout definition
    if (zoneDef.type === "text") {
      // Strip automation-owned properties from layout zone styles.
      // DNA owns: color, background (inline), fontFamily, fontWeight, _presetId.
      // Layout zones contribute structure: fontSize, letterSpacing, textTransform, padding, etc.
      // EXCEPTION: _userFontFamily on a layout zone means the designer intentionally chose that
      // font — preserve fontFamily + fontWeight so DNA does not override the designer's choice.
      // eslint-disable-next-line no-unused-vars
      const { _presetId: _sp, color: _sc, background: _sb, fontFamily: _sff, fontWeight: _sfw, ...baseLayoutStyle } = zoneDef.style || {};
      const layoutZoneStyle = zoneDef.style?._userFontFamily
        ? { ...baseLayoutStyle, fontFamily: _sff, fontWeight: _sfw } // keep designer-chosen font
        : baseLayoutStyle;
      fixed[zoneDef.id] = {
        content: { kind: "text", text: "" },
        style: { ...layoutZoneStyle },
        // Carry the background layer (set via Zone Background picker) so the contrast
        // guard in fillTextZones can see it and derive a readable text color.
        ...(zoneDef.background ? { background: zoneDef.background } : {}),
      };
    } else if (zoneDef.type === "asset") {
      fixed[zoneDef.id] = {
        content: {
          kind: "asset",
          asset: { src: null, type: "image", objectFit: "cover" },
        },
        style: {},
      };
    } else if (zoneDef.type === "decorative") {
      const br      = zoneDef.style?.borderRadius ?? 0;
      const isRing  = br >= 999;
      const isLarge = (zoneDef.width ?? 0) > 60 || (zoneDef.height ?? 0) > 60;
      const shape   = isRing ? "ring" : (isLarge ? "square" : "circle");
      // Prefer Admin-saved filled value; fall back to geometry heuristic
      const filled  = zoneDef.style?.filled ?? (!isRing && !isLarge);
      fixed[zoneDef.id] = {
        content: { shape },
        style: { ...zoneDef.style, color: zoneDef.style?.color || "#ffffff", filled },
      };
    } else if (zoneDef.type === "icon") {
      fixed[zoneDef.id] = {
        content: { iconId: null }, // will be filled by buildZones if called; placeholder for editor
        style: { ...zoneDef.style, color: zoneDef.style?.color || "#ffffff", filled: true },
      };
    } else {
      fixed[zoneDef.id] = {
        content: {},
        style: {},
      };
    }
  });

  return fixed;
}


/* ── Fill text zones — DNA-driven color + typography lock ── */
// Presets are NOT used in automation. All typography comes from dna.typographySystem
// via getTypographyForRole(). All color comes from dna.colorStory. Layout zone styles
// (fontSize, textAlign, letterSpacing) are preserved from the layout definition.
function fillTextZones(beats, colorOptions = {}) {

  // Lock typography system for the whole video — logged once here
  const typographySystem = colorOptions.dna?.typographySystem || null;
  if (typographySystem) {
    console.log("[typography] Locking system:", typographySystem);
  }

  return beats.map(beat => {
    const def = getLayoutDef(beat.layout);
    if (!def) return beat;

    // resolveColors still used for textShadow and legacy blockBg/accent
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

    // Hoist bgIsLight — constant per beat, needed by both the main forEach and the _userPreset pass.
    const nicheBg   = colorOptions.colorStory?.bg || colorOptions.dna?.colorStory?.bg || "#0b0b10";
    const bgIsLight = isLightColor(nicheBg);

    textZones.forEach((zoneDef, order) => {
      const existing = zones[zoneDef.id];

      // User manually applied a preset — skip automation styling so it isn't clobbered on regen.
      // NOTE: textShadow correction for _userPreset zones is handled in the separate pass below.
      if (existing?.style?._userPreset) return;

      // ── Automation: NO preset involvement ────────────────────────────────────
      // Presets are for manual user styling only. In automation, all visual decisions
      // come from DNA / colorStory. This is the only way to guarantee consistency
      // across zones and beats within one video.
      const paletteText = colorOptions.colorStory?.text || colorOptions.dna?.colorStory?.text || "#ffffff";
      const primary     = colorOptions.colorStory?.primary || colorOptions.dna?.colorStory?.primary || "#7c5cfc";

      const inject = {};

      // Color: always the DNA palette text color — contrast-safe for this niche's bg.
      inject.color = paletteText;

      // Text shadow: DNA-driven, stripped on light backgrounds.
      if (bgIsLight) {
        inject.textShadow = "none";
      } else if (hasAssetZones) {
        inject.textShadow = beat.energy >= 0.7
          ? "0 4px 28px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.8)"
          : "0 2px 18px rgba(0,0,0,0.9)";
      } else if (colors.textShadow && colors.textShadow !== "none") {
        inject.textShadow = colors.textShadow;
      }

      // No automatic background on text zones — pill/badge BGs are designer-set in
      // the layout zone style, not injected per zone by automation.

      // WebkitTextStroke: keep if zoneDef has it, tinted to DNA primary
      if (zoneDef.style?.WebkitTextStrokeColor || zoneDef.style?.textStrokeColor) {
        inject.WebkitTextStrokeColor = primary;
        inject.textStrokeColor       = primary;
      }

      // Assign a default text effect if the zone doesn't already have one
      if (!existing?.style?.textEffect) {
        const seed2 = (beat.intent || "").charCodeAt(0) + order * 7 + (zoneDef.id || "").charCodeAt(1);
        inject.textEffect = PIPELINE_EFFECTS[seed2 % PIPELINE_EFFECTS.length];
      }

      const existingContent = existing?.content || { kind: "text", text: "" };

      // Pull textEffect out so it's handled separately; no _presetId in automation.
      const { textEffect, ...injectVisualStyle } = inject;
      const _presetId = null; // no preset applied in automation

      // Merge order (lowest → highest priority):
      //   injectVisualStyle  — preset flair + DNA colors as the baseline
      //   zoneDef.style      — layout definition WINS over preset (font, size, color set by designer)
      //   existing?.style    — user edits in the editor win over both
      //
      // Strip automation-owned + legacy preset properties from the layout zone style.
      // DNA owns: color, background (inline), fontFamily, fontWeight.
      // Preset system: _presetId must never flow into output.
      // Layout zones contribute structure only: fontSize, letterSpacing, textTransform, padding…
      // Also strip whiteSpace:"nowrap" — dynamic content wraps by definition.
      // eslint-disable-next-line no-unused-vars
      const { whiteSpace: _sWS, _presetId: _sPI, color: _sC, background: _sBG, fontFamily: _sFF, fontWeight: _sFW, ...zoneDef_styleNoNowrap } =
        zoneDef.style || {};

      // Only re-admit values the user explicitly pinned in the editor.
      // Every other property in existing.style belongs to the layout definition or a
      // previous automation run — spreading it would let stale fontSize, letterSpacing,
      // textAlign, textTransform, padding, etc. from an old layout override the current
      // layout's zone definition, causing mid-video typography/size inconsistencies.
      const userOverrides = {};
      if (existing?.style?._userColor)      userOverrides.color      = existing.style.color;
      if (existing?.style?._userBackground) userOverrides.background = existing.style.background;
      if (existing?.style?._userPreset) {
        userOverrides.fontFamily = existing.style.fontFamily;
        userOverrides.fontWeight = existing.style.fontWeight;
      }

      const mergedVisual = {
        ...injectVisualStyle,     // baseline: textShadow, WebkitTextStroke
        ...zoneDef_styleNoNowrap, // layout structure: fontSize, letterSpacing, padding…
        ...userOverrides,         // only explicitly user-pinned values
        whiteSpace: "normal",
      };

      // Final textShadow pass — strip on light backgrounds regardless of what any layer set.
      // Check 1: niche/colorStory bg is light → strip textShadow on ALL text zones.
      // Check 2: zone's own background is a light solid color → strip on that zone specifically.
      //
      // There are TWO distinct background concepts for a zone:
      //   a) zone.style.background  — CSS background on the text element (pill presets, badge colours)
      //   b) zone.background.color  — separate background *layer* rendered behind the zone
      //                               (set via the Zone Background picker in the editor)
      // Both must be checked; the picker path is the more common one designers use.
      const zoneBgStyle = mergedVisual.background; // (a) from zone.style.background
      const zoneBgLayer =                          // (b) from zone.background layer
        (typeof zoneDef.background?.color === "string" ? zoneDef.background.color : null)
        ?? (typeof existing?.background?.color === "string" ? existing.background.color : null);
      // Prefer whichever is the more specific / non-transparent value
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

      // Zone background contrast guard:
      // If the zone has a solid background (CSS style OR background layer), verify that the
      // merged text color is actually readable.  Don't rely on "did the designer pin a color" —
      // a previous wrong pipeline run may have stored white in existing.style.color, which wins
      // over zoneDef.style.color in the merge and creates e.g. white text on white background.
      // Instead, check actual contrast: if text and background are both light (or both dark),
      // the text is unreadable and we must fix it — regardless of which layer set the color.
      // Exception: _userColor flag means the user deliberately picked this color in the editor.
      const hasZoneBackground = isSolidColor(zoneBg);

      if (hasZoneBackground && !existing?.style?._userColor) {
        const textIsLight = isLightColor(mergedVisual.color || "#ffffff");
        if (textIsLight === zoneBgIsLight) {
          // Text and background have the same lightness → invisible. Derive a readable colour.
          mergedVisual.color = zoneBgIsLight ? "#0a0a0a" : "#ffffff";
        }
      }

      // ── Force DNA color (after merge, so it wins over any layout zone color) ─────────
      // DNA palette text color is the single source of truth for text color across all beats.
      // Only skip if the user explicitly pinned a color in the editor.
      if (!existing?.style?._userColor) {
        mergedVisual.color = paletteText;
      }

      // ── Video-level typography lock (ALWAYS apply, not gap-fill) ──────────────────────
      // layout zone fontFamily/fontWeight are stripped before merging so DNA typography is
      // the default source. Two opt-out flags suppress DNA and preserve a chosen font:
      //   _userPreset  — user manually applied a preset in the editor
      //   _userFontFamily (on zoneDef.style) — layout designer explicitly chose this font
      if (typographySystem && !existing?.style?._userPreset && !zoneDef.style?._userFontFamily) {
        const zoneRole = zoneDef.role || (order === 0 ? "headline" : "subtext");
        const { fontFamily, fontWeight } = getTypographyForRole(typographySystem, zoneRole);
        if (fontFamily) mergedVisual.fontFamily = fontFamily;
        if (fontWeight) mergedVisual.fontWeight  = fontWeight;
      } else if (zoneDef.style?._userFontFamily) {
        // Layout designer's font choice — re-admit it (it was stripped from zoneDef_styleNoNowrap)
        if (zoneDef.style.fontFamily) mergedVisual.fontFamily = zoneDef.style.fontFamily;
        if (zoneDef.style.fontWeight) mergedVisual.fontWeight  = zoneDef.style.fontWeight;
      }

      zones[zoneDef.id] = {
        ...existing,
        content: existingContent,
        style: {
          ...mergedVisual,
          _presetId,
          // Preserve user's textEffect pick; otherwise use pipeline-assigned one
          textEffect: existing?.style?.textEffect || textEffect,
        },
      };
    });

    // Fix 2: textShadow removal applies to ALL zones regardless of _userPreset.
    // _userPreset preserves the user's typography choice, but background-aware contrast
    // corrections must still run — presets are assigned by automation, not deliberately chosen
    // by the user with the intent to keep a text shadow on a light background.
    textZones.forEach(zoneDef => {
      const existing = zones[zoneDef.id];
      if (!existing?.style?._userPreset) return; // already corrected in the main pass above
      const zoneBgIsLight = typeof existing.style.background === "string" && isLightColor(existing.style.background);
      if (bgIsLight || zoneBgIsLight) {
        zones[zoneDef.id] = {
          ...existing,
          style: { ...existing.style, textShadow: "none" },
        };
      }
    });

    return { ...beat, zones };
  });
}

/* ── Decorative zone color theming ── */
// Applies the DNA accent/primary color to decorative zones whose color was NOT
// explicitly set by the layout designer (i.e. they were left at the default white).
// Designer-pinned colors are always respected.
function fillDecorativeZones(beats, colorOptions = {}) {
  const accent  = colorOptions.colorStory?.primary
    || colorOptions.dna?.colorStory?.primary
    || "#7c5cfc";
  const accent2 = colorOptions.brandColor || accent;

  return beats.map(beat => {
    const def = getLayoutDef(beat.layout);
    if (!def) return beat;

    const decorativeZones = def.zones.filter(z => z.type === "decorative" || z.type === "icon");
    if (!decorativeZones.length) return beat;

    const zones = { ...beat.zones };

    decorativeZones.forEach((zoneDef, idx) => {
      // Designer explicitly set a color → respect it, don't override
      if (zoneDef.style?.color && zoneDef.style.color !== "#ffffff") return;

      const existing = zones[zoneDef.id];
      // User manually edited this zone in the editor → preserve their choice
      if (existing?.style?._userColor) return;

      // Alternate between accent and accent2 for visual variety when multiple decoratives exist
      const themeColor = idx % 2 === 0 ? accent : accent2;

      zones[zoneDef.id] = {
        ...(existing || {}),
        style: {
          ...(existing?.style || {}),
          ...(zoneDef.style || {}),
          color: themeColor,
        },
      };
    });

    return { ...beat, zones };
  });
}

/* ─────────────────────────────────────────────────────────────
   VIDEO-LEVEL VISUAL PLAN
   Runs ONCE before the beat loop.
   Returns a locked background key + a 2–3 layout rotation for
   the entire video so all beats share the same visual identity.
───────────────────────────────────────────────────────────── */

// Minimal AI-intent → background-registry-intent mapping (subset of visualPlanner's map)
const INTENT_TO_BG_INTENT_LOCAL = {
  shock: "shock", curiosity: "curiosity", proof: "proof",
  irony: "irony", reveal: "reveal", empathy: "empathy",
  urgency: "urgency", explanation: "explanation", contrast: "contrast",
  punchline: "punchline", hook: "shock", stat: "proof",
};

// AI-intent → layout-registry-intent (mirrors visualPlanner's AI_TO_LAYOUT_INTENT)
const INTENT_TO_LAYOUT_INTENT_LOCAL = {
  shock: "hook", curiosity: "hook", proof: "proof",
  irony: "contrast", reveal: "reveal", empathy: "testimonial",
  urgency: "escalate", explanation: "explanation", contrast: "contrast",
  punchline: "cta", stat: "proof", hook: "hook",
};

function planVideoVisualSystem(sourceBeats, dna, orientation = "9:16") {
  const niche      = dna?.niche       || null;
  const colorStory = dna?.colorStory  || null;

  // 1. Dominant intent across all beats
  const intentCounts = {};
  sourceBeats.forEach(b => {
    const k = b.intent || "explanation";
    intentCounts[k] = (intentCounts[k] || 0) + 1;
  });
  const dominantIntent = Object.entries(intentCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "curiosity";

  // 2. Pick ONE locked background for the whole video
  const colorFamily = getNicheColorFamily(niche);
  const nicheAvoid  = getNicheAvoid(niche);
  const bgIntentKey = INTENT_TO_BG_INTENT_LOCAL[dominantIntent] || "curiosity";

  const lockedBg = getBackgroundForIntent(
    bgIntentKey, "dark", colorFamily, true, niche, nicheAvoid,
  );

  // CTA beat gets a companion from the same family but a different key
  const ctaBg = getBackgroundForIntent(
    "urgency", "dark", colorFamily, true, niche, [lockedBg.key, ...nicheAvoid],
  );

  // 3. Pick 2–3 layout IDs for the whole video
  const layoutIntent = INTENT_TO_LAYOUT_INTENT_LOCAL[dominantIntent] || "hook";
  let candidates = findLayouts({ intent: layoutIntent, orientation, niche });
  if (!candidates.length) candidates = findLayouts({ intent: layoutIntent, orientation });
  if (!candidates.length) candidates = findLayouts({ orientation });

  // Prefer layouts that have at least one asset zone (visual richness)
  const withAsset = candidates.filter(l => (l.def?.assetCount ?? 0) >= 1);
  if (withAsset.length >= 2) candidates = withAsset;

  // Pick up to 3 distinct layouts with different text zone counts for variety
  const family = [];
  const usedIds = new Set();
  const usedTextCounts = new Set();
  for (const l of candidates) {
    if (family.length >= 3) break;
    const tc = l.def?.textCount ?? 0;
    if (usedIds.has(l.id)) continue;
    // Allow at most one layout per text-count bucket to ensure visual variety
    if (!usedTextCounts.has(tc) || family.length < 2) {
      family.push(l.id);
      usedIds.add(l.id);
      usedTextCounts.add(tc);
    }
  }

  // If primary intent pool yielded fewer than 3 unique layouts, pull from related intent pools
  const FALLBACK_INTENTS = ["hook", "explanation", "proof", "reveal", "contrast", "cta"];
  if (family.length < 3) {
    for (const fallbackIntent of FALLBACK_INTENTS) {
      if (family.length >= 3) break;
      const fallbackCandidates = findLayouts({ intent: fallbackIntent, orientation });
      for (const l of fallbackCandidates) {
        if (family.length >= 3) break;
        if (!usedIds.has(l.id)) {
          family.push(l.id);
          usedIds.add(l.id);
        }
      }
    }
  }

  // Deduplicate — never allow the same layout twice in the rotation
  const uniqueFamily = [...new Set(family)];
  if (uniqueFamily.length === 1) {
    console.warn("[visual-system] WARNING: Only 1 unique layout found — video will have no layout variety");
  }

  const finalFamily = uniqueFamily.slice(0, 3);
  // Last resort: if still only 1, grab any other available layout
  if (finalFamily.length === 1) {
    const anyOther = findLayouts({ orientation }).find(l => l.id !== finalFamily[0]);
    if (anyOther) finalFamily.push(anyOther.id);
  }
  if (!finalFamily.length) finalFamily.push("DuoStackHook");

  const colorLocked = {
    bg:     colorStory?.bg      || "#0b0b10",
    text:   colorStory?.text    || "#ffffff",
    accent: colorStory?.primary || "#7c5cfc",
  };

  console.log(
    `[visual-system] bg="${lockedBg.key}" ctaBg="${ctaBg.key}" layouts=[${finalFamily.join(", ")}]`,
  );

  return { backgroundKey: lockedBg.key, ctaBackgroundKey: ctaBg.key, layoutFamily: finalFamily, colorLocked };
}

/* ── Main pipeline ── */
export async function buildBeatsFromScript({
  script           = "",
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
  patternKey       = null,
}) {

  /* ── Ensure layout registry is loaded before picking layouts ── */
  await initLayoutRegistry();

  /* ── Pattern layout hints (override intent/energy/visual_hint per beatType) ── */
  const patternLayoutHints = patternKey ? (getPattern(patternKey)?.layoutHints || {}) : {};

  /* ── Source beats ── */
  const isRich = Array.isArray(structuredBeats) &&
    structuredBeats.length > 0 &&
    typeof structuredBeats[0].energy === "number";

  let sourceBeats = [];

  if (isRich) {
    sourceBeats = structuredBeats;
  } else if (Array.isArray(structuredBeats) && structuredBeats.length) {
    sourceBeats = structuredBeats;
    sourceBeats = await analyzeBeatRoles(sourceBeats);
    sourceBeats = await analyzeVisualTypes(sourceBeats);
    sourceBeats = validateAIOutputs(sourceBeats);
  } else {
    const sentences = script.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
    sentences.forEach(sentence => {
      splitIntoDurationBeats(sentence).forEach(p => {
        sourceBeats.push({
          spoken: p, intent: classifyBeatIntent(p),
          energy: 0.5, visual_hint: "none", emphasis_words: [],
        });
      });
    });
    sourceBeats = await analyzeBeatRoles(sourceBeats);
    sourceBeats = await analyzeVisualTypes(sourceBeats);
    sourceBeats = validateAIOutputs(sourceBeats);
  }

  const total = sourceBeats.length;
  // Pick ONE caption style for the entire video for consistency
  const videoCaptionStyle = pickVideoCaptionStyle(sourceBeats);
  let currentStart  = 0;
  let usedLayoutIds = [];
  let lastMotion    = null;
  let lastSFXKey    = null;

  /* ── VIDEO-LEVEL VISUAL SYSTEM — locked once for the whole video ── */
  const visualSystem = planVideoVisualSystem(sourceBeats, dna, orientation);

  /* ── Build beats ── */
  let beats = sourceBeats.map((item, index) => {
    const spoken      = String(item.spoken || "").trim();
    const beatHints   = patternLayoutHints[item.beatType] || {};
    const intent      = beatHints.intent     || item.intent      || classifyBeatIntent(spoken);
    const energy      = beatHints.energy     !== undefined ? beatHints.energy : (item.energy ?? 0.5);
    const visual_hint = beatHints.visualHint || item.visual_hint || "none";
    const isLast      = index === total - 1;

    // Use Whisper timestamps if provided (talking head mode) — exact speech timing
    // Otherwise fall back to WPM-based calculation
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

    /* Visual plan */
    const role             = assignBeatRole(index, total);
    const hasImageHint     = !!(item.asset_hint?.search_query || item.asset_hint?.prompt);
    // Talking head + showAvatar: layout MUST have an asset zone so the avatar can be placed
    const requireAssetZone = mode === "talking_head" && item.showAvatar !== false;
    const visual = planBeatVisual({
      mode, intent, energy, orientation,
      usedLayoutIds, lastMotion,
      brandColor, beatIndex: index,
      hasImageHint, requireAssetZone, role,
      spokenWordCount: spoken.split(/\s+/).filter(Boolean).length,
      colorStory:  dna?.colorStory  || null,
      motionStyle: dna?.motionStyle || null,
      niche:       dna?.niche       || null,
      imageCountNeeded: item.image_count_needed ?? null,
      textDensity:      item.text_density       ?? null,
      visualHint:       item.visual_hint        ?? null,
    });

    // ── Lock layout to the pre-planned family rotation ──────────────────────
    // Override whatever planBeatVisual chose with the video-level layout family.
    // enforceLayoutZones below rebuilds zones for the locked layout anyway.
    const isLastBeat  = index === total - 1;
    const familyIdx   = index % visualSystem.layoutFamily.length;
    // Never use same layout as the immediately preceding beat — step forward one slot
    const prevLayout  = usedLayoutIds.length ? usedLayoutIds[usedLayoutIds.length - 1] : null;
    let lockedLayout  = visualSystem.layoutFamily[familyIdx];
    if (lockedLayout === prevLayout && visualSystem.layoutFamily.length > 1) {
      lockedLayout = visualSystem.layoutFamily[(familyIdx + 1) % visualSystem.layoutFamily.length];
    }
    visual.layout = lockedLayout;

    // ── Lock background to ONE pattern for the whole video ───────────────────
    visual.layoutBackground = {
      type:  "pattern",
      value: isLastBeat ? visualSystem.ctaBackgroundKey : visualSystem.backgroundKey,
    };

    usedLayoutIds = [...usedLayoutIds, visual.layout];
    const z1Motion = visual.zones?.z1?.content?.asset?.motion;
    if (z1Motion) lastMotion = z1Motion;

    const captionShowDefault = layoutRegistry[visual.layout]?.showCaption ?? true;
    const captionPosition  = chooseCaptionPosition(visual.layout, index, total, energy);


    let sfxCue = pickBeatSFX(intent, energy, 0.4);
    if (sfxCue?.key === lastSFXKey) {
      const retry = pickBeatSFX(intent, energy, 0.4);
      if (retry?.key !== lastSFXKey) sfxCue = retry;
    }
    if (sfxCue) { lastSFXKey = sfxCue.key; sfxCue = { ...sfxCue, volume: 0.2 }; }

    const finalLayout = visual.layout;
    const zones = enforceLayoutZones(finalLayout, visual.zones || {});

    // Talking head: avatarZone determines which zone shows the talking head video.
    // showAvatar=false → avatarZone=null (beat shows an image instead of the face).
    // showAvatar=true (or unset) → avatarZone = first asset zone in the layout.
    let avatarZone = null;
    if (mode === "talking_head" && item.showAvatar !== false) {
      const layoutDef = getLayoutDef(finalLayout);
      const avatarZoneDef = layoutDef?.zones?.find(z => z.type === "asset");
      // Only assign avatarZone if the layout actually has an asset zone.
      // null means no avatar shown this beat (e.g. text-only layouts like CenterHook).
      avatarZone = avatarZoneDef?.id ?? null;
    }

    return {
      id:    crypto.randomUUID(),
      order: index,

      layout:           finalLayout,
      layoutPadding:    visual.layoutPadding || 0,
      layoutBackground: visual.layoutBackground,

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

      overlays: [],
      audio_cues: sfxCue ? [sfxCue] : [],

      transition: chooseTransition(visual.layout, index, energy, isLast, null /* anti-repeat applied below */),

      spoken, intent, energy, visual_hint, language, role,
      asset_hint: item.asset_hint || null,
      // Pre-generated zone content seeds from the script director
      // These are passed through to generateZoneContent as creative seeds
      headline: item.headline || null,
      subtext:  item.subtext  || null,
      label:    item.label    || null,
      stat:     item.stat     || null,
      tagline:  item.tagline  || null,
      quote:    item.quote    || null,
      cta:      item.cta      || null,
      duration_sec: end_sec - start_sec,
      start_sec, end_sec,
    };
  });

  /* ── Consistency check ── */
  {
    const uniqueBgs     = new Set(beats.map(b => b.layoutBackground?.value)).size;
    const uniqueLayouts = new Set(beats.map(b => b.layout)).size;
    console.log(`[consistency] backgrounds: ${uniqueBgs}  layouts: ${uniqueLayouts}`);
    if (uniqueBgs > 2) {
      console.warn(`[consistency] WARNING: too many background variations (${uniqueBgs})`);
    }
  }

  /* ── Anti-repeat transition pass ──
     Walk beats in order; if two consecutive beats share the same transition type,
     re-run chooseTransition passing prevType so the pool excludes the duplicate. */
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
  });

  /* ── Assign asset zone visual styling: border radius, animated border, shine ── */
  beats = beats.map(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    if (!layoutDef) return beat;
    const zones = { ...beat.zones };

    // Identify the PRIMARY asset zone for this layout — animated borders are only
    // applied to it, not to background or secondary decorative asset zones.
    // Primary = the largest non-background asset zone by area; fall back to the
    // first asset zone if all are backgrounds or there's only one.
    const allAssetZoneDefs = layoutDef.zones.filter(z => z.type === "asset");
    const nonBgAssetZoneDefs = allAssetZoneDefs.filter(z => z.role !== "background_asset");
    const primaryAssetZone = (nonBgAssetZoneDefs.length > 0 ? nonBgAssetZoneDefs : allAssetZoneDefs)
      .reduce((best, z) =>
        (z.width ?? 0) * (z.height ?? 0) > ((best?.width ?? 0) * (best?.height ?? 0)) ? z : best,
        null
      );
    const primaryAssetZoneId = primaryAssetZone?.id ?? null;

    layoutDef.zones.forEach(zoneDef => {
      if (zoneDef.type !== "asset") return;
      const existing = zones[zoneDef.id] || {};
      const existingStyle = existing.style || {};

      // Deterministic seed unique to this beat+zone combination
      const seed = (beat.intent || "").charCodeAt(0) + (zoneDef.id || "").charCodeAt(1) + (beat.order ?? 0) * 13;

      // Full-canvas zones (fill the whole background) — skip rounding/borders,
      // they would just clip at the canvas edge and the effect wouldn't be visible.
      const isFullCanvas = (zoneDef.width ?? 100) >= 90 && (zoneDef.height ?? 100) >= 85;

      const styleUpdates = {};

      // ── Border radius (100–150px) ──────────────────────────────────────────
      // Skip if: full canvas, layout already set a specific radius, already edited,
      // or layout uses an outline (polaroid frame) — rounding breaks the square frame.
      const hasOutline = !!(zoneDef.style?.outline || zoneDef.style?.outlineOffset);
      if (!isFullCanvas && !hasOutline && !existingStyle.borderRadius && !(zoneDef.style?.borderRadius > 0)) {
        styleUpdates.borderRadius = 100 + (seed % 51); // 100–150
      }

      // ── Animated border (~25% chance, PRIMARY zone only) ──────────────────
      // Only the primary (most prominent / non-background) asset zone gets an
      // animated border — applying it to secondary or background zones looks
      // cluttered and distracts from the focal subject.
      const isPrimaryZone = zoneDef.id === primaryAssetZoneId;
      if (isPrimaryZone && !isFullCanvas && !existingStyle.animatedBorder && !existingStyle.clipShape) {
        if (seed % 4 === 0) {
          styleUpdates.animatedBorder = resolveAnimatedBorderForZone(beat, dna);
        }
      }

      // ── One-shot shine effect (~60% of all asset zones) ───────────────────
      if (!existingStyle.shineEffect) {
        if (seed % 5 >= 2) {
          styleUpdates.shineEffect = PIPELINE_SHINE_EFFECTS[seed % PIPELINE_SHINE_EFFECTS.length];
        }
      }

      if (Object.keys(styleUpdates).length > 0) {
        zones[zoneDef.id] = {
          ...existing,
          style: { ...existingStyle, ...styleUpdates },
        };
      }
    });

    return { ...beat, zones };
  });


  beats = await autoMatchAssets(beats, orientation, { assetSource, uploadedAssets, topic, language });
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