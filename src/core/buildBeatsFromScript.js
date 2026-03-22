import { getPacingProfile } from "./pacingProfiles";
import { generateCaptionText } from "./captionTimingEngine";
import { autoMatchAssets } from "./assetAutoMatcher";
import { injectAudioCues } from "./audioCueEngine";
import { validateBeats } from "./compilerValidator";
import { layoutRegistry } from "./layoutRegistry";
import { classifyBeatIntent } from "./beatIntent/beatIntentClassifier";
import { autoGenerateComponents } from "./componentAutoGenerator";
import { applyBeatVariation } from "./beatVariationEngine";
import { applyCaptionEmphasis } from "./captionEmphasisEngine";

function splitScriptIntoChunks(script, chunkCount) {
  if (!script) return [];

  const sentences = script.split(/(?<=[.?!])\s+/).filter(Boolean);
  if (!sentences.length) return [script];

  const chunks = Array.from({ length: chunkCount }, () => []);

  sentences.forEach((sentence, index) => {
    const bucket = index % chunkCount;
    chunks[bucket].push(sentence);
  });

  return chunks.map((arr) => arr.join(" ").trim()).filter(Boolean);
}

function calculateDynamicDuration(spoken, pacingProfile) {
  const words = spoken.trim().split(/\s+/).filter(Boolean).length;
  const duration = words / pacingProfile.words_per_second;

  return Math.max(
    pacingProfile.min_duration,
    Math.min(pacingProfile.max_duration, duration)
  );
}

function getLayoutForIntent(intent, videoType, orientation) {

  const intentLayoutMap = {
    hook: "HeadlineFocus",
    question: "QuoteCard",
    stat: "StatLayout",
    list: "ListLayout",
    quote: "QuoteCard",
    fact: "FullZone",
  };

  const candidate = intentLayoutMap[intent] || "FullZone";
  const layout = layoutRegistry[candidate];

  if (!layout) return "FullZone";

  if (videoType === "faceless" && layout.supportsAvatar) {
    return "HeadlineFocus";
  }

  if (orientation === "vertical" && !layout.orientations.includes("vertical")) {
    return "HeadlineFocus";
  }

  if (orientation === "horizontal" && !layout.orientations.includes("horizontal")) {
    return "HeadlineFocus";
  }

  return candidate;
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

  const transitions = [
    "fade",
    "slideLeft",
    "slideRight",
    "slideUp",
    "slideDown",
    "scale",
    "blurFade"
  ];

  if (index === 0) return "cut";

  return transitions[index % transitions.length];
}

export async function buildBeatsFromScript({
  script = "",
  videoType = "faceless",
  orientation = "vertical",
  durationCategory = "short",
}) {

  if (!script || !script.trim()) return [];

  const pacingMap = {
    short: "aggressive_short",
    medium: "normal",
    long: "calm_longform",
  };

  const pacingProfile = getPacingProfile(
    pacingMap[durationCategory] || "normal"
  );

  const words = script.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let beatCount = Math.ceil(wordCount / 12);

  if (beatCount < 8) beatCount = 8;
  if (beatCount > 18) beatCount = 18;

  const spokenChunks = splitScriptIntoChunks(script, beatCount);

  let currentStart = 0;

  let beats = spokenChunks.map((spoken, index) => {

    const duration = calculateDynamicDuration(spoken, pacingProfile);

    const start_sec = currentStart;
    const end_sec = start_sec + duration;

    currentStart = end_sec;

    const intent = classifyBeatIntent(spoken);

    const layout = getLayoutForIntent(intent, videoType, orientation);

    return {

      id: crypto.randomUUID(),
      order: index,
      layout,

      zones: {
        z1: {
          type: videoType === "talking_head" ? "avatar" : "asset",
          src: null,
          objectFit: "cover",
        },
      },

      heading: intent === "hook" ? spoken : null,
      text: intent === "list" ? spoken : null,

      components: {},

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

  beats = await autoMatchAssets(beats, orientation);

  beats = autoGenerateComponents(beats);

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