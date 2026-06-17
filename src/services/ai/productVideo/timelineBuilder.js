/**
 * timelineBuilder.js — Product Video
 * Thin config over the shared eased builder (../shared/timelineBuilder.js).
 * (source/scene_format are also overridden in the orchestrator's meta merge.)
 */
import { createTimelineBuilder } from "../shared/timelineBuilder.js";

export const buildTimeline = createTimelineBuilder({
  source:           "product_video",
  defaultName:      "Product Video",
  musicMoodDefault: "premium",
  sceneFormat:      "v4",
});
