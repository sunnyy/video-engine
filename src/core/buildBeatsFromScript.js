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

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function splitIntoDurationBeats(text, pacingProfile) {

  const w = words(text);
  const beats = [];

  const minWords = Math.round(pacingProfile.words_per_second * 1.0);
  const maxWords = Math.round(pacingProfile.words_per_second * 2.0);

  let i = 0;

  while (i < w.length) {

    const sliceSize =
      Math.min(
        maxWords,
        Math.max(minWords, Math.floor(Math.random() * maxWords))
      );

    beats.push(w.slice(i, i + sliceSize).join(" "));
    i += sliceSize;

  }

  return beats;

}

function calculateDuration(spoken, pacingProfile) {

  const w = words(spoken).length;

  let duration = w / pacingProfile.words_per_second;

  if (duration < 1) duration = 1;
  if (duration > 2) duration = 2;

  return Number(duration.toFixed(2));

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

function chooseTransition(layout, index) {

  const layoutTransitionMap = {

    FullZone: ["cut","zoomCut","scaleJump"],
    SplitZone: ["slideWhip","zoomCut","cut"],
    ThreeZone: ["blurFade","cut","zoomCut"],
    TwoTopOneBottom: ["slideWhip","scaleJump","cut"],
    OneTopTwoBottom: ["zoomCut","blurFade","cut"],
    FourGrid: ["cut","flash","zoomCut"],
    PictureInPicture: ["scaleJump","blurFade","cut"],
    CenterAvatar: ["cut","zoomCut","cut"],
    FloatingAvatar: ["cut","scaleJump","zoomCut"],
    SideAvatar: ["slideWhip","cut","zoomCut"]

  };

  const pattern = layoutTransitionMap[layout] || ["cut"];

  if (index === 0) return "cut";

  return pattern[index % pattern.length];

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

  const pacingProfile =
    getPacingProfile(pacingMap[durationCategory] || "normal");

  let sourceBeats = [];

  if (structuredBeats && structuredBeats.length) {

    sourceBeats = structuredBeats;

  } else {

    const sentences = script
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    sentences.forEach((sentence) => {

      const parts = splitIntoDurationBeats(sentence, pacingProfile);

      parts.forEach((p) => {

        sourceBeats.push({
          spoken: p,
          intent: classifyBeatIntent(p),
        });

      });

    });

  }

  let currentStart = 0;

  let beats = sourceBeats.map((item, index) => {

    const spoken = item.spoken;
    const intent = item.intent || classifyBeatIntent(spoken);

    const duration = calculateDuration(spoken, pacingProfile);

    const start_sec = currentStart;
    const end_sec = start_sec + duration;

    currentStart = end_sec;

    const visual = planBeatVisual({
      intent,
      videoType,
    });

    const layoutDefaults =
      layoutDefaultsRegistry[visual.layout] || {};

    const captionPosition =
      layoutDefaults.captionPosition || "bottom";

    const layoutBackgroundDefaults =
      layoutDefaults.layoutBackground || {};

    return {

      id: crypto.randomUUID(),
      order: index,

      layout: visual.layout,

      layoutPadding: visual.layoutPadding,

      layoutBackground: {
        type: "color",
        value: "#000000",
        objectFit: "cover",
        enterTransition:
          layoutBackgroundDefaults.enterTransition || "fadeIn",
        exitTransition:
          layoutBackgroundDefaults.exitTransition || "none",
        motion:
          layoutBackgroundDefaults.motion || "none",
      },

      zones: visual.zones,

      blocks: visual.blocks || [],

      heading: intent === "hook" ? spoken : null,
      text: intent === "list" ? spoken : null,

      caption: {
        text: generateCaptionText(spoken),
        style: "tiktokClean",
        animation: chooseCaptionAnimation(intent),
        position: captionPosition,
      },

      transition: {
        type: chooseTransition(visual.layout, index),
        duration: 0.25,
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