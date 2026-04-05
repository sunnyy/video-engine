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
import { getLayoutDef, layoutRegistry } from "./layoutRegistry";
import blockRegistry              from "./blockRegistry";
import { pickBeatSFX, OVERLAY_SFX_DEFAULTS } from "./sfxRegistry";
import { autoAssignOverlays }     from "./overlayPlacementEngine";

import { analyzeBeatRoles }   from "./ai/beatRoleAnalyzer";
import { extractBlockProps }  from "./ai/blockPropExtractor";
import { analyzeVisualTypes } from "./ai/visualTypeAnalyzer";
import { validateAIOutputs }  from "./ai/aiOutputValidator";

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
  // "middle" for high energy mid-video beats, otherwise "bottom"
  if (index === 0 || index === total - 1) return "bottom";
  if (energy >= 0.8) return "middle";
  return "bottom";
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
        : (def.defaultProps || {});

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

/* ── Fill text zones from spoken content ── */
function fillTextZones(beats) {
  return beats.map(beat => {
    const def = getLayoutDef(beat.layout);
    if (!def) return beat;

    const textZones = def.zones
      .filter(z => z.type === "text")
      .sort((a, b) => a.order - b.order);

    if (!textZones.length) return beat;

    const zones = { ...beat.zones };

    // text-order-1 gets the main spoken text
    // additional text zones left empty for now (AI fill in future)
    textZones.forEach((zoneDef, i) => {
      const existing = zones[zoneDef.id];
      const hasText = existing?.content?.text;
      if (!hasText) {
        zones[zoneDef.id] = {
          ...existing,
          content: {
            kind: "text",
            text: i === 0 ? beat.spoken : "",
          },
          style: { ...(existing?.style || {}), ...zoneDef.style },
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
  let currentStart           = 0;
  let previousLayout         = null;
  let previousPreviousLayout = null;
  let lastMotion             = null;
  let lastSFXKey             = null;

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
    const visual = planBeatVisual({
      mode, intent, energy, visual_hint, orientation,
      block_candidate: item.block_candidate || null,
      previousLayout, previousPreviousLayout, lastMotion,
      brandColor, beatIndex: index,
    });

    previousPreviousLayout = previousLayout;
    previousLayout         = visual.layout;
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

    const zones = enforceLayoutZones(visual.layout, visual.zones || {});

    return {
      id:    crypto.randomUUID(),
      order: index,

      layout:           visual.layout,
      layoutPadding:    visual.layoutPadding || 0,
      layoutBackground: visual.layoutBackground,

      zones,
      blocks:      visual.blocks    || [],
      block_props: item.block_props || null,

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

      spoken, intent, energy, visual_hint, language,
      duration_sec: duration,
      start_sec, end_sec,
    };
  });

  /* ── Post-processing ── */
  beats = injectBlockContent(beats);
  beats = fillTextZones(beats);

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
                block: { ...zone.content.block, props },
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
  beats = validateBeats(beats);

  return beats;
}