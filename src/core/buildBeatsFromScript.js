import { getPacingProfile } from "./pacingProfiles";
import { generateCaptionText } from "./captionTimingEngine";
import { autoMatchAssets } from "./assetAutoMatcher";
import { injectAudioCues } from "./audioCueEngine";
import { validateBeats } from "./compilerValidator";
import { classifyBeatIntent } from "./beatIntent/beatIntentClassifier";
import { applyBeatVariation } from "./beatVariationEngine";
import { applyCaptionEmphasis } from "./captionEmphasisEngine";
import { resolveLayout } from "./layoutResolver";

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
    "blurFade",
  ];

  if (index === 0) return "cut";

  return transitions[index % transitions.length];
}

export async function buildBeatsFromScript({
  script = "",
  videoType = "faceless",
  orientation = "vertical",
  durationCategory = "short",
  project = null,
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
  let previousLayout = null;

  let beats = spokenChunks.map((spoken, index) => {
    const duration = calculateDynamicDuration(spoken, pacingProfile);

    const start_sec = currentStart;
    const end_sec = start_sec + duration;

    currentStart = end_sec;

    const intent = classifyBeatIntent(spoken);

    const layout = resolveLayout({
      intent,
      previousLayout,
      project,
    });

    previousLayout = layout;

    return {
      id: crypto.randomUUID(),
      order: index,
      layout,

      layoutBackground: {
        type: "color",
        value: "#000000",
        objectFit: "cover"
      },

      zones: {
        z1: {
          role: videoType === "talking_head" ? "avatar" : "asset",
          src: null,
          objectFit: "cover",
          padding: {},
          background: null
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