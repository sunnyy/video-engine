/**
 * timelineBuilder.js — Social Video
 * Thin config over the shared eased builder (../shared/timelineBuilder.js).
 */
import { createTimelineBuilder } from "../shared/timelineBuilder.js";

export const buildTimeline = createTimelineBuilder({
  source:           "social_video",
  defaultName:      "Social Video",
  musicMoodDefault: "upbeat",
  sceneFormat:      "v3",
});
