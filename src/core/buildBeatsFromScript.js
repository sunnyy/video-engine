import { getPacingProfile } from "./pacingProfiles";
import { generateCaptionText } from "./captionTimingEngine";
import { autoMatchAssets } from "./assetAutoMatcher";
import { injectAudioCues } from "./audioCueEngine";
import { validateBeats } from "./compilerValidator";
import { classifyBeatIntent } from "./beatIntent/beatIntentClassifier";
import { applyBeatVariation } from "./beatVariationEngine";
import { applyCaptionEmphasis } from "./captionEmphasisEngine";
import { planBeatVisual } from "./visualPlanner";
import { applyVisualDirection } from "./visualDirector";
import { layoutDefaultsRegistry } from "./layoutDefaultsRegistry";
import { layoutRegistry } from "./layoutRegistry";
import blockRegistry from "./blockRegistry";

import { analyzeBeatRoles } from "./ai/beatRoleAnalyzer";
import { analyzeVisualTypes } from "./ai/visualTypeAnalyzer";
import { extractBlockProps } from "./ai/blockPropExtractor";
import { validateAIOutputs } from "./ai/aiOutputValidator";

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

/* ------------------------------------------------ */
/* BETTER BEAT SPLITTING */
/* ------------------------------------------------ */

function splitIntoDurationBeats(text) {
  const w = words(text);
  const beats = [];

  let i = 0;

  while (i < w.length) {
    const sliceSize = Math.floor(Math.random() * 6) + 4; // 4-9 words

    beats.push(w.slice(i, i + sliceSize).join(" "));

    i += sliceSize;
  }

  return beats;
}

/* ------------------------------------------------ */
/* BETTER DURATION VARIATION */
/* ------------------------------------------------ */

function calculateDuration(spoken, intent) {
  const wc = words(spoken).length;

  let base = 1.6 + wc * 0.12;

  if (intent === "hook") base += 0.6;
  if (intent === "stat") base += 0.4;
  if (intent === "list") base += 0.3;

  const variance = Math.random() * 0.6 - 0.3;

  let duration = base + variance;

  if (duration < 1.4) duration = 1.4;
  if (duration > 3.2) duration = 3.2;

  return Number(duration.toFixed(2));
}

/* ------------------------------------------------ */

function chooseCaptionAnimation(intent) {
  switch (intent) {
    case "hook":
      return "pop";
    case "stat":
      return "word_pop";
    case "question":
      return "wave";
    case "list":
      return "slide";
    case "quote":
      return "fade";

    default:
      return "fade";
  }
}

function chooseTransition(layout, index) {
  const layoutTransitionMap = {
    FullZone: ["cut", "zoomCut", "scaleJump"],
    SplitZone: ["slideWhip", "zoomCut", "cut"],
    ThreeZone: ["blurFade", "cut", "zoomCut"],
    TwoTopOneBottom: ["slideWhip", "scaleJump", "cut"],
    OneTopTwoBottom: ["zoomCut", "blurFade", "cut"],
    FourGrid: ["cut", "flash", "zoomCut"],
  };

  const pattern = layoutTransitionMap[layout] || ["cut"];

  if (index === 0) return "cut";

  return pattern[index % pattern.length];
}

function enforceLayoutZones(layout, zones) {
  const def = layoutRegistry[layout];

  if (!def) return zones;

  const fixed = {};

  def.zones.forEach((z) => {
    fixed[z] = zones[z] || {
      role: "asset",
      content: {
        kind: "asset",
        asset: {
          src: null,
          type: "image",
          objectFit: "cover",
        },
      },
      background: {},
      style: { padding: {} },
    };
  });

  return fixed;
}

/* ------------------------------------------------ */
/* BLOCK INJECTION */
/* ------------------------------------------------ */

function injectBlockContent(beats) {

  return beats.map((beat) => {

    if (!beat.blocks || !beat.blocks.length) return beat;

    const zones = { ...beat.zones };
    const validBlocks = [];

    beat.blocks.forEach((block) => {

      const def = blockRegistry[block.type];
      if (!def) return;

      const props = beat.block_props;

      /* AI failed → remove block */

      if (!props || Object.keys(props).length === 0) {
        return;
      }

      zones[block.zone] = {

        role: "block",

        content: {
          kind: "block",
          block: {
            type: block.type,
            variant: def.variants?.[0] || null,
            props
          }
        },

        background: {},
        style: { padding: {} }

      };

      validBlocks.push(block);

    });

    return {
      ...beat,
      zones,
      blocks: validBlocks
    };

  });

}

/* ------------------------------------------------ */
/* BUILD PIPELINE */
/* ------------------------------------------------ */

export async function buildBeatsFromScript({
  script = "",
  structuredBeats = null,
  videoType = "faceless",
  orientation = "vertical",
  durationCategory = "short",
  assetSource = "stock",
  uploadedAssets = [],
}) {
  let sourceBeats = [];

  if (structuredBeats && structuredBeats.length) {
    sourceBeats = structuredBeats;
  } else {
    const sentences = script
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    sentences.forEach((sentence) => {
      const parts = splitIntoDurationBeats(sentence);

      parts.forEach((p) => {
        sourceBeats.push({
          spoken: p,
          intent: classifyBeatIntent(p),
        });
      });
    });
  }

  /* AI PASSES */

  sourceBeats = await analyzeBeatRoles(sourceBeats);

  sourceBeats = await analyzeVisualTypes(sourceBeats);

  sourceBeats = await extractBlockProps(sourceBeats);

  sourceBeats = validateAIOutputs(sourceBeats);

  /* ------------------------------------------------ */

  let currentStart = 0;

  let beats = sourceBeats.map((item, index) => {
    const spoken = item.spoken;

    const intent = item.intent || classifyBeatIntent(spoken);

    const duration = calculateDuration(spoken, intent);

    const start_sec = currentStart;

    const end_sec = start_sec + duration;

    currentStart = end_sec;

    const visual = planBeatVisual({
      intent,
      videoType,
      spoken,
      duration,
      visual_type: item.visual_type,
      block_candidate: item.block_candidate,
      visual_weight: item.visual_weight,
    });

    const zones = enforceLayoutZones(visual.layout, visual.zones || {});

    const layoutDefaults = layoutDefaultsRegistry[visual.layout] || {};

    return {
      id: crypto.randomUUID(),
      order: index,

      layout: visual.layout,

      layoutPadding: visual.layoutPadding || 0,

      layoutBackground: {
        type: "color",
        value: "#000000",
        objectFit: "cover",
        enterTransition: layoutDefaults.layoutBackground?.enterTransition || "fadeIn",
        exitTransition: layoutDefaults.layoutBackground?.exitTransition || "none",
        motion: layoutDefaults.layoutBackground?.motion || "none",
      },

      zones,

      blocks: visual.blocks || [],

      block_props: item.block_props || null,

      caption: {
        text: generateCaptionText(spoken),
        style: "tiktokClean",
        animation: chooseCaptionAnimation(intent),
        position: layoutDefaults.captionPosition || "bottom",
      },

      transition: {
        type: chooseTransition(visual.layout, index),
        duration: 0.25,
      },

      spoken,
      intent,

      duration_sec: duration,
      start_sec,
      end_sec,
    };
  });

  beats = injectBlockContent(beats);

  beats = applyVisualDirection(beats);

  beats = await autoMatchAssets(beats, orientation, {
    assetSource,
    uploadedAssets,
  });

  beats = applyBeatVariation(beats);

  beats = applyCaptionEmphasis(beats);

  beats = injectAudioCues(beats, {
    audio_rules: {
      hook_sfx: true,
      layout_whoosh: true,
    },
  });

  beats = validateBeats(beats);

  return beats;
}
