/**
 * buildBeatsFromScript.js
 * src/core/buildBeatsFromScript.js
 */

import { generateCaptionText }   from "./captionTimingEngine";
import { TYPOGRAPHY_SYSTEMS }     from "./videoDNA";
import { autoMatchAssets }        from "./assetAutoMatcher";
import { validateBeats }          from "./compilerValidator";
import { classifyBeatIntent }     from "./beatIntent/beatIntentClassifier";
import { applyBeatVariation }     from "./beatVariationEngine";
import { applyCaptionEmphasis }   from "./captionEmphasisEngine";
import { planBeatVisual }         from "./visualPlanner";
import { getLayoutDef, layoutRegistry } from "./layoutRegistry";
import { resolveColors }          from "./colorContrastResolver";
import { autoAssignElements }     from "./autoAssignElements";
import { pickDecoratives }        from "./designLibrary/decorativePicker";
import { resolveBeatColors }      from "./elements/colorContrastResolver";
import blockRegistry              from "./blockRegistry";
import { pickBeatSFX, OVERLAY_SFX_DEFAULTS } from "./sfxRegistry";
import { autoAssignOverlays }     from "./overlayPlacementEngine";
import { composeBeat }            from "./elements/elementComposer";

import { analyzeBeatRoles }   from "./ai/beatRoleAnalyzer";
import { extractBlockProps }  from "./ai/blockPropExtractor";
import { analyzeVisualTypes } from "./ai/visualTypeAnalyzer";
import { validateAIOutputs }  from "./ai/aiOutputValidator";

/* ── Block zone placement ──────────────────────────────────────
   Returns the optimal bounding box for a block overlay given the
   layout's asset zones.  The block must not obscure the main image.
───────────────────────────────────────────────────────────── */
function getBlockZone(layoutDef) {
  const assetZones = (layoutDef?.zones || []).filter(z => z.type === "asset");

  if (!assetZones.length) {
    // Text-only layout — block fills the centre column
    return { x: 4, y: 15, width: 92, height: 72, zIndex: 8 };
  }

  // Compute bounding box of all asset zones together
  const minX = Math.min(...assetZones.map(z => z.x));
  const minY = Math.min(...assetZones.map(z => z.y));
  const maxX = Math.max(...assetZones.map(z => z.x + z.width));
  const maxY = Math.max(...assetZones.map(z => z.y + z.height));
  const coverageX = maxX - minX;
  const coverageY = maxY - minY;

  // Full-bleed or near-full-bleed asset → block sits in lower third
  if (coverageX >= 70 && coverageY >= 70) {
    return { x: 4, y: 52, width: 92, height: 44, zIndex: 8 };
  }

  // Asset dominates top half → block below it
  if (minY <= 10 && maxY <= 60) {
    return { x: 4, y: maxY + 2, width: 92, height: Math.min(44, 96 - maxY - 2), zIndex: 8 };
  }

  // Asset dominates bottom half → block above it
  if (minY >= 40) {
    return { x: 4, y: 4, width: 92, height: Math.min(44, minY - 6), zIndex: 8 };
  }

  // Asset on left → block on right
  if (minX <= 10 && maxX <= 55) {
    return { x: maxX + 2, y: 10, width: Math.min(44, 96 - maxX - 2), height: 80, zIndex: 8 };
  }

  // Asset on right → block on left
  if (minX >= 45) {
    return { x: 4, y: 10, width: Math.min(44, minX - 6), height: 80, zIndex: 8 };
  }

  // Default: lower-third overlay
  return { x: 4, y: 52, width: 92, height: 44, zIndex: 8 };
}

/* ── Helpers ── */
function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
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

function chooseCaptionPosition(layoutId, index, total, energy) {
  if (index === 0 || index === total - 1) return 80;
  if (energy >= 0.8) return 50;
  return 80;
}

/* ── Block candidate — deterministic, no AI call needed ─────── */
// Returns a block type key or null. Runs on every beat unconditionally.
// Target: blocks appear in ~40–55% of beats, biased toward content-rich intents.
const BLOCK_RULES = [
  // Stat/proof with a number → StatExplosion
  { match: (i, _e, _vh, s) => (i === "stat" || i === "proof") && /\d/.test(s), type: "StatExplosion",  chance: 0.50 },
  // Contrast → BeforeAfter
  { match: (i) => i === "contrast",                                             type: "BeforeAfter",    chance: 0.45 },
  // List visual hint or list intent → ListCountdown
  { match: (i, _e, vh) => vh === "list" || i === "list",                       type: "ListCountdown",  chance: 0.50 },
  // Empathy → quote
  { match: (i) => i === "empathy",                                              type: "QuoteHighlight", chance: 0.30 },
  // Curiosity → quote
  { match: (i) => i === "curiosity",                                            type: "QuoteHighlight", chance: 0.20 },
  // Irony → before/after contrast
  { match: (i) => i === "irony",                                                type: "BeforeAfter",    chance: 0.30 },
  // Reveal → quote
  { match: (i) => i === "reveal",                                               type: "QuoteHighlight", chance: 0.25 },
  // Explanation → process steps
  { match: (i) => i === "explanation",                                          type: "ProcessSteps",   chance: 0.22 },
  // Urgency / shock → problem solution
  { match: (i) => i === "urgency" || i === "shock",                            type: "ProblemSolution", chance: 0.25 },
  // Punchline → hook impact
  { match: (i) => i === "punchline",                                            type: "HookImpact",     chance: 0.20 },
  // Proof without a number → stat explosion
  { match: (i) => i === "proof",                                                type: "StatExplosion",  chance: 0.28 },
];

function pickBlockCandidate(intent, energy, visual_hint, spoken, role) {
  for (const rule of BLOCK_RULES) {
    if (rule.match(intent, energy, visual_hint, spoken)) {
      return Math.random() < rule.chance ? rule.type : null;
    }
  }
  // Hook beats: HookImpact at moderate chance
  if (role === "hook" && Math.random() < 0.55) return "HookImpact";
  // CTA beats: HookImpact
  if (role === "cta" && Math.random() < 0.50) return "HookImpact";
  return null;
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
  if (index === 0) return { type: "cut",     duration: 0.25 };
  if (isLast)      return { type: "blurFade", duration: 0.3  };
  const high = energy >= 0.75;
  return { type: high ? "zoomCut" : "blurFade", duration: high ? 0.2 : 0.3 };
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
    } else {
      fixed[zoneDef.id] = {
        content: {},
        style: {},
      };
    }
  });

  return fixed;
}

/* ── Block injection ── */
function injectBlockContent(beats) {
  return beats.map(beat => {
    if (!beat.blocks?.length) return beat;
    const zones = { ...beat.zones };
    const validBlocks = [];

    beat.blocks.forEach(block => {
      const def = blockRegistry[block.type];
      if (!def) return;

      const props = (beat.block_props && Object.keys(beat.block_props).length)
        ? beat.block_props
        : (def.defaults || def.defaultProps || {});

      zones[block.zone] = {
        ...zones[block.zone],
        content: {
          kind: "block",
          block: { type: block.type, variant: block.variant || def.variants?.[0], props },
        },
      };
      validBlocks.push(block);
    });

    return { ...beat, zones, blocks: validBlocks };
  });
}


/* ── Fill text zones — applies DNA font + color correction only ── */
// Layout definition is the authority on font size, weight, alignment.
// This function only overrides: fontFamily (DNA), color, textShadow (readability).
// Text content is set by generateZoneContent (AI) before this runs.
function fillTextZones(beats, typographySystem = null, colorOptions = {}) {
  const fontFamily = typographySystem
    ? (TYPOGRAPHY_SYSTEMS[typographySystem]?.heading || null)
    : null;

  return beats.map(beat => {
    const def = getLayoutDef(beat.layout);
    if (!def) return beat;

    // Resolve colors for this beat's background context
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

    // Layouts with asset zones have image backgrounds — text must always be white
    const hasAssetZones = def.zones.some(z => z.type === "asset");

    textZones.forEach((zoneDef) => {
      const existing = zones[zoneDef.id];

      // Only inject: DNA fontFamily, color correction, readability shadow.
      // Everything else (fontSize, fontWeight, textAlign, letterSpacing, lineHeight)
      // comes from the layout definition — do NOT override it.
      const inject = {};

      if (fontFamily) inject.fontFamily = fontFamily;

      if (hasAssetZones) {
        inject.color      = "#ffffff";
        inject.textShadow = beat.energy >= 0.7
          ? "0 4px 28px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.8)"
          : "0 2px 18px rgba(0,0,0,0.9)";
      } else {
        inject.color = colors.text;
        if (colors.textShadow && colors.textShadow !== "none") {
          inject.textShadow = colors.textShadow;
        }
      }

      const existingContent = existing?.content || { kind: "text", text: "" };

      zones[zoneDef.id] = {
        ...existing,
        content: existingContent,
        // Layout def wins on size/weight/alignment; inject wins on font/color
        style: { ...zoneDef.style, ...(existing?.style || {}), ...inject },
      };
    });

    return { ...beat, zones };
  });
}

/* ── Main pipeline ── */
export async function buildBeatsFromScript({
  script           = "",
  structuredBeats  = null,
  mode             = "faceless",
  videoType        = "viral",
  orientation      = "9:16",
  durationCategory = "short",
  assetSource      = "stock",
  uploadedAssets   = [],
  language         = "english",
  topic            = "",
  brandColor       = null,
  brandName        = null,
  audience         = "general",
  tone             = "bold",
  dna              = null,
}) {

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
    sourceBeats = await extractBlockProps(sourceBeats);
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
    sourceBeats = await extractBlockProps(sourceBeats);
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

    const duration  = calculateDuration(spoken, intent, energy);
    const start_sec = currentStart;
    const end_sec   = start_sec + duration;
    currentStart    = end_sec;

    /* Visual plan */
    const role         = assignBeatRole(index, total);
    const hasImageHint = !!(item.asset_hint?.search_query || item.asset_hint?.prompt);
    const visual = planBeatVisual({
      mode, intent, energy, orientation,
      usedLayoutIds, lastMotion,
      brandColor, beatIndex: index,
      hasImageHint, role,
      colorStory:  dna?.colorStory  || null,
      motionStyle: dna?.motionStyle || null,
    });

    usedLayoutIds = [...usedLayoutIds, visual.layout];
    const z1Motion = visual.zones?.z1?.content?.asset?.motion;
    if (z1Motion) lastMotion = z1Motion;

    const captionStrategy  = layoutRegistry[visual.layout]?.captionStrategy ?? "always";
    const captionShowDefault = captionStrategy === "never" ? false : true;
    const captionPosition  = chooseCaptionPosition(visual.layout, index, total, energy);

    const overlays = autoAssignOverlays({
      intent, energy,
      layout:          visual.layout,
      captionPosition,
      brandColor,
    });

    overlays.forEach(ov => {
      if (!ov.sfx && OVERLAY_SFX_DEFAULTS[ov.type]) {
        ov.sfx = OVERLAY_SFX_DEFAULTS[ov.type];
      }
    });

    let sfxCue = pickBeatSFX(intent, energy, 0.4);
    if (sfxCue?.key === lastSFXKey) {
      const retry = pickBeatSFX(intent, energy, 0.4);
      if (retry?.key !== lastSFXKey) sfxCue = retry;
    }
    if (sfxCue) lastSFXKey = sfxCue.key;

    // Deterministic block assignment — runs for every beat regardless of source
    const blockCandidate = pickBlockCandidate(intent, energy, visual_hint, spoken, role);
    const blockDef       = blockCandidate ? blockRegistry[blockCandidate] : null;

    // Blocks coexist with the chosen layout — never override to FullBleed
    const finalLayout = visual.layout;
    let zones;
    let finalBlocks = [];

    if (blockCandidate && blockDef) {
      const variant    = blockDef.variants?.[0] || "default";
      const layoutDef  = getLayoutDef(finalLayout);
      zones            = enforceLayoutZones(finalLayout, visual.zones || {});

      // Place block in the best available spot given the layout's asset zones
      const bz = getBlockZone(layoutDef);
      zones["bz1"] = {
        type: "asset",
        x: bz.x, y: bz.y, width: bz.width, height: bz.height,
        zIndex: bz.zIndex, start: 0, end: null,
        content: { kind: "block", block: { type: blockCandidate, variant, props: { ...blockDef.defaults } } },
        style: {}, background: {},
      };
      finalBlocks = [{ type: blockCandidate, zone: "bz1", variant }];

      // Check which text zones the block would cover
      const bzBottom = bz.y + bz.height;
      let blockCoversPrimaryText = false;
      const zonesToHide = [];

      (layoutDef?.zones || []).forEach(zoneDef => {
        if (zoneDef.type !== "text") return;
        const zTop    = zoneDef.y ?? 0;
        const zBottom = zTop + (zoneDef.height ?? 20);
        const overlap = Math.min(zBottom, bzBottom) - Math.max(zTop, bz.y);
        if (overlap > 10) {
          // Cancel block if it covers any headline/stat/quote zone (regardless of order)
          // OR the very first zone in any layout — these are always protected content
          const isProtected =
            zoneDef.role === "headline" ||
            zoneDef.role === "stat"     ||
            zoneDef.role === "quote"    ||
            (zoneDef.order ?? 1) <= 1;
          if (isProtected) {
            blockCoversPrimaryText = true; // cancel block — don't erase main content
          } else {
            zonesToHide.push(zoneDef.id);
          }
        }
      });

      if (blockCoversPrimaryText) {
        // Block would erase the primary headline — cancel it, let layout text show
        delete zones["bz1"];
        finalBlocks = [];
      } else {
        // Safe: only hide secondary text zones the block physically covers
        zonesToHide.forEach(id => {
          zones[id] = { ...(zones[id] || {}), hidden: true };
        });
      }
    } else {
      zones = enforceLayoutZones(visual.layout, visual.zones || {});
    }

    // Auto-assign decorative/icon/emoji elements
    // Use layout definition to determine hasAsset — actual src values are filled later by autoMatchAssets
    const hasAsset = (getLayoutDef(finalLayout)?.assetCount ?? 0) > 0;
    const elementZones = autoAssignElements({
      intent, energy, role, layout: finalLayout, hasAsset, dna,
      brandColor:  brandColor  || null,
      brandColor2: null, // filled from project meta at render time
    });
    elementZones.forEach(ez => { zones[ez.id] = ez; });

    return {
      id:    crypto.randomUUID(),
      order: index,

      layout:           finalLayout,
      layoutPadding:    visual.layoutPadding || 0,
      layoutBackground: visual.layoutBackground,

      zones,
      blocks:           finalBlocks,
      block_props:      item.block_props || null,
      block_candidate:  blockCandidate,

      caption: {
        show:           captionShowDefault,
        text:           generateCaptionText(spoken),
        style:          videoCaptionStyle,
        animation:      chooseCaptionAnimation(intent, energy),
        position:       captionPosition,
        emphasis_words: item.emphasis_words || [],
      },

      overlays,
      audio_cues: sfxCue ? [sfxCue] : [],

      transition: chooseTransition(visual.layout, index, energy, isLast),

      spoken, intent, energy, visual_hint, language, role,
      asset_hint: item.asset_hint || null,
      duration_sec: duration,
      start_sec, end_sec,
    };
  });

  /* ── Composition pass — attach beat.composition to each beat ── */
  {
    const prevComps = [];
    beats = beats.map((beat, index) => {
      const composition = composeBeat({
        beat,
        dna,
        brandColor: brandColor || null,
        beatIndex:  index,
        previousCompositions: prevComps,
      });
      prevComps.push(composition);
      return { ...beat, composition };
    });
  }

  /* ── Post-processing ── */
  beats = injectBlockContent(beats);
  beats = fillTextZones(beats, dna?.typographySystem || null, {
    colorStory:  dna?.colorStory  || null,
    brandColor:  brandColor       || null,
  });

  /* ── Extract block props ── */
  const beatsWithBlocks = beats.filter(b => b.blocks?.length > 0);
  if (beatsWithBlocks.length > 0) {
    try {
      const tagged = beats.map(b => ({
        ...b,
        block_candidate: b.blocks?.[0]?.type || null,
      }));

      const extracted = await extractBlockProps(tagged);

      const propsById = {};
      extracted.forEach(b => {
        if (b.block_props && Object.keys(b.block_props).length > 0) {
          propsById[b.id] = b.block_props;
        }
      });

      beats = beats.map(b => {
        const props = propsById[b.id];
        if (!props || !b.blocks?.length) return b;

        const zones = { ...b.zones };
        b.blocks.forEach(block => {
          const zone = zones[block.zone];
          if (zone?.content?.kind === "block") {
            zones[block.zone] = {
              ...zone,
              content: {
                ...zone.content,
                block: { ...zone.content.block, props: { ...zone.content.block.props, ...props } },
              },
            };
          }
        });
        return { ...b, zones, block_props: props };
      });
    } catch (err) {
      console.error("[buildBeats] blockPropExtractor failed:", err.message);
    }
  }

  beats = await autoMatchAssets(beats, orientation, { assetSource, uploadedAssets, topic, language });
  beats = applyBeatVariation(beats);
  beats = applyCaptionEmphasis(beats);

  /* ── Design pass — decoratives + resolved colors ── */
  {
    const usedDecorativeIds = [];
    beats = beats.map(beat => {
      // Pick decoratives
      const decoratives = pickDecoratives(beat, dna, usedDecorativeIds);
      decoratives.forEach(d => usedDecorativeIds.push(d.decorativeId));

      // Resolve colors against the beat's background
      const bgStyle = beat.layoutBackground?.style || null;
      const resolvedColors = resolveBeatColors(bgStyle, dna);

      return { ...beat, decoratives, resolvedColors };
    });
  }

  beats = validateBeats(beats);

  return beats;
}