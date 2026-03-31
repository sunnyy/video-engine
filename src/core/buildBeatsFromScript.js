/**
 * buildBeatsFromScript.js
 * src/core/buildBeatsFromScript.js
 *
 * The director brain. Assembles every creative decision per beat:
 * layout, zones, backgrounds, asset styling, blocks, overlays,
 * captions, SFX, transitions — all intent + energy aware.
 */

import { generateCaptionText }   from "./captionTimingEngine";
import { autoMatchAssets }        from "./assetAutoMatcher";
import { validateBeats }          from "./compilerValidator";
import { classifyBeatIntent }     from "./beatIntent/beatIntentClassifier";
import { applyBeatVariation }     from "./beatVariationEngine";
import { applyCaptionEmphasis }   from "./captionEmphasisEngine";
import { planBeatVisual }         from "./visualPlanner";
import { layoutRegistry }         from "./layoutRegistry";
import blockRegistry              from "./blockRegistry";
import { pickBeatSFX }            from "./sfxRegistry";
import { OVERLAY_SFX_DEFAULTS }   from "./sfxRegistry";
import { autoAssignOverlays }     from "./overlayPlacementEngine";
import { pickAutoMusic }          from "./musicRegistry";

import { analyzeBeatRoles }   from "./ai/beatRoleAnalyzer";
import { analyzeVisualTypes } from "./ai/visualTypeAnalyzer";
import { extractBlockProps }  from "./ai/blockPropExtractor";
import { validateAIOutputs }  from "./ai/aiOutputValidator";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   DURATION
───────────────────────────────────────────────────────────── */
function calculateDuration(spoken, intent, energy = 0.5) {
  const wc  = words(spoken).length;
  let base  = 1.6 + wc * 0.12;

  const intentAdj = {
    shock: 0.8, curiosity: 0.5, proof: 0.5, reveal: 0.7,
    punchline: 0.6, empathy: 0.4, explanation: 0.4, urgency: -0.2,
    hook: 0.6, stat: 0.4, list: 0.3,
  };
  base += intentAdj[intent] || 0;
  base -= (energy - 0.5) * 0.4;

  const variance = Math.random() * 0.4 - 0.2;
  return Number(Math.min(4.0, Math.max(1.4, base + variance)).toFixed(2));
}

/* ─────────────────────────────────────────────────────────────
   CAPTION
───────────────────────────────────────────────────────────── */
function chooseCaptionStyle(intent, energy = 0.5) {
  if (energy >= 0.85) return "brutalSlam";
  const map = {
    shock: "wordBlaze", curiosity: "wordHighlight", proof: "premiumBlock",
    reveal: "glitchStamp", urgency: "brutalSlam", empathy: "editorialSerif",
    punchline: "markerPen", contrast: "wordHighlight", irony: "wordHighlight",
    hook: "wordBlaze", stat: "premiumBlock", quote: "editorialSerif",
  };
  return map[intent] || "tiktokClean";
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

function chooseCaptionPosition(index, total, energy) {
  // First beat → bottom (above CTA area)
  // Last beat  → bottom
  // High energy → middle for drama
  if (index === 0 || index === total - 1) return "bottom";
  if (energy >= 0.8) return "middle";
  return "bottom";
}

/* ─────────────────────────────────────────────────────────────
   TRANSITION
───────────────────────────────────────────────────────────── */
function chooseTransition(layout, index, energy = 0.5) {
  if (index === 0) return { type: "cut", duration: 0.25 };
  if (index === -1) return { type: "blurFade", duration: 0.3 }; // last beat

  const high = energy >= 0.75;
  const map = {
    FullZone:         high ? "zoomCut"   : "blurFade",
    SplitZone:        high ? "slideWhip" : "cut",
    ThreeZone:        high ? "zoomCut"   : "blurFade",
    SmallTopBigBottom:high ? "slideWhip" : "blurFade",
    BigTopSmallBottom:high ? "zoomCut"   : "blurFade",
    LeftHeavy:        high ? "slideWhip" : "cut",
    RightHeavy:       high ? "slideWhip" : "cut",
    TwoTopOneBottom:  high ? "slideWhip" : "scaleJump",
    OneTopTwoBottom:  high ? "zoomCut"   : "blurFade",
    FourGrid:               "cut",
    PictureInPicture: high ? "slideWhip" : "blurFade",
    SideAvatar:             "cut",
    CenterAvatar:     high ? "zoomCut"   : "blurFade",
    FloatingAvatar:         "cut",
  };
  return { type: map[layout] || "cut", duration: high ? 0.2 : 0.3 };
}

/* ─────────────────────────────────────────────────────────────
   ENFORCE LAYOUT ZONES
───────────────────────────────────────────────────────────── */
function enforceLayoutZones(layout, zones) {
  const def = layoutRegistry[layout];
  if (!def) return zones;
  const fixed = {};
  def.zones.forEach(z => {
    fixed[z] = zones[z] || {
      role: "asset",
      content: { kind: "asset", asset: { src: null, type: "image", objectFit: "cover" } },
      background: {},
      style: {},
    };
  });
  return fixed;
}

/* ─────────────────────────────────────────────────────────────
   BLOCK INJECTION
───────────────────────────────────────────────────────────── */
function injectBlockContent(beats) {
  return beats.map(beat => {
    if (!beat.blocks?.length) return beat;
    const zones = { ...beat.zones };
    const validBlocks = [];

    beat.blocks.forEach(block => {
      const def   = blockRegistry[block.type];
      if (!def)   return;
      const props = beat.block_props;
      if (!props || !Object.keys(props).length) return;

      zones[block.zone] = {
        ...zones[block.zone],
        role: "block",
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

/* ─────────────────────────────────────────────────────────────
   MAIN PIPELINE
───────────────────────────────────────────────────────────── */
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

  /* ── Detect rich beats ── */
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
  let currentStart = 0;

  /* Track previous layouts for variety enforcement */
  let previousLayout        = null;
  let previousPreviousLayout = null;
  let lastMotion            = null;

  /* ── Build beat objects ── */
  let beats = sourceBeats.map((item, index) => {
    const spoken      = String(item.spoken || "").trim();
    const intent      = item.intent      || classifyBeatIntent(spoken);
    const energy      = item.energy      ?? 0.5;
    const visual_hint = item.visual_hint || "none";

    const duration  = calculateDuration(spoken, intent, energy);
    const start_sec = currentStart;
    const end_sec   = start_sec + duration;
    currentStart    = end_sec;

    /* ── Visual planning with layout variety + motion coherence ── */
    const visual = planBeatVisual({
      mode,
      intent,
      energy,
      visual_hint,
      block_candidate: item.block_candidate || null,
      previousLayout,
      previousPreviousLayout,
      lastMotion,
      brandColor,
    });

    /* Update tracking */
    previousPreviousLayout = previousLayout;
    previousLayout         = visual.layout;

    // Track last motion from z1
    const z1Motion = visual.zones?.z1?.content?.asset?.motion;
    if (z1Motion) lastMotion = z1Motion;

    /* ── Caption ── */
    const captionPosition = chooseCaptionPosition(index, total, energy);
    const isLast          = index === total - 1;

    /* ── Overlays — auto-assigned, conflict-aware ── */
    const overlays = autoAssignOverlays({
      intent,
      energy,
      layout:          visual.layout,
      captionPosition,
      brandColor,
    });

    /* ── Apply overlay SFX defaults ── */
    overlays.forEach(ov => {
      if (!ov.sfx && OVERLAY_SFX_DEFAULTS[ov.type]) {
        ov.sfx = OVERLAY_SFX_DEFAULTS[ov.type];
      }
    });

    /* ── Beat SFX ── */
    const sfxCue = pickBeatSFX(intent, energy, 1.0);

    /* ── Zones ── */
    const zones = enforceLayoutZones(visual.layout, visual.zones || {});

    return {
      id:    crypto.randomUUID(),
      order: index,

      layout:           visual.layout,
      layoutPadding:    visual.layoutPadding || 0,
      layoutBackground: visual.layoutBackground,

      zones,
      blocks:      visual.blocks     || [],
      block_props: item.block_props  || null,

      caption: {
        show:           true,
        text:           generateCaptionText(spoken),
        style:          chooseCaptionStyle(intent, energy),
        animation:      chooseCaptionAnimation(intent, energy),
        position:       captionPosition,
        emphasis_words: item.emphasis_words || [],
      },

      overlays,

      audio_cues: sfxCue ? [sfxCue] : [],

      transition: chooseTransition(
        visual.layout,
        isLast ? -1 : index,
        energy
      ),

      spoken,
      intent,
      energy,
      visual_hint,
      language,

      duration_sec: duration,
      start_sec,
      end_sec,
    };
  });

  /* ── Post-processing ── */
  beats = injectBlockContent(beats);

  beats = await autoMatchAssets(beats, orientation, {
    assetSource,
    uploadedAssets,
    topic,
    language,
  });

  beats = applyBeatVariation(beats);
  beats = applyCaptionEmphasis(beats);
  beats = validateBeats(beats);

  return beats;
}