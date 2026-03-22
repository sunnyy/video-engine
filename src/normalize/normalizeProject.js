import { normalizeMeta } from "./normalizeMeta";
import { normalizeBeats } from "./normalizeBeats";
import { calculateTimeline } from "../core/calculateTimeline";
import { normalizeMusic } from "./normalizeMusic";

export function buildSafeProject(raw = {}) {

  const meta = normalizeMeta(raw.meta ?? {});

  const baseProject = {

    id: raw.id || crypto.randomUUID(),

    meta,

    captionPreset: raw.captionPreset || {
      style: "tiktokClean"
    },

    script: {
      text: raw?.script?.text || ""
    },

    workflow: raw.workflow || {
      script_completed: false,
      avatar_completed: false,
      beats_initialized: false
    },

    avatar: raw.avatar || null,

    audio: normalizeMusic(raw.audio) || {
      tts: null,
      music: null
    },

    beats: [],
    duration_sec: 0

  };

  if (raw.beats && raw.beats.length) {

    const normalizedBeats = normalizeBeats(raw.beats, meta);

    const withTimeline = calculateTimeline({
      ...baseProject,
      beats: normalizedBeats
    });

    return withTimeline;

  }

  return baseProject;

}