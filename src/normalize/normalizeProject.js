import { normalizeMeta } from "../normalize/normalizeMeta";
import { normalizeBeats } from "../normalize/normalizeBeats";
import { calculateTimeline } from "../core/calculateTimeline";

export function buildSafeProject(raw) {
  const meta = normalizeMeta(raw.meta);

  const baseProject = {
    id: raw.id || crypto.randomUUID(),

    meta,

    script: raw.script || {
      text: "",
      structured_lines: [],
    },

    workflow: raw.workflow || {
      script_completed: false,
      avatar_completed: false,
      beats_initialized: false,
    },

    avatar: raw.avatar || null,
    music: raw.music || null,

    beats: [],
    duration_sec: 0,
  };

  if (baseProject.workflow.beats_initialized && raw.beats) {
    const normalizedBeats = normalizeBeats(raw.beats, meta);

    const withTimeline = calculateTimeline({
      ...baseProject,
      beats: normalizedBeats,
    });

    return withTimeline;
  }

  return baseProject;
}