/**
 * buildBeatsFromScript.js
 * src/core/buildBeatsFromScript.js
 *
 * Two separate concepts now correctly named:
 *   mode      = "faceless" | "talking_head"   — how the video is shot
 *   videoType = "viral" | "news" | ...        — content / storytelling type
 */

import { generateCaptionText }    from "./captionTimingEngine";
import { autoMatchAssets }         from "./assetAutoMatcher";
import { injectAudioCues }         from "./audioCueEngine";
import { validateBeats }           from "./compilerValidator";
import { classifyBeatIntent }      from "./beatIntent/beatIntentClassifier";
import { applyBeatVariation }      from "./beatVariationEngine";
import { applyCaptionEmphasis }    from "./captionEmphasisEngine";
import { planBeatVisual }          from "./visualPlanner";
import { applyVisualDirection }    from "./visualDirector";
import { layoutDefaultsRegistry }  from "./layoutDefaultsRegistry";
import { layoutRegistry }          from "./layoutRegistry";
import blockRegistry               from "./blockRegistry";

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
   Uses both intent and energy (0–1) from rich beats.
───────────────────────────────────────────────────────────── */
function calculateDuration(spoken, intent, energy = 0.5) {
  const wc = words(spoken).length;
  let base  = 1.6 + wc * 0.12;

  switch (intent) {
    case "shock":       base += 0.8; break;
    case "curiosity":   base += 0.5; break;
    case "proof":       base += 0.5; break;
    case "reveal":      base += 0.7; break;
    case "punchline":   base += 0.6; break;
    case "empathy":     base += 0.4; break;
    case "explanation": base += 0.4; break;
    case "urgency":     base -= 0.2; break;
    // legacy intents
    case "hook":        base += 0.6; break;
    case "stat":        base += 0.4; break;
    case "list":        base += 0.3; break;
  }

  // High energy = faster pacing
  base -= (energy - 0.5) * 0.4;

  const variance = Math.random() * 0.4 - 0.2;
  let duration = base + variance;
  if (duration < 1.4) duration = 1.4;
  if (duration > 4.0) duration = 4.0;

  return Number(duration.toFixed(2));
}

/* ─────────────────────────────────────────────────────────────
   CAPTION STYLE
   Maps new emotional intents → caption style keys.
───────────────────────────────────────────────────────────── */
function chooseCaptionStyle(intent, energy = 0.5) {
  if (energy >= 0.85) return "brutalSlam";
  switch (intent) {
    case "shock":       return "wordBlaze";
    case "curiosity":   return "wordHighlight";
    case "proof":       return "premiumBlock";
    case "reveal":      return "glitchStamp";
    case "urgency":     return "brutalSlam";
    case "empathy":     return "editorialSerif";
    case "punchline":   return "markerHighlight";
    case "contrast":    return "splitColour";
    case "irony":       return "wordHighlight";
    // legacy
    case "hook":        return "wordBlaze";
    case "stat":        return "premiumBlock";
    case "quote":       return "editorialSerif";
    default:            return "tiktokClean";
  }
}

/* ─────────────────────────────────────────────────────────────
   CAPTION ANIMATION
───────────────────────────────────────────────────────────── */
function chooseCaptionAnimation(intent, energy = 0.5) {
  if (energy >= 0.8) return "word_pop";
  switch (intent) {
    case "shock":       return "word_pop";
    case "curiosity":   return "wave";
    case "proof":       return "word_reveal";
    case "reveal":      return "pop";
    case "urgency":     return "word_pop";
    case "contrast":    return "slide";
    case "punchline":   return "pop";
    case "empathy":     return "fade";
    case "explanation": return "word_reveal";
    case "irony":       return "wave";
    // legacy
    case "hook":        return "pop";
    case "stat":        return "word_pop";
    case "question":    return "wave";
    case "list":        return "slide";
    case "quote":       return "fade";
    default:            return "fade";
  }
}

/* ─────────────────────────────────────────────────────────────
   TRANSITION
   Energy-aware, layout-aware.
───────────────────────────────────────────────────────────── */
function chooseTransition(layout, index, energy = 0.5) {
  if (index === 0) return { type: "cut", duration: 0.25 };

  const high = energy >= 0.75;

  const map = {
    FullZone:        high ? "zoomCut"   : "blurFade",
    SplitZone:       high ? "slideWhip" : "cut",
    ThreeZone:       high ? "zoomCut"   : "blurFade",
    TwoTopOneBottom: high ? "slideWhip" : "scaleJump",
    OneTopTwoBottom: high ? "zoomCut"   : "blurFade",
    FourGrid:               "cut",
    PictureInPicture: high ? "slideWhip" : "blurFade",
    SideAvatar:             "cut",
    CenterAvatar:    high ? "zoomCut"   : "blurFade",
    FloatingAvatar:         "cut",
  };

  return {
    type:     map[layout] || "cut",
    duration: high ? 0.2 : 0.3,
  };
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
      content: {
        kind: "asset",
        asset: { src: null, type: "image", objectFit: "cover" },
      },
      background: {},
      style: { padding: {} },
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

    const zones       = { ...beat.zones };
    const validBlocks = [];

    beat.blocks.forEach(block => {
      const def   = blockRegistry[block.type];
      if (!def)   return;

      const props = beat.block_props;
      if (!props || Object.keys(props).length === 0) return;

      zones[block.zone] = {
        role: "block",
        content: {
          kind: "block",
          block: {
            type:    block.type,
            variant: def.variants?.[0] || null,
            props,
          },
        },
        background: {},
        style: { padding: {} },
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
  mode             = "faceless",      // "faceless" | "talking_head"
  videoType        = "viral",         // "viral" | "news" | "explainer" | etc.
  orientation      = "9:16",
  durationCategory = "short",
  assetSource      = "stock",
  uploadedAssets   = [],
  language         = "english",
  topic            = "",
}) {

  /* ── Detect rich beats (from new generateStructuredShort) ── */
  const isRich = Array.isArray(structuredBeats) &&
    structuredBeats.length > 0 &&
    typeof structuredBeats[0].energy === "number" &&
    structuredBeats[0].visual_hint !== undefined;

  let sourceBeats = [];

  if (isRich) {
    /* New path — rich beats, skip all AI re-passes */
    sourceBeats = structuredBeats;

  } else if (Array.isArray(structuredBeats) && structuredBeats.length) {
    /* Legacy path — minimal beats, run AI passes */
    sourceBeats = structuredBeats;
    sourceBeats = await analyzeBeatRoles(sourceBeats);
    sourceBeats = await analyzeVisualTypes(sourceBeats);
    sourceBeats = await extractBlockProps(sourceBeats);
    sourceBeats = validateAIOutputs(sourceBeats);

  } else {
    /* Plain text fallback */
    const sentences = script
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(Boolean);

    sentences.forEach(sentence => {
      splitIntoDurationBeats(sentence).forEach(p => {
        sourceBeats.push({
          spoken:         p,
          intent:         classifyBeatIntent(p),
          energy:         0.5,
          visual_hint:    "none",
          emphasis_words: [],
        });
      });
    });

    sourceBeats = await analyzeBeatRoles(sourceBeats);
    sourceBeats = await analyzeVisualTypes(sourceBeats);
    sourceBeats = await extractBlockProps(sourceBeats);
    sourceBeats = validateAIOutputs(sourceBeats);
  }

  /* ── Build beat objects ── */
  let currentStart = 0;

  let beats = sourceBeats.map((item, index) => {
    const spoken      = String(item.spoken || "").trim();
    const intent      = item.intent      || classifyBeatIntent(spoken);
    const energy      = item.energy      ?? 0.5;
    const visual_hint = item.visual_hint || "none";

    const duration  = calculateDuration(spoken, intent, energy);
    const start_sec = currentStart;
    const end_sec   = start_sec + duration;
    currentStart    = end_sec;

    const visual = planBeatVisual({
      intent,
      energy,
      visual_hint,
      mode,        // ← correct: mode drives avatar layout filtering
      videoType,   // ← correct: content type for future use
      spoken,
      duration,
      visual_type:     item.visual_type,
      block_candidate: item.block_candidate,
      visual_weight:   item.visual_weight,
    });

    const zones          = enforceLayoutZones(visual.layout, visual.zones || {});
    const layoutDefaults = layoutDefaultsRegistry[visual.layout] || {};

    return {
      id:    crypto.randomUUID(),
      order: index,

      layout:        visual.layout,
      layoutPadding: visual.layoutPadding || 0,

      layoutBackground: {
        type:            visual.layoutBackground?.type  || "color",
        value:           visual.layoutBackground?.value || "#000000",
        objectFit:       "cover",
        enterTransition: layoutDefaults.layoutBackground?.enterTransition || "fadeIn",
        exitTransition:  layoutDefaults.layoutBackground?.exitTransition  || "none",
        motion:          layoutDefaults.layoutBackground?.motion          || "none",
      },

      zones,
      blocks:      visual.blocks     || [],
      block_props: item.block_props  || null,

      caption: {
        text:           generateCaptionText(spoken),
        style:          chooseCaptionStyle(intent, energy),
        animation:      chooseCaptionAnimation(intent, energy),
        position:       layoutDefaults.captionPosition || "bottom",
        emphasis_words: item.emphasis_words || [],
      },

      transition: chooseTransition(visual.layout, index, energy),

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

  /* ── Post-processing pipeline ── */
  beats = injectBlockContent(beats);
  beats = applyVisualDirection(beats, { mode });

  beats = await autoMatchAssets(beats, orientation, {
    assetSource,
    uploadedAssets,
    topic,
    language,
  });

  beats = applyBeatVariation(beats);
  beats = applyCaptionEmphasis(beats);
  beats = injectAudioCues(beats, {
    audio_rules: { hook_sfx: true, layout_whoosh: true },
  });
  beats = validateBeats(beats);

  return beats;
}