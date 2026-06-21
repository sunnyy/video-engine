/**
 * timelineBuilder.js — Prompt to Video (AI Video)
 * Thin config over the shared eased builder (../shared/timelineBuilder.js).
 */
import { createTimelineBuilder } from "../shared/timelineBuilder.js";

export const buildTimeline = createTimelineBuilder({
  source:           "prompt_video",
  defaultName:      "Prompt Video",
  musicMoodDefault: "upbeat",
  sceneFormat:      "v3",
});
