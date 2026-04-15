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
import { getLayoutDef, layoutRegistry, initLayoutRegistry } from "./registries/layoutRegistry";
import { resolveColors }          from "./colorContrastResolver";
import { resolvePresetColor, resolvePresetBackground } from "./resolveColor.js";
import { resolveBeatColors }      from "./elements/colorContrastResolver";
import { backgroundPatternRegistry } from "./registries/backgroundPatternRegistry.js";
import { pickBeatSFX } from "./registries/sfxRegistry";
import { textStylePresets }               from "./registries/textStylePresets";
import { PIPELINE_EFFECTS }              from "./registries/textEffectRegistry.jsx";
import { PIPELINE_SHINE_EFFECTS }        from "./registries/assetShineRegistry.jsx";
import { resolveAnimatedBorderForZone }  from "./registries/animatedBorderRegistry.js";

import { analyzeBeatRoles }   from "./ai/beatRoleAnalyzer";
import { analyzeVisualTypes } from "./ai/visualTypeAnalyzer";
import { validateAIOutputs }  from "./ai/aiOutputValidator";

/* ── Helpers ── */
function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function isLightColor(hex) {
  if (!hex || !hex.startsWith('#')) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
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
function chooseTransition(layoutId, index, energy = 0.5, isLast = false) {
  // If the layout has a default transition set by admin, always use it
  const layoutDef = getLayoutDef(layoutId);
  if (layoutDef?.defaultTransition) return layoutDef.defaultTransition;

  if (index === 0) {
    // Beat 0: transition IS the opening animation — pick based on energy
    if (energy >= 0.75) return { type: "zoom",    duration: 12 };
    if (energy >= 0.45) return { type: "fade",    duration: 12 };
    return                     { type: "dissolve", duration: 14 };
  }
  if (isLast) return { type: "fade",     duration: 12 };
  const high = energy >= 0.75;
  return { type: high ? "zoom" : "dissolve", duration: high ? 12 : 14 };
}

/* ── Enforce layout zones — respects new zone type schema ── */
function enforceLayoutZones(layoutId, existingZones = {}) {
  const def = getLayoutDef(layoutId);
  if (!def) return existingZones;

  const fixed = {};

  def.zones.forEach(zoneDef => {
    const existing = existingZones[zoneDef.id];

    if (existing) {
      // Keep existing content but ensure zone id is present
      fixed[zoneDef.id] = existing;
      return;
    }

    // Create empty zone matching type from layout definition
    if (zoneDef.type === "text") {
      fixed[zoneDef.id] = {
        content: { kind: "text", text: "" },
        style: { ...zoneDef.style },
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
      const filled  = !isRing && !isLarge;
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


function pickPresetForZone(zoneDef, order, intent, energy = 0.5, niche = null) {
  const role = zoneDef.role || (order === 0 ? "headline" : "subtext");

  // Filter presets that explicitly support this zone role
  let candidates = textStylePresets.filter(p => p.roles?.includes(role));

  // If niche is set, prefer presets that match (or have no niche restriction)
  if (niche && candidates.length > 1) {
    const nicheMatch = candidates.filter(p => !p.niche?.length || p.niche.includes(niche));
    if (nicheMatch.length > 0) candidates = nicheMatch;
  }

  // If energy is high, prefer high/explosive presets; if low, prefer calm/low
  // Handles both string energy ("high") and array energy (["high", "medium"])
  if (candidates.length > 1) {
    const energyBucket = energy >= 0.75 ? ["explosive", "high"] : energy <= 0.35 ? ["low", "calm"] : ["medium", "high"];
    const energyMatch = candidates.filter(p => {
      const pe = Array.isArray(p.energy) ? p.energy : [p.energy].filter(Boolean);
      return pe.some(e => energyBucket.includes(e));
    });
    if (energyMatch.length > 0) candidates = energyMatch;
  }

  // Fallback: use all presets if nothing matched
  if (!candidates.length) candidates = textStylePresets;

  // Stable deterministic pick within the filtered pool
  const seed = (intent || "").charCodeAt(0) + (zoneDef.id || "").charCodeAt(0);
  return candidates[seed % candidates.length].id;
}

/* ── Fill text zones — applies DNA font + color + preset flair ── */
// Preset is the primary visual identity: fontFamily, fontWeight, textAlign, color.
// Layout def only controls: fontSize (zone sizing).
// Presets drive all typography (fontFamily, fontWeight, etc.) — no blanket DNA override.
// Color resolution: resolvePresetColor() — white presets follow brand/DNA, thematic colors stay fixed.
// On asset layouts: override to white for readability (thematic non-white colors are kept).
function fillTextZones(beats, colorOptions = {}) {
  // Build the context object used by resolvePresetColor / resolvePresetBackground
  const colorContext = {
    dna:   colorOptions.dna   || null,
    brand: { color: colorOptions.brandColor || null, color2: colorOptions.brandColor2 || null },
  };

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

      // User manually applied a preset — skip automation styling entirely so it isn't overridden on regeneration.
      // NOTE: textShadow correction for _userPreset zones is handled in the separate pass below.
      if (existing?.style?._userPreset) return;

      // Pick a preset for this zone
      const presetId = pickPresetForZone(zoneDef, order, beat.intent, beat.energy ?? 0.5, colorOptions.niche || null);
      const preset   = textStylePresets.find(p => p.id === presetId);

      // Fix 6: Presets are TYPOGRAPHY HINTS only in automation.
      // Only carry fontFamily/fontWeight/fontStyle/lineHeight/textAlign from the preset.
      // Visual properties (color, shadow, transforms, spacing, borders, background)
      // come from DNA/colorStory and layout zone defaults — NOT from presets.
      // Fix 1: textShadow stripped here — background-aware logic sets it below.
      // Fix 3: textTransform stripped here — layout zone definition controls casing.
      // Fix 4: color/background/border/padding stripped — never from preset directly.
      const PRESET_TYPOGRAPHY_KEYS = new Set([
        'fontFamily', 'fontWeight', 'fontStyle', 'lineHeight', 'textAlign',
      ]);
      const presetFlair = preset
        ? Object.fromEntries(Object.entries(preset.style).filter(([k]) => PRESET_TYPOGRAPHY_KEYS.has(k)))
        : {};

      // Build inject: typography flair as base, DNA color + shadow layered on top.
      const inject = { ...presetFlair };

      // bgIsLight is hoisted above the forEach — computed once per beat from colorOptions.
      const paletteText = colorOptions.colorStory?.text || colorOptions.dna?.colorStory?.text || "#ffffff";
      const primary     = colorOptions.colorStory?.primary || colorOptions.dna?.colorStory?.primary || "#7c5cfc";

      if (hasAssetZones) {
        // Asset layouts: use palette text color (contrast-safe for this niche's bg).
        inject.color = paletteText;
        inject.textShadow = bgIsLight
          ? "none"
          : (beat.energy >= 0.7
            ? "0 4px 28px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.8)"
            : "0 2px 18px rgba(0,0,0,0.9)");
        delete inject.background; // no bg overlay on asset zones
      } else {
        // Non-asset layouts: resolve through three-tier color system.
        inject.color = resolvePresetColor(preset, colorContext);

        // Resolve background for pill/badge/quote presets (backgroundRole: "primary")
        const resolvedBg = resolvePresetBackground(preset, colorContext);
        if (resolvedBg) inject.background = resolvedBg;

        if (!bgIsLight && colors.textShadow && colors.textShadow !== "none" && !presetFlair.textShadow) {
          inject.textShadow = colors.textShadow;
        } else if (bgIsLight) {
          inject.textShadow = "none";
        }
      }

      // WebkitTextStroke: replace hardcoded color with DNA primary
      if (inject.textStrokeColor || presetFlair.textStrokeColor) {
        inject.textStrokeColor = primary;
      }
      if (inject.WebkitTextStrokeColor || presetFlair.WebkitTextStrokeColor) {
        inject.WebkitTextStrokeColor = primary;
      }

      // Store which preset was applied so ZoneEditor can highlight it
      inject._presetId = presetId;

      // Assign a default text effect if the zone doesn't already have one
      if (!existing?.style?.textEffect) {
        const seed2 = (beat.intent || "").charCodeAt(0) + order * 7 + (zoneDef.id || "").charCodeAt(1);
        inject.textEffect = PIPELINE_EFFECTS[seed2 % PIPELINE_EFFECTS.length];
      }

      const existingContent = existing?.content || { kind: "text", text: "" };

      // Separate visual style from pipeline metadata so metadata doesn't get wiped
      // by zoneDef.style spreading over it.
      const { _presetId, textEffect, ...injectVisualStyle } = inject;

      // Merge order (lowest → highest priority):
      //   injectVisualStyle  — preset flair + DNA colors as the baseline
      //   zoneDef.style      — layout definition WINS over preset (font, size, color set by designer)
      //   existing?.style    — user edits in the editor win over both
      const mergedVisual = {
        ...injectVisualStyle,
        ...zoneDef.style,
        ...(existing?.style || {}),
      };

      // Final textShadow pass — strip on light backgrounds regardless of what any layer set.
      // Check 1: niche/colorStory bg is light → strip textShadow on ALL text zones.
      // Check 2: zone's own background is a light solid color → strip on that zone specifically.
      const zoneBg = mergedVisual.background;
      const zoneBgIsLight = typeof zoneBg === "string" && isLightColor(zoneBg);
      if (bgIsLight || zoneBgIsLight) {
        mergedVisual.textShadow = "none";
      }

      zones[zoneDef.id] = {
        ...existing,
        content: existingContent,
        style: {
          ...mergedVisual,
          // Metadata always from pipeline — not subject to layout/user override
          _presetId,
          // Only apply pipeline textEffect if user hasn't set their own
          ...(existing?.style?.textEffect ? {} : { textEffect }),
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
}) {

  /* ── Ensure layout registry is loaded before picking layouts ── */
  await initLayoutRegistry();

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

  /* ── Build beats ── */
  let beats = sourceBeats.map((item, index) => {
    const spoken      = String(item.spoken || "").trim();
    const intent      = item.intent      || classifyBeatIntent(spoken);
    const energy      = item.energy      ?? 0.5;
    const visual_hint = item.visual_hint || "none";
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
    });

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

      transition: chooseTransition(visual.layout, index, energy, isLast),

      spoken, intent, energy, visual_hint, language, role,
      asset_hint: item.asset_hint || null,
      duration_sec: end_sec - start_sec,
      start_sec, end_sec,
    };
  });

  /* ── Post-processing ── */
  beats = fillTextZones(beats, {
    dna,
    colorStory:  dna?.colorStory  || null,
    brandColor:  brandColor       || null,
    niche:       dna?.niche       || null,
  });

  /* ── Assign asset zone visual styling: border radius, animated border, shine ── */
  beats = beats.map(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    if (!layoutDef) return beat;
    const zones = { ...beat.zones };

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

      // ── Animated border (~25% of non-full-canvas zones) ───────────────────
      if (!isFullCanvas && !existingStyle.animatedBorder && !existingStyle.clipShape) {
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