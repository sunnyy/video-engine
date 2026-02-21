import { normalizeMeta } from "./normalizeMeta";
import { normalizeAvatar } from "./normalizeAvatar";
import { normalizeMusic } from "./normalizeMusic";
import { normalizeBeats } from "./normalizeBeats";
import { calculateTimeline } from "../core/calculateTimeline";

function generateProjectId() {
  return "proj_" + Math.random().toString(36).slice(2, 10);
}

export function buildSafeProject(raw = {}) {
  const meta = normalizeMeta(raw.meta);
  const avatar = normalizeAvatar(raw.avatar, meta.mode);
  const music = normalizeMusic(raw.music);
  const beats = normalizeBeats(raw.beats, meta.mode);

  const normalized = {
    id: raw.id || generateProjectId(),
    meta,
    avatar,
    music,
    beats,
  };

  return calculateTimeline(normalized);
}