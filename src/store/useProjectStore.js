import { create } from "zustand";
import { buildSafeProject } from "../normalize/normalizeProject";
import { calculateTimeline } from "../core/calculateTimeline";
import { getPacingProfile } from "../core/registries/pacingProfiles";
import { updateProject } from "../services/projects/projectService";

const MAX_HISTORY = 50;

function createRawBeat(order, mode) {
  return {
    id: crypto.randomUUID(),
    order,
    layout: "FullBleed",
    zones: {
      z1: {
        type: mode === "talking_head" ? "avatar" : "asset",
        src: null,
        objectFit: "cover",
      },
    },
    asset_settings: {},
    heading: null,
    text: null,
    components: {},
    overlays: [],
    caption: {
      text: "",
      style: "wordBlaze",
      animation: "fade",
      position: 80,
    },
    transition: { type: "cut", duration: 0.3 },
    spoken: "",
    duration_sec: 3,
    start_sec: 0,
    end_sec: 0,
  };
}

function recalcBeatTiming(beat, pacingProfile) {
  const words = beat.spoken?.trim().split(/\s+/).filter(Boolean).length || 0;
  const duration = Math.max(
    pacingProfile.min_duration,
    Math.min(pacingProfile.max_duration, words / pacingProfile.words_per_second || pacingProfile.min_duration),
  );
  return {
    ...beat,
    duration_sec: duration,
    caption: { ...beat.caption, text: beat.spoken || "" },
  };
}

export const useProjectStore = create((set, get) => ({
  project:      null,
  activeBeatId: null,
  databaseId:   null,
  projectName:  null,
  _history:     [],
  _future:      [],

  setDatabaseId:  (id)   => set({ databaseId: id }),
  setProjectName: (name) => set({ projectName: name }),

  setProject: (rawProject) => {
    const safeProject = buildSafeProject(rawProject);
    set({
      project:      safeProject,
      activeBeatId: safeProject.beats?.[0]?.id || null,
      _history:     [],
      _future:      [],
    });
  },

  _pushHistory: () => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = [..._history, JSON.parse(JSON.stringify(project))];
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ _history: newHistory, _future: [] });
  },

  undo: () => {
    const { project, _history, _future } = get();
    if (!_history.length) return;
    const prev    = _history[_history.length - 1];
    const newHist = _history.slice(0, -1);
    const newFut  = project ? [JSON.parse(JSON.stringify(project)), ..._future] : _future;
    set({ project: prev, _history: newHist, _future: newFut });
  },

  redo: () => {
    const { project, _history, _future } = get();
    if (!_future.length) return;
    const next    = _future[0];
    const newFut  = _future.slice(1);
    const newHist = project ? [..._history, JSON.parse(JSON.stringify(project))] : _history;
    set({ project: next, _history: newHist, _future: newFut });
  },

  updateProjectMeta: async (updates) => {
    get()._pushHistory();
    const current    = get().project;
    const databaseId = get().databaseId;
    if (!current) return;

    let newMeta = current.meta;
    if (updates.meta) newMeta = { ...current.meta, ...updates.meta };
    const rebuilt = { ...current, ...updates, meta: newMeta };

    if (updates.meta?.mode) {
      const mode = updates.meta.mode;
      rebuilt.beats = current.beats.map(beat => ({
        ...beat,
        zones: { ...beat.zones, z1: { ...beat.zones.z1, type: mode === "talking_head" ? "avatar" : "asset" } },
      }));
    }

    const safeProject = buildSafeProject(rebuilt);
    set({ project: safeProject });
    if (databaseId) await updateProject(databaseId, safeProject);
  },

  setActiveBeat: (beatId) => set({ activeBeatId: beatId }),

  /* ── Normal update — pushes history (dropdowns, text, toggles) ── */
  updateBeat: async (beatId, updates) => {
    get()._pushHistory();
    const current    = get().project;
    const databaseId = get().databaseId;
    if (!current) return;

    const pacingProfile = getPacingProfile("normal");
    const updatedBeats  = current.beats.map(beat => {
      if (beat.id !== beatId) return beat;
      let updated = { ...beat, ...updates };
      if (updates.spoken !== undefined) updated = recalcBeatTiming(updated, pacingProfile);
      return updated;
    });

    const updatedProject = calculateTimeline({ ...current, beats: updatedBeats });
    set({ project: updatedProject });
    if (databaseId) await updateProject(databaseId, updatedProject);
  },

  /* ── Silent — no history push, used while slider is dragging ── */
  updateBeatSilent: (beatId, updates) => {
    const current = get().project;
    if (!current) return;
    const updatedBeats   = current.beats.map(b => b.id !== beatId ? b : { ...b, ...updates });
    const updatedProject = calculateTimeline({ ...current, beats: updatedBeats });
    set({ project: updatedProject });
  },

  /* ── Commit — push ONE snapshot + save DB, call on slider mouseUp ── */
  commitBeat: async (beatId) => {
    get()._pushHistory();
    const current    = get().project;
    const databaseId = get().databaseId;
    if (!current) return;
    if (databaseId) await updateProject(databaseId, current);
  },

  addBeat: () => {
    get()._pushHistory();
    const current = get().project;
    if (!current) return;
    const newBeat = createRawBeat(current.beats.length, current.meta.mode);
    const updatedProject = calculateTimeline({ ...current, beats: [...current.beats, newBeat] });
    set({ project: updatedProject, activeBeatId: newBeat.id });
  },

  duplicateBeat: async (beatId) => {
    get()._pushHistory();
    const current    = get().project;
    const databaseId = get().databaseId;
    if (!current) return;

    const index = current.beats.findIndex(b => b.id === beatId);
    if (index === -1) return;

    const cloned   = JSON.parse(JSON.stringify(current.beats[index]));
    cloned.id      = crypto.randomUUID();
    const newBeats = [...current.beats];
    newBeats.splice(index + 1, 0, cloned);

    const updatedProject = calculateTimeline({ ...current, beats: newBeats });
    set({ project: updatedProject, activeBeatId: cloned.id });
    if (databaseId) await updateProject(databaseId, updatedProject);
  },

  reorderBeats: async (newBeats) => {
    get()._pushHistory();
    const current    = get().project;
    const databaseId = get().databaseId;
    if (!current) return;
    const updatedProject = calculateTimeline({ ...current, beats: newBeats });
    set({ project: updatedProject });
    if (databaseId) await updateProject(databaseId, updatedProject);
  },

  deleteBeat: async (beatId) => {
    get()._pushHistory();
    const current    = get().project;
    const databaseId = get().databaseId;
    if (!current) return;

    const filtered = current.beats.filter(b => b.id !== beatId);
    if (!filtered.length) return;

    const updatedProject = calculateTimeline({ ...current, beats: filtered });
    set({ project: updatedProject, activeBeatId: filtered[0].id });
    if (databaseId) await updateProject(databaseId, updatedProject);
  },
}));