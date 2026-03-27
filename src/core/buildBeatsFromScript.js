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

function calculateDynamicDuration(spoken, pacingProfile) {
  const words = spoken.trim().split(/\s+/).filter(Boolean).length;

  const duration = words / pacingProfile.words_per_second;

  return Math.max(1.1, Math.min(2.6, duration));
}

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

function chooseTransition(index) {
  const transitions = ["fade", "slideLeft", "slideRight", "slideUp", "slideDown", "scale", "blurFade"];

  if (index === 0) return "cut";

  return transitions[index % transitions.length];
}

export async function buildBeatsFromScript({
  script = "",
  structuredBeats = null,
  videoType = "faceless",
  orientation = "vertical",
  durationCategory = "short",
}) {
  const pacingMap = {
    short: "aggressive_short",
    medium: "normal",
    long: "calm_longform",
  };

  const pacingProfile = getPacingProfile(pacingMap[durationCategory] || "normal");

  let sourceBeats = [];

  if (structuredBeats && structuredBeats.length) {
    sourceBeats = structuredBeats;
  } else {
    const sentences = script
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    sourceBeats = sentences.map((s) => ({
      spoken: s,
      intent: classifyBeatIntent(s),
    }));
  }

  let currentStart = 0;

  let beats = sourceBeats.map((item, index) => {
    const spoken = item.spoken;
    const intent = item.intent || classifyBeatIntent(spoken);

    const duration = calculateDynamicDuration(spoken, pacingProfile);

    const start_sec = currentStart;
    const end_sec = start_sec + duration;

    currentStart = end_sec;

    const visual = planBeatVisual({
      intent,
      videoType,
    });

    return {
      id: crypto.randomUUID(),
      order: index,

      layout: visual.layout,

      layoutBackground: {
        type: "color",
        value: "#000000",
        objectFit: "cover",
      },

      zones: visual.zones,

      blocks: visual.blocks || [],

      heading: intent === "hook" ? spoken : null,
      text: intent === "list" ? spoken : null,

      caption: {
        text: generateCaptionText(spoken),
        style: "tiktokClean",
        animation: chooseCaptionAnimation(intent),
        position: "bottom",
      },

      transition: {
        type: chooseTransition(index),
        duration: 0.35,
      },

      spoken,
      duration_sec: duration,
      start_sec,
      end_sec,
    };
  });

  beats = applyVisualDirection(beats);

  beats = await autoMatchAssets(beats, orientation);

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
