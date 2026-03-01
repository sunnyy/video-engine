import { getPacingProfile } from "./pacingProfiles";
import { generateCaptionSegments } from "./captionTimingEngine";
import { autoMatchAssets } from "./assetAutoMatcher";
import { injectAudioCues } from "./audioCueEngine";
import { validateBeats } from "./compilerValidator";

function splitScriptIntoChunks(script, chunkCount) {
  if (!script) return Array(chunkCount).fill("");

  const sentences = script.split(/(?<=[.?!])\s+/).filter(Boolean);

  if (sentences.length === 0) {
    return Array(chunkCount).fill(script);
  }

  const chunks = Array.from({ length: chunkCount }, () => []);

  sentences.forEach((sentence, index) => {
    const bucket = index % chunkCount;
    chunks[bucket].push(sentence);
  });

  return chunks.map((arr) => arr.join(" ").trim());
}

function calculateDynamicDuration(spoken, pacingProfile) {
  const words = spoken.trim().split(/\s+/).filter(Boolean).length;
  const duration = words / pacingProfile.words_per_second;

  return Math.max(
    pacingProfile.min_duration,
    Math.min(pacingProfile.max_duration, duration)
  );
}

function pickLayout(index, totalBeats, videoType) {
  if (index === 0) return "full";
  if (index === totalBeats - 1) return "full";

  if (videoType === "talking_head") {
    return index % 3 === 0 ? "floating" : "split";
  }

  return index % 2 === 0 ? "split" : "dual";
}

function enforceNoMoreThanTwoSame(beats) {
  let count = 1;

  for (let i = 1; i < beats.length; i++) {
    if (beats[i].visual_mode === beats[i - 1].visual_mode) {
      count++;
      if (count > 2) {
        beats[i].visual_mode = "split";
        count = 1;
      }
    } else {
      count = 1;
    }
  }

  return beats;
}

export function buildBeatsFromScript({
  script = "",
  videoType = "faceless",
  durationCategory = "short",
}) {
  if (!script) return [];

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

  let beatCount = 6;

  if (wordCount > 150) beatCount = 8;
  if (wordCount > 300) beatCount = 12;

  const spokenChunks = splitScriptIntoChunks(script, beatCount);

  let currentStart = 0;

  let beats = spokenChunks.map((spoken, index) => {
    const duration = calculateDynamicDuration(
      spoken,
      pacingProfile
    );

    const start_sec = currentStart;
    const end_sec = start_sec + duration;
    currentStart = end_sec;

    const layout = pickLayout(
      index,
      beatCount,
      videoType
    );

    return {
      id: crypto.randomUUID(),
      order: index,

      beat_type: index === 0
        ? "hook"
        : index === beatCount - 1
        ? "closing"
        : "content",

      visual_mode: layout,

      duration_sec: duration,
      start_sec,
      end_sec,

      spoken,
      visible: true,

      assets: {
        main: null,
        secondary: null,
      },

      caption: {
        show: true,
        style_multiplier: index === 0 ? 1.3 : 1,
        segments: generateCaptionSegments(spoken, duration),
      },

      transition: {
        type: index === 0 ? "cut" : "fade",
        duration: 0.3,
      },

      components: [],
    };
  });

  beats = enforceNoMoreThanTwoSame(beats);

  beats = autoMatchAssets(beats);

  beats = injectAudioCues(beats, {
    audio_rules: {
      hook_sfx: true,
      layout_whoosh: true,
    },
  });

  beats = validateBeats(beats);

  return beats;
}